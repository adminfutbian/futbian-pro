// src/app/tablas/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Club } from "@/types";

export default function TablasPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipos"), (snap) => {
      const data: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));

      data.sort((a, b) => {
        const difA = a.goles_favor - a.goles_contra;
        const difB = b.goles_favor - b.goles_contra;
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        return difB - difA;
      });

      setClubes(data);
      setCargando(false);
    });

    return () => unsub();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
              SERIE HONOR
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              TEMPORADA OFICIAL • TIEMPO REAL
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1 text-white">
            Tabla de Posiciones
          </h1>
        </div>
        <span className="bg-slate-950 text-blue-400 px-3.5 py-2 rounded-xl border-2 border-blue-500/50 text-xs font-black uppercase tracking-wider">
          ● Top 4 Clasifica a Liguilla
        </span>
      </div>

      {/* Tabla de Alto Contraste */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4 text-center w-16">Pos</th>
                <th className="p-4">Club Deportivo</th>
                <th className="p-4 text-center">GF</th>
                <th className="p-4 text-center">GC</th>
                <th className="p-4 text-center">DIF</th>
                <th className="p-4 text-center bg-slate-950/60 text-yellow-400">PTS</th>
                <th className="p-4 text-center">Estado Deportivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-bold text-slate-400">
                    Sincronizando clasificación desde Cloud Firestore...
                  </td>
                </tr>
              ) : (
                clubes.map((club, idx) => {
                  const dif = club.goles_favor - club.goles_contra;
                  const enLiguilla = idx < 4;
                  return (
                    <tr
                      key={club.id}
                      className={`transition hover:bg-slate-800/50 ${
                        enLiguilla ? "border-l-4 border-l-blue-500" : ""
                      }`}
                    >
                      <td className="p-4 text-center font-black">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs border-2 ${
                            enLiguilla
                              ? "bg-blue-600 text-white border-white"
                              : "bg-slate-950 text-slate-400 border-slate-700"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-4 font-black text-white text-base">
                        {club.nombre}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-300">
                        {club.goles_favor}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-300">
                        {club.goles_contra}
                      </td>
                      <td className="p-4 text-center font-mono font-black">
                        <span
                          className={
                            dif > 0
                              ? "text-emerald-400"
                              : dif < 0
                              ? "text-red-400"
                              : "text-slate-400"
                          }
                        >
                          {dif > 0 ? `+${dif}` : dif}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-xl bg-slate-950/50 text-yellow-400">
                        {club.puntos}
                      </td>
                      <td className="p-4 text-center">
                        {club.bloqueadoDeportivo ? (
                          <span className="inline-block bg-red-950 text-red-300 border-2 border-red-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                            🔒 Bloqueado (Morosidad)
                          </span>
                        ) : (
                          <span className="inline-block bg-emerald-950 text-emerald-300 border-2 border-emerald-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                            ✓ Habilitado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}