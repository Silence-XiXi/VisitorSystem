/*
  Warnings:

  - The values [SUSPENDED] on the enum `DistributorStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUSPENDED] on the enum `SiteStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUSPENDED] on the enum `WorkerStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."DistributorStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "public"."distributors" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."distributors" ALTER COLUMN "status" TYPE "public"."DistributorStatus_new" USING ("status"::text::"public"."DistributorStatus_new");
ALTER TYPE "public"."DistributorStatus" RENAME TO "DistributorStatus_old";
ALTER TYPE "public"."DistributorStatus_new" RENAME TO "DistributorStatus";
DROP TYPE "public"."DistributorStatus_old";
ALTER TABLE "public"."distributors" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SiteStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "public"."sites" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."sites" ALTER COLUMN "status" TYPE "public"."SiteStatus_new" USING ("status"::text::"public"."SiteStatus_new");
ALTER TYPE "public"."SiteStatus" RENAME TO "SiteStatus_old";
ALTER TYPE "public"."SiteStatus_new" RENAME TO "SiteStatus";
DROP TYPE "public"."SiteStatus_old";
ALTER TABLE "public"."sites" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."WorkerStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "public"."workers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."workers" ALTER COLUMN "status" TYPE "public"."WorkerStatus_new" USING ("status"::text::"public"."WorkerStatus_new");
ALTER TYPE "public"."WorkerStatus" RENAME TO "WorkerStatus_old";
ALTER TYPE "public"."WorkerStatus_new" RENAME TO "WorkerStatus";
DROP TYPE "public"."WorkerStatus_old";
ALTER TABLE "public"."workers" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
