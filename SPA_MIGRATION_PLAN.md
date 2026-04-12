# HowTattoo SPA 전환 + 레거시 마이그레이션 계획서

> 작성일: 2026-02-04
> 목표: 현재 Next.js 16 프로젝트를 하이브리드 SPA로 전환 + 레거시 기능 복제

---

## 1. 현재 상태

### 현재 프로젝트 (28baff0)
- **Framework**: Next.js 16.1.4 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **i18n**: ko, en, ja, zh (4개 언어)
- **배포**: Vercel

### 레거시 프로젝트 (참조용)
- **위치**: `C:\dev\howtattoo\laravel-legacy\home\forge\`
- **API**: `api.howtattoo.com` - Laravel 10
- **Frontend**: `howtattoo.com` - Next.js 14 (JavaScript)

---

## 2. 아키텍처 목표

```
[한국 사용자]
      ↓
[Vercel 서울 Edge] ── 정적 파일 캐싱
      ↓
[Next.js 하이브리드]
  ├── 홈페이지: SSR/SSG (빠른 첫 로딩)
  └── 나머지: Client Components (SPA)
      ↓
[/api/upload] ── Sharp ── [Supabase Storage]
                           (WebP 최적화)
      ↓
[Supabase] ── 데이터베이스 + 인증 + 실시간
```

---

## 3. 이미지 최적화 전략

### 사이즈 규격
| 사이즈 | 해상도 | 용도 | 예상 용량 |
|--------|--------|------|-----------|
| `thumb` | 150x150 | 리스트 썸네일 | ~5KB |
| `small` | 320x320 | 모바일 카드 | ~15KB |
| `medium` | 640x640 | 데스크탑 카드 | ~40KB |
| `large` | 1280x1280 | 상세 페이지 | ~100KB |
| `original` | 최대 2000x2000 | 원본 보기 | ~300KB |

### 저장 구조
```
portfolios/{id}/
  ├── thumb.webp
  ├── small.webp
  ├── medium.webp
  ├── large.webp
  └── original.webp
