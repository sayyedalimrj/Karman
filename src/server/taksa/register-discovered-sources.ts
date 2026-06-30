/**
 * Register DISCOVERED Taksa sources as PostgreSQL metadata (Phase 2, section C).
 *
 * Runs discovery and persists each discovered file as a `TaksaDiscoveredFile`
 * row carrying ONLY safe metadata (relative path, file name, extension, source
 * type, checksum, size, category) — never raw content. Registration is
 * IDEMPOTENT by `(checksum, relativePath)`: re-running never creates duplicates.
 * Each NEWLY registered source writes an append-only `AuditLog` row in the same
 * transaction (actor context). It does NOT create ReferenceBook/Item or Project
 * records.
 *
 * Authorization: the server-action/UI entry point requires SYSTEM_ADMIN
 * (PROJECT_ADMIN and VIEWER are NOT allowed in Phase 2). The CLI is documented
 * as admin-only server maintenance.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { requireRole } from "@/server/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import * as audit from "@/server/audit";
import type { AuditTx } from "@/server/audit";
import { discoverTaksaSources, type DiscoveredTaksaFile } from "./source-discovery";
import { isDatabaseReachable, resolveCliActorUserId } from "./staging-db";

export interface RegisterDiscoveredResult {
  /** Whether rows were persisted to PostgreSQL. */
  persisted: boolean;
  totalDiscovered: number;
  created: number;
  existing: number;
  /** Human-readable status (e.g. why nothing was persisted). */
  message: string;
}

/**
 * Persists discovered files idempotently inside the caller's transaction and
 * writes an AuditLog row for each NEWLY created source. Returns created/existing
 * counts. Safe metadata only — never raw content.
 */
export async function persistDiscoveredFiles(
  files: readonly DiscoveredTaksaFile[],
  actorUserId: string,
  tx: AuditTx,
): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;
  for (const f of files) {
    const found = await tx.taksaDiscoveredFile.findUnique({
      where: { checksum_relativePath: { checksum: f.checksum, relativePath: f.relativePath } },
      select: { id: true },
    });
    if (found) {
      existing++;
      continue;
    }
    const row = await tx.taksaDiscoveredFile.create({
      data: {
        relativePath: f.relativePath,
        fileName: f.fileName,
        extension: f.extension,
        sourceType: f.sourceType,
        sourceFamily: f.sourceFamily,
        category: f.category,
        sizeBytes: f.sizeBytes,
        checksum: f.checksum,
        modifiedAt: f.modifiedAt ? new Date(f.modifiedAt) : null,
        supportedForAnalysis: f.supportedForAnalysis,
        supportedForIngestion: f.supportedForIngestion,
        status: "REGISTERED",
      },
      select: { id: true },
    });
    await audit.record(
      {
        actorUserId,
        action: "IMPORT",
        entityType: "TaksaDiscoveredFile",
        entityId: row.id,
        metadata: {
          relativePath: f.relativePath,
          fileName: f.fileName,
          sourceType: f.sourceType,
          checksum: f.checksum,
          sizeBytes: f.sizeBytes,
          category: f.category,
        },
      },
      tx,
    );
    created++;
  }
  return { created, existing };
}

/**
 * High-level runner used by the CLI. Runs discovery, then — only when the DB is
 * reachable AND a SYSTEM_ADMIN actor exists — persists discovered files in a
 * transaction. Otherwise it degrades gracefully (no crash) and reports why.
 */
export async function registerDiscoveredSources(
  dataRootOverride?: string,
): Promise<RegisterDiscoveredResult> {
  const discovery = discoverTaksaSources(dataRootOverride);
  if (discovery.totalFiles === 0) {
    return {
      persisted: false,
      totalDiscovered: 0,
      created: 0,
      existing: 0,
      message: "No Taksa source files found; nothing to register.",
    };
  }

  const reachable = await isDatabaseReachable();
  if (!reachable) {
    return {
      persisted: false,
      totalDiscovered: discovery.totalFiles,
      created: 0,
      existing: 0,
      message: "Database not reachable; discovery completed but nothing was persisted.",
    };
  }

  const actorUserId = await resolveCliActorUserId();
  if (!actorUserId) {
    return {
      persisted: false,
      totalDiscovered: discovery.totalFiles,
      created: 0,
      existing: 0,
      message: "No SYSTEM_ADMIN user found; refusing to persist without an audit actor.",
    };
  }

  const { created, existing } = await prisma.$transaction((tx) =>
    persistDiscoveredFiles(discovery.files, actorUserId, tx),
  );
  return {
    persisted: true,
    totalDiscovered: discovery.totalFiles,
    created,
    existing,
    message: `Registered ${created} new source(s); ${existing} already present.`,
  };
}

export type RegisterSourcesErrorCode = "unauthorized" | "forbidden" | "unknown";

export interface RegisterSourcesActionState {
  ok: boolean;
  result?: RegisterDiscoveredResult;
  error?: RegisterSourcesErrorCode;
}

/**
 * Server-action entry point (UI). Requires SYSTEM_ADMIN — PROJECT_ADMIN and
 * VIEWER are denied in Phase 2 for platform-wide source registration.
 */
export async function registerDiscoveredSourcesAction(
  dataRootOverride?: string,
): Promise<RegisterSourcesActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  try {
    await requireRole(user, [Role.SYSTEM_ADMIN]);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UnauthorizedError) {
      return { ok: false, error: "forbidden" };
    }
    throw e;
  }
  const result = await prisma.$transaction(async (tx) => {
    const discovery = discoverTaksaSources(dataRootOverride);
    if (discovery.totalFiles === 0) {
      return {
        persisted: false,
        totalDiscovered: 0,
        created: 0,
        existing: 0,
        message: "No Taksa source files found; nothing to register.",
      } satisfies RegisterDiscoveredResult;
    }
    const { created, existing } = await persistDiscoveredFiles(discovery.files, user.id, tx);
    return {
      persisted: true,
      totalDiscovered: discovery.totalFiles,
      created,
      existing,
      message: `Registered ${created} new source(s); ${existing} already present.`,
    } satisfies RegisterDiscoveredResult;
  });
  return { ok: true, result };
}
