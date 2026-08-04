-- CreateTable
CREATE TABLE "Explanation" (
    "patternKey" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Explanation_pkey" PRIMARY KEY ("patternKey")
);
