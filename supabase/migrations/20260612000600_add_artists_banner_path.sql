-- 대표 배너 1장 강제 (P6). artists.banner_path = 단일 배너(1020x340) storage 경로.
-- 배너 1장 강제를 컬럼 1개로 구조적으로 보장(profile_image_path 와 동형).
-- artist_media 는 샵 갤러리(type='image', 0~10장) 전용으로 분리.
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS banner_path text;
COMMENT ON COLUMN public.artists.banner_path IS '대표 배너 1장(1020x340) storage 경로. artist_media 는 갤러리(0~10장) 전용.';
