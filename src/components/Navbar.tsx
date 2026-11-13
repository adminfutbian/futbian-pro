// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { descargarArchivoAuditoria } from "@/lib/auditLogger";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<string>("hincha");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRol(docSnap.data().rol || "hincha");
          }
        } catch (e) {
          console.error("Error al obtener rol:", e);
        }
      } else {
        setRol("hincha");
      }
    });
    return () => unsubscribe();
  }, []);

  const esAdminGeneral = rol === "admingeneral" || rol === "admin";
  const esAdminAsociacion = rol === "adminasociacion";
  const esDelegado = rol === "delegado";
  const esArbitro = rol === "arbitro";

  return (
    <nav className="bg-slate-900 border-b-2 border-slate-800 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-4 shadow-md">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-black text-xl tracking-wider text-blue-400">
          FUTBIAN.PRO
        </Link>
        <span className="bg-slate-950 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
          Perfil: {rol}
        </span>
      </div>

      <div className="flex flex-wrap gap-3.5 items-center text-xs sm:text-sm font-bold">
        {/* Rutas Públicas y para Hincha */}
        <Link href="/" className="hover:text-blue-300">
          Inicio
        </Link>
        <Link href="/tablas" className="hover:text-blue-300">
          Posiciones
        </Link>
        <Link href="/goleadores" className="hover:text-blue-300">
          Goleadores
        </Link>
        <Link href="/fixture" className="hover:text-blue-300">
          Fixture
        </Link>
        <Link
          href="/hazte-fan"
          className="bg-yellow-400 text-black px-3 py-1 rounded-lg font-black uppercase text-xs hover:bg-yellow-300 border border-white transition"
        >
          ⭐ Hazte Fan
        </Link>
        <Link
          href="/en-vivo"
          className="bg-red-600/20 text-red-400 border border-red-500/60 px-2.5 py-1 rounded-lg hover:bg-red-600 hover:text-white transition"
        >
          🔴 En Vivo
        </Link>

        {/* Ruta Delegado (Solo ve su club) + Admins */}
        {(esDelegado || esAdminAsociacion || esAdminGeneral) && (
          <Link
            href="/dashboard/mi-club"
            className="text-yellow-400 hover:text-yellow-300"
          >
            Mi Club
          </Link>
        )}

        {/* Ruta Planilla Arbitral (AdminAsociacion en modo lectura, Arbitro y AdminGeneral editan) */}
        {(esArbitro || esAdminAsociacion || esAdminGeneral) && (
          <Link
            href="/dashboard/planilla"
            className="text-yellow-400 hover:text-yellow-300"
          >
            Planilla
          </Link>
        )}

        {/* Módulos de Gestión Asociación y General */}
        {(esAdminAsociacion || esAdminGeneral) && (
          <>
            <Link
              href="/admin/finanzas"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Finanzas
            </Link>
            <Link
              href="/admin/tribunal"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Tribunal
            </Link>
            <Link
              href="/admin/torneos"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Torneos
            </Link>
            <Link
              href="/admin/usuarios"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Perfiles
            </Link>
            <Link
              href="/admin/configuracion"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Configuración
            </Link>
            <button
              type="button"
              onClick={descargarArchivoAuditoria}
              className="bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-400/50 px-2.5 py-1 rounded-lg text-xs font-black uppercase"
              title="Descargar archivo de auditoría con fecha y hora"
            >
              📥 Bitácora TXT
            </button>
          </>
        )}

        {/* Autenticación */}
        {user ? (
          <button
            onClick={() => signOut(auth)}
            className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            Salir
          </button>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}