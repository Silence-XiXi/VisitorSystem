-- CreateEnum
CREATE TYPE "public"."VisitorStatus" AS ENUM ('ON_SITE', 'LEFT', 'PENDING');

-- CreateTable
CREATE TABLE "public"."visitor_records" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "status" "public"."VisitorStatus" NOT NULL DEFAULT 'ON_SITE',
    "idType" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "physicalCardId" TEXT,
    "registrarId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."visitor_records" ADD CONSTRAINT "visitor_records_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visitor_records" ADD CONSTRAINT "visitor_records_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visitor_records" ADD CONSTRAINT "visitor_records_registrarId_fkey" FOREIGN KEY ("registrarId") REFERENCES "public"."guards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
