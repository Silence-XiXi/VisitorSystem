-- AlterTable
ALTER TABLE "public"."item_borrow_records" ADD COLUMN     "returnHandlerId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."item_borrow_records" ADD CONSTRAINT "item_borrow_records_returnHandlerId_fkey" FOREIGN KEY ("returnHandlerId") REFERENCES "public"."guards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
