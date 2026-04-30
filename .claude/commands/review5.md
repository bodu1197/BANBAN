---
description: 커밋 전 의무 검증 — 5인 전문 검증가 병렬 다각도 검사
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# /review5 — 5인 병렬 다각도 코드 검증

**목적**: 커밋 전 의무 검증. 보안/아키텍처/타입/성능/품질 관점 5명이 서로 독립적으로 병렬 검증.
**게이트**: PASS 후 `.claude/.review5-hash` 에 현재 상태 해시를 기록해야 `git commit` 허용됨.

---

## Step 1. 변경 사항 스캔

```bash
git rev-parse --show-toplevel >/dev/null 2>&1 || { echo "git 저장소 아님"; exit 1; }
git diff HEAD --stat 2>&1
echo "---"
git status --porcelain 2>&1
echo "---"
git diff HEAD 2>&1 | head -2000
```

변경 사항이 없으면 "검증 대상 없음 — /review5 종료" 출력 후 중단.

---

## Step 2. 5인 병렬 Agent 검증

**반드시 한 메시지에서 Agent 도구를 5회 병렬 호출.** 각 검증가는 서로 독립적으로 `git diff HEAD` 를 읽고, 본인 전문 영역만 검증. `subagent_type: Explore` (읽기 전용), 각 프롬프트는 아래와 정확히 동일하게 전달.

### 검증가 1 — 보안 엔지니어 (Security)

> 당신은 시니어 보안 엔지니어입니다. `git diff HEAD` 를 실행해 이 브랜치의 변경 사항을 읽고, **보안 관점에서만** 검증하세요. 필요시 주변 파일을 Read/Grep 으로 확인해도 됩니다.
>
> 검증 항목:
> - OWASP (SQL/XSS/CSRF/SSRF injection, broken auth, 민감정보 노출)
> - 인증/권한 검증 누락 (API route, Server Action)
> - Supabase RLS 우회(`createAdminClient`)가 정당한지
> - 시크릿/API 키 하드코딩
> - 사용자 입력 검증·정제 누락
> - CORS, CSP, 쿠키 플래그
>
> 각 문제마다 `file:line` + 한 줄 수정 제안. 추상 지적 금지, diff 증거 기반만. 문제 없으면 첫 줄에 `CLEAN` 만 출력. 응답은 200단어 이내.

### 검증가 2 — Next.js 아키텍트 (Architecture)

> 당신은 Next.js 16 App Router 시니어 아키텍트입니다. `git diff HEAD` 를 아키텍처 관점에서만 검증하세요. 필요시 `CLAUDE.md` 규칙을 참조.
>
> 검증 항목:
> - Server vs Client Component 분리 (Server-First 원칙)
> - 클라이언트에서 `useEffect + fetch` / `supabase.from().select()` 초기 데이터 페칭 (금지)
> - Server Actions 가 mutation 에 사용되는지
> - `"use client"` 최상단 `// @client-reason:` 주석
> - ISR/SSR/SSG 전략 선택 적절성
> - 파일 간 결합도, 순환 의존성 가능성
>
> 각 문제 `file:line` + 수정 방향. 문제 없으면 `CLEAN`. 200단어 이내.

### 검증가 3 — TypeScript 전문가 (Type Safety)

> 당신은 TypeScript strict mode 전문가입니다. `git diff HEAD` 를 타입 안전성 관점에서만 검증.
>
> 검증 항목:
> - `any` 사용 (정당한 사유 없이)
> - `as` 타입 단언 오용 (`as string`, `as unknown as`)
> - `!` non-null assertion (프로젝트 금지)
> - null/undefined 처리 누락
> - `Readonly<Props>` 누락
> - 제네릭/조건부 타입 개선 여지
> - `globalThis` 대신 `window`/`global` 사용
>
> 각 문제 `file:line`. 문제 없으면 `CLEAN`. 200단어 이내.

### 검증가 4 — 웹 성능 전문가 (Performance)

