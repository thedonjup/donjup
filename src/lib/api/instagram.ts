const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";
const IG_USER_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "";

interface GraphApiResponse {
  id?: string;
  error?: { message: string; code: number };
}

/**
 * Step 1: Create a media container on Instagram.
 * The image must be publicly accessible via URL.
 */
export async function createMediaContainer(
  imageUrl: string,
  caption: string
): Promise<string> {
  const res = await fetch(`${GRAPH_API_BASE}/${IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: ACCESS_TOKEN,
    }),
  });

  const data: GraphApiResponse = await res.json();

  if (data.error || !data.id) {
    throw new Error(
      `Failed to create media container: ${data.error?.message ?? "Unknown error"}`
    );
  }

  return data.id;
}

/**
 * Step 2: Publish a previously created media container.
 */
export async function publishMedia(creationId: string): Promise<string> {
  const res = await fetch(`${GRAPH_API_BASE}/${IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: ACCESS_TOKEN,
    }),
  });

  const data: GraphApiResponse = await res.json();

  if (data.error || !data.id) {
    throw new Error(
      `Failed to publish media: ${data.error?.message ?? "Unknown error"}`
    );
  }

  return data.id;
}

/**
 * Post a single image to Instagram.
 * Combines container creation and publishing.
 * Returns the published media ID.
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string
): Promise<string> {
  const creationId = await createMediaContainer(imageUrl, caption);

  // Wait briefly for Instagram to process the container
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return publishMedia(creationId);
}
