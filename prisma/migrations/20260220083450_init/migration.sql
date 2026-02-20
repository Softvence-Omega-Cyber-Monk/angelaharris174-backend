-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastViewed" TIMESTAMP(3),
ADD COLUMN     "profileViews" INTEGER NOT NULL DEFAULT 0;
