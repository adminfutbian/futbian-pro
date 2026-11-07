"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Club } from "@/types";

export default function FinanzasPage() {
  const [clubes, setClubes] = useState<Club[]>([]);

  const cargarCuentas = async () => {
    const snap = await getDocs(collection(db, "equipos"));
    const lista: Club[] = snap.docs.map((d) => ({
      id: d.id,
      nombre: d.data().nombre || d.id,
      puntos: d.data().puntos || 0,
      goles_favor: d.data().goles_favor || 0,
      goles_contra: d.data().goles_contra || 0,
      saldoDeudor: d.data().saldoDeudor || 0,
      bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
    }));
    setClubes(lista);
  };

  useEffect(() => {
    cargarCuentas();
  }, []);

  const conciliarPago = async (clubId: string) => {
    const ref = doc(db, "equipos", clubId);
    await updateDoc(ref, {
      saldoDeudor: 0,
      bloqueadoDeportivo: false,
    });
    await cargarCuentas();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow border">
        <h1 className="text-2xl font-black mb-1">Tesorería General y Conciliación (CU-03)</h1>
        <p className="text-sm text-gray-500 mb-6">Control de morosidad y desbloqueo automático de habilitación deportiva</p>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-bold uppercase text-gray-600">
              <th className="p-3">Club Federado</th>
              <th className="p-3">Deuda Acumulada</th>
              <th className="p-3">Estado Deportivo</th>
              <th className="p-3 text-right">Acción Contable</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {clubes.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-bold">{c.nombre}</td>
                <td className="p-3 font-mono font-bold text-red-600">
                  ${c.saldoDeudor.toLocaleString("es-CL")}
                </td>
                <td className="p-3">
                  {c.bloqueadoDeportivo ? (
                    <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded text-xs font-bold">
                      BLOQUEADO POR MOROSIDAD
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded text-xs font-bold">
                      HABILITADO PARA JUGAR
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {c.saldoDeudor > 0 && (
                    <button
                      onClick={() => conciliarPago(c.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded"
                    >
                      Conciliar Pago y Liberar Club
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}