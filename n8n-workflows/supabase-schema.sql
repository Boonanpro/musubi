-- Musubi用Supabaseテーブル定義

-- 1. 要望テーブル
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  project VARCHAR(100),
  source VARCHAR(50) NOT NULL, -- 'cursor' or 'evaluation'
  confidence DECIMAL(3,2), -- 0.00-1.00
  importance DECIMAL(3,2), -- 0.00-1.00
  task_type VARCHAR(50), -- 'feature', 'bugfix', 'improvement', 'research', 'other'
  category VARCHAR(100), -- 'ui-design', 'api-integration', etc.
  can_implement BOOLEAN,
  evaluation_confidence DECIMAL(3,2),
  missing_capabilities JSONB,
  required_dependencies JSONB,
  estimated_effort INTEGER, -- 1-5
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'archived'
  extracted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_importance ON requirements(importance DESC);
CREATE INDEX idx_requirements_extracted_at ON requirements(extracted_at DESC);

-- 2. 提案テーブル
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES requirements(id),
  title VARCHAR(200) NOT NULL,
  growth_effect TEXT NOT NULL,
  user_action TEXT NOT NULL,
  category VARCHAR(100),
  priority DECIMAL(5,2), -- 計算された優先度
  status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'displayed', 'in_progress', 'approved', 'rejected', 'archived'
  display_order INTEGER, -- 表示順序（1-4が表示中）
  approved_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_priority ON suggestions(priority DESC);
CREATE INDEX idx_suggestions_display_order ON suggestions(display_order);

-- 3. 能力プロファイルテーブル
CREATE TABLE IF NOT EXISTS capability_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability VARCHAR(100) UNIQUE NOT NULL,
  success_rate DECIMAL(3,2) DEFAULT 0.00, -- 0.00-1.00
  total_attempts INTEGER DEFAULT 0,
  successful_attempts INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 能力プロファイル履歴テーブル（週次スナップショット）
CREATE TABLE IF NOT EXISTS capability_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability VARCHAR(100) NOT NULL,
  success_rate DECIMAL(3,2),
  total_attempts INTEGER,
  successful_attempts INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_capability_history_capability ON capability_profile_history(capability);
CREATE INDEX idx_capability_history_created_at ON capability_profile_history(created_at DESC);

-- 5. 成長レポートテーブル
CREATE TABLE IF NOT EXISTS growth_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  week_end TIMESTAMP WITH TIME ZONE NOT NULL,
  summary TEXT,
  achievements JSONB,
  improvements JSONB,
  challenges JSONB,
  next_week_focus TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_growth_reports_week_start ON growth_reports(week_start DESC);

-- 6. 実装履歴テーブル（能力評価用）
CREATE TABLE IF NOT EXISTS implementation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES requirements(id),
  suggestion_id UUID REFERENCES suggestions(id),
  result VARCHAR(50), -- 'success', 'failure', 'partial'
  capabilities_used JSONB,
  error_message TEXT,
  lessons_learned TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_implementation_history_result ON implementation_history(result);
CREATE INDEX idx_implementation_history_created_at ON implementation_history(created_at DESC);

-- 7. 会話履歴テーブル（既存のものを拡張）
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  project VARCHAR(100),
  source VARCHAR(50), -- 'cursor', 'chat', 'evaluation'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_project ON conversations(project);

-- トリガー: updated_atを自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON suggestions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capability_profile_updated_at BEFORE UPDATE ON capability_profile
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データ: デフォルト能力
INSERT INTO capability_profile (capability, success_rate, total_attempts, successful_attempts) VALUES
  ('ui-design', 0.00, 0, 0),
  ('api-integration', 0.50, 10, 5),
  ('database-design', 0.70, 20, 14),
  ('error-handling', 0.60, 15, 9),
  ('authentication', 0.40, 5, 2),
  ('file-processing', 0.30, 10, 3),
  ('real-time-communication', 0.20, 5, 1),
  ('data-visualization', 0.10, 5, 0),
  ('performance-optimization', 0.50, 8, 4),
  ('testing', 0.80, 25, 20)
ON CONFLICT (capability) DO NOTHING;

