-- 检查本地PostgreSQL数据库结构的SQL脚本
-- 请在您的本地PostgreSQL数据库中运行此脚本

-- 1. 检查所有表
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. 检查所有枚举类型
SELECT 
    typname as enum_name,
    enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typtype = 'e'
ORDER BY typname, enumlabel;

-- 3. 检查workers表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'workers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 检查workers表的索引
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'workers' 
AND schemaname = 'public';

-- 5. 检查visitor_records表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'visitor_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. 检查item_borrow_records表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'item_borrow_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. 检查外键约束
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
