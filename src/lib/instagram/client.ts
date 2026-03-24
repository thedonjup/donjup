/**
 * Instagram Graph API client for publishing photos and carousels.
 *
 * Required environment variables:
 *   INSTAGRAM_ACCESS_TOKEN  – Long-lived page access token (Facebook Graph API)
 *   INSTAGRAM_USER_ID       – Instagram Business Account ID
 *
 * Official API reference:
 *   POST /{ig-user-id}/media          – create media container
 *   POST /{ig-user-id}/media_publish  – publish a container
 *
 * Rate limits: 25 published posts per 24-hour rolling window.
 */

const GRAPH_API = "https://graph.facebook.com/v21.0";

function getConfig() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
  const userId = process.env.INSTAGRAM_USER_ID ?? "";
  if (!accessToken || !userId) {
    throw new Error(
      "Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID environment variable"
    );
  }
  return { accessToken, userId };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphApiResponse {
  id?: string;
  error?: { message: string; code: number; type: string };
}

interface ContainerStatusResponse {
  status_code?: string;
  status?: string;
  error?: { message: string; code: number; type: string };
}

export interface PublishResult {
  mediaId: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function graphPost<T = GraphApiResponse>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & {
    error?: { message: string; code: number };
  };

  if (data.error) {
    const err = data.error;
    throw new Error(
      `Instagram API error (${err.code}): ${err.message}`
    );
  }

  return data;
}

async function graphGet<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH_API}${path}?${qs}`);
  const data = (await res.json()) as T & {
    error?: { message: string; code: number };
  };
  if (data.error) {
    throw new Error(
      `Instagram API error (${data.error.code}): ${data.error.message}`
    );
  }
  return data;
}

/**
 * Poll container status until it is FINISHED or errors out.
 * Instagram needs time to download and process hosted images.
 */
async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxAttempts = 10,
  intervalMs = 3_000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await graphGet<ContainerStatusResponse>(
      `/${containerId}`,
      { fields: "status_code", access_token: accessToken }
    );

    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") {
      throw new Error(
        `Container ${containerId} failed processing`
      );
    }
    // IN_PROGRESS — wait and retry
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Container ${containerId} did not finish within ${maxAttempts * intervalMs}ms`
  );
}

// ---------------------------------------------------------------------------
// Rate-limit guard
// ---------------------------------------------------------------------------

/**
 * Check the content publishing rate limit before posting.
 * The Instagram Graph API exposes quota usage via the
 * GET /{ig-user-id}/content_publishing_limit endpoint.
 *
 * Returns the number of posts remaining in the current 24 h window.
 * If the endpoint is unavailable, returns Infinity (optimistic).
 */
export async function getRemainingQuota(): Promise<number> {
  try {
    const { accessToken, userId } = getConfig();
    const data = await graphGet<{
      data?: { config?: { quota_total?: number }; quota_usage?: number }[];
    }>(`/${userId}/content_publishing_limit`, {
      fields: "config,quota_usage",
      access_token: accessToken,
    });
    const entry = data.data?.[0];
    if (!entry) return Infinity;
    const total = entry.config?.quota_total ?? 25;
    const used = entry.quota_usage ?? 0;
    return Math.max(total - used, 0);
  } catch {
    // If the endpoint is not available, assume we have quota
    return Infinity;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Publish a single photo to Instagram.
 *
 * @param imageUrl  Publicly accessible URL of the image (JPEG/PNG, max 8 MB)
 * @param caption   Post caption (max 2200 chars)
 * @returns         Published media ID
 */
export async function publishPhoto(
  imageUrl: string,
  caption: string
): Promise<PublishResult> {
  const { accessToken, userId } = getConfig();

  // Check rate limit
  const remaining = await getRemainingQuota();
  if (remaining <= 0) {
    throw new Error("Instagram daily posting limit (25) reached");
  }

  // Step 1: Create media container
  const container = await graphPost<GraphApiResponse>(
    `/${userId}/media`,
    {
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }
  );

  if (!container.id) {
    throw new Error("No container ID returned from media creation");
  }

  // Step 2: Wait for processing
  await waitForContainer(container.id, accessToken);

  // Step 3: Publish
  const published = await graphPost<GraphApiResponse>(
    `/${userId}/media_publish`,
    {
      creation_id: container.id,
      access_token: accessToken,
    }
  );

  if (!published.id) {
    throw new Error("No media ID returned from publish");
  }

  return { mediaId: published.id };
}

/**
 * Publish a carousel (album) of up to 10 images to Instagram.
 *
 * @param imageUrls  Array of publicly accessible image URLs (2-10 items)
 * @param caption    Post caption (max 2200 chars, applied to the carousel)
 * @returns          Published media ID
 */
export async function publishCarousel(
  imageUrls: string[],
  caption: string
): Promise<PublishResult> {
  if (imageUrls.length < 2) {
    throw new Error("Carousel requires at least 2 images");
  }
  if (imageUrls.length > 10) {
    throw new Error("Carousel supports a maximum of 10 images");
  }

  const { accessToken, userId } = getConfig();

  // Check rate limit
  const remaining = await getRemainingQuota();
  if (remaining <= 0) {
    throw new Error("Instagram daily posting limit (25) reached");
  }

  // Step 1: Create individual item containers (no caption on children)
  const childIds: string[] = [];

  for (const url of imageUrls) {
    const child = await graphPost<GraphApiResponse>(
      `/${userId}/media`,
      {
        image_url: url,
        is_carousel_item: true,
        access_token: accessToken,
      }
    );
    if (!child.id) {
      throw new Error(`No container ID for carousel item: ${url}`);
    }
    childIds.push(child.id);
  }

  // Step 2: Wait for all children to finish processing
  await Promise.all(
    childIds.map((id) => waitForContainer(id, accessToken))
  );

  // Step 3: Create the carousel container
  const carousel = await graphPost<GraphApiResponse>(
    `/${userId}/media`,
    {
      media_type: "CAROUSEL",
      children: childIds,
      caption,
      access_token: accessToken,
    }
  );

  if (!carousel.id) {
    throw new Error("No container ID returned for carousel");
  }

  // Step 4: Wait for carousel container
  await waitForContainer(carousel.id, accessToken);

  // Step 5: Publish
  const published = await graphPost<GraphApiResponse>(
    `/${userId}/media_publish`,
    {
      creation_id: carousel.id,
      access_token: accessToken,
    }
  );

  if (!published.id) {
    throw new Error("No media ID returned from carousel publish");
  }

  return { mediaId: published.id };
}
