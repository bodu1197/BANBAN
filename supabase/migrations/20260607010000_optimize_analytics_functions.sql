-- 성능: analytics RPC 단일 패스화. 결과는 기존과 100% 동일, 스캔 횟수만 감소.
-- 근본원인: page_visits(현 12,655행)를 서브쿼리마다 풀 seq scan + user_agent NOT ILIKE
-- '%bot/%spider/%crawl'(선행 와일드카드 → 인덱스 불가)를 매 스캔 반복. analytics_period_counts 는
-- 4회, analytics_hourly 는 2회 스캔. EXPLAIN 실측 period_counts(daily)=224ms (12K행인데도 느림).
-- 조치: count(*) FILTER(...) 조건집계로 단일 패스(4→1) / 공유 CTE MATERIALIZED(2→1).

-- analytics_period_counts: 4개 상관 서브쿼리 → page_visits 단일 스캔 + FILTER 조건집계.
CREATE OR REPLACE FUNCTION public.analytics_period_counts(p_period text DEFAULT 'hourly'::text)
 RETURNS TABLE(period_pv bigint, period_uv bigint, total_pv bigint, total_uv bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    count(*) FILTER (WHERE pv.created_at >= ps.period_start)::bigint AS period_pv,
    count(DISTINCT pv.visitor_id) FILTER (WHERE pv.created_at >= ps.period_start AND pv.visitor_id IS NOT NULL)::bigint AS period_uv,
    count(*)::bigint AS total_pv,
    count(DISTINCT pv.visitor_id) FILTER (WHERE pv.visitor_id IS NOT NULL)::bigint AS total_uv
  FROM public.page_visits pv
  CROSS JOIN LATERAL (
    SELECT CASE p_period
      WHEN 'hourly'  THEN date_trunc('day',   now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
      WHEN 'daily'   THEN date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
      WHEN 'monthly' THEN date_trunc('year',  now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
      ELSE '2000-01-01'::timestamptz
    END AS period_start
  ) ps
  WHERE pv.country = 'KR'
    AND pv.user_agent NOT ILIKE '%bot%'
    AND pv.user_agent NOT ILIKE '%spider%'
    AND pv.user_agent NOT ILIKE '%crawl%';
$function$;

-- analytics_hourly: page_visits 를 두 CTE 가 각각 스캔 → 공유 visits CTE(MATERIALIZED)로 1회 스캔.
-- first_hour 계산식은 원본과 동일(min(created_at AT TIME ZONE 'Asia/Seoul')).
CREATE OR REPLACE FUNCTION public.analytics_hourly()
 RETURNS TABLE(hour text, count bigint, uv bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH today_start AS (
    SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' AS ts
  ),
  hours AS (
    SELECT lpad(h::text, 2, '0') || ':00' AS hour FROM generate_series(0, 23) AS h
  ),
  visits AS MATERIALIZED (
    SELECT pv.visitor_id, pv.created_at,
           to_char(pv.created_at AT TIME ZONE 'Asia/Seoul', 'HH24:00') AS hour
    FROM public.page_visits pv, today_start
    WHERE pv.created_at >= today_start.ts AND pv.visitor_id IS NOT NULL
      AND pv.country = 'KR'
      AND pv.user_agent NOT ILIKE '%bot%' AND pv.user_agent NOT ILIKE '%spider%' AND pv.user_agent NOT ILIKE '%crawl%'
  ),
  pv_counts AS (
    SELECT hour, count(*)::bigint AS count FROM visits GROUP BY hour
  ),
  first_visits AS (
    SELECT visitor_id, to_char(min(created_at AT TIME ZONE 'Asia/Seoul'), 'HH24:00') AS first_hour
    FROM visits GROUP BY visitor_id
  ),
  uv_counts AS (
    SELECT first_hour AS hour, count(*)::bigint AS uv FROM first_visits GROUP BY first_hour
  )
  SELECT h.hour, COALESCE(p.count, 0)::bigint AS count, COALESCE(u.uv, 0)::bigint AS uv
  FROM hours h
  LEFT JOIN pv_counts p ON p.hour = h.hour
  LEFT JOIN uv_counts u ON u.hour = h.hour
  ORDER BY h.hour;
$function$;
