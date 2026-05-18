-- banners.title 을 nullable 로 변경 — 사용자 요청: 텍스트 입력 없이 이미지만 업로드 가능
ALTER TABLE public.banners ALTER COLUMN title DROP NOT NULL;
