# 반언니 (banunni) Project Rules

> **⚠️ 세션 시작 시 0번째로 할 일** (Cowork / CLI 둘 다):
> 1. `.claude-sync/STATUS.md` 읽기 — 공유 상태 파악
> 2. `.claude-sync/LESSONS.md` 읽기 — 공유 교훈 (같은 실수 반복 금지)
> 3. `.claude-sync/to-{cli|cowork}/` 에서 `*OPEN*.md` 쪽지 → **Tier 1 자동 처리**
> 4. 작업 끝나면 STATUS.md 갱신 + 상대에게 쪽지 남기기
> → 규칙: `.claude-sync/README.md`, `.claude-sync/PROTOCOL.md` (3단 Tier 시스템 포함)

## 커밋 전 의무 검증 (/review5) — MANDATORY

**코드를 수정했다면 `git commit` 전에 반드시 `/review5` 를 실행한다. 예외 없음.**

- **절차**: 코드 수정 → `/review5` 실행 → 5인 병렬 검증(보안/아키텍처/타입/성능/품질) → PASS → `git commit`
- **FAIL 또는 CRITICAL 발견 시**: 문제를 수정하고 `/review5` 재실행. PASS 없이 커밋 금지.
- **게이트**: `.claude/hooks/review5-gate.mjs` 가 `git commit` 을 PreToolUse 에서 가로채 검증 마커(`.claude/.review5-hash`)와 현재 상태를 비교. 마커 없음/불일치면 차단.
- **우회 금지**: 게이트 우회, `--no-verify` 사용, 마커 파일 수동 조작은 "편법 금지" 규칙 위반.
- **절차 파일**: `.claude/commands/review5.md`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Language**: 한국어 전용 (i18n/다국어 영구 금지)
- **UI Components**: shadcn/ui
- **Quality**: ESLint, SonarCloud, JSCPD, Madge

## 한국어 전용 정책 (영구)

**다국어/외국어 페이지·번역 콘텐츠 일체 금지.** 4개 로케일(ko/en/ja/zh)은 이미 삭제되었으며, next-intl·`[locale]` 라우팅·hreflang alternates 등 어떤 형태로도 부활시키지 않는다. AI 자동 생성 콘텐츠는 system 프롬프트에 한국어 강제.

## CSS Design Enforcer (MANDATORY)

**모든 UI/스타일 작업에서 반드시 준수. 예외 없음.**

### 금지 사항
- `style={{}}` 인라인 스타일 사용 금지
- `bg-[#hex]` 하드코딩 색상 금지 (디자인 시스템 변수 사용)
- `.module.css` CSS 모듈 금지
- `styled-components`, `@emotion` 금지

### 필수 사항

#### Tailwind CSS
- 모든 스타일링은 Tailwind 유틸리티 클래스로 작성
- 디자인 시스템 색상 사용: `brand-primary`, `brand-primary-hover`, `muted-foreground`, `foreground` 등
- 임의 값 최소화 (예: `p-[13px]` 대신 `p-3` 사용)

#### 반응형 디자인 (모바일 퍼스트)
- 기본: 모바일 스타일
- `md:` (768px): 태블릿
- `lg:` (1024px): 데스크톱
- 모든 UI 컴포넌트는 반응형 클래스 포함 필수

#### 접근성 (a11y)
- 아이콘 전용 버튼에 `aria-label` 필수
- 토글 버튼에 `aria-pressed` 추가
- 확장 요소에 `aria-expanded` 추가
- 네비게이션 링크에 `aria-current="page"` 추가
- **`hover:` 스타일이 있으면 반드시 매칭되는 `focus-visible:` 스타일 추가**
- 클릭 가능 요소에 포커스 스타일 필수

### 체크리스트 (모든 UI 작업 완료 시 확인)
- [ ] 인라인 스타일 (`style={{}}`) 없음
- [ ] 하드코딩 hex 색상 없음
- [ ] Tailwind 유틸리티 클래스만 사용
- [ ] 반응형 클래스 적용 (md:, lg:)
- [ ] aria-label 적용 (아이콘 버튼)
- [ ] hover: 스타일에 매칭되는 focus-visible: 스타일 적용
- [ ] 시맨틱 HTML 사용 (nav, section, article 등)

## 데이터 페칭 규칙 (Server-First, MANDATORY)

**서버에서 데이터를 가져오는 것이 기본. 클라이언트 페칭은 최후의 수단.**

### 원칙: SSR > SSG > ISR > Client

| 전략 | 사용 시점 | 구현 |
|------|----------|------|
| **SSG** | 정적 콘텐츠 (약관, 소개 등) | `generateStaticParams()` |
| **ISR** | 자주 변하지 않는 데이터 (큐레이션, 목록) | `export const revalidate = 60` |
| **SSR** | 요청마다 달라지는 데이터 (인증 기반) | `async function Page()` (캐시 없음) |
| **Client** | 브라우저 API 필수인 경우만 | `"use client"` + `// @client-reason:` |

### 서버 컴포넌트 데이터 페칭 패턴 (기본)
```tsx
// page.tsx (Server Component) - 이것이 기본
export const revalidate = 60; // ISR: 60초마다 재검증

export default async function Page() {
  const data = await fetchData(); // 서버에서 직접 페칭
  return <ClientComponent data={data} />; // 데이터를 props로 전달
}
```

### 클라이언트 데이터 페칭 허용 사례 (예외)
- **실시간 구독**: `supabase.auth.onAuthStateChange()` 등 WebSocket/실시간 리스너
- **사용자 인터랙션 기반**: 검색 입력 디바운스, 무한 스크롤 "더보기"
- **브라우저 전용 API**: `navigator`, `localStorage`, `IntersectionObserver`
- **Optimistic UI**: 좋아요 토글 등 즉각 반응이 필요한 경우

