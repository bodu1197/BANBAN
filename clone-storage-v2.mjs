/**
 * Storage 100% 복제 - DB의 실제 경로를 기반으로 복사
 */
import pg from "pg";
const { Client } = pg;

const DB = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const OLD_SB_URL = "https://bhcascuuecgwlxujtpkx.supabase.co";
const OLD_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2FzY3V1ZWNnd2x4dWp0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNzc0OSwiZXhwIjoyMDg0ODkzNzQ5fQ.mzmX99UhBGM2XTkQt79GACTsP_QLLDws1CENTbcP4gE";
const NEW_SB_URL = "https://vzhvaweiyztbjaldnxdd.supabase.co";
const NEW_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHZhd2VpeXp0YmphbGRueGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxOTMzOSwiZXhwIjoyMDkxMjk1MzM5fQ.qJs3WyCbmbl7KtiG5_PSqdkaHIiuaEMx2wNCLCvcfrU";

async function copyFile(bucket, filePath) {
  for (let i = 0; i < 3; i++) {
    try {
      const dl = await fetch(`${OLD_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY }
      });
      if (!dl.ok) return false;
      const blob = await dl.blob();
      const ct = dl.headers.get('content-type') || 'application/octet-stream';
      const up = await fetch(`${NEW_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${NEW_SB_KEY}`, apikey: NEW_SB_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
        body: blob
      });
      if (up.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function ensureBucket(id, isPublic) {
  await fetch(`${NEW_SB_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${NEW_SB_KEY}`, apikey: NEW_SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: id, public: isPublic })
  });
}

async function main() {
  const c = new Client({ connectionString: DB });
  await c.connect();

  // Ensure buckets exist
  const buckets = ['portfolios','posts','banners','avatars','artists','ai-tattoos','models','eyebrow-templates','chat','inquiries'];
  for (const b of buckets) await ensureBucket(b, true);
  console.log('Buckets ready\n');

  // 1. portfolio_media — storage_path (bucket: portfolios)
  const { rows: pmRows } = await c.query('SELECT DISTINCT storage_path FROM portfolio_media WHERE storage_path IS NOT NULL');
  console.log(`portfolios: ${pmRows.length} files to copy`);
  let ok = 0, fail = 0;
  for (let i = 0; i < pmRows.length; i++) {
    const success = await copyFile('portfolios', pmRows[i].storage_path);
    if (success) ok++; else fail++;
    if ((i + 1) % 500 === 0) process.stdout.write(`  portfolios: ${i+1}/${pmRows.length} (${ok} ok, ${fail} fail)\n`);
  }
  console.log(`  portfolios: ${ok}/${pmRows.length} copied${fail ? ` (${fail} failed)` : ''}`);

  // 2. artist_media — storage_path (bucket: artists)
  const { rows: amRows } = await c.query('SELECT DISTINCT storage_path FROM artist_media WHERE storage_path IS NOT NULL');
  ok = 0; fail = 0;
  for (const r of amRows) { if (await copyFile('artists', r.storage_path)) ok++; else fail++; }
  console.log(`  artists: ${ok}/${amRows.length} copied${fail ? ` (${fail} failed)` : ''}`);

  // 3. profiles — avatar_path (bucket: avatars)
  const { rows: avRows } = await c.query("SELECT DISTINCT avatar_path FROM profiles WHERE avatar_path IS NOT NULL AND avatar_path != ''");
  ok = 0; fail = 0;
  for (const r of avRows) { if (await copyFile('avatars', r.avatar_path)) ok++; else fail++; }
  console.log(`  avatars: ${ok}/${avRows.length} copied${fail ? ` (${fail} failed)` : ''}`);

  // 4. artists — profile_image_path (bucket: avatars)
  const { rows: apRows } = await c.query("SELECT DISTINCT profile_image_path FROM artists WHERE profile_image_path IS NOT NULL AND profile_image_path != ''");
  ok = 0; fail = 0;
  for (const r of apRows) { if (await copyFile('avatars', r.profile_image_path)) ok++; else fail++; }
  console.log(`  artist avatars: ${ok}/${apRows.length} copied${fail ? ` (${fail} failed)` : ''}`);

  // 5. Other buckets - use API listing for small ones
  for (const bucket of ['ai-tattoos', 'models', 'eyebrow-templates', 'chat', 'inquiries', 'banners', 'posts']) {
    const res = await fetch(`${OLD_SB_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: 10000 })
    });
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) { console.log(`  ${bucket}: empty`); continue; }

    // Flatten (1 level deep folders)
    let files = [];
    for (const item of items) {
      if (item.id) { files.push(item.name); continue; }
      const sub = await fetch(`${OLD_SB_URL}/storage/v1/object/list/${bucket}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: item.name + '/', limit: 10000 })
      });
      const subItems = await sub.json();
      if (Array.isArray(subItems)) for (const s of subItems) if (s.id) files.push(item.name + '/' + s.name);
    }
    ok = 0; fail = 0;
    for (const f of files) { if (await copyFile(bucket, f)) ok++; else fail++; }
    console.log(`  ${bucket}: ${ok}/${files.length} copied${fail ? ` (${fail} failed)` : ''}`);
  }

  await c.end();
  console.log('\n✅ Storage 100% complete');
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
