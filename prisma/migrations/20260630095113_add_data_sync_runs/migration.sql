-- CreateTable
CREATE TABLE "DataSyncRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "triggeredByUserId" TEXT NOT NULL,
    "sourceRoot" TEXT NOT NULL,
    "fileCounts" JSONB,
    "discoveredSources" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "errors" JSONB,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSyncStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "message" TEXT,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSyncStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceUpdatePackage" (
    "id" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "scriptFile" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "affectedTables" JSONB,
    "insertIntentCount" INTEGER NOT NULL DEFAULT 0,
    "deleteIntentCount" INTEGER NOT NULL DEFAULT 0,
    "parsedSummary" JSONB,
    "runId" TEXT,
    "checksum" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceUpdatePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceUpdateStagingRow" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "rowData" JSONB,
    "provenance" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceUpdateStagingRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSyncRun_status_idx" ON "DataSyncRun"("status");

-- CreateIndex
CREATE INDEX "DataSyncRun_startedAt_idx" ON "DataSyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "DataSyncRun_triggeredByUserId_idx" ON "DataSyncRun"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "DataSyncStep_runId_idx" ON "DataSyncStep"("runId");

-- CreateIndex
CREATE INDEX "DataSyncStep_stepKey_idx" ON "DataSyncStep"("stepKey");

-- CreateIndex
CREATE INDEX "ReferenceUpdatePackage_status_idx" ON "ReferenceUpdatePackage"("status");

-- CreateIndex
CREATE INDEX "ReferenceUpdatePackage_packageName_idx" ON "ReferenceUpdatePackage"("packageName");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceUpdatePackage_packageName_relativePath_key" ON "ReferenceUpdatePackage"("packageName", "relativePath");

-- CreateIndex
CREATE INDEX "ReferenceUpdateStagingRow_packageId_idx" ON "ReferenceUpdateStagingRow"("packageId");

-- CreateIndex
CREATE INDEX "ReferenceUpdateStagingRow_targetTable_idx" ON "ReferenceUpdateStagingRow"("targetTable");

-- CreateIndex
CREATE INDEX "ReferenceUpdateStagingRow_intent_idx" ON "ReferenceUpdateStagingRow"("intent");

-- AddForeignKey
ALTER TABLE "DataSyncStep" ADD CONSTRAINT "DataSyncStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DataSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceUpdateStagingRow" ADD CONSTRAINT "ReferenceUpdateStagingRow_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ReferenceUpdatePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
