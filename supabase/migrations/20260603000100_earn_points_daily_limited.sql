-- H5: 일일 적립 한도 원자화 — checkDailyLimit(count) → earnPointsWithLimit(earn) 의
-- check-then-act 경쟁을 제거. 동일 사용자 지갑 행을 FOR UPDATE 로 잠가 동시 적립을
-- 직렬화하므로 "오늘 건수 count → 한도 미만이면 적립"이 원자적으로 수행된다.
-- service_role(createAdminClient)로 호출. 한도 도달 시 빈 결과(SETOF 0행) 반환.

CREATE OR REPLACE FUNCTION earn_points_daily_limited(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_daily_limit int,
  p_day_start timestamptz,
  p_description text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS SETOF point_transactions
LANGUAGE plpgsql AS $$
DECLARE
  v_wallet_id uuid;
  v_count int;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  -- 지갑 보장 + 행 잠금 (동일 사용자의 동시 적립을 직렬화 → count-then-insert 원자성 확보)
  INSERT INTO point_wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM point_wallets WHERE user_id = p_user_id FOR UPDATE;

  -- 잠금 보유 중이라 직전 커밋들이 모두 반영된 최신 건수
  SELECT count(*) INTO v_count
    FROM point_transactions
   WHERE wallet_id = v_wallet_id
     AND reason = p_reason
     AND type = 'EARN'
     AND created_at >= p_day_start;

  IF v_count >= p_daily_limit THEN
    RETURN; -- 한도 도달 → 0행
  END IF;

  UPDATE point_wallets
     SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
   WHERE id = v_wallet_id;

  RETURN QUERY
    INSERT INTO point_transactions (wallet_id, type, amount, reason, description, expires_at, reference_id)
    VALUES (v_wallet_id, 'EARN', p_amount, p_reason, p_description, p_expires_at, p_reference_id)
    RETURNING *;
END; $$;

-- 일일 한도 count 쿼리(wallet_id + reason + created_at, type='EARN') 가속용 부분 인덱스.
-- 기존 idx_point_tx_wallet(wallet_id) 만으로도 동작하나, 사용자별 EARN 이력 증가 대비.
CREATE INDEX IF NOT EXISTS idx_point_tx_daily_limit
  ON point_transactions (wallet_id, reason, created_at)
  WHERE type = 'EARN';
