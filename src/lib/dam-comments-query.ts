import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";

export type DamComment = {
  id: string;
  aptSlug: string;
  aptName: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

type CommentDocument = {
  aptName?: unknown;
  uid?: unknown;
  userId?: unknown;
  userName?: unknown;
  displayName?: unknown;
  text?: unknown;
  content?: unknown;
  createdAt?: unknown;
};

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toIsoString(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    const maybeDate = (value as { toDate?: unknown }).toDate;
    if (typeof maybeDate === "function") {
      const date = maybeDate.call(value);
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return typeof value === "string" ? value : "";
}

export async function getDamComments(
  adminDb: Firestore,
  limit: number
): Promise<DamComment[]> {
  const snapshot = await adminDb
    .collectionGroup("messages")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.flatMap((doc: QueryDocumentSnapshot) => {
    const raw = doc.data() as CommentDocument;
    const aptDoc = doc.ref.parent.parent;
    if (!aptDoc || aptDoc.parent.id !== "comments") return [];

    const aptSlug = aptDoc.id;

    return {
      id: doc.id,
      aptSlug,
      aptName: stringOrFallback(raw.aptName, aptSlug || "-"),
      userId: stringOrFallback(raw.userId, stringOrFallback(raw.uid, "-")),
      userName: stringOrFallback(
        raw.userName,
        stringOrFallback(raw.displayName, "Anonymous")
      ),
      text: stringOrFallback(raw.text, stringOrFallback(raw.content, "")),
      createdAt: toIsoString(raw.createdAt),
    };
  });
}

export async function deleteDamComment(
  adminDb: Firestore,
  aptSlug: string,
  commentId: string
): Promise<void> {
  await adminDb
    .collection("comments")
    .doc(aptSlug)
    .collection("messages")
    .doc(commentId)
    .delete();
}
