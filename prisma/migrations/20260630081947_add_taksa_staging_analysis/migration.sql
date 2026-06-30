-- CreateTable
CREATE TABLE "TaksaDiscoveredFile" (
    "id" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceFamily" TEXT,
    "category" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "modifiedAt" TIMESTAMP(3),
    "supportedForAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "supportedForIngestion" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaksaDiscoveredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaAnalysisRun" (
    "id" TEXT NOT NULL,
    "analyzerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "outputDir" TEXT,
    "summaryJson" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaAnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaDetectedEntity" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "family" TEXT,
    "name" TEXT NOT NULL,
    "parentName" TEXT,
    "metadata" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaDetectedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaScriptXmlMapping" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "procedureName" TEXT,
    "xmlPath" TEXT,
    "targetTable" TEXT NOT NULL,
    "columns" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaScriptXmlMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaUiLabel" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataPropertyName" TEXT,
    "formName" TEXT,
    "gridName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaUiLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaBehaviorHint" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaBehaviorHint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaksaDiscoveredFile_sourceType_idx" ON "TaksaDiscoveredFile"("sourceType");

-- CreateIndex
CREATE INDEX "TaksaDiscoveredFile_category_idx" ON "TaksaDiscoveredFile"("category");

-- CreateIndex
CREATE INDEX "TaksaDiscoveredFile_status_idx" ON "TaksaDiscoveredFile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TaksaDiscoveredFile_checksum_relativePath_key" ON "TaksaDiscoveredFile"("checksum", "relativePath");

-- CreateIndex
CREATE INDEX "TaksaAnalysisRun_analyzerType_idx" ON "TaksaAnalysisRun"("analyzerType");

-- CreateIndex
CREATE INDEX "TaksaAnalysisRun_status_idx" ON "TaksaAnalysisRun"("status");

-- CreateIndex
CREATE INDEX "TaksaAnalysisRun_createdById_idx" ON "TaksaAnalysisRun"("createdById");

-- CreateIndex
CREATE INDEX "TaksaAnalysisRun_startedAt_idx" ON "TaksaAnalysisRun"("startedAt");

-- CreateIndex
CREATE INDEX "TaksaDetectedEntity_runId_idx" ON "TaksaDetectedEntity"("runId");

-- CreateIndex
CREATE INDEX "TaksaDetectedEntity_entityType_idx" ON "TaksaDetectedEntity"("entityType");

-- CreateIndex
CREATE INDEX "TaksaDetectedEntity_sourceType_idx" ON "TaksaDetectedEntity"("sourceType");

-- CreateIndex
CREATE INDEX "TaksaDetectedEntity_name_idx" ON "TaksaDetectedEntity"("name");

-- CreateIndex
CREATE INDEX "TaksaScriptXmlMapping_runId_idx" ON "TaksaScriptXmlMapping"("runId");

-- CreateIndex
CREATE INDEX "TaksaScriptXmlMapping_targetTable_idx" ON "TaksaScriptXmlMapping"("targetTable");

-- CreateIndex
CREATE INDEX "TaksaUiLabel_runId_idx" ON "TaksaUiLabel"("runId");

-- CreateIndex
CREATE INDEX "TaksaUiLabel_sourceFile_idx" ON "TaksaUiLabel"("sourceFile");

-- CreateIndex
CREATE INDEX "TaksaBehaviorHint_runId_idx" ON "TaksaBehaviorHint"("runId");

-- CreateIndex
CREATE INDEX "TaksaBehaviorHint_topic_idx" ON "TaksaBehaviorHint"("topic");

-- AddForeignKey
ALTER TABLE "TaksaDetectedEntity" ADD CONSTRAINT "TaksaDetectedEntity_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaksaAnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksaScriptXmlMapping" ADD CONSTRAINT "TaksaScriptXmlMapping_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaksaAnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksaUiLabel" ADD CONSTRAINT "TaksaUiLabel_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaksaAnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksaBehaviorHint" ADD CONSTRAINT "TaksaBehaviorHint_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaksaAnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
