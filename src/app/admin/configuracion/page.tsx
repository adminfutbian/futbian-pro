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

const JUGADORES_INICIALES = [
  { id: "jug-1", nombre: "Matías Sepúlveda", club: "CD Los Halcones", serie: "Honor", goles: 8, sancionado: false },
  { id: "jug-2", nombre: "Carlos Garrido", club: "Estrella Precordillerana", serie: "Honor", goles: 6, sancionado: false },
  { id: "jug-3", nombre: "Rodrigo Fuentes", club: "Unión San Fabián", serie: "Senior", goles: 5, sancionado: false },
  { id: "jug-4", nombre: "Jorge Contreras", club: "Deportivo Ñuble", serie: "Segunda", goles: 4, sancionado: true },
];

export default function ConfiguracionPage() {
  const [temporada, setTemporada] = useState("Campeonato Oficial 2026 - Asociación San Fabián");
  const [multaRoja, setMultaRoja] = useState(15000);
  const [multaAmarilla, setMultaAmarilla] = useState(3000);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const inicializarDatosSanFabian = async () => {
    setCargando(true);
    setMensaje("");
    try {
      for (const club of CLUBES_INICIALES) {
        await setDoc(doc(db, "equipos", club.id), club, { merge: true });
      }
      for (const jug of JUGADORES_INICIALES) {
        await setDoc(doc(db, "jugadores", jug.id), jug, { merge: true });
      }
      await setDoc(doc(db, "configuracion", "torneo_actual"), {
        temporada,
        multaRoja,
        multaAmarilla,
        series: ["Honor", "Segunda", "Senior", "Súper Senior", "Juvenil"],
        canchas: ["Estadio Municipal Cancha 1", "Cancha Rural La Punilla", "Recinto Las Guardias"],
      });
      setMensaje("Base de datos poblada con éxito: 6 clubes, goleadores y parámetros oficiales cargados en Firestore.");
    } catch (error) {
      console.error(error);
      setMensaje("Error al inicializar los datos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow border">
        <h1 className="text-2xl font-black mb-1">Configuración General de la Liga</h1>
        <p className="text-sm text-gray-500 mb-6">Parametrización de aranceles, series oficiales y carga inicial de temporada</p>

        {mensaje && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-lg mb-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Nombre Oficial de Temporada</label>
            <input
              type="text"
              value={temporada}
              onChange={(e) => setTemporada(e.target.value)}
              className="w-full border p-2.5 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Arancel Tarjeta Roja Directa (CLP)</label>
              <input
                type="number"
                value={multaRoja}
                onChange={(e) => setMultaRoja(Number(e.target.value))}
                className="w-full border p-2.5 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Arancel Acumulación Amarillas (CLP)</label>
              <input
                type="number"
                value={multaAmarilla}
                onChange={(e) => setMultaAmarilla(Number(e.target.value))}
                className="w-full border p-2.5 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-between items-center">
            <p className="text-xs text-gray-500 max-w-md">
              ¿Base de datos vacía? Usa este botón para inyectar los clubes de San Fabián, sus puntos, deudas de prueba y goleadores en Firestore.
            </p>
            <button
              onClick={inicializarDatosSanFabian}
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition"
            >
              {cargando ? "Cargando en Firestore..." : "Cargar Datos Oficiales de Prueba"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}