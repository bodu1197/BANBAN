-- profiles.role 컬럼 추가 + 기존 회원 백필
-- 회원 유형 분리: 'user' (일반 회원) / 'artist' (반영구 시술사)
-- 가입 시점에 결정되며 마이페이지/권한 분기에 사용됨.
--
-- 기존 회원 보호:
--  - DEFAULT 'user' 로 즉시 NOT NULL 보장
--  - active artists 행 있는 회원은 백필로 자동 'artist' 설정
--  → useAuth.isArtist 변경(artist!==null → role==='artist') 후에도 동작 동일

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'artist'));

-- 기존 회원 백필: active artists 행 있는 회원 → 'artist'
UPDATE profiles p
SET role = 'artist'
WHERE EXISTS (
  SELECT 1 FROM artists a
  WHERE a.user_id = p.id
    AND a.deleted_at IS NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;
