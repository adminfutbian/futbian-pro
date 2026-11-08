// src/app/fixture/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Club, SERIES_OFICIALES, SerieOficial } from "@/types";

interface PartidoFixture {
  jornada: number;
  serie: SerieOficial;
  local: Club;
  visita: Club | null; // null cuando queda LIBRE (número impar de clubes)
  canchaAsignada: string;
  resolucionCancha: "TITULAR" | "LOCALIA_INVERTIDA" | "CANCHA_ALTERNATIVA";
}

const CANCHAS_AUXILIARES = [
  "Estadio Municipal Cancha 1",
  "Estadio Municipal Cancha 2",
  "Cancha Rural La Punilla",
  "Recinto Las Guardias",
  "Cancha El Caracol",
];

export default function FixturePage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [serieActiva, setSerieActiva] = useState<SerieOficial>("Honor");
  const [calendario, setCalendario] = useState<PartidoFixture[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        colorSecundario: d.data().colorSecundario || "#ffffff",
        series: d.data().series || ["Honor"],
        escudoUrl: d.data().escudoUrl || "",
        canchaLocal: d.data().canchaLocal || "Estadio Municipal Cancha 1",
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(lista);
    });
    return () => unsub();
  }, []);

  const clubesEnSerie = clubes.filter((c) =>
    (c.series || ["Honor"]).includes(serieActiva)
  );

  const generarFixtureSinColisionDeCancha = () => {
    if (clubesEnSerie.length < 2) {
      setCalendario([]);
      return;
    }

    const participantes: (Club | null)[] = [...clubesEnSerie];
    // Si la cantidad de clubes en la serie es impar, agregamos pivote LIBRE (null)
    if (participantes.length % 2 !== 0) {
      participantes.push(null);
    }

    const n = participantes.length;
    const totalJornadas = n - 1;
    const partidosPorJornada = n / 2;
    const resultado: PartidoFixture[] = [];

    // Catálogo de todas las canchas existentes para desvíos si hay triple colisión
    const todasLasCanchas = Array.from(
      new Set([
        ...CANCHAS_AUXILIARES,
        ...clubes.map((c) => c.canchaLocal || "Estadio Municipal Cancha 1"),
      ])
    );

    // Control histórico de cuántas veces cada club ha sido local para balancear
    const conteoLocalia: Record<string, number> = {};
    clubesEnSerie.forEach((c) => (conteoLocalia[c.id] = 0));

    for (let j = 0; j < totalJornadas; j++) {
      const canchasOcupadasEnJornada = new Set<string>();
      const duelosJornada: { clubA: Club; clubB: Club | null }[] = [];

      for (let i = 0; i < partidosPorJornada; i++) {
        const a = participantes[i];
        const b = participantes[n - 1 - i];
        if (a === null && b !== null) {
          duelosJornada.push({ clubA: b, clubB: null });
        } else if (a !== null) {
          duelosJornada.push({ clubA: a, clubB: b });
        }
      }

      // Ordenar primero los duelos donde ambos clubes comparten cancha o tienen canchas más demandadas
      for (const duelo of duelosJornada) {
        const { clubA, clubB } = duelo;

        if (!clubB) {
          resultado.push({
            jornada: j + 1,
            serie: serieActiva,
            local: clubA,
            visita: null,
            canchaAsignada: "FECHA LIBRE",
            resolucionCancha: "TITULAR",
          });
          continue;
        }

        // Alternancia base según paridad de fecha y balance de localías
        const prefiereALocal =
          (j % 2 === 0 && conteoLocalia[clubA.id] <= conteoLocalia[clubB.id]) ||
          conteoLocalia[clubA.id] < conteoLocalia[clubB.id];

        const candidato1 = prefiereALocal ? clubA : clubB;
        const candidato2 = prefiereALocal ? clubB : clubA;

        const cancha1 = candidato1.canchaLocal || CANCHAS_AUXILIARES[0];
        const cancha2 = candidato2.canchaLocal || CANCHAS_AUXILIARES[0];

        if (!canchasOcupadasEnJornada.has(cancha1)) {
          // Caso 1: La cancha del local titular está disponible en esta fecha
          canchasOcupadasEnJornada.add(cancha1);
          conteoLocalia[candidato1.id]++;
          resultado.push({
            jornada: j + 1,
            serie: serieActiva,
            local: candidato1,
            visita: candidato2,
            canchaAsignada: cancha1,
            resolucionCancha: "TITULAR",
          });
        } else if (!canchasOcupadasEnJornada.has(cancha2)) {
          // Caso 2: La cancha del candidato 1 está ocupada por otro club que comparte recinto;
          // se invierte la localía hacia el candidato 2 cuya cancha está libre
          canchasOcupadasEnJornada.add(cancha2);
          conteoLocalia[candidato2.id]++;
          resultado.push({
            jornada: j + 1,
            serie: serieActiva,
            local: candidato2,
            visita: candidato1,
            canchaAsignada: cancha2,
            resolucionCancha: "LOCALIA_INVERTIDA",
          });
        } else {
          // Caso 3: Ambos clubes tienen sus canchas titulares ocupadas en esta jornada;
          // se asigna una cancha auxiliar libre de la comuna para evitar colisión
          const canchaLibre =
            todasLasCanchas.find((c) => !canchasOcupadasEnJornada.has(c)) ||
            `Cancha Auxiliar #${canchasOcupadasEnJornada.size + 1}`;
          canchasOcupadasEnJornada.add(canchaLibre);
          conteoLocalia[candidato1.id]++;
          resultado.push({
            jornada: j + 1,
            serie: serieActiva,
            local: candidato1,
            visita: candidato2,
            canchaAsignada: canchaLibre,
            resolucionCancha: "CANCHA_ALTERNATIVA",
          });
        }
      }

      // Rotación cíclica Round-Robin manteniendo fijo el pivote 0
      participantes.splice(1, 0, participantes.pop()!);
    }

    setCalendario(resultado);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Cabecera y Selector de Serie */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
              MOTOR ANTI-COLISIÓN DE RECINTOS COMPARTIDOS • CU-04
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              Programación Inteligente por Serie y Cancha Local
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Invierte automáticamente la localía si dos clubes que comparten cancha topan en la misma fecha
            </p>
          </div>

          <button
            onClick={generarFixtureSinColisionDeCancha}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-white text-xs shadow-lg transition"
          >
            ⚡ Generar Fixture Serie {serieActiva} ({clubesEnSerie.length} Clubes)
          </button>
        </div>

        {/* Pestañas de las 7 Series Oficiales */}
        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-slate-800">
          {SERIES_OFICIALES.map((serie) => {
            const activa = serieActiva === serie;
            const cant = clubes.filter((c) =>
              (c.series || ["Honor"]).includes(serie)
            ).length;
            return (
              <button
                key={serie}
                onClick={() => {
                  setSerieActiva(serie);
                  setCalendario([]);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition ${
                  activa
                    ? "bg-blue-600 text-white border-white"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {serie} <span className="opacity-70">({cant})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Renderizado de Jornadas */}
      {calendario.length === 0 ? (
        <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-black text-white">
            Serie seleccionada: {serieActiva} ({clubesEnSerie.length} clubes habilitados)
          </p>
          <p className="text-xs font-bold text-slate-400">
            Presione el botón amarillo para calcular los cruces verificando que ningún recinto compartido sufra topes de horario.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from(new Set(calendario.map((p) => p.jornada))).map(
            (numJornada) => (
              <div
                key={numJornada}
                className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2.5">
                  <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                    Fecha {numJornada} • {serieActiva}
                  </span>
                  <span className="text-[11px] font-black text-emerald-400 uppercase">
                    ✓ 0 Colisiones de Cancha
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {calendario
                    .filter((p) => p.jornada === numJornada)
                    .map((partido, idx) => (
                      <li
                        key={idx}
                        className="bg-slate-950 p-3.5 rounded-xl border-2 border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          {/* Local */}
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-white shrink-0"
                              style={{
                                backgroundColor:
                                  partido.local.colorPrimario || "#2563eb",
                              }}
                            />
                            <span className="font-black text-sm text-white">
                              {partido.local.nombre}
                            </span>
                          </div>

                          <span className="text-yellow-400 font-black text-xs px-2">
                            VS
                          </span>

                          {/* Visita */}
                          {partido.visita ? (
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-white text-right">
                                {partido.visita.nombre}
                              </span>
                              <span
                                className="w-3 h-3 rounded-full border border-white shrink-0"
                                style={{
                                  backgroundColor:
                                    partido.visita.colorPrimario || "#10b981",
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-black uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
                              LIBRE
                            </span>
                          )}
                        </div>

                        {partido.visita && (
                          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-900 text-[11px]">
                            <span className="font-black text-emerald-400">
                              📍 {partido.canchaAsignada}
                            </span>
                            {partido.resolucionCancha === "LOCALIA_INVERTIDA" && (
                              <span className="bg-amber-950 text-amber-300 border border-amber-500/60 px-2 py-0.5 rounded font-black uppercase text-[10px]">
                                ⇄ Localía ajustada (Evita tope de cancha)
                              </span>
                            )}
                            {partido.resolucionCancha === "CANCHA_ALTERNATIVA" && (
                              <span className="bg-blue-950 text-blue-300 border border-blue-500/60 px-2 py-0.5 rounded font-black uppercase text-[10px]">
                                🏟 Recinto Auxiliar (Ambas canchas ocupadas)
                              </span>
                            )}
                          </div>
                        )}
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