-- CreateEnum
CREATE TYPE "PointCategory" AS ENUM ('PERFORMANCE', 'REWARD');

-- AlterTable
ALTER TABLE "point_logs" ADD COLUMN "category" "PointCategory" NOT NULL DEFAULT 'PERFORMANCE';
