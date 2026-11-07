"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRol(docSnap.data().rol);
          }
        } catch (e) {
          console.error("Error al obtener rol:", e);
        }
      } else {
        setRol(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
      <Link href="/" className="font-black text-xl tracking-wider text-blue-400">
        FUTBIAN.PRO
      </Link>
      
      <div className="flex gap-4 items-center text-sm font-medium">
        {/* Rutas Públicas */}
        <Link href="/tablas" className="hover:text-blue-300">Posiciones</Link>
        <Link href="/goleadores" className="hover:text-blue-300">Goleadores</Link>
        <Link href="/fixture" className="hover:text-blue-300">Fixture</Link>

        {/* Rutas Usuario / Cancha */}
        {user && (
          <>
            <Link href="/dashboard/planilla" className="text-yellow-400 hover:text-yellow-300">Planilla</Link>
            <Link href="/dashboard/liguilla" className="text-yellow-400 hover:text-yellow-300">Liguilla</Link>
          </>
        )}

        {/* Rutas Administrador */}
        {rol === "admin" && (
          <>
            <Link href="/admin/finanzas" className="text-emerald-400 hover:text-emerald-300">Finanzas</Link>
            <Link href="/admin/tribunal" className="text-emerald-400 hover:text-emerald-300">Tribunal</Link>
            <Link href="/admin/configuracion" className="text-emerald-400 hover:text-emerald-300">Configuración</Link>
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