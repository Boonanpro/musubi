-- Musubi Temporal用のSupabaseテーブル

-- 提案テーブル
CREATE TABLE IF NOT EXISTS musubi_suggestions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  user_action TEXT NOT NULL,
  priority REAL NOT NULL DEFAULT 0.5,
  category TEXT NOT NULL,
  requirement_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON musubi_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON musubi_suggestions(priority DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON musubi_suggestions(created_at DESC);

-- 更新時刻の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_musubi_suggestions_updated_at
BEFORE UPDATE ON musubi_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 能力評価履歴テーブル（学習用）
CREATE TABLE IF NOT EXISTS musubi_capability_evaluations (
  id SERIAL PRIMARY KEY,
  requirement_title TEXT NOT NULL,
  requirement_description TEXT,
  can_implement BOOLEAN NOT NULL,
  confidence REAL NOT NULL,
  missing_capabilities TEXT[],
  reasoning TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capability_evaluations_evaluated_at ON musubi_capability_evaluations(evaluated_at DESC);

-- ワークフロー実行履歴
CREATE TABLE IF NOT EXISTS musubi_workflow_executions (
  workflow_id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  status TEXT NOT NULL, -- running, completed, failed, terminated
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON musubi_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON musubi_workflow_executions(started_at DESC);


