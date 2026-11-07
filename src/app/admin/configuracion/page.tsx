"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const CLUBES_INICIALES = [
  { id: "halcones", nombre: "CD Los Halcones", puntos: 15, goles_favor: 12, goles_contra: 4, saldoDeudor: 0, bloqueadoDeportivo: false },
  { id: "estrella", nombre: "Estrella Precordillerana", puntos: 12, goles_favor: 9, goles_contra: 5, saldoDeudor: 15000, bloqueadoDeportivo: true },
  { id: "union", nombre: "Unión San Fabián", puntos: 10, goles_favor: 8, goles_contra: 6, saldoDeudor: 0, bloqueadoDeportivo: false },
  { id: "nuble", nombre: "Deportivo Ñuble", puntos: 7, goles_favor: 6, goles_contra: 8, saldoDeudor: 0, bloqueadoDeportivo: false },
  { id: "condores", nombre: "Cóndores del Valle", puntos: 4, goles_favor: 3, goles_contra: 10, saldoDeudor: 30000, bloqueadoDeportivo: true },
  { id: "alico", nombre: "Juventud Alico", puntos: 1, goles_favor: 2, goles_contra: 12, saldoDeudor: 0, bloqueadoDeportivo: false },
];

export default function ConfiguracionPage() {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const inicializarDatosSanFabian = async () => {
    setCargando(true);
    setMensaje("");
    try {
      for (const club of CLUBES_INICIALES) {
        await setDoc(doc(db, "equipos", club.id), club, { merge: true });
      }
      setMensaje("✓ Base de datos poblada con éxito: 6 clubes oficiales cargados en Firestore.");
    } catch (error) {
      console.error(error);
      setMensaje("Error al inicializar los datos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-800 space-y-5">
        <div>
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            SISTEMA • SEED FIRESTORE
          </span>
          <h1 className="text-2xl font-black text-white mt-2">
            Configuración General y Semilla de Datos
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Parametrización oficial e inyección atómica ({`{ merge: true }`}) de clubes de San Fabián
          </p>
        </div>

        {mensaje && (
          <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-sm font-black">
            {mensaje}
          </div>
        )}

        <div className="pt-4 border-t-2 border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs font-bold text-slate-400 max-w-md">
            Poblar Cloud Firestore con la nómina oficial de 6 clubes, puntajes iniciales y estados de cuenta corriente de prueba.
          </p>
          <button
            onClick={inicializarDatosSanFabian}
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-white text-xs shadow-lg transition"
          >
            {cargando ? "Cargando en Firestore..." : "⚡ Cargar Datos Oficiales"}
          </button>
        </div>
      </div>
    </div>
  );
}