```

---

## 4. 페이지 전환 전략

| 페이지 | 렌더링 | 이유 |
|--------|--------|------|
| 홈 (`/`) | **SSR/SSG** | 첫 접속 속도, SEO |
| 정적 페이지 (약관 등) | **SSG** | SEO, 변경 없음 |
| 아티스트/포트폴리오 목록 | CSR | 필터/검색 인터랙션 |
| 상세 페이지 | CSR | 동적 데이터 |
| 마이페이지 | CSR | 인증 필요 |

---

## 5. 레거시 페이지 목록 (57개)

### 공개 페이지
| 경로 | 설명 | 현재 상태 |
|------|------|-----------|
| `/` | 홈페이지 | ✅ 있음 (개선 필요) |
| `/artists` | 아티스트 목록 | ✅ 있음 |
| `/artists/[id]` | 아티스트 상세 | ✅ 있음 |
| `/artists/map` | 지도 검색 | ❌ 신규 |
| `/portfolios` | 포트폴리오 목록 | ✅ 있음 |
| `/portfolios/[id]` | 포트폴리오 상세 | ✅ 있음 |
| `/event` | 이벤트/기획전 | ✅ 있음 |
| `/event/portfolios/[id]` | 이벤트 포트폴리오 | ❌ 신규 |
| `/login` | 로그인 | ✅ 있음 |
| `/register` | 회원가입 | ❌ 신규 |
| `/register/artist` | 아티스트 등록 | ❌ 신규 |
| `/find` | 아이디/비번 찾기 | ❌ 신규 |
| `/privacy` | 개인정보처리방침 | ✅ 있음 |
| `/notifications` | 알림 | ❌ 신규 |

### 커뮤니티
| 경로 | 설명 | 현재 상태 |
|------|------|-----------|
| `/community/posts` | 게시글 목록 | ❌ 신규 |
| `/community/posts/[id]` | 게시글 상세 | ❌ 신규 |
| `/community/posts/write` | 게시글 작성 | ❌ 신규 |
| `/community/posts/[id]/edit` | 게시글 수정 | ❌ 신규 |
| `/community/artist` | 아티스트 커뮤니티 | ❌ 신규 |
| `/community/user/reviews` | 사용자 리뷰 | ❌ 신규 |
| `/community/user/recruitments` | 모집 목록 | ❌ 신규 |

### 마이페이지 (일반 사용자)
| 경로 | 설명 | 현재 상태 |
|------|------|-----------|
| `/mypage` | 마이페이지 홈 | ✅ 있음 (기능 추가) |
| `/mypage/profile` | 프로필 수정 | ❌ 신규 |
| `/mypage/messages` | 채팅 목록 | ❌ 신규 |
| `/mypage/messages/[id]` | 채팅방 | ❌ 신규 |
| `/mypage/posts` | 내 게시글 | ❌ 신규 |
| `/mypage/posts/liked` | 좋아요한 글 | ❌ 신규 |
| `/mypage/reviews` | 내 리뷰 | ❌ 신규 |
| `/mypage/applications` | 지원 목록 | ❌ 신규 |
| `/mypage/recruitments` | 내 모집글 | ❌ 신규 |
| `/mypage/recruitments/write` | 모집글 작성 | ❌ 신규 |
| `/mypage/estimates/inquiries` | 견적 문의 | ❌ 신규 |
| `/mypage/estimates/inquiries/write` | 견적 문의 작성 | ❌ 신규 |

### 마이페이지 (아티스트)
| 경로 | 설명 | 현재 상태 |
|------|------|-----------|
| `/mypage/profile/artist` | 아티스트 프로필 | ❌ 신규 |
| `/mypage/artist/dashboard` | 대시보드 | ❌ 신규 |
| `/mypage/artist/portfolios` | 포트폴리오 관리 | ❌ 신규 |
| `/mypage/artist/portfolios/write` | 포트폴리오 작성 | ❌ 신규 |
| `/mypage/artist/portfolios/edit/[id]` | 포트폴리오 수정 | ❌ 신규 |
| `/mypage/artist/sales` | 판매 관리 | ❌ 신규 |
| `/mypage/artist/reviews` | 받은 리뷰 | ❌ 신규 |
| `/mypage/artist/point` | 포인트 | ❌ 신규 |
| `/mypage/artist/subscription` | 구독 관리 | ❌ 신규 |
| `/mypage/estimates/write` | 견적서 작성 | ❌ 신규 |

### 예약/리뷰/모집
| 경로 | 설명 | 현재 상태 |
|------|------|-----------|
| `/reservations` | 예약 목록 | ❌ 신규 |
| `/reservations/[id]` | 예약 상세 | ❌ 신규 |
| `/reviews/[id]` | 리뷰 상세 | ❌ 신규 |
| `/reviews/write` | 리뷰 작성 | ❌ 신규 |
| `/reviews/[id]/edit` | 리뷰 수정 | ❌ 신규 |
| `/recruitments/[id]` | 모집 상세 | ❌ 신규 |
| `/recruitments/[id]/apply` | 모집 지원 | ❌ 신규 |

---

## 6. 개발 단계

### Phase 1: SPA 전환 + 이미지 최적화 (5-7일) 🔴
- [ ] Sharp 패키지 설치
- [ ] `/api/upload` API Route 생성 (이미지 업로드 + 최적화)
- [ ] `storage-utils.ts` 확장 (`getOptimizedImageUrl`)
- [ ] `OptimizedImage` 컴포넌트 생성
- [ ] 인증 시스템 클라이언트화 (`/auth/callback` 제거)
- [ ] 페이지별 Client Component 전환

### Phase 2: 홈페이지 디자인 개선 (3-4일) 🔴
- [ ] 레거시 홈페이지 디자인 분석
- [ ] 섹션별 컴포넌트 재구성
- [ ] 반응형 레이아웃 개선

### Phase 3: 회원가입/로그인 완성 (2-3일) 🔴
- [ ] `/register` 페이지
- [ ] `/register/artist` 아티스트 등록
- [ ] `/find` 아이디/비밀번호 찾기
- [ ] 소셜 로그인 (카카오, 애플)

### Phase 4: 마이페이지 기본 기능 (4-5일) 🟡
- [ ] `/mypage/profile` 프로필 수정
- [ ] `/mypage/posts` 내 게시글
- [ ] `/mypage/reviews` 내 리뷰
- [ ] 좋아요/찜 목록

### Phase 5: 아티스트 지도 검색 (2-3일) 🟡
- [ ] `/artists/map` 페이지
- [ ] 카카오맵 또는 구글맵 연동
- [ ] 위치 기반 검색

### Phase 6: 커뮤니티 (게시판) (5-7일) 🟡
- [ ] 게시글 CRUD
- [ ] 댓글 시스템
- [ ] 좋아요 기능
- [ ] 카테고리별 필터

### Phase 7: 채팅/메시지 (4-5일) 🟡
- [ ] Supabase Realtime 연동
- [ ] 채팅방 목록
- [ ] 실시간 메시지

### Phase 8: 견적/예약 시스템 (5-7일) 🟢
- [ ] 견적 문의/답변
- [ ] 예약 생성/관리
- [ ] 결제 연동 (선택)

### Phase 9: 아티스트 대시보드 (5-7일) 🟢
- [ ] 매출/통계 대시보드
- [ ] 포트폴리오 관리
- [ ] 구독/포인트 관리

### Phase 10: 모집/리뷰 시스템 (3-4일) 🟢
- [ ] 모델 모집 CRUD
- [ ] 리뷰 작성/관리
- [ ] 지원 시스템

---

## 7. 총 예상 기간

| 우선순위 | Phase | 기간 |
|----------|-------|------|
| 🔴 높음 | Phase 1-3 | 10-14일 |
| 🟡 중간 | Phase 4-7 | 15-20일 |
| 🟢 낮음 | Phase 8-10 | 13-18일 |
| | **총합** | **38-52일** |

---

## 8. 레거시 참조 경로

```
레거시 프론트엔드:
C:\dev\howtattoo\laravel-legacy\home\forge\howtattoo.com\releases\62393912\

레거시 API:
C:\dev\howtattoo\laravel-legacy\home\forge\api.howtattoo.com\releases\62256392\
```

---

## 9. 기술 스택 비교

| 항목 | 레거시 | 현재 (목표) |
|------|--------|-------------|
| Frontend | Next.js 14 (JS) | Next.js 16 (TS) |
| Backend | Laravel 10 | Supabase |
| Database | MySQL | PostgreSQL |
| 인증 | Laravel Sanctum | Supabase Auth |
| 실시간 | Pusher + Soketi | Supabase Realtime |
| 이미지 | 원본 저장 | WebP 최적화 |
| 스타일링 | CSS/SCSS | Tailwind CSS v4 |
| i18n | 없음 | 4개 언어 |

---

*이 문서는 개발 진행에 따라 업데이트됩니다.*
