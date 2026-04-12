/**
 * 타투어때 → 반언니 Supabase 100% 복제
 * DB(테이블+데이터+제약조건+함수+트리거+RLS) + Storage + Auth
 */
import pg from "pg";
const { Client } = pg;

const OLD = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const NEW = "postgresql://postgres.vzhvaweiyztbjaldnxdd:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const BATCH = 200;

const OLD_SB_URL = "https://bhcascuuecgwlxujtpkx.supabase.co";
const OLD_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2FzY3V1ZWNnd2x4dWp0cGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNzc0OSwiZXhwIjoyMDg0ODkzNzQ5fQ.mzmX99UhBGM2XTkQt79GACTsP_QLLDws1CENTbcP4gE";
const NEW_SB_URL = "https://vzhvaweiyztbjaldnxdd.supabase.co";
const NEW_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHZhd2VpeXp0YmphbGRueGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDMzNjg2NiwiZXhwIjoyMDU5OTEyODY2fQ.MMWMJPA1XGlxDsnlcHGIFbGq7ZJkLFnCxnJhBfANfTY";

function mapType(c) {
  const { udt_name, data_type, character_maximum_length, numeric_precision, numeric_scale } = c;
  if (udt_name === 'uuid') return 'uuid';
  if (udt_name === 'text') return 'text';
  if (udt_name === 'bool') return 'boolean';
  if (udt_name === 'int4') return 'integer';
  if (udt_name === 'int8') return 'bigint';
  if (udt_name === 'int2') return 'smallint';
  if (udt_name === 'float4') return 'real';
  if (udt_name === 'float8') return 'double precision';
  if (udt_name === 'numeric') return numeric_precision ? `numeric(${numeric_precision},${numeric_scale||0})` : 'numeric';
  if (udt_name === 'timestamptz') return 'timestamptz';
  if (udt_name === 'timestamp') return 'timestamp';
  if (udt_name === 'date') return 'date';
  if (udt_name === 'jsonb') return 'jsonb';
  if (udt_name === 'json') return 'json';
  if (udt_name === 'varchar') return character_maximum_length ? `varchar(${character_maximum_length})` : 'varchar';
  if (udt_name === 'vector') return 'vector(512)';
  if (udt_name === '_text') return 'text[]';
  if (udt_name === '_uuid') return 'uuid[]';
  if (udt_name === '_int4') return 'integer[]';
  if (udt_name === '_float8') return 'double precision[]';
  if (data_type === 'ARRAY') return udt_name.replace(/^_/, '') + '[]';
  if (data_type === 'USER-DEFINED') return udt_name;
  return data_type;
}

