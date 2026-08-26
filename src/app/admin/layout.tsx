import AdminShell from "@/components/admin/admin-shell";

// Hidden admin panel — requires admin session (login gate inside shell)
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