### 금지 사항
- `useEffect` + `fetch()`로 초기 데이터 로딩 (서버에서 가능한 경우)
- Client Component에서 Supabase `.from().select()` 초기 쿼리 (서버로 이동)
- `useState`로 서버에서 가져올 수 있는 데이터 관리
- API Route (`/api/*`)를 Client Component가 호출하여 초기 데이터 로딩

### 올바른 패턴
```
❌ ClientComponent → useEffect → fetch("/api/data") → setState
✅ ServerPage → fetchData() → <ClientComponent data={data} />

❌ ClientComponent → useEffect → supabase.from("table").select()
✅ ServerPage → supabase.from("table").select() → <ClientComponent data={data} />

❌ ClientComponent → useState(null) → useEffect → load data
✅ Server Action → "use server" → 클라이언트에서 mutation 호출
```

### Server Actions 사용 (mutations)
- 데이터 변경(생성/수정/삭제)은 Server Actions 사용
- `"use server"` 함수로 정의, Client Component에서 호출
- `startTransition` + Optimistic UI 패턴 권장

## Code Quality Rules

### TypeScript
- `Readonly<Props>` 모든 컴포넌트 props에 적용
- `as string` 사용 (`!` non-null assertion 금지)
- strict mode 유지, 타입 오류 0개

### React/Next.js
- Server Component 기본, `"use client"` 최소화
- `"use client"` 사용 시 파일 최상단에 `// @client-reason:` 주석 필수
- `"use client"` 컴포넌트에서 초기 데이터 페칭 금지 (서버에서 props로 전달)
- `Suspense` + async Server Component 패턴 사용
- `globalThis` 사용 (`window`/`global` 금지)

### SonarCloud
- 부정 조건 (`!condition ? A : B`) 대신 긍정 조건 우선 (`condition ? B : A`)
- 빈 catch: `catch {}` 사용 (`catch (e) {}` 금지)
- `??=` 널 병합 할당 연산자 활용
- `export { x } from` re-export 패턴 사용

### Quality Gate (pre-push)
1. ESLint: 경고 0개
2. TypeScript: 타입 오류 0개
3. JSCPD: 코드 중복 5% 이하
4. Madge: 순환 의존성 0개
5. Next.js Build: 빌드 성공

## 절대 금지 사항 (No Workarounds Policy)

**문제가 발생하면 근본적으로 해결해야 함. 편법/우회 금지.**

### 금지되는 편법들
- TypeScript 에러를 `tsconfig.json`의 `exclude`로 회피
- ESLint 에러를 `// eslint-disable` 주석으로 무시 (정당한 사유 없이)
- 타입 에러를 `any`로 회피
- 테스트 실패를 `.skip()`으로 무시
- 빌드 에러를 환경변수나 설정으로 우회
- 누락된 데이터를 기본값으로 대체 (실제 데이터 수정 필요 시)

### 올바른 해결 방법
- TypeScript 에러 → 실제 타입 정의 수정 또는 `@types` 패키지 설치
- 누락된 파일 → 실제 파일 복구 또는 DB 정리
- 빌드 에러 → 코드 수정으로 해결
- 의존성 문제 → 패키지 업데이트 또는 호환성 수정

### 예외 허용 조건
- 외부 라이브러리 → 타당한 사유 있으면 `exclude` 허용
- 명확한 사유가 있는 `eslint-disable` → 반드시 사유 주석 포함

## 임시 파일 관리 정책

**임시 파일은 Git에 푸시하지 않는다.**

### 임시 파일 저장 위치
- `scripts-temp/` - 임시 스크립트 (마이그레이션, 디버그, 검증용)
- `docs/` - 임시 문서

### .gitignore에 포함된 항목
```
scripts-temp/
docs/
*_dump.txt
migration_manifest.jsonl
missing_*.json
```

### 영구 스크립트 (scripts/)
- `quality-gate.ts` - 품질 검사
- `migrate-images.ts` - 공식 마이그레이션 (필요 시)
- 기타 프로덕션에 필요한 스크립트만 유지

---

## [진행중] 페이지 콘텐츠 구성 (2026-03-02 시작)

### 상세 계획서
📄 **`PAGE_CONTENT_PLAN.md`** 참조 (tattooshare.co.kr 벤치마킹 기반)

### 우선순위
1. 홈 페이지 콘텐츠 (퀵메뉴, 할인타이머, 해시태그 추천, 인기작품, 뷰티추천)
2. 타투 페이지 필터/검색
3. 랭킹 페이지 구현
4. 남성/여성뷰티 카테고리 탭
5. 기획전 페이지

---

## [진행중] SPA 전환 (2026-02-04 시작)

### 상세 계획서
📄 **`SPA_MIGRATION_PLAN.md`** 참조

### 목표
1. 현재 프로젝트를 하이브리드 SPA로 전환
2. 이미지 직접 최적화 (Sharp + WebP)

### 아키텍처
```
모든 페이지         → Server Component 기본 (SSR/ISR)
인터랙션 필요 부분  → Client Component (최소 범위)
데이터 변경         → Server Actions
이미지 업로드       → /api/upload → Sharp → WebP 변환
```

### 개발 단계 요약
| Phase | 작업 | 상태 |
|-------|------|------|
| 1 | SPA 전환 + 이미지 최적화 | ⏳ 대기 |
| 2 | 홈페이지 디자인 개선 | ⏳ 대기 |
| 3 | 회원가입/로그인 완성 | ⏳ 대기 |
| 4-10 | 마이페이지, 커뮤니티, 채팅 등 | ⏳ 대기 |

**총 예상 기간: 38-52일**
