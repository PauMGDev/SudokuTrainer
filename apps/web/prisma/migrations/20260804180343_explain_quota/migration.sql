-- CreateTable
CREATE TABLE "ExplainQuota" (
    "sessionId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExplainQuota_pkey" PRIMARY KEY ("sessionId","day")
);
