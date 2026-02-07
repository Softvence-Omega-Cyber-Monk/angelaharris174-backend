-- CreateTable
CREATE TABLE "highlights" (
    "id" TEXT NOT NULL,
    "mergedVideoUrl" TEXT,
    "caption" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clips" JSONB NOT NULL,
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
