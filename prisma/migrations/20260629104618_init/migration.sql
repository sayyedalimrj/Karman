-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'PROJECT_ADMIN', 'EMPLOYER', 'CONSULTANT', 'CONTRACTOR', 'FINANCIAL_CONTROLLER', 'REVIEWER', 'VIEWER', 'SUPPORT_ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowState" AS ENUM ('PROJECT_DRAFT', 'PROJECT_ACTIVE', 'DOCUMENT_DRAFT', 'MEASUREMENT_IN_PROGRESS', 'CONTRACTOR_INTERNAL_CHECK', 'SUBMITTED_TO_CONSULTANT', 'CONSULTANT_REVIEWING', 'RETURNED_TO_CONTRACTOR', 'CONSULTANT_APPROVED', 'SUBMITTED_TO_EMPLOYER', 'EMPLOYER_REVIEWING', 'RETURNED_BY_EMPLOYER', 'EMPLOYER_APPROVED', 'DOCUMENT_LOCKED', 'EXPORT_READY', 'EXPORTED_TO_TAKSA');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('EMPLOYER', 'CONSULTANT', 'CONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'WORKFLOW_TRANSITION', 'LOCK', 'UNLOCK', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "TaksaImportStatus" AS ENUM ('NOT_IMPORTED', 'PENDING', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "TaksaExportStatus" AS ENUM ('NOT_EXPORTED', 'PENDING', 'EXPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemRole" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectParty" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "nationalId" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowCase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" "WorkflowState" NOT NULL DEFAULT 'DOCUMENT_DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "projectId" TEXT,
    "workflowCaseId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromState" "WorkflowState",
    "toState" "WorkflowState",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT,
    "byteSize" INTEGER,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "sourceName" TEXT NOT NULL,
    "importStatus" "TaksaImportStatus" NOT NULL DEFAULT 'NOT_IMPORTED',
    "exportStatus" "TaksaExportStatus" NOT NULL DEFAULT 'NOT_EXPORTED',
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaksaArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaRawTable" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "rawTableName" TEXT NOT NULL,
    "tableOrder" INTEGER NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaRawTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksaRawRow" (
    "id" TEXT NOT NULL,
    "rawTableId" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "patchJson" JSONB,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaksaRawRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "ProjectMember_role_idx" ON "ProjectMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_projectId_code_key" ON "Contract"("projectId", "code");

-- CreateIndex
CREATE INDEX "ProjectParty_projectId_idx" ON "ProjectParty"("projectId");

-- CreateIndex
CREATE INDEX "ProjectParty_partyType_idx" ON "ProjectParty"("partyType");

-- CreateIndex
CREATE INDEX "WorkflowCase_projectId_idx" ON "WorkflowCase"("projectId");

-- CreateIndex
CREATE INDEX "WorkflowCase_state_idx" ON "WorkflowCase"("state");

-- CreateIndex
CREATE INDEX "WorkflowCase_isLocked_idx" ON "WorkflowCase"("isLocked");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_workflowCaseId_idx" ON "AuditLog"("workflowCaseId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TaksaArtifact_projectId_idx" ON "TaksaArtifact"("projectId");

-- CreateIndex
CREATE INDEX "TaksaArtifact_importStatus_idx" ON "TaksaArtifact"("importStatus");

-- CreateIndex
CREATE INDEX "TaksaArtifact_exportStatus_idx" ON "TaksaArtifact"("exportStatus");

-- CreateIndex
CREATE INDEX "TaksaRawTable_artifactId_idx" ON "TaksaRawTable"("artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "TaksaRawTable_artifactId_rawTableName_key" ON "TaksaRawTable"("artifactId", "rawTableName");

-- CreateIndex
CREATE INDEX "TaksaRawRow_rawTableId_idx" ON "TaksaRawRow"("rawTableId");

-- CreateIndex
CREATE UNIQUE INDEX "TaksaRawRow_rawTableId_rowOrder_key" ON "TaksaRawRow"("rawTableId", "rowOrder");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectParty" ADD CONSTRAINT "ProjectParty_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCase" ADD CONSTRAINT "WorkflowCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCase" ADD CONSTRAINT "WorkflowCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCase" ADD CONSTRAINT "WorkflowCase_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "WorkflowCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workflowCaseId_fkey" FOREIGN KEY ("workflowCaseId") REFERENCES "WorkflowCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksaArtifact" ADD CONSTRAINT "TaksaArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksaRawTable" ADD CONSTRAINT "TaksaRawTable_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "TaksaArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksaRawRow" ADD CONSTRAINT "TaksaRawRow_rawTableId_fkey" FOREIGN KEY ("rawTableId") REFERENCES "TaksaRawTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
