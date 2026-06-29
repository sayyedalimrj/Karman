-- CreateEnum
CREATE TYPE "ReferenceSourceType" AS ENUM ('TAKSA_DB', 'TAKSA_SQL_SCRIPT', 'SVZT', 'BRVT', 'PSNT', 'EXCEL', 'PDF_OFFICIAL_DOC', 'MANUAL_VERIFIED');

-- CreateEnum
CREATE TYPE "ReferenceMappingStatus" AS ENUM ('RAW', 'MAPPED', 'VERIFIED', 'CONFLICT', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ReferenceBookType" AS ENUM ('PRICE_LIST', 'INDEX', 'RESOURCE', 'CIRCULAR', 'COEFFICIENT', 'DEDUCTION', 'OTHER');

-- CreateTable
CREATE TABLE "ReferenceSource" (
    "id" TEXT NOT NULL,
    "sourceType" "ReferenceSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "originalFileName" TEXT,
    "originalDbName" TEXT,
    "originalScriptName" TEXT,
    "checksum" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceImportRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rowsRead" INTEGER,
    "rowsMapped" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceBook" (
    "id" TEXT NOT NULL,
    "bookType" "ReferenceBookType" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawRowOrder" INTEGER,
    "rawCode" TEXT,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceItem" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "itemCode" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT,
    "unitId" TEXT,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "rawRowOrder" INTEGER,
    "rawJson" JSONB,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceResource" (
    "id" TEXT NOT NULL,
    "resourceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitId" TEXT,
    "unitPrice" DECIMAL(18,4),
    "effectiveYear" INTEGER NOT NULL,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "rawRowOrder" INTEGER,
    "rawJson" JSONB,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceIndexPeriod" (
    "id" TEXT NOT NULL,
    "bookId" TEXT,
    "chapterId" TEXT,
    "itemId" TEXT,
    "category" TEXT,
    "year" INTEGER,
    "quarter" INTEGER,
    "month" INTEGER,
    "effectivePeriod" TEXT,
    "indexValue" DECIMAL(18,4) NOT NULL,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "rawRowOrder" INTEGER,
    "rawJson" JSONB,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceIndexPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCircular" (
    "id" TEXT NOT NULL,
    "circularNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "description" TEXT,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCircular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCoefficientRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coefficientValue" DECIMAL(18,4) NOT NULL,
    "applicability" JSONB,
    "effectiveYear" INTEGER,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCoefficientRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceDeductionRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rate" DECIMAL(18,4),
    "fixedValue" DECIMAL(18,4),
    "applicability" JSONB,
    "effectiveYear" INTEGER,
    "sourceId" TEXT,
    "importRunId" TEXT,
    "rawTableName" TEXT,
    "rawCode" TEXT,
    "checksum" TEXT,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceDeductionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceMapping" (
    "id" TEXT NOT NULL,
    "sourceType" "ReferenceSourceType" NOT NULL,
    "rawTableName" TEXT NOT NULL,
    "rawRowId" TEXT,
    "rawRowOrder" INTEGER,
    "rawCode" TEXT,
    "normalizedEntityType" TEXT NOT NULL,
    "normalizedEntityId" TEXT NOT NULL,
    "mappingStatus" "ReferenceMappingStatus" NOT NULL DEFAULT 'RAW',
    "checksum" TEXT,
    "notes" TEXT,
    "importRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceSource_sourceType_idx" ON "ReferenceSource"("sourceType");

-- CreateIndex
CREATE INDEX "ReferenceSource_checksum_idx" ON "ReferenceSource"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceSource_sourceType_name_key" ON "ReferenceSource"("sourceType", "name");

-- CreateIndex
CREATE INDEX "ReferenceImportRun_sourceId_idx" ON "ReferenceImportRun"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceImportRun_status_idx" ON "ReferenceImportRun"("status");

-- CreateIndex
CREATE INDEX "ReferenceBook_sourceId_idx" ON "ReferenceBook"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceBook_importRunId_idx" ON "ReferenceBook"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceBook_mappingStatus_idx" ON "ReferenceBook"("mappingStatus");

-- CreateIndex
CREATE INDEX "ReferenceBook_effectiveYear_idx" ON "ReferenceBook"("effectiveYear");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceBook_bookType_code_effectiveYear_key" ON "ReferenceBook"("bookType", "code", "effectiveYear");

-- CreateIndex
CREATE INDEX "ReferenceChapter_bookId_idx" ON "ReferenceChapter"("bookId");

-- CreateIndex
CREATE INDEX "ReferenceChapter_sourceId_idx" ON "ReferenceChapter"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceChapter_importRunId_idx" ON "ReferenceChapter"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceChapter_mappingStatus_idx" ON "ReferenceChapter"("mappingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceChapter_bookId_code_key" ON "ReferenceChapter"("bookId", "code");

-- CreateIndex
CREATE INDEX "ReferenceUnit_sourceId_idx" ON "ReferenceUnit"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceUnit_importRunId_idx" ON "ReferenceUnit"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceUnit_mappingStatus_idx" ON "ReferenceUnit"("mappingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceUnit_code_key" ON "ReferenceUnit"("code");

-- CreateIndex
CREATE INDEX "ReferenceItem_bookId_idx" ON "ReferenceItem"("bookId");

-- CreateIndex
CREATE INDEX "ReferenceItem_chapterId_idx" ON "ReferenceItem"("chapterId");

-- CreateIndex
CREATE INDEX "ReferenceItem_unitId_idx" ON "ReferenceItem"("unitId");

-- CreateIndex
CREATE INDEX "ReferenceItem_itemCode_idx" ON "ReferenceItem"("itemCode");

-- CreateIndex
CREATE INDEX "ReferenceItem_sourceId_idx" ON "ReferenceItem"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceItem_importRunId_idx" ON "ReferenceItem"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceItem_mappingStatus_idx" ON "ReferenceItem"("mappingStatus");

-- CreateIndex
CREATE INDEX "ReferenceItem_effectiveYear_idx" ON "ReferenceItem"("effectiveYear");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceItem_bookId_itemCode_effectiveYear_key" ON "ReferenceItem"("bookId", "itemCode", "effectiveYear");

-- CreateIndex
CREATE INDEX "ReferenceResource_resourceCode_idx" ON "ReferenceResource"("resourceCode");

-- CreateIndex
CREATE INDEX "ReferenceResource_unitId_idx" ON "ReferenceResource"("unitId");

-- CreateIndex
CREATE INDEX "ReferenceResource_sourceId_idx" ON "ReferenceResource"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceResource_importRunId_idx" ON "ReferenceResource"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceResource_mappingStatus_idx" ON "ReferenceResource"("mappingStatus");

-- CreateIndex
CREATE INDEX "ReferenceResource_effectiveYear_idx" ON "ReferenceResource"("effectiveYear");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceResource_resourceCode_effectiveYear_key" ON "ReferenceResource"("resourceCode", "effectiveYear");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_bookId_idx" ON "ReferenceIndexPeriod"("bookId");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_chapterId_idx" ON "ReferenceIndexPeriod"("chapterId");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_itemId_idx" ON "ReferenceIndexPeriod"("itemId");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_category_idx" ON "ReferenceIndexPeriod"("category");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_year_idx" ON "ReferenceIndexPeriod"("year");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_sourceId_idx" ON "ReferenceIndexPeriod"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_importRunId_idx" ON "ReferenceIndexPeriod"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceIndexPeriod_mappingStatus_idx" ON "ReferenceIndexPeriod"("mappingStatus");

-- CreateIndex
CREATE INDEX "ReferenceCircular_sourceId_idx" ON "ReferenceCircular"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceCircular_importRunId_idx" ON "ReferenceCircular"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceCircular_mappingStatus_idx" ON "ReferenceCircular"("mappingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCircular_circularNo_key" ON "ReferenceCircular"("circularNo");

-- CreateIndex
CREATE INDEX "ReferenceCoefficientRule_code_idx" ON "ReferenceCoefficientRule"("code");

-- CreateIndex
CREATE INDEX "ReferenceCoefficientRule_sourceId_idx" ON "ReferenceCoefficientRule"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceCoefficientRule_importRunId_idx" ON "ReferenceCoefficientRule"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceCoefficientRule_mappingStatus_idx" ON "ReferenceCoefficientRule"("mappingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCoefficientRule_code_effectiveYear_key" ON "ReferenceCoefficientRule"("code", "effectiveYear");

-- CreateIndex
CREATE INDEX "ReferenceDeductionRule_code_idx" ON "ReferenceDeductionRule"("code");

-- CreateIndex
CREATE INDEX "ReferenceDeductionRule_sourceId_idx" ON "ReferenceDeductionRule"("sourceId");

-- CreateIndex
CREATE INDEX "ReferenceDeductionRule_importRunId_idx" ON "ReferenceDeductionRule"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceDeductionRule_mappingStatus_idx" ON "ReferenceDeductionRule"("mappingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceDeductionRule_code_effectiveYear_key" ON "ReferenceDeductionRule"("code", "effectiveYear");

-- CreateIndex
CREATE INDEX "ReferenceMapping_normalizedEntityType_normalizedEntityId_idx" ON "ReferenceMapping"("normalizedEntityType", "normalizedEntityId");

-- CreateIndex
CREATE INDEX "ReferenceMapping_rawTableName_rawCode_idx" ON "ReferenceMapping"("rawTableName", "rawCode");

-- CreateIndex
CREATE INDEX "ReferenceMapping_sourceType_idx" ON "ReferenceMapping"("sourceType");

-- CreateIndex
CREATE INDEX "ReferenceMapping_importRunId_idx" ON "ReferenceMapping"("importRunId");

-- CreateIndex
CREATE INDEX "ReferenceMapping_mappingStatus_idx" ON "ReferenceMapping"("mappingStatus");

-- AddForeignKey
ALTER TABLE "ReferenceImportRun" ADD CONSTRAINT "ReferenceImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ReferenceSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceChapter" ADD CONSTRAINT "ReferenceChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ReferenceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceItem" ADD CONSTRAINT "ReferenceItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ReferenceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceItem" ADD CONSTRAINT "ReferenceItem_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ReferenceChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceItem" ADD CONSTRAINT "ReferenceItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReferenceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceResource" ADD CONSTRAINT "ReferenceResource_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReferenceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
