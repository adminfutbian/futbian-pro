"use client";

import React, { useState, useEffect } from "react";
import { ActaPartido, Incidencia } from "@/types";
import { guardarActaOfflineFirst, sincronizarOutboxConFirestore } from "@/lib/offlineDb";

export default function PlanillaPage() {
  const [online, setOnline] = useState(true);
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
    clubVisitaNombre: "Estrella precordillerana",
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

  const agregarIncidencia = async (tipo: "gol" | "amarilla" | "roja", equipo: "local" | "visita") => {
    if (acta.estado === "cerrado_inmutable") return;

    const nueva: Incidencia = {
      minuto,
      tipo,
      jugadorNombre: jugadorInput || "Jugador N° 10",
      equipoId: equipo === "local" ? acta.clubLocalId : acta.clubVisitaId,
    };

    const nuevaActa: ActaPartido = {
      ...acta,
      golesLocal: tipo === "gol" && equipo === "local" ? acta.golesLocal + 1 : acta.golesLocal,
      golesVisita: tipo === "gol" && equipo === "visita" ? acta.golesVisita + 1 : acta.golesVisita,
      incidencias: [...acta.incidencias, nueva],
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
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawData));
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black">Planilla Arbitral Táctil (CU-01)</h1>
            <p className="text-sm text-gray-500">Serie {acta.serie} • Fecha {acta.jornada}</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {online ? "Conectado (Cloud Firestore)" : "Modo Offline (IndexedDB Outbox)"}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${acta.estado === "cerrado_inmutable" ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}>
              {acta.estado === "cerrado_inmutable" ? "ACTA SELLADA" : "EN JUEGO"}
            </span>
          </div>
        </div>

        {/* Marcador */}
        <div className="grid grid-cols-3 items-center text-center bg-slate-900 text-white p-6 rounded-xl mb-6">
          <div>
            <h2 className="text-lg font-bold">{acta.clubLocalNombre}</h2>
            <p className="text-6xl font-black my-2">{acta.golesLocal}</p>
          </div>
          <div className="text-2xl font-bold text-slate-400">VS</div>
          <div>
            <h2 className="text-lg font-bold">{acta.clubVisitaNombre}</h2>
            <p className="text-6xl font-black my-2">{acta.golesVisita}</p>
          </div>
        </div>

        {/* Controles de captura táctil */}
        {acta.estado !== "cerrado_inmutable" && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-4">
            <div className="flex gap-4">
              <div className="w-28">
                <label className="block text-xs font-bold uppercase text-gray-600">Minuto</label>
                <input
                  type="number"
                  value={minuto}
                  onChange={(e) => setMinuto(Number(e.target.value))}
                  className="w-full border p-2 rounded font-bold text-center"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase text-gray-600">Jugador / Dorsal</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez (#9)"
                  value={jugadorInput}
                  onChange={(e) => setJugadorInput(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Acciones Local</p>
                <div className="flex gap-2">
                  <button onClick={() => agregarIncidencia("gol", "local")} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm flex-1">+ Gol</button>
                  <button onClick={() => agregarIncidencia("amarilla", "local")} className="bg-yellow-400 text-black px-3 py-2 rounded font-bold text-sm">Amarilla</button>
                  <button onClick={() => agregarIncidencia("roja", "local")} className="bg-red-600 text-white px-3 py-2 rounded font-bold text-sm">Roja</button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Acciones Visita</p>
                <div className="flex gap-2">
                  <button onClick={() => agregarIncidencia("gol", "visita")} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm flex-1">+ Gol</button>
                  <button onClick={() => agregarIncidencia("amarilla", "visita")} className="bg-yellow-400 text-black px-3 py-2 rounded font-bold text-sm">Amarilla</button>
                  <button onClick={() => agregarIncidencia("roja", "visita")} className="bg-red-600 text-white px-3 py-2 rounded font-bold text-sm">Roja</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historial cronológico */}
        <div className="mb-6">
          <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Registro Cronológico en IndexedDB</h3>
          {acta.incidencias.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin incidencias registradas.</p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {acta.incidencias.map((inc, i) => (
                <li key={i} className="p-2.5 text-sm flex justify-between">
                  <span><strong>{inc.minuto}&apos;</strong> — {inc.tipo.toUpperCase()} ({inc.jugadorNombre})</span>
                  <span className="text-gray-500 font-medium">{inc.equipoId}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Firma Digital y Sello de Inmutabilidad */}
        {acta.estado !== "cerrado_inmutable" ? (
          <div className="border-t pt-4">
            <label className="block text-sm font-bold mb-2">Firma Digital de Cierre (Árbitro y Delegados)</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ingrese código o firma de validación"
                value={firmaArbitro}
                onChange={(e) => setFirmaArbitro(e.target.value)}
                className="border p-2.5 rounded-lg flex-1"
              />
              <button
                onClick={cerrarYSellarActa}
                className="bg-slate-900 hover:bg-black text-white font-bold px-6 py-2.5 rounded-lg"
              >
                Sellar Acta Inmutable
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 p-4 rounded-lg border text-xs font-mono break-all">
            <p className="font-bold text-slate-700 mb-1">ACTA BLOQUEADA - SELLO CRIPTOGRÁFICO SHA-256:</p>
            {acta.selloInmutabilidad}
          </div>
        )}
      </div>
    </div>
  );
}