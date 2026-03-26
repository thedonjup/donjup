export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  return adminEmails.includes(email);
}
