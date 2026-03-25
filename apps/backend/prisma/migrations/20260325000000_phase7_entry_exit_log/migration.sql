-- CreateEnum
CREATE TYPE "EntryExitDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "entry_exit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "direction" "EntryExitDirection" NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logged_by" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "entry_exit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "entry_exit_logs" ADD CONSTRAINT "entry_exit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_exit_logs" ADD CONSTRAINT "entry_exit_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_exit_logs" ADD CONSTRAINT "entry_exit_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
