-- CreateTable
CREATE TABLE "Aisearchlog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aisearchlog_pkey" PRIMARY KEY ("id")
);
