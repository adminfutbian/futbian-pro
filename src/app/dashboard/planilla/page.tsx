// src/app/dashboard/planilla/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ActaPartido, Incidencia } from "@/types";
import { guardarActaOfflineFirst, sincronizarOutboxConFirestore } from "@/lib/offlineDb";

export default function PlanillaPage() {
  const [online, setOnline] = useState(true);
  const [modoSol, setModoSol] = useState(true); // Activado por defecto para terreno (ISO/IEC 25010)
  const [minuto, setMinuto] = useState(1);
  const [jugadorInput, setJugadorInput] = useState("");
  const [firmaArbitro, setFirmaArbitro] = useState("");

  const [acta, setActa] = useState<ActaPartido>({
    id: "partido-fecha1-honor",
    jornada: 1,
    serie: "Honor",
    clubLocalId: "halcones",
    clubLocalNombre: "CD Los Halcones",
    clubVisitaId: "estrella",
    clubVisitaNombre: "Estrella Precordillerana",
    golesLocal: 0,
    golesVisita: 0,
    incidencias: [],
    estado: "en_juego",
    sincronizado: false,
  });

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      sincronizarOutboxConFirestore();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const agregarIncidencia = async (
    tipo: "gol" | "amarilla" | "roja",
    equipo: "local" | "visita"
  ) => {
    if (acta.estado === "cerrado_inmutable") return;

    const clubNombre =
      equipo === "local" ? acta.clubLocalNombre : acta.clubVisitaNombre;

    const nueva: Incidencia = {
      minuto,
      tipo,
      jugadorNombre: jugadorInput.trim() || `Jugador (${clubNombre})`,
      equipoId: equipo === "local" ? acta.clubLocalId : acta.clubVisitaId,
    };

    const nuevaActa: ActaPartido = {
      ...acta,
      golesLocal:
        tipo === "gol" && equipo === "local" ? acta.golesLocal + 1 : acta.golesLocal,
      golesVisita:
        tipo === "gol" && equipo === "visita" ? acta.golesVisita + 1 : acta.golesVisita,
      incidencias: [nueva, ...acta.incidencias],
      sincronizado: false,
    };

    setActa(nuevaActa);
    setJugadorInput("");
    await guardarActaOfflineFirst(nuevaActa);
  };

  const cerrarYSellarActa = async () => {
    if (!firmaArbitro.trim()) {
      alert("Ingrese firma digital o PIN de árbitro y delegados para sellar el acta.");
      return;
    }

    const rawData = JSON.stringify(acta);
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawData)
    );
    const selloHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const actaCerrada: ActaPartido = {
      ...acta,
      estado: "cerrado_inmutable",
      firmaArbitro,
      selloInmutabilidad: selloHex,
      sincronizado: false,
    };

    setActa(actaCerrada);
    await guardarActaOfflineFirst(actaCerrada);
  };

  return (
    <div
      className={`min-h-screen py-6 px-3 sm:px-6 transition-colors ${
        modoSol ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Cabecera Operativa con Límites Claros */}
        <div
          className={`p-4 sm:p-5 rounded-xl border-2 flex flex-wrap justify-between items-center gap-3 ${
            modoSol
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
                Serie {acta.serie}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                Fecha {acta.jornada} • CU-01
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
              Planilla Arbitral Táctil
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Modo Luz Solar ISO/IEC 25010 */}
            <button
              onClick={() => setModoSol(!modoSol)}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase border-2 transition ${
                modoSol
                  ? "bg-yellow-400 text-black border-white"
                  : "bg-slate-900 text-white border-slate-900"
              }`}
            >
              {modoSol ? "☀ Modo Sol: ON" : "☀ Modo Sol: OFF"}
            </button>

            <span
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase border-2 ${
                acta.estado === "cerrado_inmutable"
                  ? "bg-red-600 text-white border-white"
                  : "bg-emerald-600 text-white border-emerald-300"
              }`}
            >
              {acta.estado === "cerrado_inmutable" ? "🔒 ACTA SELLADA" : "⏱ EN JUEGO"}
            </span>
          </div>
        </div>

        {/* Marcador Gigante de Alto Contraste */}
        <div className="bg-slate-900 text-white rounded-2xl border-4 border-slate-700 p-4 sm:p-6 shadow-xl">
          <div className="grid grid-cols-7 items-center text-center gap-2">
            {/* Club Local */}
            <div className="col-span-3 bg-slate-950 p-3 sm:p-4 rounded-xl border-2 border-blue-500/50">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-400 block">
                LOCAL
              </span>
              <h2 className="text-sm sm:text-lg font-black leading-tight mt-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                {acta.clubLocalNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black text-white my-2 tracking-tighter">
                {acta.golesLocal}
              </p>
            </div>

            {/* Separador Central */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-400 uppercase">Min</span>
              <span className="bg-yellow-400 text-black font-black text-lg sm:text-2xl px-2.5 py-1 rounded-lg border-2 border-white my-1">
                {minuto}&prime;
              </span>
              <span className="text-xs font-black text-slate-500">VS</span>
            </div>

            {/* Club Visita */}
            <div className="col-span-3 bg-slate-950 p-3 sm:p-4 rounded-xl border-2 border-emerald-500/50">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 block">
                VISITA
              </span>
              <h2 className="text-sm sm:text-lg font-black leading-tight mt-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                {acta.clubVisitaNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black text-white my-2 tracking-tighter">
                {acta.golesVisita}
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Captura Táctil (Oculto si el acta está sellada) */}
        {acta.estado !== "cerrado_inmutable" && (
          <div
            className={`p-4 sm:p-6 rounded-2xl border-2 space-y-5 ${
              modoSol
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-300 shadow-sm"
            }`}
          >
            {/* Fila 1: Minuto Rápido + Input de Jugador */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5">
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                  Minuto de Incidencia
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={minuto}
                    onChange={(e) => setMinuto(Number(e.target.value))}
                    className="w-20 bg-slate-950 text-white border-2 border-slate-600 rounded-lg p-2.5 font-black text-lg text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setMinuto((m) => Math.min(120, m + 1))}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-lg border-2 border-slate-600 py-2.5"
                  >
                    +1&prime;
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinuto((m) => Math.min(120, m + 5))}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-lg border-2 border-slate-600 py-2.5"
                  >
                    +5&prime;
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinuto(45)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 font-black text-xs rounded-lg border-2 border-slate-600 py-2.5"
                  >
                    45&prime;
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinuto(90)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 font-black text-xs rounded-lg border-2 border-slate-600 py-2.5"
                  >
                    90&prime;
                  </button>
                </div>
              </div>

              <div className="md:col-span-7">
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                  Dorsal o Nombre del Jugador
                </label>
                <input
                  type="text"
                  placeholder="Ej: #10 Juan Pérez"
                  value={jugadorInput}
                  onChange={(e) => setJugadorInput(e.target.value)}
                  className={`w-full p-3 rounded-lg border-2 font-bold text-base ${
                    modoSol
                      ? "bg-slate-950 text-white border-slate-600 placeholder:text-slate-500"
                      : "bg-slate-50 text-slate-900 border-slate-300"
                  }`}
                />
              </div>
            </div>

            {/* Fila 2: Botoneras Táctiles por Equipo (WCAG AAA Contrast) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Botonera Local */}
              <div className="p-4 rounded-xl border-2 border-blue-500/60 bg-slate-950/60 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-2">
                  Acciones Local • {acta.clubLocalNombre}
                </p>
                <button
                  onClick={() => agregarIncidencia("gol", "local")}
                  className="w-full min-h-[54px] bg-blue-600 active:bg-blue-700 text-white font-black text-base uppercase tracking-wider rounded-xl border-2 border-white shadow-md transition"
                >
                  ⚽ + GOL LOCAL
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => agregarIncidencia("amarilla", "local")}
                    className="min-h-[52px] bg-yellow-400 active:bg-yellow-500 text-black font-black text-sm uppercase rounded-xl border-2 border-black shadow"
                  >
                    🟨 AMARILLA
                  </button>
                  <button
                    onClick={() => agregarIncidencia("roja", "local")}
                    className="min-h-[52px] bg-red-600 active:bg-red-700 text-white font-black text-sm uppercase rounded-xl border-2 border-white shadow"
                  >
                    🟥 ROJA
                  </button>
                </div>
              </div>

              {/* Botonera Visita */}
              <div className="p-4 rounded-xl border-2 border-emerald-500/60 bg-slate-950/60 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2">
                  Acciones Visita • {acta.clubVisitaNombre}
                </p>
                <button
                  onClick={() => agregarIncidencia("gol", "visita")}
                  className="w-full min-h-[54px] bg-blue-600 active:bg-blue-700 text-white font-black text-base uppercase tracking-wider rounded-xl border-2 border-white shadow-md transition"
                >
                  ⚽ + GOL VISITA
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => agregarIncidencia("amarilla", "visita")}
                    className="min-h-[52px] bg-yellow-400 active:bg-yellow-500 text-black font-black text-sm uppercase rounded-xl border-2 border-black shadow"
                  >
                    🟨 AMARILLA
                  </button>
                  <button
                    onClick={() => agregarIncidencia("roja", "visita")}
                    className="min-h-[52px] bg-red-600 active:bg-red-700 text-white font-black text-sm uppercase rounded-xl border-2 border-white shadow"
                  >
                    🟥 ROJA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bitácora Cronológica del Partido */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 ${
            modoSol
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider">
              Bitácora de Incidencias ({acta.incidencias.length})
            </h3>
            <span className="text-xs font-bold opacity-75">
              {acta.sincronizado ? "✓ Sincronizado en Firestore" : "⚡ Guardado en IndexedDB"}
            </span>
          </div>

          {acta.incidencias.length === 0 ? (
            <p className="text-xs opacity-60 py-4 text-center border-2 border-dashed border-slate-700 rounded-xl">
              Sin incidencias registradas aún en el encuentro.
            </p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {acta.incidencias.map((inc, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 text-white border border-slate-800 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black bg-slate-800 px-2 py-1 rounded text-yellow-400">
                      {inc.minuto}&prime;
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-black uppercase text-[11px] ${
                        inc.tipo === "gol"
                          ? "bg-blue-600 text-white"
                          : inc.tipo === "amarilla"
                          ? "bg-yellow-400 text-black"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {inc.tipo}
                    </span>
                    <span className="font-bold">{inc.jugadorNombre}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    {inc.equipoId === acta.clubLocalId
                      ? acta.clubLocalNombre
                      : acta.clubVisitaNombre}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cierre Criptográfico SHA-256 */}
        <div
          className={`p-4 sm:p-6 rounded-2xl border-2 ${
            acta.estado === "cerrado_inmutable"
              ? "bg-red-950/90 border-red-500 text-white"
              : modoSol
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300"
          }`}
        >
          {acta.estado !== "cerrado_inmutable" ? (
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider">
                Cierre definitivo • Firma Digital o PIN de Árbitro y Delegados
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  placeholder="Ingrese PIN o código de validación arbitral"
                  value={firmaArbitro}
                  onChange={(e) => setFirmaArbitro(e.target.value)}
                  className={`flex-1 p-3 rounded-xl border-2 font-bold ${
                    modoSol
                      ? "bg-slate-950 text-white border-slate-600"
                      : "bg-slate-50 text-slate-900 border-slate-300"
                  }`}
                />
                <button
                  onClick={cerrarYSellarActa}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider px-6 py-3.5 rounded-xl border-2 border-white shadow-lg transition"
                >
                  🔒 Sellar Acta SHA-256
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-red-300">
                  ✓ ACTA CERRADA E INMUTABLE (CU-01)
                </span>
                <span className="text-xs font-bold bg-red-800 px-2.5 py-0.5 rounded">
                  Firma: {acta.firmaArbitro}
                </span>
              </div>
              <p className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-red-400/50 break-all text-emerald-400">
                SHA-256: {acta.selloInmutabilidad}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}