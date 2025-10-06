/*
  Warnings:

  - A unique constraint covering the columns `[distributorId]` on the table `distributors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `distributorId` to the `distributors` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add the column as nullable first
ALTER TABLE "public"."distributors" ADD COLUMN "distributorId" TEXT;

-- Step 2: Generate unique distributor IDs for existing records
-- Using a function to generate D + 7 random alphanumeric characters
UPDATE "public"."distributors" 
SET "distributorId" = 'D' || substr(md5(random()::text), 1, 7)
WHERE "distributorId" IS NULL;

-- Step 3: Make the column NOT NULL
ALTER TABLE "public"."distributors" ALTER COLUMN "distributorId" SET NOT NULL;

-- Step 4: Create unique index
CREATE UNIQUE INDEX "distributors_distributorId_key" ON "public"."distributors"("distributorId");
