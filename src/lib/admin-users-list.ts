import type { Auth, UserRecord } from "firebase-admin/auth";
import type { AdminUsersQuery } from "@/lib/admin-users-query";

export type AdminUserListItem = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSignInTime: string | null;
  creationTime: string | null;
};

export type AdminUsersListResponse = {
  users: AdminUserListItem[];
  total: number;
  pageToken: string | null;
};

function toAdminUserListItem(user: UserRecord): AdminUserListItem {
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    lastSignInTime: user.metadata.lastSignInTime ?? null,
    creationTime: user.metadata.creationTime ?? null,
  };
}

export async function listAdminUsers(
  adminAuth: Pick<Auth, "listUsers">,
  query: AdminUsersQuery
): Promise<AdminUsersListResponse> {
  const listResult = await adminAuth.listUsers(query.maxResults, query.pageToken);
  const users = listResult.users.map(toAdminUserListItem);

  return {
    users,
    total: users.length,
    pageToken: listResult.pageToken ?? null,
  };
}
