-- CreateTable
CREATE TABLE "LikeHighlights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LikeHighlights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LikeHighlights_userId_highlightId_key" ON "LikeHighlights"("userId", "highlightId");

-- AddForeignKey
ALTER TABLE "LikeHighlights" ADD CONSTRAINT "LikeHighlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeHighlights" ADD CONSTRAINT "LikeHighlights_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "highlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
