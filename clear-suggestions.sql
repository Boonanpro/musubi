-- 既存の提案をクリア（新しいシステムでやり直すため）
DELETE FROM musubi_suggestions;

-- 確認
SELECT COUNT(*) as remaining_count FROM musubi_suggestions;

