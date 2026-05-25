-- 닉네임 ↔ 아티스트명 양방향 자동 동기화
--
-- 정책:
--   1) profiles.nickname 과 artists.title 은 항상 동일해야 한다.
--   2) 어느 한쪽이 update 되면 다른 쪽도 자동으로 update 된다.
--   3) 아티스트명 우선: 이미 artist.title 이 비어있지 않다면 그 값이 정답.
--   4) 무한 트리거 루프 방지: 값이 이미 같으면 update 하지 않는다.

-- Phase A: 초기 sync (아티스트명 우선)
-- artist.title 이 있는 사용자의 profile.nickname 을 artist.title 로 덮어쓴다.
UPDATE public.profiles p
SET nickname = a.title
FROM public.artists a
WHERE a.user_id = p.id
  AND a.title IS NOT NULL
  AND length(trim(a.title)) > 0
  AND (p.nickname IS NULL OR p.nickname IS DISTINCT FROM a.title);

-- Phase B: 트리거 함수 정의
-- profiles.nickname 변경 → artists.title 동기화
CREATE OR REPLACE FUNCTION public.sync_nickname_to_artist_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.nickname IS NOT NULL AND length(trim(NEW.nickname)) > 0 THEN
        UPDATE public.artists
        SET title = NEW.nickname
        WHERE user_id = NEW.id
          AND title IS DISTINCT FROM NEW.nickname;
    END IF;
    RETURN NEW;
END;
$$;

-- artists.title 변경 → profiles.nickname 동기화
CREATE OR REPLACE FUNCTION public.sync_artist_title_to_nickname()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.title IS NOT NULL AND length(trim(NEW.title)) > 0 AND NEW.user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET nickname = NEW.title
        WHERE id = NEW.user_id
          AND nickname IS DISTINCT FROM NEW.title;
    END IF;
    RETURN NEW;
END;
$$;

-- Phase C: 트리거 부착 (UPDATE OF 컬럼만 발화 → 다른 컬럼 update 영향 없음)
DROP TRIGGER IF EXISTS trg_sync_nickname_to_artist ON public.profiles;
CREATE TRIGGER trg_sync_nickname_to_artist
AFTER UPDATE OF nickname ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_nickname_to_artist_title();

DROP TRIGGER IF EXISTS trg_sync_artist_title_to_nickname ON public.artists;
CREATE TRIGGER trg_sync_artist_title_to_nickname
AFTER UPDATE OF title ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.sync_artist_title_to_nickname();

COMMENT ON FUNCTION public.sync_nickname_to_artist_title() IS
'profiles.nickname → artists.title 자동 동기화 (값 다를 때만 update — 무한루프 방지).';
COMMENT ON FUNCTION public.sync_artist_title_to_nickname() IS
'artists.title → profiles.nickname 자동 동기화 (값 다를 때만 update — 무한루프 방지).';
