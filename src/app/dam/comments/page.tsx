"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { createDamAuthHeaders } from "@/lib/dam-api-client";

interface Comment {
  id: string;
  aptSlug: string;
  aptName: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface CommentsResponse {
  comments?: Comment[];
  error?: string;
}

export default function CommentsManagement() {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/dam/comments?limit=50", {
        headers: createDamAuthHeaders(idToken),
      });

      const data = (await res.json().catch(() => ({}))) as CommentsResponse;
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setComments(data.comments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 목록 로딩 실패");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchComments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (comment: Comment) => {
    if (!confirm(`"${comment.text.slice(0, 30)}..." 댓글을 삭제하시겠습니까?`)) return;
    setDeleting(comment.id);
    setError(null);
    try {
      if (!user) throw new Error("Admin login required");

      const idToken = await user.getIdToken();
      const res = await fetch("/api/dam/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...createDamAuthHeaders(idToken),
        },
        body: JSON.stringify({ aptSlug: comment.aptSlug, commentId: comment.id }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 삭제 실패");
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
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
          style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }}
        >
          새로고침
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-semantic-drop)" }}>{error}</p>
        </div>
      )}

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
