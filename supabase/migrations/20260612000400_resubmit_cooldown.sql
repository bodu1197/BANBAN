-- 반려 후 재신청 24h 쿨다운 (P3) — prevent_artist_self_approve 트리거 함수에 통합.
-- 무제한 재신청이되 24시간에 1회. ArtistEditClient 가 직접 RLS update(서버 API 미경유)로 재신청하므로
-- 클라 검증만으론 우회 가능 → DB 트리거가 resubmitted_at 을 자동 기록하고 쿨다운을 강제한다.
-- (000100 의 자가승인 차단 로직 + 재신청 쿨다운을 한 함수에 통합)
CREATE OR REPLACE FUNCTION public.prevent_artist_self_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- service_role(서버 API): auth context 없음 → 통과
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 관리자: 승인/반려 권한 있음 → 통과
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN NEW;
  END IF;

  -- 일반 사용자(본인 샵) 자가 승인 차단
  IF TG_OP = 'INSERT' THEN
    IF NEW.approved_at IS NOT NULL OR NEW.status = 'active' THEN
      RAISE EXCEPTION '샵은 관리자 승인 후 활성화됩니다' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: 승인 시각 본인 변경 금지
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION '승인 상태는 관리자만 변경할 수 있습니다' USING ERRCODE = '42501';
  END IF;

  -- 미승인(approved_at NULL)에서 status=active 자가 설정 금지 (dormant 재활성화는 approved_at NOT NULL 이라 통과)
  IF NEW.status = 'active' AND NEW.approved_at IS NULL THEN
    RAISE EXCEPTION '샵은 관리자 승인 후 활성화됩니다' USING ERRCODE = '42501';
  END IF;

  -- 재신청(rejected → pending): 24h 쿨다운 강제 + resubmitted_at 자동 기록(클라 우회 불가)
  IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
    IF OLD.resubmitted_at IS NOT NULL AND now() - OLD.resubmitted_at < interval '24 hours' THEN
      RAISE EXCEPTION '재신청은 24시간에 한 번만 가능합니다. 잠시 후 다시 시도해 주세요.';
    END IF;
    NEW.resubmitted_at := now();
  END IF;

  RETURN NEW;
END;
$$;
