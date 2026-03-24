"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSignInTime: string | null;
  creationTime: string | null;
}

export default function UsersManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function fetchUsers() {
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "회원 목록 로딩 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUsers();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          회원 관리
        </h1>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          회원 관리
        </h1>
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
        >
          <div className="mb-4 text-4xl">👥</div>
          <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Firebase Admin SDK 연동 후 회원 목록이 표시됩니다
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            서버 사이드에서 Firebase Admin SDK를 사용하여 사용자 목록을 조회할 수 있습니다.
            현재는 클라이언트 SDK만 설정되어 있어 사용자 목록 조회가 제한됩니다.
          </p>
          <p className="mb-4 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            오류: {error}
          </p>
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "#f59e0b" }}
          >
            Firebase Console 열기
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          회원 관리
        </h1>
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }}
        >
          총 {total.toLocaleString()}명
        </span>
      </div>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  사용자
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  이메일
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  가입일
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  마지막 로그인
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.uid}
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt=""
                          width={32}
                          height={32}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--color-surface-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            flexShrink: 0,
                          }}
                        >
                          {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {u.displayName || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                    {u.email || "-"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-tertiary)" }}>
                    {u.creationTime ? formatDate(u.creationTime) : "-"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-tertiary)" }}>
                    {u.lastSignInTime ? formatDate(u.lastSignInTime) : "-"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}
