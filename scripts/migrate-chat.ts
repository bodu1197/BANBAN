import { Client } from 'pg';

const connectionString = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";

async function main() {
    const client = new Client({ connectionString });
    await client.connect();
    console.log("Connected.");

    // ─── 1. conversations ──────────────────────────────────
    console.log("\n[1/2] Creating conversations...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_1 UUID NOT NULL REFERENCES profiles(id),
      participant_2 UUID NOT NULL REFERENCES profiles(id),
      last_message TEXT,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (participant_1, participant_2)
    );
  `);

    await client.query(`
    CREATE INDEX IF NOT EXISTS idx_conv_p1 ON conversations(participant_1);
    CREATE INDEX IF NOT EXISTS idx_conv_p2 ON conversations(participant_2);
    CREATE INDEX IF NOT EXISTS idx_conv_last ON conversations(last_message_at DESC NULLS LAST);
  `);

    // ─── 2. messages ──────────────────────────────────────
    console.log("[2/2] Creating messages...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES profiles(id),
      content TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    await client.query(`
    CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_msg_sender ON messages(sender_id);
  `);

    // ─── RLS ───────────────────────────────────────────────
    console.log("\n[RLS] Setting up policies...");

    // conversations: participants can read
    await client.query(`ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "conv_participants" ON conversations FOR SELECT
        USING (participant_1 = auth.uid() OR participant_2 = auth.uid());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "conv_insert" ON conversations FOR INSERT
        WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "conv_update" ON conversations FOR UPDATE
        USING (participant_1 = auth.uid() OR participant_2 = auth.uid());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // messages: conversation participants can read/insert
    await client.query(`ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "msg_read" ON messages FOR SELECT
        USING (conversation_id IN (
          SELECT id FROM conversations WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        ));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "msg_insert" ON messages FOR INSERT
        WITH CHECK (sender_id = auth.uid() AND conversation_id IN (
          SELECT id FROM conversations WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        ));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "msg_update" ON messages FOR UPDATE
        USING (conversation_id IN (
          SELECT id FROM conversations WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        ));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // Enable realtime
    console.log("\n[Realtime] Enabling...");
    await client.query(`
    DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    console.log("\n✅ Chat tables created with RLS + Realtime!");

    // Verify
    const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages')
    ORDER BY table_name;
  `);
    tables.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

    await client.end();
}

main().catch(e => { console.error("Migration failed:", e); process.exit(1); });
