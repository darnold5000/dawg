import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses a separate layout path — handled by not wrapping login
  return children;
}

export async function AdminGuarded({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
