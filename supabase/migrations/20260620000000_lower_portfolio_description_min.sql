-- 포트폴리오 작품 설명 최소 글자수 200 → 50 하향.
-- 사유: "200자는 너무 많다"는 샵 입점자 항의 다수. 수동 작성 장벽을 낮춤.
-- (AI 자동생성 프롬프트는 200~400자 유지 — 품질/ SEO 목적. 이건 사용자 강제 최소가 아님.)
-- 클라이언트 MIN_DESCRIPTION_LEN(portfolio-form-fields.tsx = 50)과 반드시 동기화.
-- 직전 정의: migration 20260613000100_enforce_portfolio_create_rules (< 200).
-- INSERT 전용 — 기존 행/편집(UPDATE)은 무손상. 제목 비어있지 않음 규칙은 그대로 유지.
create or replace function public.enforce_portfolio_create_rules()
returns trigger
language plpgsql
set search_path = public  -- Supabase linter 0011(function_search_path_mutable) 준수
as $$
begin
  if coalesce(trim(new.title), '') = '' then
    raise exception 'PORTFOLIO_TITLE_REQUIRED' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(new.description, ''))) < 50 then
    raise exception 'PORTFOLIO_DESCRIPTION_MIN_50' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 트리거(trg_enforce_portfolio_create_rules)는 직전 마이그레이션 20260613000100 에서 이미 생성됨.
-- 트리거는 함수를 '이름'으로 참조하므로 위 create or replace 로 본문만 교체하면 새 규칙(< 50)이
-- 즉시 적용된다. 트리거를 재선언(drop+create)하면 불필요한 ACCESS EXCLUSIVE 락만 추가되므로 생략.
