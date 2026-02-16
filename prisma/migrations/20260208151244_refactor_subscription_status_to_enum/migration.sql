/*
  Warnings:

  - You are about to drop the column `iSSubscrived` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "subscribeStatus" AS ENUM ('PAID', 'UNPAID', 'FREE');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "iSSubscrived",
ADD COLUMN     "subscribeStatus" "subscribeStatus" NOT NULL DEFAULT 'UNPAID';
