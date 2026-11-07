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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800">
        <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
          TESORERÍA GENERAL • CU-03
        </span>
        <h1 className="text-2xl font-black text-white mt-2">
          Control de Morosidad y Habilitación Deportiva
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">
          Conciliación de aranceles y liberación inmediata para disputar la jornada
        </p>
      </div>

      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">Club Federado</th>
                <th className="p-4 text-right">Deuda Acumulada</th>
                <th className="p-4 text-center">Estado Deportivo</th>
                <th className="p-4 text-right">Acción Contable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {clubes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-black text-white text-base">
                    {c.nombre}
                  </td>
                  <td className="p-4 text-right font-mono font-black text-lg">
                    <span
                      className={
                        c.saldoDeudor > 0 ? "text-red-400" : "text-emerald-400"
                      }
                    >
                      ${c.saldoDeudor.toLocaleString("es-CL")}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {c.bloqueadoDeportivo ? (
                      <span className="inline-block bg-red-950 text-red-300 border-2 border-red-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                        🔒 Bloqueado por Morosidad
                      </span>
                    ) : (
                      <span className="inline-block bg-emerald-950 text-emerald-300 border-2 border-emerald-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                        ✓ Habilitado para Jugar
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {c.saldoDeudor > 0 ? (
                      <button
                        onClick={() => conciliarPago(c.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border-2 border-white shadow transition"
                      >
                        ✓ Conciliar Pago y Liberar
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Al Día
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}