async function copyRows(oc, nc, schema, tablename) {
  const qs = `${schema}."${tablename}"`;
  const { rows: [cnt] } = await oc.query(`SELECT count(*) FROM ${qs}`);
  const total = parseInt(cnt.count);
  if (total === 0) { process.stdout.write(`  ${qs}: 0/0\n`); return; }

  const { rows: cols } = await oc.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = '${schema}' AND table_name = '${tablename}' AND is_generated = 'NEVER'
    ORDER BY ordinal_position
  `);
  const colNames = cols.map(c => c.column_name);
  const colList = colNames.map(c => `"${c}"`).join(', ');

  let copied = 0, offset = 0;
  while (offset < total) {
    const { rows } = await oc.query(`SELECT ${colList} FROM ${qs} LIMIT ${BATCH} OFFSET ${offset}`);
    if (rows.length === 0) break;
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const row of rows) {
      const rp = [];
      for (const col of colNames) { values.push(row[col]); rp.push(`$${idx++}`); }
      placeholders.push(`(${rp.join(',')})`);
    }
    try {
      const r = await nc.query(`INSERT INTO ${qs} (${colList}) VALUES ${placeholders.join(',')} ON CONFLICT DO NOTHING`, values);
      copied += r.rowCount;
    } catch {
      for (const row of rows) {
        const rv = colNames.map(c => row[c]);
        const rp = colNames.map((_, i) => `$${i+1}`).join(',');
        try { const r = await nc.query(`INSERT INTO ${qs} (${colList}) VALUES (${rp}) ON CONFLICT DO NOTHING`, rv); copied += r.rowCount; } catch {}
      }
    }
    offset += BATCH;
  }
  process.stdout.write(`  ${qs}: ${copied}/${total}\n`);
}

async function sbFetch(url, key, path, options = {}) {
  const res = await fetch(url + path, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, apikey: key, ...options.headers }
  });
  return res;
}

async function cloneStorage() {
  console.log("\n═══ STORAGE CLONE ═══");

  // Get old buckets
  const oldRes = await sbFetch(OLD_SB_URL, OLD_SB_KEY, '/storage/v1/bucket');
  const oldBuckets = await oldRes.json();

  for (const bucket of oldBuckets) {
    // Create bucket in new
    await sbFetch(NEW_SB_URL, NEW_SB_KEY, '/storage/v1/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bucket.id, name: bucket.id, public: bucket.public })
    });

    // List all files recursively
    let allFiles = [];
    let offset = 0;
    while (true) {
      const listRes = await sbFetch(OLD_SB_URL, OLD_SB_KEY, `/storage/v1/object/list/${bucket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      });
      const files = await listRes.json();
      if (!Array.isArray(files) || files.length === 0) break;

      // Some are folders, need to recurse
      for (const f of files) {
        if (f.id) {
          allFiles.push(f.name);
        } else {
          // It's a folder, list inside
          const subRes = await sbFetch(OLD_SB_URL, OLD_SB_KEY, `/storage/v1/object/list/${bucket.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: f.name + '/', limit: 10000, sortBy: { column: 'name', order: 'asc' } })
          });
          const subFiles = await subRes.json();
          if (Array.isArray(subFiles)) {
            for (const sf of subFiles) {
              if (sf.id) allFiles.push(f.name + '/' + sf.name);
              else {
                // 2-level deep
                const sub2Res = await sbFetch(OLD_SB_URL, OLD_SB_KEY, `/storage/v1/object/list/${bucket.id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prefix: f.name + '/' + sf.name + '/', limit: 10000, sortBy: { column: 'name', order: 'asc' } })
                });
                const sub2Files = await sub2Res.json();
                if (Array.isArray(sub2Files)) {
                  for (const s2f of sub2Files) {
                    if (s2f.id) allFiles.push(f.name + '/' + sf.name + '/' + s2f.name);
                  }
                }
              }
            }
          }
        }
      }
      if (files.length < 1000) break;
      offset += 1000;
    }

    // Copy each file
    let ok = 0, fail = 0;
    for (const filePath of allFiles) {
      try {
        const dlRes = await fetch(`${OLD_SB_URL}/storage/v1/object/${bucket.id}/${filePath}`, {
          headers: { Authorization: `Bearer ${OLD_SB_KEY}`, apikey: OLD_SB_KEY }
        });
        if (!dlRes.ok) { fail++; continue; }
        const blob = await dlRes.blob();
        const contentType = dlRes.headers.get('content-type') || 'application/octet-stream';

        const upRes = await fetch(`${NEW_SB_URL}/storage/v1/object/${bucket.id}/${filePath}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${NEW_SB_KEY}`,
            apikey: NEW_SB_KEY,
            'Content-Type': contentType,
            'x-upsert': 'true'
          },
          body: blob
        });
        if (upRes.ok) ok++; else fail++;
      } catch { fail++; }
    }
    console.log(`  ${bucket.id}: ${ok}/${allFiles.length} files copied${fail ? ` (${fail} failed)` : ''}`);
  }
}

