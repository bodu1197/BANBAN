/**
 * Storage 누락분 복사 - 순차 + 짧은 timeout + 매 파일 로그 + 350 스킵
 */
import pg from "pg";
const { Client } = pg;

const DB = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const OLD_SB_URL = "https://bhcascuuecgwlxujtpkx.supabase.co";
const OLD_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2FzY3V1ZWNnd2x4dWp0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNzc0OSwiZXhwIjoyMDg0ODkzNzQ5fQ.mzmX99UhBGM2XTkQt79GACTsP_QLLDws1CENTbcP4gE";
const NEW_SB_URL = "https://vzhvaweiyztbjaldnxdd.supabase.co";
const NEW_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHZhd2VpeXp0YmphbGRueGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxOTMzOSwiZXhwIjoyMDkxMjk1MzM5fQ.qJs3WyCbmbl7KtiG5_PSqdkaHIiuaEMx2wNCLCvcfrU";

const SKIP_ARTIST = parseInt(process.argv[2] || '0');

async function copyFile(bucket, filePath) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl1 = new AbortController();
    const t1 = setTimeout(() => ctrl1.abort(), 20000);
    try {
      const dl = await fetch(`${OLD_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY },
        signal: ctrl1.signal
      });
      clearTimeout(t1);
      if (!dl.ok) return false;

      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 20000);
      try {
        const buf = Buffer.from(await dl.arrayBuffer());
        const ct = dl.headers.get('content-type') || 'application/octet-stream';
        const up = await fetch(`${NEW_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${NEW_SB_KEY}`, apikey: NEW_SB_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
          body: buf,
          signal: ctrl2.signal
        });
        clearTimeout(t2);
        if (up.ok) return true;
      } catch { clearTimeout(t2); }
    } catch { clearTimeout(t1); }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const c = new Client({ connectionString: DB });
  await c.connect();
  console.log('DB connected');

  // 1. artist_media → portfolios 버킷
  const { rows: amRows } = await c.query('SELECT DISTINCT storage_path FROM artist_media WHERE storage_path IS NOT NULL ORDER BY storage_path');
  const allPaths = amRows.map(r => r.storage_path);
  const paths = allPaths.slice(SKIP_ARTIST);
  console.log(`artist_media: ${allPaths.length} total, skipping ${SKIP_ARTIST}, copying ${paths.length}`);

  let ok = 0, fail = 0;
  for (let i = 0; i < paths.length; i++) {
    const success = await copyFile('portfolios', paths[i]);
    if (success) ok++; else fail++;
    if ((i + 1) % 50 === 0 || i + 1 === paths.length) {
      console.log(`  [${SKIP_ARTIST + i + 1}/${allPaths.length}] ${ok} ok, ${fail} fail`);
    }
  }
  console.log(`artist_media DONE: ${ok + SKIP_ARTIST}/${allPaths.length} (${fail} failed)\n`);

  // 2. profiles → avatars 버킷
  const { rows: avRows } = await c.query("SELECT DISTINCT profile_image_path FROM profiles WHERE profile_image_path IS NOT NULL AND profile_image_path != ''");
  console.log(`profile avatars: ${avRows.length} files`);
  ok = 0; fail = 0;
  for (let i = 0; i < avRows.length; i++) {
    const success = await copyFile('avatars', avRows[i].profile_image_path);
    if (success) ok++; else fail++;
  }
  console.log(`profile avatars DONE: ${ok}/${avRows.length} (${fail} failed)\n`);

  await c.end();
  console.log('✅ Done');
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
