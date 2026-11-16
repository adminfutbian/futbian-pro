// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { descargarArchivoAuditoria } from "@/lib/auditLogger";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<string>("hincha");
  const [menuAbierto, setMenuAbierto] = useState(false);

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
  const esTurno = rol === "turno";
  const esMultimedia = rol === "multimedia";

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <header className="bg-slate-900 border-b-2 border-slate-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-3">
        {/* Marca y Badge de Perfil */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            onClick={cerrarMenu}
            className="font-black text-lg sm:text-xl tracking-wider text-blue-400 shrink-0"
          >
            FUTBIAN.PRO
          </Link>
          <span className="bg-slate-950 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase truncate">
            {rol}
          </span>
        </div>

        {/* Acciones Rápidas Móvil + Botón Hamburguesa */}
        <div className="flex items-center gap-2 xl:hidden">
          <Link
            href="/en-vivo"
            onClick={cerrarMenu}
            className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase border border-white"
          >
            🔴 Vivo
          </Link>
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="bg-slate-950 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg border-2 border-slate-700 text-xs font-black uppercase"
          >
            {menuAbierto ? "✕ Cerrar" : "☰ Menú"}
          </button>
        </div>

        {/* Navegación Desktop (Pantallas Grandes) */}
        <nav className="hidden xl:flex flex-wrap gap-2.5 items-center text-xs font-bold">
          <Link
            href="/"
            className={`px-2.5 py-1.5 rounded-lg transition ${
              pathname === "/" ? "bg-blue-600 text-white" : "hover:text-blue-300"
            }`}
          >
            Inicio
          </Link>
          <Link
            href="/tablas"
            className={`px-2.5 py-1.5 rounded-lg transition ${
              pathname === "/tablas"
                ? "bg-blue-600 text-white"
                : "hover:text-blue-300"
            }`}
          >
            Posiciones
          </Link>
          <Link
            href="/goleadores"
            className={`px-2.5 py-1.5 rounded-lg transition ${
              pathname === "/goleadores"
                ? "bg-blue-600 text-white"
                : "hover:text-blue-300"
            }`}
          >
            Goleadores
          </Link>
          <Link
            href="/fixture"
            className={`px-2.5 py-1.5 rounded-lg transition ${
              pathname === "/fixture"
                ? "bg-blue-600 text-white"
                : "hover:text-blue-300"
            }`}
          >
            Fixture
          </Link>
          <Link
            href="/hazte-fan"
            className="bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-black uppercase hover:bg-yellow-300 border border-white transition"
          >
            ⭐ Hazte Fan
          </Link>
              <Link
  href="/manual"
  className={`px-3 py-1.5 rounded-lg font-black uppercase text-xs border transition ${
    pathname === "/manual"
      ? "bg-cyan-500 text-black border-white"
      : "bg-slate-950 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500 hover:text-black"
  }`}
>
  📖 Manual
</Link>


          <Link
            href="/en-vivo"
            className="bg-red-600/20 text-red-400 border border-red-500/60 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition"
          >
            🔴 En Vivo
          </Link>

          {(esDelegado || esAdminAsociacion || esAdminGeneral) && (
            <Link
              href="/dashboard/mi-club"
              className="text-yellow-400 hover:text-yellow-300 px-2 py-1"
            >
              Mi Club
            </Link>
          )}

          {(esTurno || esArbitro || esAdminAsociacion || esAdminGeneral) && (
            <>
              <Link
                href="/dashboard/planilla"
                className="text-yellow-400 hover:text-yellow-300 px-2 py-1"
              >
                Planilla
              </Link>
              <Link
                href="/dashboard/liguilla"
                className="text-yellow-400 hover:text-yellow-300 px-2 py-1"
              >
                Liguilla
              </Link>
            </>
          )}

          {(esMultimedia || esAdminAsociacion || esAdminGeneral) && (
            <Link
              href="/admin/multimedia"
              className="text-pink-400 hover:text-pink-300 px-2 py-1"
            >
              Config. Vivo
            </Link>
          )}

          {(esAdminAsociacion || esAdminGeneral) && (
            <>
              <Link
                href="/admin/finanzas"
                className="text-emerald-400 hover:text-emerald-300 px-2 py-1"
              >
                Finanzas
              </Link>
              <Link
                href="/admin/tribunal"
                className="text-emerald-400 hover:text-emerald-300 px-2 py-1"
              >
                Tribunal
              </Link>
              <Link
                href="/admin/torneos"
                className="text-emerald-400 hover:text-emerald-300 px-2 py-1"
              >
                Torneos
              </Link>
              <Link
                href="/admin/usuarios"
                className="text-emerald-400 hover:text-emerald-300 px-2 py-1"
              >
                Perfiles
              </Link>
              <Link
                href="/admin/configuracion"
                className="text-emerald-400 hover:text-emerald-300 px-2 py-1"
              >
                Configuración
              </Link>
              <button
                type="button"
                onClick={descargarArchivoAuditoria}
                className="bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-400/50 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase"
              >
                📥 Bitácora
              </button>
            </>
          )}

          {user ? (
            <button
              onClick={() => signOut(auth)}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>

      {/* Menú Desplegable Responsivo para Móvil y Tablet */}
      {menuAbierto && (
        <div className="xl:hidden bg-slate-950 border-t-2 border-slate-800 px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-black uppercase">
            <Link
              href="/"
              onClick={cerrarMenu}
              className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"
            >
              🏠 Inicio
            </Link>
            <Link
              href="/tablas"
              onClick={cerrarMenu}
              className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"
            >
              📊 Posiciones
            </Link>
            <Link
              href="/goleadores"
              onClick={cerrarMenu}
              className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"
            >
              ⚽ Goleadores
            </Link>
            <Link
              href="/fixture"
              onClick={cerrarMenu}
              className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center"
            >
              📅 Fixture
            </Link>
            <Link
              href="/hazte-fan"
              onClick={cerrarMenu}
              className="bg-yellow-400 text-black p-3 rounded-xl border border-white text-center"
            >
              ⭐ Hazte Fan
            </Link>
            <Link
  href="/manual"
  onClick={cerrarMenu}
  className="bg-slate-900 text-cyan-300 p-3 rounded-xl border border-cyan-500/40 text-center"
>
  📖 Manual App
</Link>

            <Link
              href="/en-vivo"
              onClick={cerrarMenu}
              className="bg-red-600 text-white p-3 rounded-xl border border-white text-center"
            >
              🔴 En Vivo
            </Link>

            {(esDelegado || esAdminAsociacion || esAdminGeneral) && (
              <Link
                href="/dashboard/mi-club"
                onClick={cerrarMenu}
                className="bg-slate-900 text-yellow-400 p-3 rounded-xl border border-yellow-400/40 text-center"
              >
                🛡️ Mi Club
              </Link>
            )}

            {(esTurno || esArbitro || esAdminAsociacion || esAdminGeneral) && (
              <>
                <Link
                  href="/dashboard/planilla"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-yellow-400 p-3 rounded-xl border border-yellow-400/40 text-center"
                >
                  ⏱ Planilla
                </Link>
                <Link
                  href="/dashboard/liguilla"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-yellow-400 p-3 rounded-xl border border-yellow-400/40 text-center"
                >
                  🏆 Liguilla
                </Link>
              </>
            )}

            {(esMultimedia || esAdminAsociacion || esAdminGeneral) && (
              <Link
                href="/admin/multimedia"
                onClick={cerrarMenu}
                className="bg-slate-900 text-pink-400 p-3 rounded-xl border border-pink-500/40 text-center"
              >
                📡 Config. Vivo
              </Link>
            )}

            {(esAdminAsociacion || esAdminGeneral) && (
              <>
                <Link
                  href="/admin/finanzas"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-emerald-500/40 text-center"
                >
                  💳 Finanzas
                </Link>
                <Link
                  href="/admin/tribunal"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-emerald-500/40 text-center"
                >
                  ⚖ Tribunal
                </Link>
                <Link
                  href="/admin/torneos"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-emerald-500/40 text-center"
                >
                  🏅 Torneos
                </Link>
                <Link
                  href="/admin/usuarios"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-emerald-500/40 text-center"
                >
                  👥 Perfiles
                </Link>
                <Link
                  href="/admin/configuracion"
                  onClick={cerrarMenu}
                  className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-emerald-500/40 text-center"
                >
                  ⚙️ Config.
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    descargarArchivoAuditoria();
                    cerrarMenu();
                  }}
                  className="bg-slate-900 text-amber-300 p-3 rounded-xl border border-amber-400/40 text-center uppercase font-black"
                >
                  📥 Bitácora TXT
                </button>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            {user ? (
              <button
                onClick={() => {
                  signOut(auth);
                  cerrarMenu();
                }}
                className="w-full bg-red-600 text-white py-3 rounded-xl text-xs font-black uppercase"
              >
                Cerrar Sesión
              </button>
            ) : (
              <Link
                href="/login"
                onClick={cerrarMenu}
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase text-center"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}