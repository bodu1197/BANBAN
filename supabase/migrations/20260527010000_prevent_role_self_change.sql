-- profiles.role 자가 변경 차단 트리거
-- 일반 사용자는 본인 profile 의 다른 필드(nickname, contact 등)는 수정할 수 있지만
-- role 은 변경 불가. service_role (auth.uid() IS NULL) 또는 관리자(is_admin)만 변경 가능.
-- 모든 role 변경은 /api/profiles/promote-to-artist 또는 /api/profiles/set-initial-role 경유.

CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role: auth context 없음 → 통과 (서버 API 만 통과)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 관리자: role 변경 허용
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RETURN NEW;
  END IF;

  -- 일반 사용자: role 변경 차단 (다른 필드 수정은 허용)
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'role 변경 권한이 없습니다' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;

CREATE TRIGGER profiles_prevent_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_change();
