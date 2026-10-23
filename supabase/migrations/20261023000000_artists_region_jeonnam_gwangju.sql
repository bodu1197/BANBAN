-- 2026-07-01 광주광역시+전라남도 → 전남광주통합특별시. 다음 주소검색이 이 이름을 그대로 내려주는데
-- 시도 표에 없어 지역 매칭이 실패했다(폼·등록 API 는 "지역을 찾지 못했습니다"로 저장을 막고,
-- 그 밖의 경로로 저장되면 이 트리거가 region_id 를 NULL 로 만들었다).
-- regions 는 광주/전남 그대로 두고(지역 필터·페이지 유지) 통합시 주소는 '광주 X'/'전남 X' 중 있는 쪽에 붙인다.
-- 함께: 주소 앞뒤 공백을 종류(탭·줄바꿈)와 상관없이 무시한다 — 앱의 trim()/split(/\s+/) 과 맞춘다.
--   (전엔 btrim 이 스페이스만 지워, 탭으로 시작하는 주소는 앱은 통과·트리거는 NULL 이었다.)
-- 시도 표와 '시 구' 처리는 20260811010000_artists_region_from_address.sql 그대로다.

create or replace function public.artists_region_from_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parts   text[];
  sido    text;
  city    text;
  rid     uuid;
begin
  -- 주소가 없거나 시도+시군구 형태가 아니면 지역을 알 수 없다 → NULL(넘어온 값을 살려두지 않는다).
  parts := array_remove(regexp_split_to_array(coalesce(new.address, ''), '\s+'), '');
  if coalesce(array_length(parts, 1), 0) < 2 then
    new.region_id := null;
    return new;
  end if;

  -- 통합시의 옛 광주 구와 전남 시·군은 이름이 겹치지 않는다 → regions 에 있는 쪽으로 붙인다.
  -- 구 목록을 여기 두지 않는다: 앱(src/lib/regions.ts)의 목록과 어긋나도 저장 때 지역이 조용히 NULL 이 되지 않게.
  if parts[1] = '전남광주통합특별시' then
    select id into rid from public.regions where name in ('광주 ' || parts[2], '전남 ' || parts[2]);
    new.region_id := rid;
    return new;
  end if;

  -- 여기부터 앱 src/lib/regions.ts 의 addressToRegionKey(ADDRESS_SIDO_MAP·세종 고정·시+구)와 같은 규칙 — 바꿀 땐 둘 다.
  sido := case parts[1]
    when '서울특별시' then '서울' when '부산광역시' then '부산'
    when '대구광역시' then '대구' when '인천광역시' then '인천'
    when '광주광역시' then '광주' when '대전광역시' then '대전'
    when '울산광역시' then '울산' when '세종특별자치시' then '세종'
    when '경기도' then '경기' when '강원특별자치도' then '강원' when '강원도' then '강원'
    when '충청북도' then '충북' when '충청남도' then '충남'
    when '전북특별자치도' then '전북' when '전라북도' then '전북' when '전라남도' then '전남'
    when '경상북도' then '경북' when '경상남도' then '경남' when '제주특별자치도' then '제주'
    else parts[1]
  end;

  if sido = '세종' then
    select id into rid from public.regions where name = '세종 세종시';
    new.region_id := rid;
    return new;
  end if;

  city := parts[2];

  -- "…시 …구" 형태면 구까지 포함한 이름을 먼저 찾는다.
  if array_length(parts, 1) > 2 and city like '%시' and parts[3] like '%구' then
    select id into rid from public.regions where name = sido || ' ' || city || ' ' || parts[3];
  end if;

  if rid is null then
    select id into rid from public.regions where name = sido || ' ' || city;
  end if;

  new.region_id := rid;
  return new;
end;
$$;

revoke execute on function public.artists_region_from_address() from public, anon, authenticated;

-- 지역이 빈 샵을 새 규칙으로 다시 계산한다 — region_id 를 SET 에 올리면 트리거(update of region_id)가 주소에서 다시 채운다.
-- 트리거(2026-08) 도입 전에 저장돼 지역이 비어 있던 샵도 함께 채워진다(그 행의 updated_at 도 적용 시각으로 바뀐다).
update public.artists set region_id = null where region_id is null and address ~ '\S';
