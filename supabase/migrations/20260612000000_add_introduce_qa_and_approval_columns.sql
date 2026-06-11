-- 샵 등록 승인 워크플로 + Q&A 소개글 구조화 기반 컬럼 (P0)
-- introduce_qa: 인터뷰 Q&A 구조화 저장(jsonb). 기존 introduce(text NOT NULL)는 파생 평문으로 유지(SEO meta/JSON-LD/홈카드 무중단).
-- 승인 워크플로 컬럼: reject_reason/rejected_at/reviewed_by/resubmitted_at(24h 재신청 쿨다운 추적).
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS introduce_qa jsonb,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;

-- status 허용값 제약 (현재 운영 데이터: active/dormant. 신규 도입: pending/rejected).
-- 기존 82행(active 77 / dormant 5)은 모두 허용값이라 검증 통과.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.artists'::regclass AND conname = 'artists_status_check'
  ) THEN
    ALTER TABLE public.artists
      ADD CONSTRAINT artists_status_check
      CHECK (status IN ('pending','active','rejected','dormant'));
  END IF;
END $$;

COMMENT ON COLUMN public.artists.introduce_qa IS '인터뷰 Q&A 구조화 소개글(jsonb). [{q,a},...] + free 자유작성. introduce(평문)는 파생 동시 저장.';
COMMENT ON COLUMN public.artists.reject_reason IS '관리자 반려 사유';
COMMENT ON COLUMN public.artists.resubmitted_at IS '반려 후 재신청 시각(24h 쿨다운 추적)';
