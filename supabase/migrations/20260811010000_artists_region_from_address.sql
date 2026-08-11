-- artists.region_id 를 주소에서 강제 도출 — '지역 위장' 차단 + 주소/지역 불일치 영구 방지.
--
-- 배경: 샵 수정(본인)은 브라우저가 artists 를 직접 update 한다(RLS 는 컬럼을 제한하지 않음).
--       그래서 주소는 '전남 목포시' 로 두고 region_id 만 '서울 강남구' 로 저장하는 것이 가능했다.
--       API 라우트에서만 막으면 콘솔에서 직접 update 하는 경로가 남으므로, 모든 경로가 지나는
--       DB 트리거 한 곳에서 강제한다(등록 API/샵 수정/관리자/직접 쿼리 전부 동일 규칙).
--
-- 규칙(앱의 addressToRegionKey 와 동일):
--   · 시도는 축약형으로 정규화("경기도"→"경기", "강원특별자치도"→"강원")
--   · 일반구가 있는 시는 "시 구"("경기 용인시 수지구"), 그 외는 "시도 시군구"
--   · 세종은 시군구가 없으므로 "세종 세종시" 고정
--   · 구 단위 이름이 없으면 시 단위로 한 번 더 찾는다(행정구역 개편 안전망)
-- 주소에서 지역을 못 찾으면 넘어온 region_id 를 그대로 둔다 — 정상 등록/수정을 막지 않는다.

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
  if new.address is null or btrim(new.address) = '' then
    return new;
  end if;

  parts := regexp_split_to_array(btrim(new.address), '\s+');
  if array_length(parts, 1) < 2 then
    return new;
  end if;

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
    new.region_id := coalesce(rid, new.region_id);
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

  new.region_id := coalesce(rid, new.region_id);
  return new;
end;
$$;

-- security definer 는 regions 조회 보장을 위한 것이고 사용자가 직접 호출할 이유는 없다.
-- create function 이 PUBLIC 에 EXECUTE 를 기본 부여하므로 회수한다(트리거 실행에는 영향 없음).
revoke execute on function public.artists_region_from_address() from public, anon, authenticated;

drop trigger if exists artists_region_from_address_trg on public.artists;

create trigger artists_region_from_address_trg
before insert or update of address, region_id on public.artists
for each row
execute function public.artists_region_from_address();
