-- 신규 샵 등록 기본값을 pending 으로 (P0 — ⚠️ P1 라우트 배포와 함께 적용할 것)
-- P1 의 artist-register 라우트가 status='pending' / approved_at=null 을 명시 설정하므로,
-- 이 DEFAULT 변경은 직접 INSERT(클라이언트 RLS 경로)에 대한 방어선 역할.
-- 기존 active/dormant 데이터에는 영향 없음(DEFAULT 는 신규 INSERT 에만 적용).
--
-- 적용 타이밍 주의: 구(舊) 라우트(approved_at=now() 설정)가 살아있는 동안 이 DEFAULT 만 바꾸면
--   status=pending + approved_at=now() 의 half-state 가 생길 수 있어, 반드시 P1 라우트 배포와 동시 적용.
ALTER TABLE public.artists ALTER COLUMN status SET DEFAULT 'pending';
