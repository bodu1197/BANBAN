-- 샵갤러리(artist_media) 폐지 이관:
-- 배너 없는 샵의 '첫' 갤러리 이미지(order_index 최소)를 대표 배너(banner_path)로 승격.
-- 다중 갤러리 샵은 첫 장만 배너로(나머지는 폐지). artist_media 행은 보존(레거시) — UI/hero 에서만 미사용 처리.
-- 영향: 배너없음 + 갤러리있음 28개 샵.

update public.artists a
set banner_path = m.storage_path
from (
  select distinct on (artist_id) artist_id, storage_path
  from public.artist_media
  order by artist_id, order_index nulls last, created_at
) m
where a.id = m.artist_id
  and a.banner_path is null
  and a.deleted_at is null;
