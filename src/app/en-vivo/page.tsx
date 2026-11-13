// src/app/en-vivo/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PartidoTransmision } from "@/types";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

const RESPALDO_VIVO: PartidoTransmision[] = [
  {
    id: "live-default",
    enunciado: "Transmisión Oficial - Clásico Precordillerano",
    jornada: 1,
    serie: "Honor",
    localNombre: "Paso Ancho",
    visitaNombre: "CD Los Halcones",
    cancha: "Estadio Paso Ancho",
    precioBoleto: 2000,
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    enVivo: true,
    marcadorVivo: "2 - 1 (En Vivo)",
  },
];

export default function TransmisionEnVivoPage() {
  const [cartelera, setCartelera] =
    useState<PartidoTransmision[]>(RESPALDO_VIVO);
  const [partidoActivo, setPartidoActivo] = useState<PartidoTransmision>(
    RESPALDO_VIVO[0]
  );
  const [boletosComprados, setBoletosComprados] = useState<string[]>([]);
  const [nombreHincha, setNombreHincha] = useState("");

  useEffect(() => {
    const guardados = JSON.parse(
      localStorage.getItem("futbian_tickets_vivo") || "[]"
    );
    setBoletosComprados(guardados);

    const unsub = onSnapshot(collection(db, "transmisiones_vivo"), (snap) => {
      if (!snap.empty) {
        const lista: PartidoTransmision[] = snap.docs.map((d) => ({
          ...(d.data() as PartidoTransmision),
          id: d.id,
        }));
        setCartelera(lista);
        setPartidoActivo(lista[0]);
      }
    });
    return () => unsub();
  }, []);

  const tieneBoleto = boletosComprados.includes(partidoActivo.id);

  const comprarBoletoDigital = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos = [...boletosComprados, partidoActivo.id];
    setBoletosComprados(nuevos);
    localStorage.setItem("futbian_tickets_vivo", JSON.stringify(nuevos));

    await registrarAccionAuditoria(
      "TRANSMISION_VIVO",
      "COMPRA_BOLETO_HINCHA",
      `Boleto pagado por ${nombreHincha} para "${partidoActivo.enunciado}"`
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-red-500/60">
        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase animate-pulse">
          🔴 STREAMING OFICIAL HD
        </span>
        <h1 className="text-2xl font-black text-white mt-2">
          {partidoActivo.enunciado || "Transmisión en Vivo — San Fabián"}
        </h1>
        <p className="text-xs font-bold text-slate-400">
          {partidoActivo.localNombre} vs {partidoActivo.visitaNombre} • Serie{" "}
          {partidoActivo.serie} • 📍 {partidoActivo.cancha}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cartelera.map((p) => {
          const sel = partidoActivo.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPartidoActivo(p)}
              className={`p-4 rounded-2xl border-2 text-left flex justify-between items-center ${
                sel
                  ? "bg-slate-900 border-yellow-400"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase text-red-400 block">
                  ● {p.enunciado}
                </span>
                <p className="text-base font-black text-white">
                  {p.localNombre} vs {p.visitaNombre}
                </p>
                <span className="text-xs font-bold text-yellow-400">
                  {p.marcadorVivo}
                </span>
              </div>
              <span className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-black">
                ${p.precioBoleto.toLocaleString("es-CL")}
              </span>
            </button>
          );
        })}
      </div>

      {tieneBoleto ? (
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-emerald-500 space-y-3">
          <h2 className="text-lg font-black text-white">
            {partidoActivo.enunciado}: {partidoActivo.localNombre} vs{" "}
            {partidoActivo.visitaNombre} ({partidoActivo.marcadorVivo})
          </h2>
          <div className="aspect-video w-full rounded-xl overflow-hidden border-2 border-slate-800 bg-black">
            <iframe
              src={partidoActivo.streamUrl}
              title={partidoActivo.enunciado}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <form
          onSubmit={comprarBoletoDigital}
          className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-800 max-w-xl mx-auto space-y-4 text-center"
        >
          <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded uppercase">
            🎟 TAQUILLA DIGITAL
          </span>
          <h2 className="text-xl font-black text-white">
            {partidoActivo.enunciado}
          </h2>
          <input
            type="text"
            placeholder="Ingrese su nombre para validar el boleto..."
            value={nombreHincha}
            onChange={(e) => setNombreHincha(e.target.value)}
            className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
            required
          />
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-4 rounded-xl border-2 border-white text-sm"
          >
            🔓 Pagar Boleto (${partidoActivo.precioBoleto.toLocaleString("es-CL")}) y Ver Señal
          </button>
        </form>
      )}
    </div>
  );
}