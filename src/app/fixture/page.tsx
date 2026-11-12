// src/app/fixture/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { Club, EncuentroFixture } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

const ESTADIOS_UNICOS_COMUNA = [
  "Estadio Paso Ancho",
  "Estadio Municipal",
  "Cancha Rural La Punilla",
  "Recinto Las Guardias",
  "Cancha El Caracol",
];

export default function FixturePage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [encuentros, setEncuentros] = useState<EncuentroFixture[]>([]);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        canchaLocal: d.data().canchaLocal || "Estadio Municipal",
        prioridadCancha:
          d.data().prioridadCancha ||
          (d.data().nombre || "").toLowerCase().includes("paso ancho"),
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(lista);
    });

    const unsubFix = onSnapshot(collection(db, "fixture_oficial"), (snap) => {
      const lista: EncuentroFixture[] = snap.docs.map(
        (d) => d.data() as EncuentroFixture
      );
      lista.sort((a, b) => a.jornada - b.jornada);
      setEncuentros(lista);
    });

    return () => {
      unsubClubes();
      unsubFix();
    };
  }, []);

  const esClubPasoAncho = (c: Club) =>
    c.prioridadCancha || c.nombre.toLowerCase().includes("paso ancho");

  const generarYGuardarFixtureOficial = async () => {
    if (clubes.length < 2) return;

    const participantes: (Club | null)[] = [...clubes];
    if (participantes.length % 2 !== 0) {
      participantes.push(null);
    }

    const n = participantes.length;
    const totalJornadas = n - 1;
    const mitad = n / 2;
    const generados: EncuentroFixture[] = [];

    const catalogoEstadios = Array.from(
      new Set([
        ...ESTADIOS_UNICOS_COMUNA,
        ...clubes.map((c) => c.canchaLocal || "Estadio Municipal"),
      ])
    );

    for (let j = 0; j < totalJornadas; j++) {
      // Cada estadio tiene SOLO 1 CANCHA: este Set garantiza máximo 1 partido por estadio en la jornada
      const estadiosOcupadosEnJornada = new Set<string>();
      const paresCrudos: { eq1: Club; eq2: Club }[] = [];

      for (let i = 0; i < mitad; i++) {
        const a = participantes[i];
        const b = participantes[n - 1 - i];
        if (a && b) {
          // Alternar localía base según paridad de fecha
          paresCrudos.push(
            j % 2 === 0 ? { eq1: a, eq2: b } : { eq1: b, eq2: a }
          );
        }
      }

      // ORDEN DE PRIORIDAD DE ASIGNACIÓN DE CANCHA EN LA JORNADA:
      // 1° Duelos donde ambos equipos comparten el mismo estadio (usan 1 sola cancha naturalmente)
      // 2° Duelos donde participa "Paso Ancho" (tiene prioridad sobre Estadio Paso Ancho)
      // 3° Resto de encuentros
      paresCrudos.sort((dueloA, dueloB) => {
        const mismoRecintoA =
          dueloA.eq1.canchaLocal === dueloA.eq2.canchaLocal ? 1 : 0;
        const mismoRecintoB =
          dueloB.eq1.canchaLocal === dueloB.eq2.canchaLocal ? 1 : 0;
        if (mismoRecintoA !== mismoRecintoB)
          return mismoRecintoB - mismoRecintoA;

        const pasoAnchoA =
          esClubPasoAncho(dueloA.eq1) || esClubPasoAncho(dueloA.eq2) ? 1 : 0;
        const pasoAnchoB =
          esClubPasoAncho(dueloB.eq1) || esClubPasoAncho(dueloB.eq2) ? 1 : 0;
        return pasoAnchoB - pasoAnchoA;
      });

      for (let idx = 0; idx < paresCrudos.length; idx++) {
        const { eq1, eq2 } = paresCrudos[idx];
        const canchaEq1 = eq1.canchaLocal || "Estadio Municipal";
        const canchaEq2 = eq2.canchaLocal || "Estadio Municipal";

        let localFinal = eq1;
        let visitaFinal = eq2;
        let canchaFinal = canchaEq1;
        let motivo: EncuentroFixture["motivoAsignacion"] = "TITULAR_LIBRE";

        // Regla A: Ambos clubes comparten la misma cancha y se enfrentan entre sí
        if (canchaEq1 === canchaEq2 && !estadiosOcupadosEnJornada.has(canchaEq1)) {
          localFinal = eq1;
          visitaFinal = eq2;
          canchaFinal = canchaEq1;
          motivo = "DUELO_MISMO_RECINTO";
          estadiosOcupadosEnJornada.add(canchaFinal);
        }
        // Regla B: Prioridad exclusiva de Paso Ancho en Estadio Paso Ancho
        else if (
          esClubPasoAncho(eq1) &&
          !estadiosOcupadosEnJornada.has(canchaEq1)
        ) {
          localFinal = eq1;
          visitaFinal = eq2;
          canchaFinal = canchaEq1;
          motivo = "PRIORIDAD_PASO_ANCHO";
          estadiosOcupadosEnJornada.add(canchaFinal);
        } else if (
          esClubPasoAncho(eq2) &&
          !estadiosOcupadosEnJornada.has(canchaEq2)
        ) {
          localFinal = eq2;
          visitaFinal = eq1;
          canchaFinal = canchaEq2;
          motivo = "PRIORIDAD_PASO_ANCHO";
          estadiosOcupadosEnJornada.add(canchaFinal);
        }
        // Regla C: La cancha del equipo 1 está libre (no topa con nadie)
        else if (!estadiosOcupadosEnJornada.has(canchaEq1)) {
          localFinal = eq1;
          visitaFinal = eq2;
          canchaFinal = canchaEq1;
          motivo = "TITULAR_LIBRE";
          estadiosOcupadosEnJornada.add(canchaFinal);
        }
        // Regla D: La cancha de eq1 ya está ocupada por otro club que comparte recinto,
        // pero la cancha de eq2 está libre -> Se invierte localía para no chocar
        else if (!estadiosOcupadosEnJornada.has(canchaEq2)) {
          localFinal = eq2;
          visitaFinal = eq1;
          canchaFinal = canchaEq2;
          motivo = "LOCALIA_INVERTIDA_ANTITOPE";
          estadiosOcupadosEnJornada.add(canchaFinal);
        }
        // Regla E: Ambas canchas titulares ya fueron ocupadas en esta fecha (ej. 5 equipos en 3 canchas)
        // Se asigna el siguiente estadio con cancha única disponible
        else {
          const estadioLibre =
            catalogoEstadios.find((est) => !estadiosOcupadosEnJornada.has(est)) ||
            `Estadio Auxiliar #${idx + 1}`;
          localFinal = eq1;
          visitaFinal = eq2;
          canchaFinal = estadioLibre;
          motivo = "REUBICADO_ESTADIO_LIBRE";
          estadiosOcupadosEnJornada.add(canchaFinal);
        }

        const idEncuentro = `f${j + 1}-${localFinal.id}-vs-${visitaFinal.id}`;
        const partidoObj: EncuentroFixture = {
          id: idEncuentro,
          jornada: j + 1,
          localId: localFinal.id,
          localNombre: localFinal.nombre,
          visitaId: visitaFinal.id,
          visitaNombre: visitaFinal.nombre,
          canchaAsignada: canchaFinal,
          motivoAsignacion: motivo,
        };

        generados.push(partidoObj);
        await setDoc(doc(db, "fixture_oficial", idEncuentro), partidoObj, {
          merge: true,
        });
      }

      participantes.splice(1, 0, participantes.pop()!);
    }

    await registrarAccionAuditoria(
      "FIXTURE",
      "GENERACION_AUTOMATICA_SIN_TOPE",
      `Fixture generado con ${generados.length} encuentros respetando prioridad Paso Ancho y 1 cancha por estadio.`
    );

    setMensaje(
      "✓ Fixture Oficial generado y sincronizado con el Módulo Planilla Arbitral (0 choques de cancha)."
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            MOTOR ANTI-TOPE (1 CANCHA POR ESTADIO + PRIORIDAD PASO ANCHO)
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Fixture Oficial Sincronizado con Planilla
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Si dos equipos del mismo recinto se enfrentan, el 1° es Local y el 2° Visita. Si enfrentan a otros, evita el tope priorizando a Paso Ancho.
          </p>
        </div>

        <button
          onClick={generarYGuardarFixtureOficial}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-white text-xs shadow-lg transition"
        >
          ⚡ Generar y Publicar Fixture Oficial
        </button>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-xs font-black">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from(new Set(encuentros.map((e) => e.jornada))).map(
          (numJornada) => (
            <div
              key={numJornada}
              className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-3"
            >
              <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2.5">
                <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg uppercase">
                  Fecha {numJornada} (Todas las Series)
                </span>
                <span className="text-[11px] font-black text-emerald-400 uppercase">
                  ✓ 1 Partido por Cancha
                </span>
              </div>

              <ul className="space-y-2.5">
                {encuentros
                  .filter((p) => p.jornada === numJornada)
                  .map((p) => (
                    <li
                      key={p.id}
                      className="bg-slate-950 p-3.5 rounded-xl border-2 border-slate-800 space-y-2"
                    >
                      <div className="flex justify-between items-center text-sm font-black text-white">
                        <span>🏠 {p.localNombre} (Local)</span>
                        <span className="text-yellow-400 text-xs px-2">VS</span>
                        <span>✈️ {p.visitaNombre} (Visita)</span>
                      </div>
                      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-900 text-[11px]">
                        <span className="font-black text-emerald-400">
                          📍 {p.canchaAsignada} (Cancha Única)
                        </span>
                        <span className="bg-slate-900 text-blue-300 border border-slate-700 px-2 py-0.5 rounded font-black text-[10px]">
                          {p.motivoAsignacion === "DUELO_MISMO_RECINTO" &&
                            "Duelo Directo en Cancha Compartida"}
                          {p.motivoAsignacion === "PRIORIDAD_PASO_ANCHO" &&
                            "★ Prioridad Estadio Paso Ancho"}
                          {p.motivoAsignacion === "TITULAR_LIBRE" &&
                            "Recinto Titular Disponible"}
                          {p.motivoAsignacion === "LOCALIA_INVERTIDA_ANTITOPE" &&
                            "⇄ Localía Invertida (Evita Choque)"}
                          {p.motivoAsignacion === "REUBICADO_ESTADIO_LIBRE" &&
                            "🏟 Reubicado por Tope de Cancha"}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
}