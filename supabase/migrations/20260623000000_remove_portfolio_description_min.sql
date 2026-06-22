-- 포트폴리오 작품 설명 '글자수 최소 길이' 제한 완전 제거 (입점자 요청: "글자수 제한 자체를 없애라").
-- 추이: 200 → 50[20260620000000] → 길이 최소 제한 없음. 이제 1자짜리 설명도 등록 가능.
-- 단, 작품 설명은 제목과 동일하게 '빈 값'은 거부한다(필수 입력 — 길이 제한이 아니라 presence 검증).
--   클라이언트도 동기화: MIN_DESCRIPTION_LEN 상수·카운터 UI 제거 + validatePortfolioForm 의
--   빈 값 검증만 유지 (portfolio-form-fields.tsx, portfolio-submit.ts, index.ts).
-- 직전 정의: migration 20260620000000_lower_portfolio_description_min (< 50).
-- INSERT 전용 — 기존 행/편집(UPDATE)은 무손상.
create or replace function public.enforce_portfolio_create_rules()
returns trigger
language plpgsql
set search_path = public  -- Supabase linter 0011(function_search_path_mutable) 준수
as $$
begin
  if coalesce(trim(new.title), '') = '' then
    raise exception 'PORTFOLIO_TITLE_REQUIRED' using errcode = 'check_violation';
  end if;
  -- 작품 설명: 글자수 최소 길이 강제 없음. 단 빈 값(공백 only 포함)은 제목과 동일하게 거부.
  if coalesce(trim(new.description), '') = '' then
    raise exception 'PORTFOLIO_DESCRIPTION_REQUIRED' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 트리거(trg_enforce_portfolio_create_rules)는 마이그레이션 20260613000100 에서 이미 생성됨.
-- 함수를 '이름'으로 참조하므로 위 create or replace 로 본문만 교체하면 새 규칙(길이 무제한+빈 값 거부)이
-- 즉시 적용된다. 트리거 재선언(drop+create)은 불필요한 ACCESS EXCLUSIVE 락만 추가되므로 생략.
