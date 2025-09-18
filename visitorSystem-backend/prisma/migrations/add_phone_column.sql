-- 添加phone字段到visitor_records表
ALTER TABLE visitor_records ADD COLUMN IF NOT EXISTS phone TEXT;
