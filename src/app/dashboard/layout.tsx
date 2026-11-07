import RoleGuard from "@/components/RoleGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["admin", "arbitro", "delegado", "user"]}>{children}</RoleGuard>;
}