// src/app/fixture/page.tsx
"use client";

import React, { useState } from "react";

interface PartidoFixture {
  jornada: number;
  local: string;
  visita: string;
  cancha: string;
}

const CLUBES_SAN_FABIAN = [
  "CD Los Halcones",
  "Estrella Precordillerana",
  "Unión San Fabián",
  "Deportivo Ñuble",
  "Cóndores del Valle",
  "Juventud Alico",
];

const CANCHAS = [
  "Estadio Municipal Cancha 1",
  "Cancha Rural La Punilla",
  "Recinto Las Guardias",
];

export default function FixturePage() {
  const [calendario, setCalendario] = useState<PartidoFixture[]>([]);

  const ejecutarRoundRobin = () => {
    const equipos = [...CLUBES_SAN_FABIAN];
    const n = equipos.length;
    const jornadas = n - 1;
    const mitad = n / 2;
    const resultado: PartidoFixture[] = [];

    for (let j = 0; j < jornadas; j++) {
      for (let i = 0; i < mitad; i++) {
        const local = equipos[i];
        const visita = equipos[n - 1 - i];
        const cancha = CANCHAS[i % CANCHAS.length];
        resultado.push({
          jornada: j + 1,
          local,
          visita,
          cancha,
        });
      }
      equipos.splice(1, 0, equipos.pop()!);
    }
    setCalendario(resultado);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
              ALGORITMO ROUND-ROBIN • CU-04
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            Programación Multicancha
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Asignación automática libre de colisiones de recinto
          </p>
        </div>

        <button
          onClick={ejecutarRoundRobin}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-white text-xs shadow-lg transition"
        >
          ⚡ Generar Fixture Oficial
        </button>
      </div>

      {calendario.length === 0 ? (
        <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center">
          <p className="text-sm font-bold text-slate-400">
            Presione &ldquo;Generar Fixture Oficial&rdquo; para calcular las jornadas y recintos de San Fabián.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from(new Set(calendario.map((p) => p.jornada))).map(
            (numJornada) => (
              <div
                key={numJornada}
                className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2.5">
                  <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                    Fecha {numJornada}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    3 Encuentros Simultáneos
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {calendario
                    .filter((p) => p.jornada === numJornada)
                    .map((partido, idx) => (
                      <li
                        key={idx}
                        className="bg-slate-950 p-3.5 rounded-xl border-2 border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                      >
                        <div className="font-black text-sm text-white">
                          <span>{partido.local}</span>
                          <span className="text-yellow-400 mx-2 text-xs">VS</span>
                          <span>{partido.visita}</span>
                        </div>
                        <span className="text-[11px] font-black uppercase bg-slate-900 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                          📍 {partido.cancha}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}