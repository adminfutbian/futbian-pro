// src/app/en-vivo/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PartidoTransmision } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

const PARTIDOS_CARTELERA_VIVO: PartidoTransmision[] = [
  {
    id: "live-1",
    jornada: 1,
    serie: "Honor",
    localNombre: "Paso Ancho",
    visitaNombre: "CD Los Halcones",
    cancha: "Estadio Paso Ancho (Cancha Única)",
    precioBoleto: 2000,
    streamUrl: "https://www.youtube.com/watch?v=GvdU_VaKD0E",
    enVivo: true,
    marcadorVivo: "2 - 1 (72' ST)",
  },
  {
    id: "live-2",
    jornada: 1,
    serie: "Honor",
    localNombre: "Estrella Precordillerana",
    visitaNombre: "Unión San Fabián",
    cancha: "Estadio Municipal",
    precioBoleto: 2000,
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    enVivo: true,
    marcadorVivo: "0 - 0 (38' PT)",
  },
];

export default function TransmisionEnVivoPage() {
  const [partidoActivo, setPartidoActivo] = useState<PartidoTransmision>(
    PARTIDOS_CARTELERA_VIVO[0]
  );
  const [boletosComprados, setBoletosComprados] = useState<string[]>([]);
  const [nombreHincha, setNombreHincha] = useState("");
  const [metodoPago, setMetodoPago] = useState("Webpay / CuentaRUT");
  const [procesandoPago, setProcesandoPago] = useState(false);

  useEffect(() => {
    const guardados = JSON.parse(
      localStorage.getItem("futbian_tickets_vivo") || "[]"
    );
    setBoletosComprados(guardados);
  }, []);

  const tieneBoleto = boletosComprados.includes(partidoActivo.id);

  const comprarBoletoDigital = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesandoPago(true);

    const nuevos = [...boletosComprados, partidoActivo.id];
    setBoletosComprados(nuevos);
    localStorage.setItem("futbian_tickets_vivo", JSON.stringify(nuevos));

    await registrarAccionAuditoria(
      "TRANSMISION_VIVO",
      "COMPRA_BOLETO_HINCHA",
      `Boleto digital ($${partidoActivo.precioBoleto.toLocaleString(
        "es-CL"
      )}) adquirido por ${nombreHincha || "Hincha"} para ver ${
        partidoActivo.localNombre
      } vs ${partidoActivo.visitaNombre}`
    );

    setProcesandoPago(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-red-500/60 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase animate-pulse">
            🔴 SEÑAL OFICIAL STREAMING HD • TAQUILLA DIGITAL
          </span>
          <h1 className="text-2xl font-black text-white mt-2">
            Transmisión en Vivo — Fútbol San Fabián
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Adquiera su boleto digital y apoye directamente a los clubes de la Asociación.
          </p>
        </div>
      </div>

      {/* Selector de Partidos en Cartelera */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PARTIDOS_CARTELERA_VIVO.map((p) => {
          const seleccionado = partidoActivo.id === p.id;
          const desbloqueado = boletosComprados.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPartidoActivo(p)}
              className={`p-4 rounded-2xl border-2 text-left transition flex justify-between items-center ${
                seleccionado
                  ? "bg-slate-900 border-yellow-400"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase text-red-400 block">
                  ● EN VIVO • SERIE {p.serie} • {p.cancha}
                </span>
                <p className="text-base font-black text-white mt-0.5">
                  {p.localNombre} vs {p.visitaNombre}
                </p>
                <span className="text-xs font-bold text-yellow-400">
                  Marcador: {p.marcadorVivo}
                </span>
              </div>

              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border ${
                  desbloqueado
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                    : "bg-blue-600 text-white border-white"
                }`}
              >
                {desbloqueado
                  ? "✓ Boleto Activo"
                  : `$${p.precioBoleto.toLocaleString("es-CL")}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pantalla de Video o Pasarela de Boleto Digital */}
      {tieneBoleto ? (
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-emerald-500 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
                ✓ ACCESO AUTORIZADO • BOLETO DIGITAL VALIDADO
              </span>
              <h2 className="text-xl font-black text-white mt-1">
                {partidoActivo.localNombre} vs {partidoActivo.visitaNombre} (
                {partidoActivo.marcadorVivo})
              </h2>
            </div>
            <span className="text-xs font-black text-emerald-400">
              📍 {partidoActivo.cancha}
            </span>
          </div>

          <div className="aspect-video w-full rounded-xl overflow-hidden border-2 border-slate-800 bg-black">
            <iframe
              src={partidoActivo.streamUrl}
              title="Transmisión en Vivo Futbian.pro"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-800 max-w-xl mx-auto space-y-5 text-center">
          <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded uppercase">
            🎟 BOLETERÍA DIGITAL HINCHA
          </span>
          <h2 className="text-2xl font-black text-white">
            Desbloquear Transmisión en Vivo
          </h2>
          <p className="text-sm font-bold text-slate-300">
            Partido: <span className="text-yellow-400">{partidoActivo.localNombre} vs {partidoActivo.visitaNombre}</span>
            <br />
            Valor Entrada Digital:{" "}
            <span className="text-emerald-400 font-black">
              ${partidoActivo.precioBoleto.toLocaleString("es-CL")} CLP
            </span>
          </p>

          <form onSubmit={comprarBoletoDigital} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Nombre del Hincha
              </label>
              <input
                type="text"
                placeholder="Ej: Pedro González"
                value={nombreHincha}
                onChange={(e) => setNombreHincha(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Medio de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-3 rounded-xl font-black text-sm"
              >
                <option value="Webpay / CuentaRUT">
                  Webpay Plus / BancoEstado CuentaRUT
                </option>
                <option value="MercadoPago">MercadoPago / Tarjeta Débito</option>
                <option value="Transferencia Directa">
                  Transferencia Asociación San Fabián
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={procesandoPago}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-4 rounded-xl border-2 border-white shadow-xl text-sm transition"
            >
              {procesandoPago
                ? "Validando Boleto..."
                : `🔓 Pagar $${partidoActivo.precioBoleto.toLocaleString(
                    "es-CL"
                  )} y Ver Partido Ahora`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}