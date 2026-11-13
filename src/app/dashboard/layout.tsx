// src/app/dashboard/layout.tsx
import RoleGuard from "@/components/RoleGuard";

export default function DashboardLayout({
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
        "arbitro",
        "turno",
        "delegado",
      ]}
    >
      {children}
    </RoleGuard>
  );
}