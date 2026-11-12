// src/app/goleadores/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Jugador, SERIES_OFICIALES, SerieOficial } from "@/types";

export default function GoleadoresPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [serieFiltro, setSerieFiltro] = useState<SerieOficial | "TODAS">(
    "Honor"
  );

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jugadores"), (snap) => {
      const lista: Jugador[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || "Jugador",
        rut: d.data().rut || "",
        club: d.data().club || "San Fabián",
        clubId: d.data().clubId || "club",
        serie: (d.data().serie as SerieOficial) || "Honor",
        goles: Number(d.data().goles || 0),
        sancionado: d.data().sancionado || false,
      }));
      // REGLA ESTRICTA: Dejar fuera a quienes tengan 0 goles
      const soloArtilleros = lista
        .filter((j) => j.goles > 0)
        .sort((a, b) => b.goles - a.goles);
      setJugadores(soloArtilleros);
    });
    return () => unsub();
  }, []);

  const artillerosMostrados =
    serieFiltro === "TODAS"
      ? jugadores
      : jugadores.filter((j) => j.serie === serieFiltro);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
              RANKING DE ARTILLEROS CON GOLES CONVERTIDOS (GOLES &gt; 0)
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              Tabla de Goleadores — Serie {serieFiltro}
            </h1>
          </div>
          <span className="bg-slate-950 text-yellow-400 px-3.5 py-2 rounded-xl border-2 border-yellow-400/50 text-xs font-black uppercase">
            ⚽ {artillerosMostrados.length} Goleadores Registrados
          </span>
        </div>

        {/* Selector de Serie */}
        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-slate-800">
          {SERIES_OFICIALES.map((serie) => (
            <button
              key={serie}
              type="button"
              onClick={() => setSerieFiltro(serie)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border-2 transition ${
                serieFiltro === serie
                  ? "bg-yellow-400 text-black border-white"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {serie}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSerieFiltro("TODAS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border-2 transition ${
              serieFiltro === "TODAS"
                ? "bg-blue-600 text-white border-white"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            Todas las Series
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-400">
              <th className="p-4 text-center w-16">#</th>
              <th className="p-4">Jugador / Jugadora</th>
              <th className="p-4">Club</th>
              <th className="p-4 text-center">Serie</th>
              <th className="p-4 text-center text-yellow-400">Goles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {artillerosMostrados.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-xs font-bold text-slate-400"
                >
                  Aún no se registran jugadoras o jugadores con goles convertidos en la serie {serieFiltro}.
                </td>
              </tr>
            ) : (
              artillerosMostrados.map((j, idx) => (
                <tr key={j.id} className="hover:bg-slate-800/50">
                  <td className="p-4 text-center font-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs bg-slate-950 border border-slate-700">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="p-4 font-black text-white">{j.nombre}</td>
                  <td className="p-4 font-bold text-slate-300">{j.club}</td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-950 text-blue-400 border border-blue-500/40 px-2.5 py-1 rounded text-xs font-black uppercase">
                      {j.serie}
                    </span>
                  </td>
                  <td className="p-4 text-center font-black text-2xl text-yellow-400">
                    {j.goles}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}