-- 회원 삭제 시 "모든 것을 완벽하게 삭제"하는 구조로 전환.
--
-- 배경: profiles 를 참조하는 9개 FK 가 ON DELETE SET NULL 이었다. 회원(profiles)을 삭제해도
-- 그 회원이 작성한 리뷰/게시글/댓글/견적/채팅이 작성자=null 인 채로 DB 에 남아(찌꺼기) 완전 삭제가 안 됐다.
-- 정책 변경: 회원 삭제 = 그 회원이 만든 콘텐츠(리뷰·게시글·댓글·견적·문의·채팅)까지 모두 연쇄 삭제.
--
-- 9개 FK 를 ON DELETE CASCADE 로 전환한다. (나머지 33개 user/artist FK 는 이미 CASCADE)
-- 멱등(idempotent): DROP CONSTRAINT IF EXISTS 후 재생성.

-- chat_messages.sender_id → profiles
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- chat_rooms.user_id → profiles
ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_user_id_fkey;
ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- comments.user_id → profiles
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- estimate_inquiries.user_id → profiles
ALTER TABLE public.estimate_inquiries DROP CONSTRAINT IF EXISTS estimate_inquiries_user_id_fkey;
ALTER TABLE public.estimate_inquiries
  ADD CONSTRAINT estimate_inquiries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- estimates.user_id → profiles
ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_user_id_fkey;
ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- posts.user_id → profiles
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reports.reporter_id → profiles
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- review_comments.user_id → profiles
ALTER TABLE public.review_comments DROP CONSTRAINT IF EXISTS review_comments_user_id_fkey;
ALTER TABLE public.review_comments
  ADD CONSTRAINT review_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reviews.user_id → profiles
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- CASCADE 삭제는 자식 테이블의 FK 컬럼으로 조회하므로 인덱스가 없으면 풀스캔(대량 회원 삭제 시 타임아웃 위험).
-- 나머지 8개 컬럼은 이미 인덱스가 있고, review_comments.user_id 만 누락되어 있어 추가한다.
CREATE INDEX IF NOT EXISTS idx_review_comments_user_id ON public.review_comments (user_id);
