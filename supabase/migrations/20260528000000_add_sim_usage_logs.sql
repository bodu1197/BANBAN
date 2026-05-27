-- 시뮬레이션 사용 로그 테이블
CREATE TABLE IF NOT EXISTS sim_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    step text NOT NULL CHECK (step IN ('remove', 'simulate')),
    area text CHECK (area IN ('eyebrow', 'lip')),
    style text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sim_usage_logs_created_at ON sim_usage_logs (created_at DESC);
CREATE INDEX idx_sim_usage_logs_user_id ON sim_usage_logs (user_id);

ALTER TABLE sim_usage_logs ENABLE ROW LEVEL SECURITY;
