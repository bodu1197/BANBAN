-- 포트폴리오 생성 규칙 서버 강제 (INSERT 전용 — 기존 행/편집[UPDATE]은 무손상)
-- 클라이언트 검증만으론 우회 가능 → DB 트리거로 '의무적' 강제.
-- 규칙: 제목 비어있지 않음 + 작품 설명 200자 이상.
-- (포트폴리오당 사진 1장 서버강제는 편집흐름·기존 다중사진과 얽혀 별도 단계에서 처리)

-- 설명 최소 200자: 클라이언트 MIN_DESCRIPTION_LEN(portfolio-form-fields.tsx)과 반드시 동기화.
create or replace function public.enforce_portfolio_create_rules()
returns trigger
language plpgsql
set search_path = public  -- Supabase linter 0011(function_search_path_mutable) 준수
as $$
begin
  if coalesce(trim(new.title), '') = '' then
    raise exception 'PORTFOLIO_TITLE_REQUIRED' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(new.description, ''))) < 200 then
    raise exception 'PORTFOLIO_DESCRIPTION_MIN_200' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_portfolio_create_rules on public.portfolios;
create trigger trg_enforce_portfolio_create_rules
  before insert on public.portfolios
  for each row
  execute function public.enforce_portfolio_create_rules();
