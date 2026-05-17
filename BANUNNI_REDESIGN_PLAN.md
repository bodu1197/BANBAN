# 반언니 리디자인 설계서 (바비톡 벤치마킹)

> 작성: 2026-05-18 | 벤치마킹 대상: https://web.babitalk.com/
> 목적: PC 컨테이너 폭 통일 + 홈/주요 페이지 레이아웃·디자인 토큰을 바비톡 패턴으로 정렬

---

## 0. 분석 요약 (바비톡 PC 1440px 측정)

| 항목 | 측정값 | 비고 |
|---|---|---|
| 브라우저 viewport | 1440px (테스트 기준) | 16:10 대다수 PC |
| **콘텐츠 컨테이너 폭** | **1024px** | 양쪽 자동 여백 ≈ 208px |
| 컨테이너 좌우 패딩 | 16px (`px-4`) | desktop |
| 헤더 높이 | 72px (desktop) / 56px (mobile) | sticky top-0 |
| 카테고리 그리드 | 2단 (각 컬럼 동등 분할) | 4×2 = 8개 아이콘 |
| 이벤트 카드 그리드 | 4열 (desktop) | gap ≈ 16px |

스크린샷 자산: `babitalk-top.png`, `babitalk-scroll1.png`, `babitalk-scroll2.png`, `babitalk-fullpage.png`

---

## 1. 디자인 토큰

### 1-A. 컨테이너 시스템

```
.container = max-w-[1024px] mx-auto px-4
모바일: 좌우 16px 패딩만, 전체 폭
태블릿 (md ≥ 768px): 좌우 24px, 전체 폭
데스크탑 (lg ≥ 1024px): 1024px 컨테이너, 양쪽 자동 마진
```

Tailwind 컴포넌트 클래스 제안:
```css
@layer components {
  .layout-container { @apply mx-auto w-full max-w-[1024px] px-4 md:px-6; }
}
```

### 1-B. 컬러 (반언니 브랜드 유지 + 보조 매핑)

| 의미 | 바비톡 값 | 반언니 매핑 (제안) |
|---|---|---|
| Primary CTA | `#7264FF` (보라) | **brand-primary (기존 핑크 유지)** |
| Primary CTA hover | 어두운 보라 | brand-primary-hover |
| 검색바 테두리 | 보라 라이트 | brand-primary/40 |
| 카드 outline | `outline-thumbnail` (라이트 그레이) | border/10 또는 zinc-200 |
| 카드 배경 | `#FFF` | background |
| pill 태그 배경 | 라이트 그레이 | muted |

→ **반언니 핑크 브랜드는 유지**. 바비톡의 보라 위치만 핑크로 치환.

### 1-C. 타이포그래피

- 폰트: **Pretendard Variable** (이미 반언니가 동일하면 OK, 아니면 추가)
- 본문: 14~15px / line-height 1.5
- H2 (섹션 헤더): 18~20px bold
- H3 (카드 제목): 14~16px medium
- 가격 강조: 18~20px bold + 할인% 컬러 강조

### 1-D. Radius (라운드)

| 사용처 | 값 |
|---|---|
| 작은 버튼 / 인풋 | 8px |
| 카드 (썸네일·아이템) | 16px |
| 큰 카드 / 모달 / 캐러셀 | 24~32px |
| pill / chip / 검색바 / 카테고리 원형 | 200px (= rounded-full) |

### 1-E. Spacing

- 섹션 간 vertical gap: 32~48px (`gap-y-8` ~ `gap-y-12`)
- 카드 내부 padding: 12~16px
- 카드 그리드 gap: 16px (`gap-4`)

### 1-F. Shadow

- 그림자 최소화. 카드는 outline (`border border-zinc-200`) 위주
- hover 시에만 미세 그림자 `hover:shadow-sm`

---

## 2. 페이지 레이아웃

### 2-A. 홈 페이지 (`/`)

위에서 아래로 — 바비톡 구조에 반언니 도메인 매핑:

