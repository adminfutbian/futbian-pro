// src/app/goleadores/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Jugador } from "@/types";

const GOLEADORES_RESPALDO: Jugador[] = [
  { id: "1", nombre: "Matías Sepúlveda (#9)", club: "CD Los Halcones", serie: "Honor", goles: 8, sancionado: false },
  { id: "2", nombre: "Cristóbal Muñoz (#10)", club: "Estrella Precordillerana", serie: "Honor", goles: 6, sancionado: false },
  { id: "3", nombre: "Diego Valdés (#7)", club: "Unión San Fabián", serie: "Honor", goles: 5, sancionado: false },
  { id: "4", nombre: "Sebastián Contreras (#11)", club: "Deportivo Ñuble", serie: "Honor", goles: 4, sancionado: true },
  { id: "5", nombre: "Felipe Riquelme (#8)", club: "CD Los Halcones", serie: "Honor", goles: 3, sancionado: false },
  { id: "6", nombre: "Nicolás Fuentes (#19)", club: "Cóndores del Valle", serie: "Honor", goles: 2, sancionado: false },
];

export default function GoleadoresPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>(GOLEADORES_RESPALDO);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jugadores"), (snap) => {
      if (!snap.empty) {
        const lista: Jugador[] = snap.docs.map((d) => ({
          id: d.id,
          nombre: d.data().nombre || "Jugador",
          club: d.data().club || "San Fabián",
          serie: d.data().serie || "Honor",
          goles: d.data().goles || 0,
          sancionado: d.data().sancionado || false,
        }));
        lista.sort((a, b) => b.goles - a.goles);
        setJugadores(lista);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            ESTADÍSTICAS INDIVIDUALES • SERIE HONOR
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Ranking Oficial de Goleadores
          </h1>
        </div>
        <span className="bg-slate-950 text-yellow-400 px-3.5 py-2 rounded-xl border-2 border-yellow-400/50 text-xs font-black uppercase tracking-wider">
          ⚽ Artilleros Temporada Oficial
        </span>
      </div>

      {/* Tabla de Goleadores */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4 text-center w-16">Rank</th>
                <th className="p-4">Jugador / Dorsal</th>
                <th className="p-4">Club Federado</th>
                <th className="p-4 text-center">Serie</th>
                <th className="p-4 text-center">Estado Tribunal</th>
                <th className="p-4 text-center bg-slate-950/60 text-yellow-400">Goles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {jugadores.map((j, idx) => (
                <tr key={j.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-4 text-center font-black">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs border-2 ${
                        idx === 0
                          ? "bg-yellow-400 text-black border-white"
                          : idx < 3
                          ? "bg-blue-600 text-white border-blue-300"
                          : "bg-slate-950 text-slate-400 border-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="p-4 font-black text-white text-base">
                    {j.nombre}
                  </td>
                  <td className="p-4 font-bold text-slate-300">{j.club}</td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-950 text-blue-400 border border-blue-500/40 px-2.5 py-1 rounded text-xs font-black uppercase">
                      {j.serie}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {j.sancionado ? (
                      <span className="bg-red-950 text-red-300 border-2 border-red-500 px-2.5 py-1 rounded-lg text-xs font-black uppercase">
                        🟥 Suspendido
                      </span>
                    ) : (
                      <span className="bg-emerald-950 text-emerald-300 border-2 border-emerald-500 px-2.5 py-1 rounded-lg text-xs font-black uppercase">
                        ✓ Habilitado
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center font-black text-2xl bg-slate-950/50 text-yellow-400">
                    {j.goles}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}