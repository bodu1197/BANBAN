-- 광고 통계 단일 진실 소스 = ad_events.
-- 기존 버그: 화면은 ad_subscriptions.impression_count/click_count(0 고정)를 읽는데,
-- 실제 노출 기록은 ad_events 에만 들어가고 카운터 컬럼은 증가되지 않았다.
-- 해결: 구독별 노출/클릭을 ad_events 에서 직접 집계하는 RPC.
-- (idx_ad_events_subscription 인덱스 사용. service_role 로 호출해 RLS 우회.)

CREATE OR REPLACE FUNCTION ad_event_counts(p_subscription_ids uuid[])
RETURNS TABLE(subscription_id uuid, impressions int, clicks int)
LANGUAGE sql STABLE AS $$
  SELECT ae.subscription_id,
         count(*) FILTER (WHERE ae.event_type = 'IMPRESSION')::int AS impressions,
         count(*) FILTER (WHERE ae.event_type = 'CLICK')::int AS clicks
    FROM ad_events ae
   WHERE ae.subscription_id = ANY(p_subscription_ids)
   GROUP BY ae.subscription_id;
$$;
