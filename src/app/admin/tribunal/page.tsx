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

      setMensaje(`Fallo emitido: Jugador suspendido por ${fechas} fecha(s) y multa de $${multa.toLocaleString("es-CL")} cargada a la cuenta corriente de ${clubNombre}.`);
      setJugador("");
    } catch (error) {
      console.error(error);
      setMensaje("Error al registrar la sanción en Firestore.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <h1 className="text-2xl font-black mb-1">Tribunal de Disciplina (CU-02)</h1>
        <p className="text-sm text-gray-500 mb-6">Imputación de castigos y traspaso automático de multas a Tesorería</p>

        {mensaje && <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-lg mb-4 text-sm font-medium">{mensaje}</div>}

        <form onSubmit={emitirFallo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">ID Club</label>
              <input type="text" value={clubId} onChange={(e) => setClubId(e.target.value)} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Nombre del Club</label>
              <input type="text" value={clubNombre} onChange={(e) => setClubNombre(e.target.value)} className="w-full border p-2 rounded" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Jugador Infractor</label>
            <input type="text" placeholder="Nombre y RUT del jugador" value={jugador} onChange={(e) => setJugador(e.target.value)} className="w-full border p-2 rounded" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Fechas de Suspensión</label>
              <input type="number" value={fechas} onChange={(e) => setFechas(Number(e.target.value))} className="w-full border p-2 rounded" min={1} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Multa Arancelaria (CLP)</label>
              <input type="number" value={multa} onChange={(e) => setMulta(Number(e.target.value))} className="w-full border p-2 rounded" step={1000} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Causal Reglamentaria / Boletín</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border p-2 rounded" rows={2} />
          </div>

          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg">
            Publicar Boletín e Imputar Multa en Tesorería
          </button>
        </form>
      </div>
    </div>
  );
}