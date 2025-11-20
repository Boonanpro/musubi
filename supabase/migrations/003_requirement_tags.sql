-- Requirement Tags Table
-- 要望のタグ付け情報を保存

CREATE TABLE IF NOT EXISTS requirement_tags (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('cursor', 'evaluation')),
  project TEXT,
  
  -- タグ情報
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  importance REAL NOT NULL CHECK (importance >= 0 AND importance <= 1),
  implementation_status TEXT NOT NULL CHECK (implementation_status IN ('not_started', 'in_progress', 'completed', 'failed')),
  task_type TEXT NOT NULL CHECK (task_type IN ('feature', 'bugfix', 'improvement', 'research', 'other')),
  
  -- メタ情報
  extracted_at TIMESTAMP NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  related_requirements TEXT[], -- 関連要望のID配列
  
  -- AI分析結果
  why_confident TEXT,
  why_important TEXT,
  suggested_priority INTEGER CHECK (suggested_priority >= 1 AND suggested_priority <= 5),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_requirement_tags_confidence ON requirement_tags(confidence);
CREATE INDEX IF NOT EXISTS idx_requirement_tags_importance ON requirement_tags(importance);
CREATE INDEX IF NOT EXISTS idx_requirement_tags_status ON requirement_tags(implementation_status);
CREATE INDEX IF NOT EXISTS idx_requirement_tags_project ON requirement_tags(project);
CREATE INDEX IF NOT EXISTS idx_requirement_tags_extracted_at ON requirement_tags(extracted_at DESC);

-- 高確信度・高重要度の要望を取得するビュー
CREATE OR REPLACE VIEW high_priority_requirements AS
SELECT 
  id,
  content,
  source,
  project,
  confidence,
  importance,
  implementation_status,
  task_type,
  suggested_priority,
  extracted_at
FROM requirement_tags
WHERE confidence >= 0.7 AND importance >= 0.7 AND implementation_status = 'not_started'
ORDER BY suggested_priority ASC, importance DESC, confidence DESC;

COMMENT ON TABLE requirement_tags IS '要望のタグ付け情報（確信度・重要度・実装状況）';
COMMENT ON VIEW high_priority_requirements IS '高確信度・高重要度の未実装要望';

