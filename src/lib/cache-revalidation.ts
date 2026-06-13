import { revalidateTag } from "next/cache";
import { logger } from "@/lib/logger";
import type { PublicDataCacheTag } from "@/lib/cache-tags";

export type PublicDataCacheRevalidationResult = {
  attempted: PublicDataCacheTag[];
  revalidated: PublicDataCacheTag[];
  failed: PublicDataCacheTag[];
};

export function revalidatePublicDataCaches(
  tags: readonly PublicDataCacheTag[],
  context: Record<string, unknown> = {}
): PublicDataCacheRevalidationResult {
  const attempted = Array.from(new Set(tags));
  const revalidated: PublicDataCacheTag[] = [];
  const failed: PublicDataCacheTag[] = [];

  for (const tag of attempted) {
    try {
      revalidateTag(tag, "max");
      revalidated.push(tag);
    } catch (error) {
      failed.push(tag);
      logger.warn("Failed to revalidate public data cache", {
        ...context,
        tag,
        error,
      });
    }
  }

  if (revalidated.length > 0) {
    logger.info("Revalidated public data caches", {
      ...context,
      tags: revalidated,
    });
  }

  return {
    attempted,
    revalidated,
    failed,
  };
}
