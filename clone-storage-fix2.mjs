/**
 * Storage 누락분 복사 - 병렬 처리 (10개 동시)
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

async function copyBatch(bucket, paths) {
  let ok = 0, fail = 0;
  const total = paths.length;
  const CONCURRENCY = 10;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = paths.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(p => copyFile(bucket, p)));
    for (const r of results) { if (r) ok++; else fail++; }
    const done = Math.min(i + CONCURRENCY, total);
    if (done % 100 === 0 || done === total) {
      console.log(`  ${bucket}: ${done}/${total} (${ok} ok, ${fail} fail)`);
    }
  }
  return { ok, fail, total };
}

async function main() {
  const c = new Client({ connectionString: DB });
  await c.connect();
  console.log('DB connected');

  // 1. artist_media → portfolios 버킷
  const { rows: amRows } = await c.query('SELECT DISTINCT storage_path FROM artist_media WHERE storage_path IS NOT NULL');
  console.log(`\nartist_media: ${amRows.length} files (portfolios bucket)`);
  const amResult = await copyBatch('portfolios', amRows.map(r => r.storage_path));
  console.log(`artist_media DONE: ${amResult.ok}/${amResult.total}${amResult.fail ? ` (${amResult.fail} failed)` : ''}\n`);

  // 2. profiles → avatars 버킷
  const { rows: avRows } = await c.query("SELECT DISTINCT profile_image_path FROM profiles WHERE profile_image_path IS NOT NULL AND profile_image_path != ''");
  console.log(`profile avatars: ${avRows.length} files (avatars bucket)`);
  const avResult = await copyBatch('avatars', avRows.map(r => r.profile_image_path));
  console.log(`profile avatars DONE: ${avResult.ok}/${avResult.total}${avResult.fail ? ` (${avResult.fail} failed)` : ''}\n`);

  await c.end();
  console.log('✅ Storage fix complete');
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
