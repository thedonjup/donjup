import { eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";

const BACKFILL_GOVT_ID_LIMIT = 500;
const GOVT_ID_SLUG_PATTERN = /^\d{5}-\d+$/;
const UNIQUE_VIOLATION_CODE = "23505";

type BackfillCandidate = {
  id: string;
  slug: string;
};

type BackfillCompleteResponse = {
  message: "Backfill complete";
  totalNull: number;
  updated: number;
  remaining: number;
  skippedInvalidSlug: number;
  skippedDuplicate: number;
};

type BackfillEmptyResponse = {
  message: "All complexes have govtComplexId";
  nullCount: 0;
};

export type BackfillGovtIdsResponse =
  | BackfillCompleteResponse
  | BackfillEmptyResponse;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;

  for (let i = 0; i < 5 && current !== undefined && current !== null; i += 1) {
    chain.push(current);
    current = asRecord(current)?.cause;
  }

  return chain;
}

export function deriveGovtComplexIdFromSlug(slug: string): string | null {
  return GOVT_ID_SLUG_PATTERN.test(slug) ? slug : null;
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return errorChain(error).some((item) => {
    const code = asRecord(item)?.code;
    return code === UNIQUE_VIOLATION_CODE;
  });
}

async function updateCandidate(candidate: BackfillCandidate): Promise<{
  updated: boolean;
  duplicate: boolean;
}> {
  const govtComplexId = deriveGovtComplexIdFromSlug(candidate.slug);
  if (!govtComplexId) {
    return { updated: false, duplicate: false };
  }

  try {
    await db
      .update(aptComplexes)
      .set({ govtComplexId })
      .where(eq(aptComplexes.id, candidate.id));
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { updated: false, duplicate: true };
    }

    throw error;
  }

  return { updated: true, duplicate: false };
}

export async function backfillMissingGovtComplexIds(): Promise<BackfillGovtIdsResponse> {
  const nullRows = await db
    .select({
      id: aptComplexes.id,
      slug: aptComplexes.slug,
    })
    .from(aptComplexes)
    .where(isNull(aptComplexes.govtComplexId))
    .limit(BACKFILL_GOVT_ID_LIMIT);

  if (nullRows.length === 0) {
    return { message: "All complexes have govtComplexId", nullCount: 0 };
  }

  let updated = 0;
  let skippedInvalidSlug = 0;
  let skippedDuplicate = 0;

  for (const row of nullRows) {
    const result = await updateCandidate(row);
    if (result.updated) {
      updated += 1;
    } else if (result.duplicate) {
      skippedDuplicate += 1;
    } else {
      skippedInvalidSlug += 1;
    }
  }

  return {
    message: "Backfill complete",
    totalNull: nullRows.length,
    updated,
    remaining: nullRows.length - updated,
    skippedInvalidSlug,
    skippedDuplicate,
  };
}
