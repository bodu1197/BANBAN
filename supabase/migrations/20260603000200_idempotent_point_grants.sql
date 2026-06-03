-- H3: 멱등 적립 — 클라이언트가 /api/points/earn 을 반복 호출해도 중복 적립되지 않도록.
-- 지갑 행 FOR UPDATE 잠금으로 동일 사용자 적립을 직렬화한 뒤 "이미 적립됐는가"를 원자적으로
-- 확인(EXISTS)하고, 없을 때만 적립한다. 기존 중복 데이터가 있어도 "추가 적립"만 막으므로 관용적
-- (유니크 인덱스와 달리 마이그레이션이 기존 데이터로 실패하지 않음). 한 번 적립됐으면 0행 반환.

-- (a) wallet+reason 당 1회만 — WELCOME_BONUS 등 사용자당 1회성 보너스.
CREATE OR REPLACE FUNCTION earn_points_once(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_description text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS SETOF point_transactions
LANGUAGE plpgsql AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  INSERT INTO point_wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM point_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM point_transactions
     WHERE wallet_id = v_wallet_id AND reason = p_reason AND type = 'EARN'
  ) THEN
    RETURN; -- 이미 지급됨 → 0행
  END IF;

  UPDATE point_wallets
     SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
   WHERE id = v_wallet_id;

  RETURN QUERY
    INSERT INTO point_transactions (wallet_id, type, amount, reason, description, expires_at)
    VALUES (v_wallet_id, 'EARN', p_amount, p_reason, p_description, p_expires_at)
    RETURNING *;
END; $$;

-- (b) wallet+reason+reference_id 당 1회만 — PORTFOLIO_UPLOAD(reference_id=portfolio_id) 등 이벤트 1회성.
CREATE OR REPLACE FUNCTION earn_points_once_ref(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_reference_id uuid,
  p_description text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS SETOF point_transactions
LANGUAGE plpgsql AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  IF p_reference_id IS NULL THEN RAISE EXCEPTION 'REFERENCE_REQUIRED'; END IF;

  INSERT INTO point_wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM point_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM point_transactions
     WHERE wallet_id = v_wallet_id AND reason = p_reason AND type = 'EARN' AND reference_id = p_reference_id
  ) THEN
    RETURN; -- 해당 reference 에 이미 지급됨 → 0행
  END IF;

  UPDATE point_wallets
     SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
   WHERE id = v_wallet_id;

  RETURN QUERY
    INSERT INTO point_transactions (wallet_id, type, amount, reason, description, expires_at, reference_id)
    VALUES (v_wallet_id, 'EARN', p_amount, p_reason, p_description, p_expires_at, p_reference_id)
    RETURNING *;
END; $$;

-- earn_points_once_ref 의 EXISTS(wallet_id+reason+reference_id, type='EARN') 조회 가속용 부분 인덱스.
CREATE INDEX IF NOT EXISTS idx_point_tx_once_ref
  ON point_transactions (wallet_id, reason, reference_id)
  WHERE type = 'EARN';
