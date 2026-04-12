/**
 * Storage 누락분 복사 - artist_media(portfolios버킷) + profile avatars(profile_image_path)
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

async function main() {
  const c = new Client({ connectionString: DB });
  await c.connect();

  // 1. artist_media — storage_path → portfolios 버킷 (artists 아님!)
  const { rows: amRows } = await c.query('SELECT DISTINCT storage_path FROM artist_media WHERE storage_path IS NOT NULL');
  console.log(`artist_media: ${amRows.length} files to copy (portfolios bucket)`);
  let ok = 0, fail = 0;
  for (let i = 0; i < amRows.length; i++) {
    const success = await copyFile('portfolios', amRows[i].storage_path);
    if (success) ok++; else fail++;
    if ((i + 1) % 500 === 0) console.log(`  artist_media: ${i+1}/${amRows.length} (${ok} ok, ${fail} fail)`);
  }
  console.log(`artist_media: ${ok}/${amRows.length} copied${fail ? ` (${fail} failed)` : ''}\n`);

  // 2. profiles — profile_image_path → avatars 버킷
  const { rows: avRows } = await c.query("SELECT DISTINCT profile_image_path FROM profiles WHERE profile_image_path IS NOT NULL AND profile_image_path != ''");
  console.log(`profile avatars: ${avRows.length} files to copy (avatars bucket)`);
  ok = 0; fail = 0;
  for (const r of avRows) {
    const success = await copyFile('avatars', r.profile_image_path);
    if (success) ok++; else fail++;
  }
  console.log(`profile avatars: ${ok}/${avRows.length} copied${fail ? ` (${fail} failed)` : ''}\n`);

  await c.end();
  console.log('✅ Storage fix complete');
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
