"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Club } from "@/types";

export default function LiguillaPage() {
  const [clasificados, setClasificados] = useState<Club[]>([]);

  useEffect(() => {
    const obtenerTop4 = async () => {
      const q = query(collection(db, "equipos"), orderBy("puntos", "desc"), limit(4));
      const snap = await getDocs(q);
      const top: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre,
        puntos: d.data().puntos,
        goles_favor: d.data().goles_favor,
        goles_contra: d.data().goles_contra,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClasificados(top);
    };
    obtenerTop4();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <h1 className="text-2xl font-black mb-1">Cuadro de Postemporada (Liguilla Oficial)</h1>
        <p className="text-sm text-gray-500 mb-6">Emparejamiento automático según clasificación general (1° vs 4° y 2° vs 3°)</p>

        {clasificados.length < 4 ? (
          <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded border">
            Ve al módulo de Configuración y presiona &quot;Cargar Datos Oficiales de Prueba&quot; para generar las llaves con al menos 4 clubes.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="border-2 border-slate-800 rounded-xl p-4 bg-slate-50">
                <span className="text-xs font-black uppercase text-blue-600">Semifinal Llave A</span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between bg-white p-3 rounded border font-bold">
                    <span>1° {clasificados[0].nombre}</span>
                    <span className="text-blue-600">{clasificados[0].puntos} pts</span>
                  </div>
                  <div className="flex justify-between bg-white p-3 rounded border font-bold">
                    <span>4° {clasificados[3].nombre}</span>
                    <span className="text-blue-600">{clasificados[3].puntos} pts</span>
                  </div>
                </div>
              </div>

              <div className="border-2 border-slate-800 rounded-xl p-4 bg-slate-50">
                <span className="text-xs font-black uppercase text-blue-600">Semifinal Llave B</span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between bg-white p-3 rounded border font-bold">
                    <span>2° {clasificados[1].nombre}</span>
                    <span className="text-blue-600">{clasificados[1].puntos} pts</span>
                  </div>
                  <div className="flex justify-between bg-white p-3 rounded border font-bold">
                    <span>3° {clasificados[2].nombre}</span>
                    <span className="text-blue-600">{clasificados[2].puntos} pts</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-amber-500 bg-amber-50/40 rounded-xl p-6 text-center">
              <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase">
                Gran Final Comunal
              </span>
              <h3 className="text-xl font-black mt-4 text-slate-900">Ganador Llave A vs Ganador Llave B</h3>
              <p className="text-xs text-gray-500 mt-1">Sede: Estadio Municipal de San Fabián</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}