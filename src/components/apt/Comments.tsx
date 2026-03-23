"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/components/providers/AuthProvider";
import LoginModal from "@/components/auth/LoginModal";

interface Comment {
  id: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

export default function Comments({ aptSlug }: { aptSlug: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "comments", aptSlug, "messages"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Comment, "id">),
      }));
      setComments(items);
    });
    return unsubscribe;
  }, [aptSlug]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !text.trim() || submitting) return;

      setSubmitting(true);
      try {
        await addDoc(collection(db, "comments", aptSlug, "messages"), {
          uid: user.uid,
          displayName: user.displayName ?? "익명",
          photoURL: user.photoURL ?? null,
          text: text.trim(),
          createdAt: serverTimestamp(),
        });
        setText("");
      } catch {
        // silently fail
      } finally {
        setSubmitting(false);
      }
    },
    [user, text, submitting, aptSlug]
  );

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
      }}
    >
      <h2 className="mb-4 text-lg font-bold t-text">댓글</h2>

      {/* Comment form or login prompt */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-8 w-8 flex-shrink-0 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {(user.displayName ?? "U")[0]}
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 200))}
                placeholder="이 단지에 대한 의견을 남겨주세요..."
                rows={3}
                className="w-full resize-none rounded-xl border p-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-500"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-elevated)",
                  color: "var(--color-text-primary)",
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {text.length}/200
                </span>
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "작성 중..." : "작성"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-xl py-8 text-center" style={{ background: "var(--color-surface-elevated)" }}>
          <p
            className="mb-3 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            로그인하고 이 단지에 대한 의견을 남겨보세요.
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            로그인하기
          </button>
          <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p
          className="py-6 text-center text-sm"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.photoURL ? (
                <img
                  src={c.photoURL}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {(c.displayName ?? "U")[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {c.displayName}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {c.createdAt ? timeAgo(c.createdAt.toDate()) : "방금 전"}
                  </span>
                </div>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
