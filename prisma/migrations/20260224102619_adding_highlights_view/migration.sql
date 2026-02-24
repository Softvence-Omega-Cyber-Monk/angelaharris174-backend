-- CreateTable
CREATE TABLE "HighlightsView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "highlightsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HighlightsView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HighlightsView_userId_highlightsId_key" ON "HighlightsView"("userId", "highlightsId");

-- AddForeignKey
ALTER TABLE "HighlightsView" ADD CONSTRAINT "HighlightsView_highlightsId_fkey" FOREIGN KEY ("highlightsId") REFERENCES "highlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighlightsView" ADD CONSTRAINT "HighlightsView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