> 당신은 웹 성능 전문가(Core Web Vitals, Next.js 최적화)입니다. `git diff HEAD` 를 성능 관점에서만 검증.
>
> 검증 항목:
> - N+1 쿼리 (Supabase `.from()` 루프)
> - Client 번들 불필요 증가 (서버 로직의 클라이언트 노출)
> - `next/image` 미사용, width/height/alt 누락
> - 캐싱 누락 (`unstable_cache`, `revalidate`, tags)
> - LCP/CLS 영향 (레이아웃 시프트)
> - React 재렌더 폭발 (key 누락, 불필요한 객체 재생성)
> - 폰트/서드파티 스크립트 blocking
>
> 각 문제 `file:line`. 문제 없으면 `CLEAN`. 200단어 이내.

### 검증가 5 — 코드 품질 & 디자인 시스템 집행자 (Quality)

> 당신은 `CLAUDE.md` 프로젝트 규칙 집행자입니다. 먼저 `CLAUDE.md` 를 읽고, `git diff HEAD` 에서 규칙 준수 여부를 검증.
>
> 검증 항목:
> - `style={{}}` 인라인 스타일 (금지)
> - `bg-[#...]` 하드코딩 색상 (금지)
> - `.module.css` / styled-components (금지)
> - 외국어 UI 텍스트 (한국어 전용)
> - 반응형 클래스 누락 (`md:`, `lg:`)
> - a11y: `aria-label`(아이콘 버튼), `focus-visible:`(hover 매칭), `aria-pressed/expanded/current`
> - SonarCloud: 부정 조건 우선, 빈 `catch {}` 형식, `??=` 활용
> - 편법 (`eslint-disable` 무사유, `any` 회피, `.skip()`, `tsconfig exclude` 회피)
> - DRY 위반, 명명 품질
>
> 각 문제 `file:line`. 문제 없으면 `CLEAN`. 200단어 이내.

---

## Step 3. 종합 판정

5명의 결과를 모아 표로 정리:

```
═══ 5인 병렬 검증 결과 ═══
[1 보안]        CLEAN / N건 발견
[2 아키텍처]    ...
[3 타입]        ...
[4 성능]        ...
[5 품질]        ...

CRITICAL (반드시 수정):
  - file:line — 문제 요약

WARNING (강력 권고):
  - ...

INFO (개선 여지):
  - ...

결정: PASS | FAIL
```

**PASS 기준**:
- CRITICAL 0건
- 보안/품질 검증가는 `CLEAN` 이거나 발견 항목이 모두 WARNING 이하
- 5명 모두에게서 출력을 받았고, 그 중 1건이라도 실패했다면 FAIL

**FAIL 이면**:
1. CRITICAL/WARNING 을 실제로 수정 (Edit 도구로 코드 변경)
2. 수정 후 **반드시** `/review5` 재실행 (수정분에 대한 새로운 검증 필요)
3. 절대 건너뛰고 커밋 금지

---

## Step 4. 통과 표시 (PASS 한정)

PASS 일 때만 마커 기록:

```bash
node .claude/hooks/review5-mark.mjs
```

이 스크립트는 현재 working tree 상태 해시를 `.claude/.review5-hash` 에 기록. 이 해시가 있어야 `git commit` 게이트가 열림.

---

## 중요 규칙

- **5명 모두 Explore subagent 로 병렬 호출.** 직렬 금지 — 시간이 5배 늘어남.
- **CLEAN 선언은 증거 기반일 것.** "아마 괜찮아 보인다" 금지. 실제로 확인하지 못했으면 `UNVERIFIED` 로 표기.
- **자동 수정 금지.** /review5 는 검증만. 수정은 명시적으로 사용자에게 보고 후 진행.
- **게이트 우회 금지.** FAIL 상태에서 `--no-verify` 나 게이트 파일 수동 조작은 MEMORY.md 의 "편법 금지" 위반.
