"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, increment } from "firebase/firestore";

export default function TribunalPage() {
  const [clubId, setClubId] = useState("halcones");
  const [clubNombre, setClubNombre] = useState("CD Los Halcones");
  const [jugador, setJugador] = useState("");
  const [fechas, setFechas] = useState(1);
  const [multa, setMulta] = useState(15000);
  const [motivo, setMotivo] = useState("Tarjeta roja directa - Conducta violenta");
  const [mensaje, setMensaje] = useState("");

  const emitirFallo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "sanciones"), {
        clubId,
        clubNombre,
        jugador,
        fechasCastigo: fechas,
        montoMulta: multa,
        motivo,
        fechaEmision: new Date().toISOString(),
      });

      const clubRef = doc(db, "equipos", clubId);
      await setDoc(
        clubRef,
        {
          nombre: clubNombre,
          saldoDeudor: increment(multa),
          bloqueadoDeportivo: multa > 0,
        },
        { merge: true }
      );

      setMensaje(
        `✓ Fallo emitido: Multa de $${multa.toLocaleString("es-CL")} imputada a ${clubNombre}.`
      );
      setJugador("");
    } catch (error) {
      console.error(error);
      setMensaje("Error al registrar la sanción.");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800">
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            TRIBUNAL DE DISCIPLINA • CU-02
          </span>
          <h1 className="text-2xl font-black text-white mt-2">
            Emisión de Fallos y Multas
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Imputación automática en cuenta corriente y bloqueo deportivo en Tesorería
          </p>
        </div>

        {mensaje && (
          <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl mb-5 text-sm font-black">
            {mensaje}
          </div>
        )}

        <form onSubmit={emitirFallo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                ID Club Infractor
              </label>
              <input
                type="text"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Nombre Oficial del Club
              </label>
              <input
                type="text"
                value={clubNombre}
                onChange={(e) => setClubNombre(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Jugador Sancionado (Nombre / Dorsal)
            </label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez (#9)"
              value={jugador}
              onChange={(e) => setJugador(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold placeholder:text-slate-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Fechas de Suspensión
              </label>
              <input
                type="number"
                value={fechas}
                onChange={(e) => setFechas(Number(e.target.value))}
                className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-3 rounded-xl font-black text-lg"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Multa Arancelaria (CLP $)
              </label>
              <input
                type="number"
                value={multa}
                onChange={(e) => setMulta(Number(e.target.value))}
                className="w-full bg-slate-950 text-red-400 border-2 border-slate-700 p-3 rounded-xl font-black text-lg"
                step={1000}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Causal Reglamentaria / Boletín Oficial
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold"
              rows={2}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-4 rounded-xl border-2 border-white shadow-lg transition"
          >
            ⚖ Publicar Boletín e Imputar Multa en Tesorería
          </button>
        </form>
      </div>
    </div>
  );
}