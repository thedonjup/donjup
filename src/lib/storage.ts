import { put } from "@vercel/blob";
import { logger } from "./logger";

/**
 * Upload a Buffer to Vercel Blob and return the URL.
 *
 * @param path  - Logical path/filename in storage (e.g., 'cardnews/2026.04.05/1.png')
 * @param body  - File content as Buffer
 * @param contentType - Optional MIME type
 */
export async function uploadToBlob(
  path: string,
  body: Buffer,
  contentType = "image/png"
): Promise<string> {
  try {
    const blob = await put(path, body, {
      access: "public",
      contentType,
      addRandomSuffix: true, // Prevent overwriting
    });

    return blob.url;
  } catch (error) {
    logger.error("Vercel Blob upload failed", { path, error });
    throw new Error(`Failed to upload to Vercel Blob: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Upload multiple buffers to Vercel Blob.
 */
export async function uploadMultipleToBlob(
  prefix: string,
  buffers: Buffer[]
): Promise<string[]> {
  const uploadPromises = buffers.map((buffer, index) => {
    const filename = `${prefix}/${index + 1}.png`;
    return uploadToBlob(filename, buffer);
  });

  return Promise.all(uploadPromises);
}
