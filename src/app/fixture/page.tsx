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

const CANCHAS = ["Estadio Municipal Cancha 1", "Cancha Rural La Punilla", "Recinto Las Guardias"];

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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black">Programación Multicancha (CU-04)</h1>
            <p className="text-sm text-gray-500">Motor determinista Round-Robin libre de solapamiento de sedes</p>
          </div>
          <button
            onClick={ejecutarRoundRobin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
          >
            Generar Fixture Oficial
          </button>
        </div>

        {calendario.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from(new Set(calendario.map((p) => p.jornada))).map((numJornada) => (
              <div key={numJornada} className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-black text-blue-900 border-b pb-2 mb-3">Fecha {numJornada}</h3>
                <ul className="space-y-2 text-sm">
                  {calendario
                    .filter((p) => p.jornada === numJornada)
                    .map((partido, idx) => (
                      <li key={idx} className="bg-white p-2.5 rounded border flex justify-between items-center">
                        <span className="font-bold">{partido.local} vs {partido.visita}</span>
                        <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">{partido.cancha}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}