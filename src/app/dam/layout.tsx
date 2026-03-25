import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayout";

export const metadata: Metadata = {
  title: {
    default: "관리자",
    template: "%s | 관리자",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
