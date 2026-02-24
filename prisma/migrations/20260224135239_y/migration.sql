-- AlterTable
ALTER TABLE "User" ADD COLUMN     "oranaizaitonCode" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "organizationCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "imaageUrl" TEXT,
    "accessUrl" TEXT,
    "totalClicks" INTEGER DEFAULT 0,
    "uniqueVisitors" INTEGER DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_organizationCode_key" ON "Organization"("organizationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_email_key" ON "Organization"("email");
