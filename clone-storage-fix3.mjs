/**
 * Storage 누락분 복사 - timeout + 병렬 5개 + 매 10개 로그
 */
import pg from "pg";
const { Client } = pg;

const DB = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const OLD_SB_URL = "https://bhcascuuecgwlxujtpkx.supabase.co";
const OLD_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2FzY3V1ZWNnd2x4dWp0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNzc0OSwiZXhwIjoyMDg0ODkzNzQ5fQ.mzmX99UhBGM2XTkQt79GACTsP_QLLDws1CENTbcP4gE";
const NEW_SB_URL = "https://vzhvaweiyztbjaldnxdd.supabase.co";
const NEW_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHZhd2VpeXp0YmphbGRueGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxOTMzOSwiZXhwIjoyMDkxMjk1MzM5fQ.qJs3WyCbmbl7KtiG5_PSqdkaHIiuaEMx2wNCLCvcfrU";

function fetchWithTimeout(url, opts, ms = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function copyFile(bucket, filePath) {
  for (let i = 0; i < 2; i++) {
    try {
      const dl = await fetchWithTimeout(`${OLD_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY }
      }, 30000);
      if (!dl.ok) return false;
      const buf = await dl.arrayBuffer();
      const ct = dl.headers.get('content-type') || 'application/octet-stream';
      const up = await fetchWithTimeout(`${NEW_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${NEW_SB_KEY}`, apikey: NEW_SB_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
        body: buf
      }, 30000);
      if (up.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const c = new Client({ connectionString: DB });
  await c.connect();
  console.log('DB connected');

  // 1. artist_media → portfolios 버킷
  const { rows: amRows } = await c.query('SELECT DISTINCT storage_path FROM artist_media WHERE storage_path IS NOT NULL');
  const paths = amRows.map(r => r.storage_path);
  console.log(`artist_media: ${paths.length} files`);

  let ok = 0, fail = 0;
  const BATCH = 5;
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(p => copyFile('portfolios', p)));
    for (const r of results) { if (r) ok++; else fail++; }
    if ((i + BATCH) % 50 === 0 || i + BATCH >= paths.length) {
      console.log(`  artist_media: ${Math.min(i + BATCH, paths.length)}/${paths.length} (${ok} ok, ${fail} fail)`);
    }
  }
  console.log(`artist_media DONE: ${ok}/${paths.length} (${fail} failed)\n`);

  // 2. profiles → avatars 버킷
  const { rows: avRows } = await c.query("SELECT DISTINCT profile_image_path FROM profiles WHERE profile_image_path IS NOT NULL AND profile_image_path != ''");
  const avPaths = avRows.map(r => r.profile_image_path);
  console.log(`profile avatars: ${avPaths.length} files`);
  ok = 0; fail = 0;
  for (let i = 0; i < avPaths.length; i += BATCH) {
    const batch = avPaths.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(p => copyFile('avatars', p)));
    for (const r of results) { if (r) ok++; else fail++; }
    console.log(`  avatars: ${Math.min(i + BATCH, avPaths.length)}/${avPaths.length} (${ok} ok, ${fail} fail)`);
  }
  console.log(`profile avatars DONE: ${ok}/${avPaths.length} (${fail} failed)\n`);

  await c.end();
  console.log('✅ Done');
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
