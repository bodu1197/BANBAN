-- ============================================================
-- P7 문신사 공부방 흡수 — Supabase 스키마 (반언니)
-- nunsinpass(문신패스) 학습 진도를 localStorage → Supabase 로 이관.
-- 모든 write 는 createAdminClient(RLS 우회) + Server Action 전담.
-- RLS 는 SELECT(본인)만 개방, INSERT/UPDATE/DELETE 정책 없음(클라 직접 쓰기 차단).
-- 게이트 결정(LOCKED): 승인=영구 무제한 / pending=7일 체험 / else=잠금.
--   → '시험 합격' 종료조건 없음 ⇒ exam_passed_at 컬럼 불필요.
-- 콘텐츠: 문신사 국가시험 그대로 ⇒ subject = hygiene/anatomy/ink_material/law 유지.
-- ============================================================

-- ── 1) study_user_answers : 진도 진실원천 (munshinpass:progress:v1 이관) ──
-- AnswerRecord {questionId, subject, correct, at} ↔ 1행. 같은 문제 여러 번 = 이력형 다건(append-only).
-- computeStats/SRS/능력추정이 AnswerRecord[] 시간순 재생에 의존 → 이력 보존 필수.
create table if not exists public.study_user_answers (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  question_id text        not null,
  subject     text        not null,
  is_correct  boolean     not null,
  solved_at   timestamptz not null default now(),
  source      text        not null default 'quiz',  -- quiz|test|review|mock
  created_at  timestamptz not null default now()
);
create index if not exists study_answers_user_solved_idx on public.study_user_answers (user_id, solved_at desc);
create index if not exists study_answers_user_q_idx      on public.study_user_answers (user_id, question_id, solved_at);
create index if not exists study_answers_user_subj_idx   on public.study_user_answers (user_id, subject);
-- 더블클릭/재시도 중복은 Server Action(recordStudyAnswer)에서 직전 동일 답안 디바운스로 처리.
-- (date_trunc(timestamptz)는 IMMUTABLE 아니라 unique index 불가. 이력형 다건은 의도된 설계.)
alter table public.study_user_answers enable row level security;
drop policy if exists "study_answers_select_own" on public.study_user_answers;
create policy "study_answers_select_own" on public.study_user_answers
  for select using (auth.uid() = user_id);

-- ── 2) study_user_bookmarks : 북마크 (munshinpass:bookmarks:v1, 최신앞) ──
create table if not exists public.study_user_bookmarks (
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  question_id text        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index if not exists study_bookmarks_user_idx on public.study_user_bookmarks (user_id, created_at desc);
alter table public.study_user_bookmarks enable row level security;
drop policy if exists "study_bookmarks_select_own" on public.study_user_bookmarks;
create policy "study_bookmarks_select_own" on public.study_user_bookmarks
  for select using (auth.uid() = user_id);

-- ── 3) study_exam_sessions : 모의고사 회차 이력 (munshinpass:exam:v1) ──
create table if not exists public.study_exam_sessions (
  id                bigint generated always as identity primary key,
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  session_no        int         not null,
  score             int         not null,
  total             int         not null,
  target_difficulty real        not null,
  ability_before    real        not null,
  ability_after     real        not null,
  question_ids      jsonb       not null default '[]'::jsonb,  -- 스페이싱(lastIds)용
  created_at        timestamptz not null default now()
);
create index if not exists study_sessions_user_idx on public.study_exam_sessions (user_id, session_no desc);
alter table public.study_exam_sessions enable row level security;
drop policy if exists "study_sessions_select_own" on public.study_exam_sessions;
create policy "study_sessions_select_own" on public.study_exam_sessions
  for select using (auth.uid() = user_id);

-- ── 4) study_checklist_progress : 실기 체크리스트 (munshinpass:checklist:v1) ──
create table if not exists public.study_checklist_progress (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  item_key   text        not null,           -- '{group.key}-{index}'
  checked    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.study_checklist_progress enable row level security;
drop policy if exists "study_checklist_select_own" on public.study_checklist_progress;
create policy "study_checklist_select_own" on public.study_checklist_progress
  for select using (auth.uid() = user_id);

-- ── 5) study_user_settings : 일일목표/온보딩/체험시작 (1행/유저) ──
-- trial_started_at = pending 사용자가 공부방 최초 접근 시 1회 set(이후 불변). 만료 = +7일.
create table if not exists public.study_user_settings (
  user_id          uuid        primary key references public.profiles (id) on delete cascade,
  daily_goal       int         not null default 20,
  onboarded        boolean     not null default false,
  trial_started_at timestamptz,
  updated_at       timestamptz not null default now()
);
alter table public.study_user_settings enable row level security;
drop policy if exists "study_settings_select_own" on public.study_user_settings;
create policy "study_settings_select_own" on public.study_user_settings
  for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';
