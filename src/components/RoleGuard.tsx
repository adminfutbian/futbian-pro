"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const rol = snap.exists() ? snap.data().rol : "user";

      if (allowedRoles.includes(rol) || rol === "admin") {
        setAutorizado(true);
      } else {
        router.push("/");
      }
      setCargando(false);
    });
    return () => unsub();
  }, [allowedRoles, router]);

  if (cargando) {
    return <div className="p-8 text-center text-sm text-gray-500">Verificando credenciales de seguridad...</div>;
  }

  return autorizado ? <>{children}</> : null;
}