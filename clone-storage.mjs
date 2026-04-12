/**
 * Storage 버킷 + 파일 100% 복제 (재시도 로직 포함)
 */
const OLD_SB_URL = "https://bhcascuuecgwlxujtpkx.supabase.co";
const OLD_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2FzY3V1ZWNnd2x4dWp0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNzc0OSwiZXhwIjoyMDg0ODkzNzQ5fQ.mzmX99UhBGM2XTkQt79GACTsP_QLLDws1CENTbcP4gE";
const NEW_SB_URL = "https://vzhvaweiyztbjaldnxdd.supabase.co";
const NEW_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHZhd2VpeXp0YmphbGRueGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxOTMzOSwiZXhwIjoyMDkxMjk1MzM5fQ.qJs3WyCbmbl7KtiG5_PSqdkaHIiuaEMx2wNCLCvcfrU";

async function sbFetch(url, key, path, options = {}) {
  const res = await fetch(url + path, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, apikey: key, ...options.headers }
  });
  return res;
}

async function listAllFiles(bucket, prefix = '') {
  const files = [];
  const res = await sbFetch(OLD_SB_URL, OLD_SB_KEY, `/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 10000, sortBy: { column: 'name', order: 'asc' } })
  });
  const items = await res.json();
  if (!Array.isArray(items)) return files;

  for (const item of items) {
    const path = prefix ? `${prefix}${item.name}` : item.name;
    if (item.id) {
      files.push(path);
    } else {
      const sub = await listAllFiles(bucket, path + '/');
      files.push(...sub);
    }
  }
  return files;
}

async function copyFile(bucket, filePath) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const dl = await fetch(`${OLD_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY }
      });
      if (!dl.ok) return false;
      const blob = await dl.blob();
      const ct = dl.headers.get('content-type') || 'application/octet-stream';

      const up = await fetch(`${NEW_SB_URL}/storage/v1/object/${bucket}/${filePath}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NEW_SB_KEY}`, apikey: NEW_SB_KEY,
          'Content-Type': ct, 'x-upsert': 'true'
        },
        body: blob
      });
      if (up.ok) return true;
      await new Promise(r => setTimeout(r, 1000));
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

async function main() {
  // Get old buckets
  const res = await sbFetch(OLD_SB_URL, OLD_SB_KEY, '/storage/v1/bucket');
  const buckets = await res.json();
  console.log(`${buckets.length} buckets found\n`);

  for (const bucket of buckets) {
    // Create bucket
    await sbFetch(NEW_SB_URL, NEW_SB_KEY, '/storage/v1/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bucket.id, name: bucket.id, public: bucket.public })
    });

    // List files
    const files = await listAllFiles(bucket.id);
    if (files.length === 0) {
      console.log(`${bucket.id}: 0 files (empty)`);
      continue;
    }

    // Copy files
    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      const success = await copyFile(bucket.id, files[i]);
      if (success) ok++; else fail++;
      if ((i + 1) % 100 === 0) process.stdout.write(`  ${bucket.id}: ${i+1}/${files.length}...\r`);
    }
    console.log(`${bucket.id}: ${ok}/${files.length} copied${fail ? ` (${fail} failed)` : ''}`);
  }

  console.log('\n✅ Storage clone complete');
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
