-- 시술사가 자기 샵을 자가 승인하는 권한상승 차단 (P0)
-- 근거(실측): artists_update RLS 정책에 with_check 가 없어, owner(user_id=auth.uid())가
--   자기 행의 status='active' / approved_at 을 임의 설정 가능 → 관리자 승인 우회.
--   ArtistEditClient.saveArtistUpdatesSelf 가 인증 클라이언트로 직접 update 하므로 실제 악용 가능.
-- prevent_role_self_change(20260527010000) 패턴 복제.
--
-- ⚠️ 재활성화 경로 보존(실측 검증):
--   1) auth/callback: adminClient(service_role) dormant→active → auth.uid() NULL → 통과
--   2) update_artist_portfolio_media_count(DEFINER): 포폴 추가 시 dormant→active.
--      owner uid 로 실행되지만 dormant 샵은 approved_at 이 NOT NULL 이라 아래 조건 모두 통과.
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

  -- 일반 사용자(본인 샵) 자가 승인 차단:
  IF TG_OP = 'INSERT' THEN
    IF NEW.approved_at IS NOT NULL OR NEW.status = 'active' THEN
      RAISE EXCEPTION '샵은 관리자 승인 후 활성화됩니다' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: 승인 시각 본인 변경 금지(부여/철회 모두)
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION '승인 상태는 관리자만 변경할 수 있습니다' USING ERRCODE = '42501';
  END IF;

  -- 미승인(approved_at NULL) 상태에서 status=active 자가 설정 금지.
  -- dormant 재활성화는 approved_at 이 NOT NULL 이므로 이 조건에 걸리지 않음.
  IF NEW.status = 'active' AND NEW.approved_at IS NULL THEN
    RAISE EXCEPTION '샵은 관리자 승인 후 활성화됩니다' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_artist_self_approve ON public.artists;
CREATE TRIGGER trg_prevent_artist_self_approve
  BEFORE INSERT OR UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.prevent_artist_self_approve();
