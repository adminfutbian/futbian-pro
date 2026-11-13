// src/app/admin/layout.tsx
import RoleGuard from "@/components/RoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={[
        "admingeneral",
        "adminasociacion",
        "admin",
        "multimedia",
        "tesorero",
        "tribunal",
      ]}
    >
      {children}
    </RoleGuard>
  );
}