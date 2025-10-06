/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `item_categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the table `item_categories` without a default value. This is not possible if the table is not empty.

*/

-- 添加code列（允许NULL）
ALTER TABLE "public"."item_categories" ADD COLUMN "code" TEXT;

-- 为现有数据生成code值
UPDATE "public"."item_categories" 
SET "code" = 'C' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7))
WHERE "code" IS NULL;

-- 设置code列为NOT NULL
ALTER TABLE "public"."item_categories" ALTER COLUMN "code" SET NOT NULL;

-- 创建唯一索引
CREATE UNIQUE INDEX "item_categories_code_key" ON "public"."item_categories"("code");