import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, type Firestore } from "firebase-admin/firestore";

type CommentCreateInput = {
  aptSlug: string;
  text: string;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function saveComment(
  adminDb: Firestore,
  decoded: DecodedIdToken,
  comment: CommentCreateInput
): Promise<void> {
  await adminDb
    .collection("comments")
    .doc(comment.aptSlug)
    .collection("messages")
    .add({
      uid: decoded.uid,
      displayName: stringOrNull(decoded.name) ?? stringOrNull(decoded.email) ?? "?듬챸",
      photoURL: stringOrNull(decoded.picture),
      text: comment.text,
      createdAt: FieldValue.serverTimestamp(),
    });
}
