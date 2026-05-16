---
description: 8-전문가 병렬 리뷰 (Security / SEO / Performance / UX / Maintainability / Quality / Architecture / Type Safety)
---

# /review8 — 8-Expert Parallel Review

**목표**: 8명 도메인 전문가 서브에이전트를 **한 메시지 안에서 병렬 실행**해서 diff를 리뷰 → 결과 종합 → 유저에게 보고.

## 입력 해석 (`$ARGUMENTS`)

- 비어있음 → `HEAD~1..HEAD` (최근 1커밋)
- `origin/main..HEAD` → 브랜치 전체
- 경로 (`app/api`) → 해당 경로의 최근 변경
- 커밋 SHA (`c4db1c2b`) → 해당 커밋

## 1단계: 스코프 확정

```bash
git diff <scope> --stat
git log --oneline <scope>
```

diff가 비어있으면 "리뷰할 변경 없음" 출력하고 종료.

## 2단계: 8개 Agent 병렬 실행 (단일 메시지에 8 tool calls)

각 에이전트: `subagent_type=Explore`, 중간 thoroughness. 프롬프트 공통 구조:
- **역할**: [전문가 이름]
- **컨텍스트**: 리뷰 대상 scope (`git diff <scope>`), 프로젝트 CLAUDE.md 요약
- **체크리스트**: 아래 카테고리별
- **출력 포맷**: 발견사항만. 각 항목 `[CRITICAL|HIGH|MEDIUM] file:line — 문제 한 줄 / 수정 한 줄`. 없으면 `NO FINDINGS`.
- **금지**: 칭찬, 추측, "looks good" 같은 필러

### 리뷰어 1 — Security Expert (OWASP)

OWASP Top 10: A01 Broken Access Control (Supabase RLS 누락, service_role 오남용), A02 Cryptographic Failures (평문 시크릿, 약한 해시), A03 Injection (SQL/NoSQL/URL/Command — 특히 `encodeURIComponent` 누락), A04 Insecure Design, A05 Security Misconfiguration (robots 차단 누락, CORS), A06 Vulnerable Components, A07 Auth Failures (토큰 만료, 세션), A08 Data Integrity, A09 Logging Failures, A10 SSRF. 추가: 프로토타입 오염, 시크릿 git 노출, 외부 URL 검증 누락, open-redirect.

### 리뷰어 2 — SEO/Crawlability Expert

robots.txt Allow/Disallow 구체성 충돌, canonical 태그 일관성, sitemap 누락 경로, hreflang 매칭, 메타태그 중복/누락, JSON-LD 구조화 데이터 오류, 소프트 404, CSR로 인한 인덱싱 실패, Googlebot XHR 차단, 중복 URL 발생, i18n 라우팅 사고, trailing slash 정책 일관성.

### 리뷰어 3 — Performance Expert

N+1 쿼리, fetch waterfall, Vercel 10s/60s/300s 타임아웃, 번들 사이즈 (heavy deps), 캐시 헤더, 이미지 lazy/width/height, 리렌더 폭발, 메모리 누수.

### 리뷰어 4 — UX/Accessibility Expert

ARIA 라벨/role, 키보드 네비게이션, 모바일 터치 타겟 (≥44×44px), 로딩 UI, 에러 UX, 폼 레이블, 색 대비 (WCAG AA 4.5:1), `prefers-reduced-motion`, 스크린리더 공지.

### 리뷰어 5 — Maintainability Expert

조기 추상화, 중복 로직 (같은 패턴 3회↑ 승격), 매직 넘버, 주석 품질 (WHAT 설명 금지/WHY만), dead code, 네이밍, 테스트 커버리지 공백.

### 리뷰어 6 — Code Quality Expert (SonarQube + Clean Code)

SonarQube 5원칙 (가독성·신뢰성·유지보수성·보안성·테스트가능성), Cognitive Complexity (함수당 ≤15), 중첩 깊이 (≤4), 함수 라인 (≤80), 매개변수 (≤7), 중복 코드 블록 (≥10라인 같은 패턴), 빈 catch/empty block, console.log 잔존 (NOSONAR 누락), 사용되지 않는 import/변수.

### 리뷰어 7 — Architecture Expert

레이어 경계 침범 (UI ↔ data, route handler ↔ service), 단일 진실 소스 위반 (같은 config 여러 곳), 도메인 모델 누수 (DB schema가 UI까지 그대로 노출), 결합도/응집도, 추상화 수준 (premature ≠ legitimate), 의존성 방향 (lib ← app ← components), 사이드 이펙트 위치, 환경 변수 직접 접근 분산, route group 구조, Next.js App Router 컨벤션.

### 리뷰어 8 — TypeScript Type Safety Expert

`any` 사용, `as unknown as`/이중 캐스트, `!` non-null assertion 남용, 함수 시그니처 누락 (any 추론), 제네릭 누락, discriminated union 미사용, `as const` 누락 (literal 타입 잃음), readonly 누락, `Record<string, unknown>` vs interface, `unknown` 검증 (type guard 없는 사용), error 타입 (`catch (e: unknown)` 후 좁히기), Supabase 생성 타입 우회.

## 3단계: 결과 종합

8개 결과 수령 후:

1. **중복 제거**: 같은 `file:line` 이슈 여러 리뷰어가 지적 → 1개로 묶고 "복수 지적(N)" 마크
2. **심각도 정렬**: CRITICAL → HIGH → MEDIUM
3. **출력 포맷**:

```
/review8 Report (scope: <scope>, files: F, lines: L)
════════════════════════════════════════════════════════
🔴 CRITICAL (X)
  1. [Security] app/api/foo/route.ts:42 — 문제 / 수정
  ...

🟠 HIGH (Y)
  ...

🟡 MEDIUM (Z)
  ...

✅ CLEAN PASSES: [리뷰어 이름들]
════════════════════════════════════════════════════════
```

4. 발견 0개 → `/review8: CLEAN` 출력 후 종료.

## 4단계: 후속 액션

발견이 있으면:

- **AUTO-FIX 후보** (encodeURIComponent, 주석 오류, dead code 등 기계적): 즉시 적용
- **ASK 항목** (설계 결정, 기능 변경): 유저에게 한 번에 배치 질문
- 푸시/커밋 금지 — 유저가 직접 지시해야 함
