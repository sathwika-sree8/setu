-- CreateEnum
CREATE TYPE "UpdateVisibility" AS ENUM ('PUBLIC', 'INVESTORS_ONLY');

-- AlterTable
ALTER TABLE "StartupUpdate" ADD COLUMN "visibility" "UpdateVisibility" NOT NULL DEFAULT 'PUBLIC';
