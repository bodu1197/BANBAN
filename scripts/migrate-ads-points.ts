import { Client } from 'pg';

const connectionString = "postgresql://postgres.bhcascuuecgwlxujtpkx:chl1197dbA%21%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";

async function main() {
    const client = new Client({ connectionString });
    await client.connect();
    console.log("Connected to database.");

    // ─── 1. ad_plans ────────────────────────────────────────
    console.log("\n[1/5] Creating ad_plans...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS ad_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    // Insert default plan
    const { rowCount } = await client.query(`SELECT 1 FROM ad_plans LIMIT 1`);
    if (rowCount === 0) {
        await client.query(`
      INSERT INTO ad_plans (name, price, duration_days)
      VALUES ('프리미엄 광고', 200000, 30);
    `);
        console.log("  → Inserted default plan: 프리미엄 광고 (200,000원/30일)");
    } else {
        console.log("  → Plan already exists, skipping insert.");
    }

    // ─── 2. ad_subscriptions ────────────────────────────────
    console.log("\n[2/5] Creating ad_subscriptions...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS ad_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL REFERENCES artists(id),
      plan_id UUID NOT NULL REFERENCES ad_plans(id),
      status TEXT NOT NULL DEFAULT 'PENDING',
      started_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      price_paid INTEGER NOT NULL DEFAULT 0,
      paid_by_points INTEGER NOT NULL DEFAULT 0,
      paid_by_cash INTEGER NOT NULL DEFAULT 0,
      imp_uid TEXT,
      merchant_uid TEXT UNIQUE,
      impression_count INTEGER NOT NULL DEFAULT 0,
      click_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    // ─── 3. ad_events ──────────────────────────────────────
    console.log("\n[3/5] Creating ad_events...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS ad_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID NOT NULL REFERENCES ad_subscriptions(id),
      event_type TEXT NOT NULL,
      placement TEXT,
      page_path TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    // Index for fast lookups
    await client.query(`
    CREATE INDEX IF NOT EXISTS idx_ad_events_subscription ON ad_events(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at);
  `);

    // ─── 4. point_wallets ──────────────────────────────────
    console.log("\n[4/5] Creating point_wallets...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS point_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
      balance INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    // ─── 5. point_transactions ─────────────────────────────
    console.log("\n[5/5] Creating point_transactions...");
    await client.query(`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID NOT NULL REFERENCES point_wallets(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      expires_at TIMESTAMPTZ,
      expired BOOLEAN NOT NULL DEFAULT false,
      reference_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    await client.query(`
    CREATE INDEX IF NOT EXISTS idx_point_tx_wallet ON point_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_point_tx_expires ON point_transactions(expires_at) WHERE expired = false AND expires_at IS NOT NULL;
  `);

    // ─── RLS Policies ──────────────────────────────────────
    console.log("\n[RLS] Setting up Row Level Security...");

    // ad_plans: everyone can read
    await client.query(`ALTER TABLE ad_plans ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "ad_plans_read" ON ad_plans FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // ad_subscriptions: artist owns their subscriptions
    await client.query(`ALTER TABLE ad_subscriptions ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "ad_subs_artist_read" ON ad_subscriptions FOR SELECT
        USING (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "ad_subs_service_all" ON ad_subscriptions FOR ALL
        USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // ad_events: insert only (service role)
    await client.query(`ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "ad_events_insert" ON ad_events FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "ad_events_read" ON ad_events FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // point_wallets: user owns their wallet
    await client.query(`ALTER TABLE point_wallets ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "wallet_owner" ON point_wallets FOR SELECT
        USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "wallet_service_all" ON point_wallets FOR ALL
        USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // point_transactions: wallet owner can read
    await client.query(`ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "tx_wallet_owner" ON point_transactions FOR SELECT
        USING (wallet_id IN (SELECT id FROM point_wallets WHERE user_id = auth.uid()));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
    await client.query(`
    DO $$ BEGIN
      CREATE POLICY "tx_service_all" ON point_transactions FOR ALL
        USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

    console.log("\n✅ All 5 tables created with RLS policies!");

    // ─── Verify ────────────────────────────────────────────
    const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('ad_plans', 'ad_subscriptions', 'ad_events', 'point_wallets', 'point_transactions')
    ORDER BY table_name;
  `);
    console.log("\nVerification — tables found:");
    tables.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

    await client.end();
}

main().catch(e => { console.error("Migration failed:", e); process.exit(1); });
