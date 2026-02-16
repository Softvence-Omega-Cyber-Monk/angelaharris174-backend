/*
  Warnings:

  - The values [FREE] on the enum `subscribeStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "subscribeStatus_new" AS ENUM ('PAID', 'UNPAID');
ALTER TABLE "public"."User" ALTER COLUMN "subscribeStatus" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "subscribeStatus" TYPE "subscribeStatus_new" USING ("subscribeStatus"::text::"subscribeStatus_new");
ALTER TYPE "subscribeStatus" RENAME TO "subscribeStatus_old";
ALTER TYPE "subscribeStatus_new" RENAME TO "subscribeStatus";
DROP TYPE "public"."subscribeStatus_old";
ALTER TABLE "User" ALTER COLUMN "subscribeStatus" SET DEFAULT 'UNPAID';
COMMIT;
