-- 포인트 정합성: 비원자적 read-modify-write(절대값 할당) → 원자적 RPC 로 교체.
-- 기존 spendPoints/earnPoints 는 JS에서 balance 를 읽고 절대값으로 덮어써 동시요청 시
-- lost-update/더블스펜드/음수잔액 가능. 아래 RPC 는 행 잠금 + 가드된 상대증감으로 원자적.
-- service_role(createAdminClient)로 호출. 반환은 삽입된 point_transactions 행.

-- 차감: 잔액 충분할 때만 원자적으로 차감 + 거래 기록. 부족하면 INSUFFICIENT_POINTS 예외.
CREATE OR REPLACE FUNCTION spend_points(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_description text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS SETOF point_transactions
LANGUAGE plpgsql AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance int;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  -- 지갑 보장 + 행 잠금
  INSERT INTO point_wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM point_wallets WHERE user_id = p_user_id FOR UPDATE;

  -- 가드된 원자적 차감 (balance >= amount 인 경우에만)
  UPDATE point_wallets
     SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now()
   WHERE id = v_wallet_id AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS';
  END IF;

  RETURN QUERY
    INSERT INTO point_transactions (wallet_id, type, amount, reason, description, reference_id)
    VALUES (v_wallet_id, 'SPEND', -p_amount, p_reason, p_description, p_reference_id)
    RETURNING *;
END; $$;

-- 적립: 원자적 증가 + 거래 기록. 반환은 삽입된 거래 행.
CREATE OR REPLACE FUNCTION earn_points(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_description text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS SETOF point_transactions
LANGUAGE plpgsql AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  INSERT INTO point_wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM point_wallets WHERE user_id = p_user_id FOR UPDATE;

  UPDATE point_wallets
     SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
   WHERE id = v_wallet_id;

  RETURN QUERY
    INSERT INTO point_transactions (wallet_id, type, amount, reason, description, expires_at, reference_id)
    VALUES (v_wallet_id, 'EARN', p_amount, p_reason, p_description, p_expires_at, p_reference_id)
    RETURNING *;
END; $$;
