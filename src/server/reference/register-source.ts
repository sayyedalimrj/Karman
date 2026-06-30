"use server";
/**
 * Server action: register a Taksa-derived reference SOURCE (metadata only).
 *
 * This creates a REAL `ReferenceSource` row AND writes an append-only
 * `AuditLog` entry inside the SAME database transaction (atomic provenance).
 * It is the honest first step of the reference pipeline: it records that a
 * source (Taksa DB, SQL script, SVZT/BRVT/PSNT, Excel, official PDF) exists and
 * will be extracted/mapped later. It does NOT upload, parse, or invent any
 * data, and it never seeds official values.
 *
 * Authorization is enforced SERVER-SIDE (deny-by-default): only SYSTEM_ADMIN or
 * PROJECT_ADMIN may register a source. Input is validated with zod. Audit
 * metadata carries only non-sensitive descriptors (the audit service also
 * redacts any sensitive keys defensively).
 *
 * Requirements: 4.1, 4.2, 7.1, 15.1, 15.4
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { requireRole } from "@/server/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import * as audit from "@/server/audit";
import { createReferenceSource } from "./index";

/** Accepted source types — mirrors the ReferenceSourceType enum. */
const SOURCE_TYPES = [
  "TAKSA_DB",
  "TAKSA_SQL_SCRIPT",
  "SVZT",
  "BRVT",
  "PSNT",
  "EXCEL",
  "PDF_OFFICIAL_DOC",
  "MANUAL_VERIFIED",
] as const;

const optionalTrimmed = z
  .string()
  .trim()
  .max(512)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const registerSourceSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  name: z.string().trim().min(1).max(256),
  originalFileName: optionalTrimmed,
  originalDbName: optionalTrimmed,
  originalScriptName: optionalTrimmed,
  description: optionalTrimmed,
  checksum: optionalTrimmed,
});

export type RegisterSourceInput = z.infer<typeof registerSourceSchema>;


export type RegisterSourceErrorCode = "unauthorized" | "forbidden" | "invalid" | "unknown";

export interface RegisterSourceState {
  ok: boolean;
  /** Set on success — the created source id. */
  sourceId?: string;
  /** Set on failure. */
  error?: RegisterSourceErrorCode;
  /** Field-level validation messages (when error === "invalid"). */
  fieldErrors?: Record<string, string[]>;
}

/**
 * Core registration logic (testable). Validates input, enforces role, and
 * persists the source + audit row atomically. Returns a typed result rather
 * than throwing for the expected authz/validation cases.
 */
export async function registerReferenceSource(
  raw: Record<string, unknown>,
): Promise<RegisterSourceState> {
  // 1) Authenticated?
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // 2) Authorized? (deny-by-default; SYSTEM_ADMIN or PROJECT_ADMIN only)
  try {
    await requireRole(user, [Role.SYSTEM_ADMIN, Role.PROJECT_ADMIN]);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UnauthorizedError) {
      return { ok: false, error: "forbidden" };
    }
    throw e;
  }

  // 3) Valid input?
  const parsed = registerSourceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  // 4) Persist source + audit atomically (no file parsing, no invented data).
  const sourceId = await prisma.$transaction(async (tx) => {
    const id = await createReferenceSource(
      {
        sourceType: input.sourceType,
        name: input.name,
        originalFileName: input.originalFileName ?? null,
        originalDbName: input.originalDbName ?? null,
        originalScriptName: input.originalScriptName ?? null,
        checksum: input.checksum ?? null,
        notes: input.description ?? null,
      },
      tx,
    );
    await audit.record(
      {
        actorUserId: user.id,
        action: "CREATE",
        entityType: "ReferenceSource",
        entityId: id,
        // Non-sensitive descriptors only; audit service also redacts defensively.
        metadata: {
          sourceType: input.sourceType,
          name: input.name,
          originalFileName: input.originalFileName ?? null,
          originalDbName: input.originalDbName ?? null,
          originalScriptName: input.originalScriptName ?? null,
        },
      },
      tx,
    );
    return id;
  });

  return { ok: true, sourceId };
}


/**
 * Form-bound server action. Extracts fields from FormData and delegates to
 * {@link registerReferenceSource}, then revalidates the sources list on success.
 */
export async function registerReferenceSourceAction(
  _prevState: RegisterSourceState,
  formData: FormData,
): Promise<RegisterSourceState> {
  const raw = {
    sourceType: formData.get("sourceType")?.toString(),
    name: formData.get("name")?.toString(),
    originalFileName: formData.get("originalFileName")?.toString(),
    originalDbName: formData.get("originalDbName")?.toString(),
    originalScriptName: formData.get("originalScriptName")?.toString(),
    description: formData.get("description")?.toString(),
    checksum: formData.get("checksum")?.toString(),
  };
  const result = await registerReferenceSource(raw);
  if (result.ok) {
    revalidatePath("/reference/sources");
    revalidatePath("/reference");
    revalidatePath("/dashboard");
  }
  return result;
}
