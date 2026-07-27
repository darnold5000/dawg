/** Admin routes use auth, staff roles, and Supabase — never static prerender. */
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
