// src/app/admin/torneos/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Club,
  GrupoTorneo,
  SERIES_OFICIALES,
  SerieOficial,
  Torneo,
} from "@/types";

export default function CrearTorneoPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [torneosCreados, setTorneosCreados] = useState<Torneo[]>([]);

  // Configuración del nuevo torneo
  const [nombreTorneo, setNombreTorneo] = useState(
    "Clausura 2026 Minas Ñuble"
  );
  const [formato, setFormato] = useState<
    "GRUPOS_SIMETRICOS_ELIMINATORIA" | "LIGA_TODOS_CONTRA_TODOS"
  >("GRUPOS_SIMETRICOS_ELIMINATORIA");
  const [seriesTorneo, setSeriesTorneo] = useState<SerieOficial[]>([
    "Honor",
    "Primera",
    "Segunda",
    "Super Senior 35",
    "Damas",
  ]);
  const [cupoEquipos, setCupoEquipos] = useState<number>(6);
  const [clubesSeleccionadosIds, setClubesSeleccionadosIds] = useState<
    string[]
  >([]);
  const [faseEliminatoria, setFaseEliminatoria] = useState<
    "CUARTOS" | "SEMIFINAL" | "FINAL"
  >("SEMIFINAL");

  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        canchaLocal: d.data().canchaLocal || "Estadio Municipal",
        series: d.data().series || ["Honor"],
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(lista);
      if (clubesSeleccionadosIds.length === 0 && lista.length > 0) {
        const cantPar =
          lista.length % 2 === 0 ? lista.length : lista.length - 1;
        setCupoEquipos(Math.max(4, cantPar));
        setClubesSeleccionadosIds(lista.slice(0, cantPar).map((c) => c.id));
      }
    });

    const unsubTorneos = onSnapshot(collection(db, "torneos"), (snap) => {
      const lista: Torneo[] = snap.docs.map((d) => ({
        ...(d.data() as Torneo),
        id: d.id,
      }));
      setTorneosCreados(lista);
    });

    return () => {
      unsubClubes();
      unsubTorneos();
    };
  }, []);

  const toggleSerie = (serie: SerieOficial) => {
    if (seriesTorneo.includes(serie)) {
      setSeriesTorneo(seriesTorneo.filter((s) => s !== serie));
    } else {
      setSeriesTorneo([...seriesTorneo, serie]);
    }
  };

  const toggleClubParticipante = (clubId: string) => {
    if (clubesSeleccionadosIds.includes(clubId)) {
      setClubesSeleccionadosIds(
        clubesSeleccionadosIds.filter((id) => id !== clubId)
      );
    } else {
      if (clubesSeleccionadosIds.length >= cupoEquipos) {
        setErrorMsg(
          `Ya alcanzó el cupo máximo de ${cupoEquipos} equipos definido para este torneo. Aumente el cupo si desea agregar más.`
        );
        return;
      }
      setErrorMsg("");
      setClubesSeleccionadosIds([...clubesSeleccionadosIds, clubId]);
    }
  };

  const crearInstanciaTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setErrorMsg("");

    if (!nombreTorneo.trim()) {
      setErrorMsg("Ingrese un nombre para el torneo.");
      return;
    }

    if (seriesTorneo.length === 0) {
      setErrorMsg("Seleccione al menos una serie para el torneo.");
      return;
    }

    if (clubesSeleccionadosIds.length < 4) {
      setErrorMsg("Debe seleccionar al menos 4 clubes participantes.");
      return;
    }

    if (
      formato === "GRUPOS_SIMETRICOS_ELIMINATORIA" &&
      clubesSeleccionadosIds.length % 2 !== 0
    ) {
      setErrorMsg(
        `Para un Torneo Corto por Grupos Simétricos la cantidad de clubes seleccionados debe ser PAR (actualmente tiene ${clubesSeleccionadosIds.length} seleccionados).`
      );
      return;
    }

    const clubesObjetos = clubes.filter((c) =>
      clubesSeleccionadosIds.includes(c.id)
    );

    // Generar Grupos Simétricos (Grupo A y Grupo B con igual cantidad de clubes)
    let gruposGenerados: GrupoTorneo[] = [];
    if (formato === "GRUPOS_SIMETRICOS_ELIMINATORIA") {
      const mitad = clubesObjetos.length / 2;
      const grupoA = clubesObjetos.slice(0, mitad);
      const grupoB = clubesObjetos.slice(mitad);

      gruposGenerados = [
        {
          nombreGrupo: "Grupo A",
          clubesIds: grupoA.map((c) => c.id),
          clubesNombres: grupoA.map((c) => c.nombre),
        },
        {
          nombreGrupo: "Grupo B",
          clubesIds: grupoB.map((c) => c.id),
          clubesNombres: grupoB.map((c) => c.nombre),
        },
      ];
    }

    const idTorneo = nombreTorneo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");

    const nuevoTorneo: Torneo = {
      id: idTorneo,
      nombre: nombreTorneo.trim(),
      formato,
      seriesHabilitadas: seriesTorneo,
      cantidadEquipos: clubesSeleccionadosIds.length,
      clubesParticipantesIds: clubesSeleccionadosIds,
      grupos: gruposGenerados,
      faseFinalClasificados: faseEliminatoria,
      estado: "ACTIVO",
      fechaCreacion: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "torneos", idTorneo), nuevoTorneo, { merge: true });
      setMensaje(
        `🏆 Torneo "${nombreTorneo}" creado exitosamente con ${seriesTorneo.length} series y ${clubesSeleccionadosIds.length} clubes.`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al guardar el torneo en Firestore.");
    }
  };

  // Generar cruces internos todos contra todos dentro de un grupo simétrico
  const generarCrucesInternosGrupo = (nombres: string[]) => {
    const duelos: string[] = [];
    for (let i = 0; i < nombres.length; i++) {
      for (let j = i + 1; j < nombres.length; j++) {
        duelos.push(`${nombres[i]} vs ${nombres[j]}`);
      }
    }
    return duelos;
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800">
        <span className="bg-yellow-400 text-black text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
          MOTOR DE COMPETICIONES • FORMATO LIGA Y GRUPOS SIMÉTRICOS
        </span>
        <h1 className="text-2xl font-black text-white mt-2">
          Creador de Torneos y Campeonatos Cortos
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">
          Configure torneos a medida (ej. Clausura 2026 Minas Ñuble), elija las series activas, clubes participantes y grupos pares con clasificación a Playoffs.
        </p>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-sm font-black">
          {mensaje}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950 border-2 border-red-500 text-red-300 p-4 rounded-xl text-sm font-black">
          {errorMsg}
        </div>
      )}

      {/* Formulario Constructor de Torneo */}
      <form
        onSubmit={crearInstanciaTorneo}
        className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Nombre Oficial del Torneo
            </label>
            <input
              type="text"
              placeholder="Ej: Clausura 2026 Minas Ñuble"
              value={nombreTorneo}
              onChange={(e) => setNombreTorneo(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold"
              required
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Modalidad de Competencia
            </label>
            <select
              value={formato}
              onChange={(e) =>
                setFormato(
                  e.target.value as
                    | "GRUPOS_SIMETRICOS_ELIMINATORIA"
                    | "LIGA_TODOS_CONTRA_TODOS"
                )
              }
              className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-3 rounded-xl font-black text-xs uppercase"
            >
              <option value="GRUPOS_SIMETRICOS_ELIMINATORIA">
                Torneo Corto: Grupos Simétricos (Pares) + Eliminatoria
              </option>
              <option value="LIGA_TODOS_CONTRA_TODOS">
                Torneo Largo: Todos contra Todos (Round-Robin)
              </option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Fase de Clasificación Playoffs
            </label>
            <select
              value={faseEliminatoria}
              onChange={(e) =>
                setFaseEliminatoria(
                  e.target.value as "CUARTOS" | "SEMIFINAL" | "FINAL"
                )
              }
              className="w-full bg-slate-950 text-emerald-400 border-2 border-slate-700 p-3 rounded-xl font-black text-xs uppercase"
            >
              <option value="CUARTOS">Cuartos de Final (Top 4 por Grupo)</option>
              <option value="SEMIFINAL">Semifinales (1° y 2° por Grupo)</option>
              <option value="FINAL">Final Directa (1° Grupo A vs 1° Grupo B)</option>
            </select>
          </div>
        </div>

        {/* Selección de Series que jugarán este Torneo */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-300 mb-2">
            1. Seleccione las Series que competirán en este Torneo ({seriesTorneo.length}{" "}
            series elegidas)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {SERIES_OFICIALES.map((serie) => {
              const activa = seriesTorneo.includes(serie);
              return (
                <button
                  key={serie}
                  type="button"
                  onClick={() => toggleSerie(serie)}
                  className={`p-3 rounded-xl text-xs font-black uppercase border-2 transition ${
                    activa
                      ? "bg-blue-600 text-white border-white shadow"
                      : "bg-slate-950 text-slate-500 border-slate-800"
                  }`}
                >
                  {activa ? "✓ " : ""}
                  {serie}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selección de Cupo Par y Clubes Participantes */}
        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <label className="text-xs font-black uppercase text-slate-300">
              2. Cantidad de Equipos a Competir (Número PAR para Grupos Simétricos):{" "}
              <span className="text-yellow-400">
                {clubesSeleccionadosIds.length} de {cupoEquipos} seleccionados
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                Cupo Torneo:
              </span>
              {[4, 6, 8, 10, 12, 16].map((numPar) => (
                <button
                  key={numPar}
                  type="button"
                  onClick={() => setCupoEquipos(numPar)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 ${
                    cupoEquipos === numPar
                      ? "bg-yellow-400 text-black border-white"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  {numPar} Equipos
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clubes.map((club) => {
              const seleccionado = clubesSeleccionadosIds.includes(club.id);
              return (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => toggleClubParticipante(club.id)}
                  className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition ${
                    seleccionado
                      ? "bg-slate-950 border-emerald-500 text-white"
                      : "bg-slate-950/40 border-slate-800 text-slate-500"
                  }`}
                >
                  <div>
                    <p className="font-black text-sm">{club.nombre}</p>
                    <p className="text-[11px] font-bold text-slate-400">
                      📍 {club.canchaLocal}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-black uppercase ${
                      seleccionado
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 text-slate-500"
                    }`}
                  >
                    {seleccionado ? "✓ Inscrito" : "Incluir"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider py-4 rounded-xl border-2 border-white shadow-xl text-sm transition"
        >
          🏆 Generar Instancia de Torneo y Grupos Simétricos
        </button>
      </form>

      {/* Visualización de Torneos Creados, Grupos Simétricos y Cruces Clasificatorios */}
      <div className="space-y-5">
        {torneosCreados.map((torneo) => (
          <div
            key={torneo.id}
            className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-800 space-y-5"
          >
            <div className="flex flex-wrap justify-between items-start gap-4 border-b-2 border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
                    {torneo.estado}
                  </span>
                  <span className="bg-slate-950 text-yellow-400 border border-yellow-400/50 text-xs font-black px-2.5 py-1 rounded uppercase">
                    {torneo.cantidadEquipos} Clubes •{" "}
                    {torneo.seriesHabilitadas.length} Series Activas
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white mt-2">
                  {torneo.nombre}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {torneo.seriesHabilitadas.map((s) => (
                    <span
                      key={s}
                      className="bg-slate-950 text-blue-400 border border-blue-500/40 px-2.5 py-0.5 rounded text-[11px] font-black uppercase"
                    >
                      Serie {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => deleteDoc(doc(db, "torneos", torneo.id))}
                className="bg-slate-950 hover:bg-red-950 text-red-400 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-black uppercase"
              >
                Eliminar Torneo
              </button>
            </div>

            {/* Si es Torneo por Grupos Simétricos, muestra Grupo A y Grupo B con sus duelos internos */}
            {torneo.grupos && torneo.grupos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {torneo.grupos.map((g, idx) => {
                  const duelos = generarCrucesInternosGrupo(g.clubesNombres);
                  return (
                    <div
                      key={idx}
                      className="bg-slate-950 p-4 rounded-xl border-2 border-blue-500/50 space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h3 className="text-base font-black text-blue-400 uppercase">
                          {g.nombreGrupo} ({g.clubesNombres.length} Equipos)
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Grupo Simétrico Par
                        </span>
                      </div>

                      <ul className="space-y-1.5 text-sm">
                        {g.clubesNombres.map((nom, pos) => (
                          <li
                            key={pos}
                            className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg font-black text-white"
                          >
                            <span>
                              <span className="text-yellow-400 mr-2">
                                #{pos + 1}
                              </span>
                              {nom}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">
                              En Competencia
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                          Cruces Internos del {g.nombreGrupo}:
                        </span>
                        <div className="space-y-1">
                          {duelos.map((d, dIdx) => (
                            <div
                              key={dIdx}
                              className="text-xs font-bold text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-800"
                            >
                              ⚽ {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cuadro de Clasificación a Fase Eliminatoria */}
            <div className="bg-slate-950 p-4 rounded-xl border-2 border-yellow-400/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-yellow-400 block">
                  FASE DE DEFINICIÓN CONFIGURADA
                </span>
                <p className="text-sm font-black text-white">
                  {torneo.faseFinalClasificados === "CUARTOS" &&
                    "Clasifican los 4 primeros de cada grupo a Cuartos de Final (1°A vs 4°B, 2°A vs 3°B, 1°B vs 4°A, 2°B vs 3°A) → Semifinal → Final."}
                  {torneo.faseFinalClasificados === "SEMIFINAL" &&
                    "Clasifican los 2 mejores de cada grupo a Semifinales Cruzadas (1° Grupo A vs 2° Grupo B y 1° Grupo B vs 2° Grupo A) → Gran Final."}
                  {torneo.faseFinalClasificados === "FINAL" &&
                    "Clasifica el ganador de cada grupo directo a la Gran Final (1° Grupo A vs 1° Grupo B)."}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}