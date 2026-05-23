# Transformers

DB row (`snake_case`) ↔ UI 모델 (`camelCase`) 변환 레이어.

- 도메인 모델 누수 차단: Supabase generated types 가 컴포넌트 prop 까지 그대로 노출되지 않도록 격리.
- 컴포넌트는 transformer 결과만 받는다 → DB 스키마 변경 시 transformer 만 수정하면 됨.

## 파일 구조

- `artist.ts` — Artist row → UI Artist
- `portfolio.ts` — Portfolio row → UI Portfolio
- `event.ts` — Event row → UI Event
- `media.ts` — portfolio_media / event_media → MediaImage

## 사용 패턴

```ts
// API route / lib/supabase 쿼리에서
const { data } = await supabase.from("artists").select(ARTIST_FULL).eq("id", id).single();
return transformArtistForUI(data);

// 컴포넌트는 UI 타입만 받는다
function ArtistCard({ artist }: { artist: ArtistUI }) { ... }
```
