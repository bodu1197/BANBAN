/**
 * Storage 복사 - 범위 지정 (start ~ end)
 * Usage: node clone-storage-range.mjs <start> <end>
 */
import pg from "pg";
const { Client } = pg;

const DB = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const OLD_SB_URL = "https://bhcascuuecgwlxujtpkx.supabase.co";
const OLD_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2FzY3V1ZWNnd2x4dWp0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNzc0OSwiZXhwIjoyMDg0ODkzNzQ5fQ.mzmX99UhBGM2XTkQt79GACTsP_QLLDws1CENTbcP4gE";
const NEW_SB_URL = "https://vzhvaweiyztbjaldnxdd.supabase.co";
const NEW_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHZhd2VpeXp0YmphbGRueGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxOTMzOSwiZXhwIjoyMDkxMjk1MzM5fQ.qJs3WyCbmbl7KtiG5_PSqdkaHIiuaEMx2wNCLCvcfrU";

const START = parseInt(process.argv[2] || '0');
const END = parseInt(process.argv[3] || '99999');
const MODE = process.argv[4] || 'artist'; // 'artist' or 'avatar'

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
      const buf = Buffer.from(await dl.arrayBuffer());
      const ct = dl.headers.get('content-type') || 'application/octet-stream';
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 20000);
      try {
        const up = await fetch(`${NEW_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${NEW_SB_KEY}`, apikey: NEW_SB_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
          body: buf, signal: ctrl2.signal
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

  let rows, bucket;
  if (MODE === 'avatar') {
    const res = await c.query("SELECT DISTINCT profile_image_path FROM profiles WHERE profile_image_path IS NOT NULL AND profile_image_path != '' ORDER BY profile_image_path");
    rows = res.rows.map(r => r.profile_image_path);
    bucket = 'avatars';
  } else {
    const res = await c.query('SELECT DISTINCT storage_path FROM artist_media WHERE storage_path IS NOT NULL ORDER BY storage_path');
    rows = res.rows.map(r => r.storage_path);
    bucket = 'portfolios';
  }

  const paths = rows.slice(START, END);
  console.log(`[${MODE}] range ${START}-${Math.min(END, rows.length)} of ${rows.length} (bucket: ${bucket})`);

  let ok = 0, fail = 0;
  for (let i = 0; i < paths.length; i++) {
    const success = await copyFile(bucket, paths[i]);
    if (success) ok++; else fail++;
    if ((i + 1) % 50 === 0 || i + 1 === paths.length) {
      console.log(`  [${START + i + 1}] ${ok} ok, ${fail} fail`);
    }
  }
  console.log(`DONE: ${ok}/${paths.length} (${fail} failed)`);
  await c.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
