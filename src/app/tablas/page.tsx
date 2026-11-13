// src/app/tablas/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Club, SERIES_OFICIALES, SerieOficial } from "@/types";

export default function TablasPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [serieActiva, setSerieActiva] = useState<SerieOficial | "GENERAL">(
    "Honor"
  );
  const [busquedaClub, setBusquedaClub] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipos"), (snap) => {
      const data: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        series: d.data().series || ["Honor"],
        instagramUrl:
          d.data().instagramUrl || d.data().redesSociales?.instagram || "",
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        estadisticasPorSerie: d.data().estadisticasPorSerie || {},
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(data);
      setCargando(false);
    });

    return () => unsub();
  }, []);

  // Obtener puntos y goles según la serie seleccionada
  const obtenerStatsClub = (c: Club) => {
    if (serieActiva === "GENERAL") {
      return {
        pts: c.puntos,
        gf: c.goles_favor,
        gc: c.goles_contra,
      };
    }
    const statsSerie = c.estadisticasPorSerie?.[serieActiva];
    if (statsSerie) {
      return {
        pts: statsSerie.puntos || 0,
        gf: statsSerie.goles_favor || 0,
        gc: statsSerie.goles_contra || 0,
      };
    }
    // Si es Honor y aún no tiene desglose separado, muestra el base
    if (serieActiva === "Honor") {
      return {
        pts: c.puntos,
        gf: c.goles_favor,
        gc: c.goles_contra,
      };
    }
    return { pts: 0, gf: 0, gc: 0 };
  };

  const clubesDeLaSerie = clubes
    .filter((c) => {
      if (
        serieActiva !== "GENERAL" &&
        !(c.series || ["Honor"]).includes(serieActiva)
      ) {
        return false;
      }
      return c.nombre.toLowerCase().includes(busquedaClub.toLowerCase());
    })
    .sort((a, b) => {
      const stA = obtenerStatsClub(a);
      const stB = obtenerStatsClub(b);
      const difA = stA.gf - stA.gc;
      const difB = stB.gf - stB.gc;
      if (stB.pts !== stA.pts) return stB.pts - stA.pts;
      return difB - difA;
    });

  const normalizarLinkInstagram = (raw: string) => {
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    return `https://instagram.com/${raw.replace(/^@/, "")}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Cabecera con Selector de las 7 Series y Buscador */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
              CLASIFICACIÓN OFICIAL POR SERIE • TIEMPO REAL
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              Tabla de Posiciones —{" "}
              {serieActiva === "GENERAL"
                ? "Acumulada General"
                : `Serie ${serieActiva}`}
            </h1>
          </div>

          <input
            type="text"
            placeholder="🔍 Buscar club en la tabla..."
            value={busquedaClub}
            onChange={(e) => setBusquedaClub(e.target.value)}
            className="bg-slate-950 text-white border-2 border-slate-700 px-4 py-2 rounded-xl text-xs font-bold"
          />
        </div>

        {/* Pestañas de las 7 Series Oficiales */}
        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-slate-800">
          {SERIES_OFICIALES.map((serie) => (
            <button
              key={serie}
              type="button"
              onClick={() => setSerieActiva(serie)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border-2 transition ${
                serieActiva === serie
                  ? "bg-yellow-400 text-black border-white"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {serie}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSerieActiva("GENERAL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border-2 transition ${
              serieActiva === "GENERAL"
                ? "bg-blue-600 text-white border-white"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            Tabla General
          </button>
        </div>
      </div>

      {/* Tabla de Posiciones */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4 text-center w-16">Pos</th>
                <th className="p-4">Club Deportivo</th>
                <th className="p-4 text-center">Instagram</th>
                <th className="p-4 text-center">GF</th>
                <th className="p-4 text-center">GC</th>
                <th className="p-4 text-center">DIF</th>
                <th className="p-4 text-center bg-slate-950/60 text-yellow-400">
                  PTS ({serieActiva})
                </th>
                <th className="p-4 text-center">Estado Deportivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {cargando ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center font-bold text-slate-400"
                  >
                    Sincronizando clasificación...
                  </td>
                </tr>
              ) : (
                clubesDeLaSerie.map((club, idx) => {
                  const st = obtenerStatsClub(club);
                  const dif = st.gf - st.gc;
                  const enLiguilla = idx < 4;
                  const igLink = normalizarLinkInstagram(
                    club.instagramUrl || ""
                  );
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
                      <td className="p-4 text-center">
                        {igLink ? (
                          <a
                            href={igLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-lg border border-white/40 transition"
                          >
                            📸 Instagram ↗
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-300">
                        {st.gf}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-300">
                        {st.gc}
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
                        {st.pts}
                      </td>
                      <td className="p-4 text-center">
                        {club.bloqueadoDeportivo ? (
                          <span className="inline-block bg-red-950 text-red-300 border-2 border-red-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                            🔒 Bloqueado
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