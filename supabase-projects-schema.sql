-- Musubi プロジェクト管理テーブル

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS musubi_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'developing', -- developing, completed, evaluated
  code TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  evaluation_score INTEGER,
  evaluation_comments TEXT,
  suggestions JSONB, -- 改善提案を保存
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_projects_status ON musubi_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON musubi_projects(created_at DESC);

-- 更新時刻の自動更新
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_musubi_projects_updated_at ON musubi_projects;
CREATE TRIGGER update_musubi_projects_updated_at
BEFORE UPDATE ON musubi_projects
FOR EACH ROW
EXECUTE FUNCTION update_projects_updated_at();

-- Musubi能力テーブル（学習した能力を記録）
CREATE TABLE IF NOT EXISTS musubi_capabilities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capabilities_acquired_at ON musubi_capabilities(acquired_at DESC);

-- 初期能力を登録
INSERT INTO musubi_capabilities (name, description) VALUES
  ('HTML', '基本的なHTML構造の作成'),
  ('CSS', 'スタイリングとレイアウト'),
  ('JavaScript', '基本的なインタラクティブ機能')
ON CONFLICT (name) DO NOTHING;

