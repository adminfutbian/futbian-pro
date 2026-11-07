// src/app/dashboard/liguilla/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Club } from "@/types";

export default function LiguillaPage() {
  const [top4, setTop4] = useState<string[]>([
    "CD Los Halcones",
    "Estrella Precordillerana",
    "Unión San Fabián",
    "Deportivo Ñuble",
  ]);

  const [golesSemi1, setGolesSemi1] = useState({ local: 2, visita: 1 });
  const [golesSemi2, setGolesSemi2] = useState({ local: 1, visita: 0 });
  const [golesFinal, setGolesFinal] = useState({ local: 0, visita: 0 });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipos"), (snap) => {
      if (!snap.empty) {
        const data: Club[] = snap.docs.map((d) => ({
          id: d.id,
          nombre: d.data().nombre || d.id,
          puntos: d.data().puntos || 0,
          goles_favor: d.data().goles_favor || 0,
          goles_contra: d.data().goles_contra || 0,
          saldoDeudor: d.data().saldoDeudor || 0,
          bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
        }));
        data.sort((a, b) => b.puntos - a.puntos);
        if (data.length >= 4) {
          setTop4(data.slice(0, 4).map((c) => c.nombre));
        }
      }
    });
    return () => unsub();
  }, []);

  const ganadorSemi1 =
    golesSemi1.local >= golesSemi1.visita ? top4[0] : top4[3];
  const ganadorSemi2 =
    golesSemi2.local >= golesSemi2.visita ? top4[1] : top4[2];
  const campeon =
    golesFinal.local > golesFinal.visita
      ? ganadorSemi1
      : golesFinal.visita > golesFinal.local
      ? ganadorSemi2
      : "Por Definir";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-yellow-400 text-black text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            POSTEMPORADA • ELIMINACIÓN DIRECTA
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Cuadro Oficial de Liguilla (Top 4)
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Emparejamiento automático según clasificación general en tiempo real
          </p>
        </div>
        <div className="bg-slate-950 border-2 border-yellow-400 px-4 py-2 rounded-xl text-right">
          <span className="text-[10px] font-black uppercase text-yellow-400 block">
            🏆 CAMPEÓN PROYECTADO
          </span>
          <span className="text-sm font-black text-white">{campeon}</span>
        </div>
      </div>

      {/* Bracket de Liguilla */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Columna Semifinales */}
        <div className="space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 pl-1">
            SEMIFINALES (IDA Y VUELTA / DEFINICIÓN)
          </h2>

          {/* Llave 1: 1° vs 4° */}
          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-blue-500/60 space-y-3">
            <div className="flex justify-between text-xs font-black uppercase text-slate-400 border-b border-slate-800 pb-2">
              <span>Semifinal A (1° vs 4°)</span>
              <span className="text-blue-400">Estadio Municipal Cancha 1</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-black text-white text-sm">
                <span className="text-blue-400 mr-2">#1</span> {top4[0]}
              </span>
              <input
                type="number"
                min={0}
                value={golesSemi1.local}
                onChange={(e) =>
                  setGolesSemi1({ ...golesSemi1, local: Number(e.target.value) })
                }
                className="w-14 bg-slate-900 text-yellow-400 border-2 border-slate-700 rounded-lg p-1.5 text-center font-black"
              />
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-black text-white text-sm">
                <span className="text-slate-400 mr-2">#4</span> {top4[3]}
              </span>
              <input
                type="number"
                min={0}
                value={golesSemi1.visita}
                onChange={(e) =>
                  setGolesSemi1({ ...golesSemi1, visita: Number(e.target.value) })
                }
                className="w-14 bg-slate-900 text-yellow-400 border-2 border-slate-700 rounded-lg p-1.5 text-center font-black"
              />
            </div>
          </div>

          {/* Llave 2: 2° vs 3° */}
          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-blue-500/60 space-y-3">
            <div className="flex justify-between text-xs font-black uppercase text-slate-400 border-b border-slate-800 pb-2">
              <span>Semifinal B (2° vs 3°)</span>
              <span className="text-blue-400">Cancha Rural La Punilla</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-black text-white text-sm">
                <span className="text-blue-400 mr-2">#2</span> {top4[1]}
              </span>
              <input
                type="number"
                min={0}
                value={golesSemi2.local}
                onChange={(e) =>
                  setGolesSemi2({ ...golesSemi2, local: Number(e.target.value) })
                }
                className="w-14 bg-slate-900 text-yellow-400 border-2 border-slate-700 rounded-lg p-1.5 text-center font-black"
              />
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-black text-white text-sm">
                <span className="text-slate-400 mr-2">#3</span> {top4[2]}
              </span>
              <input
                type="number"
                min={0}
                value={golesSemi2.visita}
                onChange={(e) =>
                  setGolesSemi2({ ...golesSemi2, visita: Number(e.target.value) })
                }
                className="w-14 bg-slate-900 text-yellow-400 border-2 border-slate-700 rounded-lg p-1.5 text-center font-black"
              />
            </div>
          </div>
        </div>

        {/* Columna Gran Final */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-yellow-400 pl-1">
            GRAN FINAL COMUNAL SAN FABIÁN
          </h2>

          <div className="bg-slate-900 p-6 rounded-2xl border-4 border-yellow-400 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
              <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded uppercase">
                🏆 DEFINICIÓN TÍTULO SERIE HONOR
              </span>
              <span className="text-xs font-bold text-slate-400">
                Estadio Municipal
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 block">
                  GANADOR SEMIFINAL A
                </span>
                <span className="font-black text-white text-base">
                  {ganadorSemi1}
                </span>
              </div>
              <input
                type="number"
                min={0}
                value={golesFinal.local}
                onChange={(e) =>
                  setGolesFinal({ ...golesFinal, local: Number(e.target.value) })
                }
                className="w-16 bg-slate-900 text-white border-2 border-white rounded-xl p-2 text-center font-black text-xl"
              />
            </div>

            <div className="text-center font-black text-xs text-yellow-400 uppercase tracking-widest">
              — VS —
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 block">
                  GANADOR SEMIFINAL B
                </span>
                <span className="font-black text-white text-base">
                  {ganadorSemi2}
                </span>
              </div>
              <input
                type="number"
                min={0}
                value={golesFinal.visita}
                onChange={(e) =>
                  setGolesFinal({ ...golesFinal, visita: Number(e.target.value) })
                }
                className="w-16 bg-slate-900 text-white border-2 border-white rounded-xl p-2 text-center font-black text-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}