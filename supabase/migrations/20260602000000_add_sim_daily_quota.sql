-- AI 뷰티 시뮬레이션: 영역(눈썹/입술)별 일일 사용 횟수 제한
-- 비로그인(쿠키 UUID)·로그인(user:<id>) 공통. 리셋 기준은 KST(Asia/Seoul) 자정 0시.

CREATE TABLE IF NOT EXISTS sim_daily_quota (
  identity    text NOT NULL,
  area        text NOT NULL CHECK (area IN ('eyebrow', 'lip')),
  used_date   date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  count       int  NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (identity, used_date, area)
);

CREATE INDEX IF NOT EXISTS idx_sim_daily_quota_used_date ON sim_daily_quota (used_date);

-- RLS 활성화 + 정책 없음 = 기본 거부. 접근은 오직 service_role(createAdminClient)뿐이며
-- RLS 를 우회하므로 RPC 에 SECURITY DEFINER 불필요. sim_usage_logs 와 동일한 패턴.
ALTER TABLE sim_daily_quota ENABLE ROW LEVEL SECURITY;

-- 차감/커밋(원자적): 결과를 완전히 얻은 후 호출. 충돌 시 DO UPDATE 로 행 잠금 확보 후 한도 검사.
-- 원자적 검사+증가라 사전확인-커밋 사이의 경쟁에도 한도(p_limit)를 절대 초과하지 않는다.
CREATE OR REPLACE FUNCTION consume_sim_quota(p_identity text, p_area text, p_limit int)
RETURNS TABLE(allowed boolean, used int, quota_limit int)
LANGUAGE plpgsql AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_count int;
BEGIN
  -- 신규/기존 모두 행 잠금 + 현재값 확보
  INSERT INTO sim_daily_quota (identity, area, used_date, count)
  VALUES (p_identity, p_area, v_today, 0)
  ON CONFLICT (identity, used_date, area) DO UPDATE SET updated_at = now()
  RETURNING count INTO v_count;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, v_count, p_limit;
    RETURN;
  END IF;

  UPDATE sim_daily_quota SET count = count + 1, updated_at = now()
   WHERE identity = p_identity AND used_date = v_today AND area = p_area
  RETURNING count INTO v_count;

  RETURN QUERY SELECT true, v_count, p_limit;
END; $$;

-- 조회(미차감): 오늘 영역별 사용량 → 잔여 계산 + 파이프라인 시작 전 사전 확인용
CREATE OR REPLACE FUNCTION get_sim_quota(p_identity text)
RETURNS TABLE(area text, used int)
LANGUAGE sql AS $$
  SELECT sim_daily_quota.area, sim_daily_quota.count
    FROM sim_daily_quota
   WHERE identity = p_identity
     AND used_date = (now() AT TIME ZONE 'Asia/Seoul')::date;
$$;
