-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FREE', 'PRO', 'ELITE', 'FOUNDER');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'FREE';
