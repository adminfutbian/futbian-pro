"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Club } from "@/types";

export default function TablasPage() {
  const [equipos, setEquipos] = useState<Club[]>([]);

  useEffect(() => {
    const fetchTablas = async () => {
      const q = query(collection(db, "equipos"), orderBy("puntos", "desc"));
      const snap = await getDocs(q);
      const data: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setEquipos(data);
    };
    fetchTablas();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <h1 className="text-2xl font-black mb-4">Tabla Oficial de Posiciones</h1>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-slate-900 text-white text-xs uppercase">
              <th className="p-3">Pos</th>
              <th className="p-3">Club</th>
              <th className="p-3 text-center">GF</th>
              <th className="p-3 text-center">GC</th>
              <th className="p-3 text-center">DIF</th>
              <th className="p-3 text-center">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {equipos.map((eq, i) => (
              <tr key={eq.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold">{i + 1}</td>
                <td className="p-3 font-bold">{eq.nombre}</td>
                <td className="p-3 text-center">{eq.goles_favor}</td>
                <td className="p-3 text-center">{eq.goles_contra}</td>
                <td className="p-3 text-center">{eq.goles_favor - eq.goles_contra}</td>
                <td className="p-3 text-center font-black text-blue-600">{eq.puntos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}