| # | 섹션 | 바비톡 원본 | 반언니 적용 |
|---|---|---|---|
| 1 | **헤더** | 로고 + 메뉴 + 로그인 CTA | 좌 반언니 로고 / 중 메뉴 (홈·아티스트·기획전·커뮤니티·뷰티탭) / 우 핑크 "로그인" |
| 2 | **검색바** | 회전 placeholder + 돋보기 | 활동명·시술 키워드 검색, placeholder 회전 |
| 3 | **인기 검색 태그** | 가로 pill 스크롤 | "눈썹/입술/아이라인/리터치/..." pill |
| 4 | **메인 캐러셀** | 큰 컬러 배경 + 모델 + 카피 | 기획전 + 시즌 할인 (3~5장) |
| 5 | **카테고리 그리드 2단** | 좌 성형 / 우 쁘띠·피부 (각 4×2) | 좌 **여성뷰티** (눈썹/입술/아이라인/헤어라인/...) / 우 **남성뷰티** (눈썹/헤어라인/...) |
| 6 | **지금 많이 찾는 인기 이벤트** | 4열 카드 | **인기 아티스트 4명** (썸네일/활동명/지역/평점/대표 가격) |
| 7 | **새 포트폴리오** | (없음, 신규 제안) | 최근 등록 포트폴리오 4~8개 그리드 |
| 8 | **랭킹** | (없음, 신규 제안) | 좋아요 TOP 10 아티스트 / 포트폴리오 |
| 9 | **앱 다운로드 / QR** | "더 많은 시술정보 앱에서" | PWA 설치 안내 (이미 PWA 있음) |
| 10 | **푸터** | 회사정보 + ISMS 마크 | 회사정보 + 이용약관·개인정보 링크 |

### 2-B. 검색 페이지 (`/search`) — 신규

**바비톡 실측 패턴** (Playwright 검증):
- 홈의 검색바는 **fake input + click → router.push("/search")** (hover 만으로는 X, 클릭/포커스 시 SPA 라우팅)
- 모바일 키보드 사고 회피 + SEO + 번들 분리 효과
- `/search` 도착 시 진짜 input `autoFocus`, placeholder "질문, 고민 등 무엇이든 검색해 보세요."

**반언니 적용 구조**:

```tsx
// 홈 (src/app/(main)/page.tsx) — HomeSearchTrigger
<button
  type="button"
  onClick={() => router.push("/search")}
  aria-label="검색 페이지로 이동"
  className="w-full max-w-[680px] flex items-center gap-2 rounded-full
             border-2 border-brand-primary/40 px-4 h-12 bg-white
             hover:border-brand-primary
             focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
             transition-colors"
>
  <SearchIcon aria-hidden="true" />
  <span className="text-sm text-muted-foreground truncate">{rotatingPlaceholder}</span>
</button>

// 검색 페이지 (src/app/(main)/search/page.tsx) — Server Component + ISR
export const revalidate = 60;
export const metadata = {
  title: "아티스트·시술 검색 — 반언니",
  description: "전국 반영구 아티스트와 시술을 한 번에 검색. 활동명·시술·지역.",
};

export default async function SearchPage() {
  const [keywords, artists] = await Promise.all([
    fetchPopularKeywords(),
    fetchPopularArtists(),
  ]);
  return <SearchClient initialKeywords={keywords} popularArtists={artists} />;
}
```

**`/search` 페이지 섹션**:
1. 상단 검색바 (autoFocus 진짜 input) + 좌측 `<` 뒤로가기 버튼
2. AI 추천 칩 (가로 스크롤 pill) — FAQ 키워드 ("리터치 주기는?", "눈썹 색 빠짐?")
3. **인기 검색어 랭킹** — "오늘 ___시 기준" 표시
   - 1차 탭: **여성뷰티 / 남성뷰티**
   - 2차 탭: 전체 / 시술 / 아티스트 / 지역
   - 1~10위 + 등락 표시 (▲N / ▼N / -)
4. 검색어 입력 시 실시간 자동완성 (Server Action + debounce)
5. 검색 결과: 아티스트 카드 + 시술 카드 + 포트폴리오 카드 혼합

**데이터 소스 결정 필요**:
- 인기 검색어: (a) `search_logs` 테이블 신규 + 시간 단위 집계 RPC, (b) 어드민 수동 관리 (간단), (c) 좋아요/조회수 기반 인기 아티스트로 대체

### 2-C. 다른 페이지

- `/artists`, `/portfolios`, `/exhibition`, `/community`, `/encyclopedia` → **모두 1024px 컨테이너 통일**
- 헤더·푸터 동일 컨테이너 적용
- `/admin/*` 도 1024px 적용 (옵션 — 데이터 테이블 폭이 좁아질 수 있으니 별도 검토)

### 2-D. 모바일 (< 768px)

- 헤더 56px, 메뉴 햄버거 또는 하단 nav bar
- 컨테이너 full-width + px-4
- 카테고리 그리드는 2단 유지 (각 컬럼 폭 적응)
- 이벤트 카드: 가로 스크롤 또는 1~2열

---

## 3. 컴포넌트 인벤토리

신규 / 개선해야 할 컴포넌트:

