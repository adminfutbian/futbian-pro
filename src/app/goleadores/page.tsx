"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

interface Artillero {
  id: string;
  nombre: string;
  club: string;
  serie: string;
  goles: number;
}

export default function GoleadoresPage() {
  const [jugadores, setJugadores] = useState<Artillero[]>([]);
  const [serieFiltro, setSerieFiltro] = useState("Todas");

  useEffect(() => {
    const cargarGoleadores = async () => {
      const q = query(collection(db, "jugadores"), orderBy("goles", "desc"));
      const snap = await getDocs(q);
      const lista: Artillero[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre,
        club: d.data().club,
        serie: d.data().serie || "Honor",
        goles: d.data().goles || 0,
      }));
      setJugadores(lista);
    };
    cargarGoleadores();
  }, []);

  const filtrados = serieFiltro === "Todas"
    ? jugadores
    : jugadores.filter((j) => j.serie === serieFiltro);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black">Goleadores por Serie</h1>
            <p className="text-sm text-gray-500">Estadísticas individuales actualizadas tras el cierre de actas</p>
          </div>
          <select
            value={serieFiltro}
            onChange={(e) => setSerieFiltro(e.target.value)}
            className="border p-2 rounded-lg text-sm font-bold bg-gray-50"
          >
            <option value="Todas">Todas las Series</option>
            <option value="Honor">Serie Honor</option>
            <option value="Segunda">Segunda Serie</option>
            <option value="Senior">Serie Senior</option>
          </select>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase">
              <th className="p-3">#</th>
              <th className="p-3">Jugador</th>
              <th className="p-3">Club</th>
              <th className="p-3 text-center">Serie</th>
              <th className="p-3 text-center">Goles</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filtrados.map((j, i) => (
              <tr key={j.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold">{i + 1}</td>
                <td className="p-3 font-bold">{j.nombre}</td>
                <td className="p-3 text-gray-600">{j.club}</td>
                <td className="p-3 text-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{j.serie}</span>
                </td>
                <td className="p-3 text-center font-black text-lg text-emerald-600">{j.goles}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}