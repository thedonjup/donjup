"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import {
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  collectionGroup,
} from "firebase/firestore";

interface Comment {
  id: string;
  aptId: string;
  aptName: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export default function CommentsManagement() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const data: Comment[] = snapshot.docs.map((d) => {
        const raw = d.data();
        // Parent path: apartments/{aptId}/comments/{commentId}
        const parentPath = d.ref.parent.parent?.id || "";
        return {
          id: d.id,
          aptId: parentPath,
          aptName: (raw.aptName as string) || parentPath || "-",
          userId: (raw.userId as string) || "-",
          userName: (raw.userName as string) || (raw.displayName as string) || "익명",
          text: (raw.text as string) || (raw.content as string) || "",
          createdAt: raw.createdAt?.toDate?.()
            ? raw.createdAt.toDate().toISOString()
            : (raw.createdAt as string) || "",
        };
      });
      setComments(data);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleDelete = async (comment: Comment) => {
    if (!confirm(`"${comment.text.slice(0, 30)}..." 댓글을 삭제하시겠습니까?`)) return;
    setDeleting(comment.id);
    try {
      const docRef = doc(db, "apartments", comment.aptId, "comments", comment.id);
      await deleteDoc(docRef);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>댓글 관리</h1>
        <button
          onClick={fetchComments}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
          style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }}
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>댓글이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>아파트</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>작성자</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>내용</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>작성일</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {comment.aptName}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                      {comment.userName}
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-2.5" style={{ color: "var(--color-text-primary)" }}>
                      {comment.text}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {comment.createdAt
                        ? new Date(comment.createdAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(comment)}
                        disabled={deleting === comment.id}
                        className="rounded px-2.5 py-1 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                        style={{ background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }}
                      >
                        {deleting === comment.id ? "삭제 중..." : "삭제"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
