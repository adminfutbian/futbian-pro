// src/components/Navbar.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Inicio", zona: "publica" },
    { href: "/tablas", label: "Posiciones", zona: "publica" },
    { href: "/goleadores", label: "Goleadores", zona: "publica" },
    { href: "/fixture", label: "Fixture", zona: "publica" },
    { href: "/dashboard/planilla", label: "Planilla Cancha", zona: "cancha" },
    { href: "/admin/tribunal", label: "Tribunal", zona: "admin" },
    { href: "/admin/finanzas", label: "Tesorería", zona: "admin" },
  ];

  return (
    <header className="bg-slate-950 text-white border-b-4 border-blue-600 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Branding Institucional */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xl tracking-tighter border-2 border-white shadow-sm">
              SF
            </div>
            <div>
              <span className="font-black text-lg tracking-tight block leading-none">
                FUTBIAN<span className="text-blue-400">.PRO</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mt-0.5">
                Asoc. San Fabián
              </span>
            </div>
          </Link>

          {/* Estado de Red (Visible siempre en móvil y desktop) */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 ${
                online
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                  : "bg-amber-950 text-amber-300 border-amber-400 animate-pulse"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  online ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="hidden sm:inline">
                {online ? "Cloud Online" : "Offline Outbox"}
              </span>
              <span className="sm:hidden">{online ? "ON" : "OFF"}</span>
            </div>

            {/* Botón Menú Móvil (Táctil de alto contraste) */}
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="lg:hidden bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg border-2 border-slate-600 font-bold text-xs uppercase"
              aria-label="Abrir menú"
            >
              {menuAbierto ? "Cerrar ✕" : "Menú ☰"}
            </button>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const activo = pathname === link.href;
              const esCancha = link.zona === "cancha";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition border-2 ${
                    activo
                      ? "bg-blue-600 text-white border-white"
                      : esCancha
                      ? "bg-slate-900 text-yellow-400 border-yellow-400/60 hover:bg-yellow-400 hover:text-black"
                      : "bg-transparent text-slate-300 border-transparent hover:bg-slate-900 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Navegación Móvil Desplegable (Botones grandes para terreno) */}
      {menuAbierto && (
        <nav className="lg:hidden bg-slate-900 border-t-2 border-slate-800 px-4 pt-3 pb-5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const activo = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAbierto(false)}
                  className={`p-3 rounded-lg text-center text-xs font-black uppercase tracking-wider border-2 ${
                    activo
                      ? "bg-blue-600 text-white border-white"
                      : "bg-slate-800 text-slate-200 border-slate-700 active:bg-slate-700"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}