| 컴포넌트 | 위치 | 상태 |
|---|---|---|
| `LayoutContainer` | `src/components/layout/LayoutContainer.tsx` | 신규 — 모든 페이지에서 사용 |
| `HomeSearchTrigger` | `src/components/home/HomeSearchTrigger.tsx` | 신규 — fake input button + 회전 placeholder, 클릭 시 /search 라우팅 |
| `SearchClient` | `src/app/(main)/search/SearchClient.tsx` | 신규 — /search 페이지 클라이언트 (autoFocus input + 자동완성) |
| `PopularSearchTags` | `src/components/home/PopularSearchTags.tsx` | 신규 — 가로 스크롤 pill |
| `HeroCarousel` | `src/components/home/HeroCarousel.tsx` | 신규 — 큰 컬러 캐러셀 (Embla 또는 Swiper) |
| `CategoryGrid` | `src/components/home/CategoryGrid.tsx` | 신규 — 2단 4×2 원형 아이콘 |
| `PopularArtistsGrid` | `src/components/home/PopularArtistsGrid.tsx` | 신규 — 4열 카드 |
| `Footer` | `src/components/layout/Footer.tsx` | 기존 — 컨테이너 폭만 통일 |

---

## 4. Phase 별 실행 계획

| Phase | 작업 | 산출 | 예상 시간 |
|---|---|---|---|
| **P1** | `LayoutContainer` 컴포넌트 + 모든 페이지 1024px 통일 | 헤더·푸터·각 페이지 컨테이너 변경 | 1~2h |
| **P2** | 홈 페이지 섹션 1~5 (헤더·검색·태그·캐러셀·카테고리) | 신규 컴포넌트 5개 | 4~6h |
| **P2-search** | `/search` 신규 페이지 + HomeSearchTrigger 라우팅 + 인기 검색어 랭킹 | 페이지 1개 + 컴포넌트 2개 + 데이터 RPC/admin | 3~5h |
| **P3** | 홈 페이지 섹션 6~8 (인기 아티스트·포트폴리오·랭킹) | 데이터 페칭 + 그리드 | 3~5h |
| **P4** | 홈 페이지 섹션 9~10 (PWA 안내·푸터 정리) | 미세 조정 | 1~2h |
| **P5** | 디자인 토큰 정비 (Tailwind config / strings / 라운드 통일) | tailwind.config.ts, globals.css | 1~2h |
| **P6** | 다른 페이지 (아티스트·기획전·커뮤니티 등) 컨테이너 통일 | 일괄 적용 | 2~3h |
| **P7** | 모바일 검수 + 반응형 fine-tuning | 디바이스 별 테스트 | 2~3h |

**총 예상**: 14~23시간 (1.5~3 working day)

각 Phase 마다 `/review8` PASS 후 커밋 + master/main 푸시.

---

## 5. 정책 준수

- **CSS Design Enforcer**: 인라인 스타일 금지, 하드코딩 hex 금지, Tailwind 유틸리티만, focus-visible 매칭, aria-label 필수
- **한국어 전용**: 영어 문구 추가 금지, hreflang 추가 금지
- **Server-First**: 홈 페이지 데이터(인기 아티스트·새 포트폴리오·랭킹)는 Server Component + ISR (예: revalidate=60)
- **모바일 퍼스트**: 기본 모바일, `md:` 태블릿, `lg:` 데스크탑

---

## 6. 검증 기준 (Phase 종료 시)

1. ESLint 경고 0개
2. TypeScript 오류 0개
3. `/review8` 8 도메인 PASS
4. Lighthouse Mobile + Desktop ≥ 90 (Performance/Accessibility/Best Practices/SEO)
5. PC 1440px 에서 컨테이너 폭 1024px 일치 확인 (Playwright 자동 검증)
6. 모바일 375px / 태블릿 768px / 데스크탑 1440px 스크린샷 비교

---

## 7. 결정 보류 항목

다음은 사용자 확인 후 결정:

1. **컬러 정책**: 바비톡의 보라색 위치를 반언니 핑크로 그대로 치환 vs 새 컬러 도입
2. **메뉴 구성**: 현재 메뉴 그대로 유지 vs 바비톡 패턴 (홈·이벤트·의사·병원·커뮤니티) 차용
3. **회원가입 위치**: 헤더 CTA "로그인 및 회원가입" 합쳐서 표시 (바비톡 패턴) vs 별도 분리
4. **앱 다운로드 섹션**: QR 코드 표시 vs 다른 형태 (배너·플로팅)
5. **랭킹 섹션 포함 여부**: 페이지 길이 vs 콘텐츠 양

---

## 8. 참고 자산

- 바비톡 메인 스크린샷 4종 (`babitalk-*.png` — repo 루트, 분석용)
- 기존 설계 문서: `PAGE_CONTENT_PLAN.md`, `SPA_MIGRATION_PLAN.md`
- CLAUDE.md 의 CSS Design Enforcer 절 + 데이터 페칭 규칙