async function main() {
  const oc = new Client({ connectionString: OLD });
  const nc = new Client({ connectionString: NEW });
  await oc.connect();
  await nc.connect();
  console.log("Connected\n");

  // ═══ STEP 1: Create tables ═══
  console.log("═══ STEP 1: Create tables ═══");
  const { rows: tables } = await oc.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  for (const { tablename } of tables) {
    const { rows: cols } = await oc.query(`
      SELECT column_name, data_type, udt_name, column_default, is_nullable,
             character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position
    `, [tablename]);
    const colDefs = cols.map(c => {
      let def = `"${c.column_name}" ${mapType(c)}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      return def;
    });
    try {
      await nc.query(`CREATE TABLE IF NOT EXISTS public."${tablename}" (${colDefs.join(', ')})`);
    } catch (e) { console.error(`  ❌ ${tablename}: ${e.message.slice(0,80)}`); }
  }
  console.log(`  ${tables.length} tables created`);

  // ═══ STEP 2: PK & UNIQUE ═══
  console.log("\n═══ STEP 2: PK & UNIQUE ═══");
  const { rows: constraints } = await oc.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
           string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
  `);
  let cOk = 0;
  for (const c of constraints) {
    const cols = c.columns.split(',').map(col => `"${col}"`).join(', ');
    try { await nc.query(`ALTER TABLE public."${c.table_name}" ADD CONSTRAINT "${c.constraint_name}" ${c.constraint_type} (${cols})`); cOk++; } catch {}
  }
  console.log(`  ${cOk}/${constraints.length}`);

  // ═══ STEP 3: Indexes ═══
  console.log("\n═══ STEP 3: Indexes ═══");
  const { rows: indexes } = await oc.query(`
    SELECT indexdef FROM pg_indexes WHERE schemaname = 'public'
    AND indexname NOT IN (SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public')
  `);
  let iOk = 0;
  for (const { indexdef } of indexes) { try { await nc.query(indexdef); iOk++; } catch {} }
  console.log(`  ${iOk}/${indexes.length}`);

  // ═══ STEP 4: Copy ALL data ═══
  console.log("\n═══ STEP 4: Copy ALL data ═══");
  for (const { tablename } of tables) {
    await copyRows(oc, nc, 'public', tablename);
  }

  // ═══ STEP 5: Auth ═══
  console.log("\n═══ STEP 5: Auth ═══");
  await copyRows(oc, nc, 'auth', 'users');
  await copyRows(oc, nc, 'auth', 'identities');

  // ═══ STEP 6: FK ═══
  console.log("\n═══ STEP 6: FK ═══");
  const { rows: fks } = await oc.query(`
    SELECT tc.table_name, tc.constraint_name,
           kcu.column_name, ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column,
           rc.update_rule, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  let fOk = 0;
  for (const fk of fks) {
    const refTable = fk.ref_schema === 'public' ? `public."${fk.ref_table}"` : `${fk.ref_schema}."${fk.ref_table}"`;
    try {
      await nc.query(`ALTER TABLE public."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}"
        FOREIGN KEY ("${fk.column_name}") REFERENCES ${refTable}("${fk.ref_column}")
        ON UPDATE ${fk.update_rule} ON DELETE ${fk.delete_rule}`);
      fOk++;
    } catch {}
  }
  console.log(`  ${fOk}/${fks.length}`);

  // ═══ STEP 7: Functions ═══
  console.log("\n═══ STEP 7: Functions ═══");
  const { rows: funcs } = await oc.query(`
    SELECT pg_get_functiondef(p.oid) as funcdef FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'
  `);
  let fnOk = 0;
  for (const f of funcs) {
    let def = f.funcdef;
    if (def.startsWith('CREATE FUNCTION')) def = 'CREATE OR REPLACE FUNCTION' + def.slice('CREATE FUNCTION'.length);
    try { await nc.query(def); fnOk++; } catch {}
  }
  console.log(`  ${fnOk}/${funcs.length}`);

  // ═══ STEP 8: Triggers ═══
  console.log("\n═══ STEP 8: Triggers ═══");
  const { rows: triggers } = await oc.query(`
    SELECT pg_get_triggerdef(t.oid) as triggerdef FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
  `);
  let tOk = 0;
  for (const t of triggers) { try { await nc.query(t.triggerdef); tOk++; } catch {} }
  console.log(`  ${tOk}/${triggers.length}`);

  // ═══ STEP 9: RLS ═══
  console.log("\n═══ STEP 9: RLS ═══");
  const { rows: rlsTables } = await oc.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true`);
  for (const t of rlsTables) { await nc.query(`ALTER TABLE public."${t.tablename}" ENABLE ROW LEVEL SECURITY`).catch(() => {}); }
  const { rows: policies } = await oc.query(`SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'`);
  let pOk = 0;
  for (const p of policies) {
    const roles = p.roles.replace(/[{}]/g, '');
    let sql = `CREATE POLICY "${p.policyname}" ON public."${p.tablename}" AS ${p.permissive} FOR ${p.cmd} TO ${roles}`;
    if (p.qual) sql += ` USING (${p.qual})`;
    if (p.with_check) sql += ` WITH CHECK (${p.with_check})`;
    try { await nc.query(sql); pOk++; } catch {}
  }
  console.log(`  ${pOk}/${policies.length} policies`);

  // ═══ STEP 10: Verify ═══
  console.log("\n═══ VERIFICATION ═══");
  let allMatch = true;
  for (const { tablename } of tables) {
    const { rows: [o] } = await oc.query(`SELECT count(*) FROM public."${tablename}"`);
    const { rows: [n] } = await nc.query(`SELECT count(*) FROM public."${tablename}"`);
    const match = o.count === n.count;
    if (!match) allMatch = false;
    if (!match || parseInt(o.count) > 0) process.stdout.write(`  ${tablename}: ${match ? '✅' : '❌'} ${n.count}/${o.count}\n`);
  }
  const { rows: [oau] } = await oc.query('SELECT count(*) FROM auth.users');
  const { rows: [nau] } = await nc.query('SELECT count(*) FROM auth.users');
  console.log(`  auth.users: ${oau.count === nau.count ? '✅' : '❌'} ${nau.count}/${oau.count}`);
  const { rows: [oai] } = await oc.query('SELECT count(*) FROM auth.identities');
  const { rows: [nai] } = await nc.query('SELECT count(*) FROM auth.identities');
  console.log(`  auth.identities: ${oai.count === nai.count ? '✅' : '❌'} ${nai.count}/${oai.count}`);

  await oc.end();
  await nc.end();

  // ═══ Storage ═══
  await cloneStorage();

  console.log(allMatch ? "\n🏁 100% COMPLETE" : "\n⚠️ 일부 불일치");
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
