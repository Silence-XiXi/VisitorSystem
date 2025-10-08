-- CreateEnum
CREATE TYPE "public"."IdType" AS ENUM ('ID_CARD', 'PASSPORT', 'DRIVER_LICENSE', 'OTHER');

-- 数据迁移：将idCard字段的数据迁移到idNumber和idType字段
-- 首先添加新字段
ALTER TABLE "public"."workers" ADD COLUMN "idNumber" TEXT;
ALTER TABLE "public"."workers" ADD COLUMN "idType" "public"."IdType" DEFAULT 'ID_CARD';

-- 将现有的idCard数据复制到idNumber字段
UPDATE "public"."workers" SET "idNumber" = "idCard" WHERE "idNumber" IS NULL;

-- 确保所有记录都有idType值
UPDATE "public"."workers" SET "idType" = 'ID_CARD' WHERE "idType" IS NULL;

-- 现在可以安全地删除旧字段和索引
DROP INDEX "public"."workers_idCard_key";
ALTER TABLE "public"."workers" DROP COLUMN "age",
DROP COLUMN "idCard",
DROP COLUMN "photo",
DROP COLUMN "physicalCardId";

-- 为新字段添加约束
ALTER TABLE "public"."workers" ALTER COLUMN "idNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."item_borrow_records" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "visitorRecordId" TEXT;

-- AlterTable
ALTER TABLE "public"."visitor_records" ADD COLUMN     "phone" TEXT,
DROP COLUMN "idType",
ADD COLUMN     "idType" "public"."IdType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workers_idNumber_key" ON "public"."workers"("idNumber");

-- AddForeignKey
ALTER TABLE "public"."item_borrow_records" ADD CONSTRAINT "item_borrow_records_visitorRecordId_fkey" FOREIGN KEY ("visitorRecordId") REFERENCES "public"."visitor_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
