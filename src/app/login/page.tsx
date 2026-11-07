// src/app/login/page.tsx
"use client";

import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard/planilla");
    } catch (err) {
      console.error(err);
      setError("Credenciales inválidas o usuario no registrado en Firebase Auth.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white border-2 border-white shadow-lg">
            SF
          </div>
          <span className="inline-block bg-slate-950 text-blue-400 border border-blue-500/40 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            SEGURIDAD RBAC • ISO/IEC 27001
          </span>
          <h1 className="text-2xl font-black text-white">
            Acceso Oficial Futbian.pro
          </h1>
          <p className="text-xs font-bold text-slate-400">
            Ingrese con su cuenta de Árbitro, Tribunal, Tesorería o Directiva
          </p>
        </div>

        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-300 p-3.5 rounded-xl text-xs font-black text-center">
            {error}
          </div>
        )}

        <form onSubmit={iniciarSesion} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Correo Electrónico Institucional
            </label>
            <input
              type="email"
              placeholder="arbitro@futbian.pro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 focus:border-blue-500 p-3.5 rounded-xl font-bold outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Clave de Seguridad
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 focus:border-blue-500 p-3.5 rounded-xl font-bold outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider py-4 rounded-xl border-2 border-white shadow-lg transition"
          >
            {cargando ? "Verificando Credenciales..." : "🔐 Ingresar a la Plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
}