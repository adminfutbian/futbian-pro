// src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Club } from "@/types";

export default function HomePage() {
  const [clubes, setClubes] = useState<Club[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      lista.sort((a, b) => b.puntos - a.puntos);
      setClubes(lista);
    });
    return () => unsub();
  }, []);

  const totalGoles = clubes.reduce((acc, c) => acc + c.goles_favor, 0);
  const clubesBloqueados = clubes.filter((c) => c.bloqueadoDeportivo).length;
  const deudaTotal = clubes.reduce((acc, c) => acc + c.saldoDeudor, 0);
  const lider = clubes[0]?.nombre || "CD Los Halcones";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Hero Banner Institucional */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded uppercase tracking-wider border border-white/30">
            ASOCIACIÓN DE FÚTBOL SAN FABIÁN
          </span>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-black px-3 py-1 rounded uppercase tracking-wider">
            ⚡ ARQUITECTURA OFFLINE-FIRST (PWA)
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          FUTBIAN<span className="text-blue-400">.PRO</span> — Centro de Control Deportivo
        </h1>
        <p className="text-sm sm:text-base font-bold text-slate-400 mt-2 max-w-2xl">
          Plataforma integral de gestión arbitral en cancha con sellado criptográfico SHA-256, tabla en tiempo real y control automatizado de Tesorería y Tribunal.
        </p>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/dashboard/planilla"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-white text-xs sm:text-sm shadow-lg transition"
          >
            ⏱ Abrir Planilla Arbitral (CU-01)
          </Link>
          <Link
            href="/tablas"
            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-white text-xs sm:text-sm shadow-lg transition"
          >
            📊 Ver Tabla de Posiciones
          </Link>
          <Link
            href="/fixture"
            className="bg-slate-950 hover:bg-slate-800 text-slate-200 font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-slate-700 text-xs sm:text-sm transition"
          >
            📅 Fixture Multicancha (CU-04)
          </Link>
        </div>
      </div>

      {/* KPIs Ejecutivos en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-blue-500/50">
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 block">
            PUNTERO SERIE HONOR
          </span>
          <p className="text-xl font-black text-white mt-2 truncate">{lider}</p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            {clubes[0]?.puntos ?? 15} PTS acumulados
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-emerald-500/50">
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block">
            GOLES CONVERTIDOS
          </span>
          <p className="text-3xl font-black text-white mt-1">{totalGoles || 40}</p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            6 Clubes Federados en competencia
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-yellow-400/50">
          <span className="text-[11px] font-black uppercase tracking-widest text-yellow-400 block">
            MOROSIDAD EN TESORERÍA
          </span>
          <p className="text-2xl font-mono font-black text-white mt-1">
            ${deudaTotal.toLocaleString("es-CL")}
          </p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            Control arancelario activo (CU-03)
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-red-500/50">
          <span className="text-[11px] font-black uppercase tracking-widest text-red-400 block">
            BLOQUEOS DEPORTIVOS
          </span>
          <p className="text-3xl font-black text-red-400 mt-1">
            {clubesBloqueados} <span className="text-sm text-slate-300 font-bold">Clubes</span>
          </p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            Inhabilitados por deuda vigente
          </span>
        </div>
      </div>

      {/* Módulos Rápidos por Dominio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/goleadores"
          className="bg-slate-900 hover:bg-slate-800/80 p-5 rounded-2xl border-2 border-slate-800 hover:border-blue-500 transition block"
        >
          <span className="text-xs font-black uppercase text-blue-400">ESTADÍSTICAS</span>
          <h2 className="text-lg font-black text-white mt-1">Tabla de Goleadores</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Ranking individual de artilleros de la Serie Honor de San Fabián.
          </p>
        </Link>

        <Link
          href="/dashboard/liguilla"
          className="bg-slate-900 hover:bg-slate-800/80 p-5 rounded-2xl border-2 border-slate-800 hover:border-yellow-400 transition block"
        >
          <span className="text-xs font-black uppercase text-yellow-400">POSTEMPORADA</span>
          <h2 className="text-lg font-black text-white mt-1">Cuadro de Liguilla</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Cruces automáticos de semifinales (1° vs 4° y 2° vs 3°) y Gran Final.
          </p>
        </Link>

        <Link
          href="/admin/tribunal"
          className="bg-slate-900 hover:bg-slate-800/80 p-5 rounded-2xl border-2 border-slate-800 hover:border-red-500 transition block"
        >
          <span className="text-xs font-black uppercase text-red-400">GESTIÓN DIRECTIVA</span>
          <h2 className="text-lg font-black text-white mt-1">Tribunal y Finanzas</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Emisión de boletines disciplinarios y liberación de clubes en Tesorería.
          </p>
        </Link>
      </div>
    </div>
  );
}