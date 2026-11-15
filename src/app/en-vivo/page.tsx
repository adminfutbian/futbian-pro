// src/app/en-vivo/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PartidoTransmision } from "@/types";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

const RESPALDO_VIVO: PartidoTransmision[] = [
  {
    id: "live-default",
    enunciado: "Transmisión Oficial - Clásico Comunal San Fabián",
    jornada: 1,
    serie: "Honor",
    localNombre: "Paso Ancho",
    visitaNombre: "La Ribera",
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
  const [ultimoTicketCodigo, setUltimoTicketCodigo] = useState<string>("");

  // Estados del Simulador de Muro de Pago (Paywall)
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [pasoPasarela, setPasoPasarela] = useState<
    "FORMULARIO" | "PROCESANDO_BANCO" | "APROBADO"
  >("FORMULARIO");
  const [metodoPago, setMetodoPago] = useState<
    "WEBPAY_TARJETA" | "CUENTA_RUT" | "MERCADOPAGO"
  >("WEBPAY_TARJETA");
  const [nombreHincha, setNombreHincha] = useState("");
  const [emailHincha, setEmailHincha] = useState("");
  const [numTarjeta, setNumTarjeta] = useState("4532 •••• •••• 8891");
  const [vencimiento, setVencimiento] = useState("08/28");
  const [cvv, setCvv] = useState("842");
  const [claveBanco, setClaveBanco] = useState("");

  useEffect(() => {
    const guardados = JSON.parse(
      localStorage.getItem("futbian_tickets_vivo") || "[]"
    );
    setBoletosComprados(guardados);

    const unsub = onSnapshot(collection(db, "transmisiones_vivo"), (snap) => {
      if (!snap.empty) {
        const lista: PartidoTransmision[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<PartidoTransmision, "id">),
          id: d.id,
        }));
        setCartelera(lista);
        setPartidoActivo(lista[0]);
      }
    });
    return () => unsub();
  }, []);

  const tieneBoleto = boletosComprados.includes(partidoActivo.id);

  const simularAutorizacionBancaria = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasoPasarela("PROCESANDO_BANCO");

    setTimeout(async () => {
      const codigoUnico = `TCK-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;
      setUltimoTicketCodigo(codigoUnico);

      const nuevos = [...boletosComprados, partidoActivo.id];
      setBoletosComprados(nuevos);
      localStorage.setItem("futbian_tickets_vivo", JSON.stringify(nuevos));

      // Guardar la venta en la base de datos Firestore (colección boletos_vendidos)
      try {
        await addDoc(collection(db, "boletos_vendidos"), {
          codigoTicket: codigoUnico,
          partidoId: partidoActivo.id,
          enunciadoPartido: `${partidoActivo.localNombre} vs ${partidoActivo.visitaNombre}`,
          serie: partidoActivo.serie,
          montoPagado: partidoActivo.precioBoleto,
          metodoPago,
          compradorNombre: nombreHincha.trim() || "Hincha San Fabián",
          compradorEmail: emailHincha.trim() || "sin-correo@futbian.pro",
          fechaCompra: new Date().toISOString(),
        });

        await registrarAccionAuditoria(
          "TAQUILLA_STREAMING",
          "PAGO_BOLETO_APROBADO",
          `Ticket ${codigoUnico} ($${partidoActivo.precioBoleto.toLocaleString(
            "es-CL"
          )}) pagado vía ${metodoPago} por ${nombreHincha}`
        );
      } catch (err) {
        console.error("Error registrando boleto en Firestore:", err);
      }

      setPasoPasarela("APROBADO");
    }, 1800);
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-red-500/60 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase animate-pulse">
            🔴 SEÑAL OFICIAL STREAMING PPV • PAYWALL DIGITAL
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2">
            {partidoActivo.enunciado || "Transmisión en Vivo — San Fabián"}
          </h1>
          <p className="text-xs font-bold text-slate-400">
            {partidoActivo.localNombre} vs {partidoActivo.visitaNombre} • Serie{" "}
            {partidoActivo.serie} • 📍 {partidoActivo.cancha}
          </p>
        </div>

        <div className="bg-slate-950 border-2 border-slate-800 px-4 py-2.5 rounded-xl text-right">
          <span className="text-[10px] font-black uppercase text-slate-400 block">
            MARCADOR EN DIRECTO
          </span>
          <span className="text-base font-black text-yellow-400">
            {partidoActivo.marcadorVivo}
          </span>
        </div>
      </div>

      {/* Selector de Cartelera de Partidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cartelera.map((p) => {
          const sel = partidoActivo.id === p.id;
          const comprado = boletosComprados.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPartidoActivo(p);
                setModalPagoAbierto(false);
              }}
              className={`p-4 rounded-2xl border-2 text-left flex justify-between items-center gap-3 transition ${
                sel
                  ? "bg-slate-900 border-yellow-400 shadow-lg"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-red-400 block truncate">
                  ● {p.enunciado}
                </span>
                <p className="text-base font-black text-white truncate">
                  {p.localNombre} vs {p.visitaNombre}
                </p>
                <span className="text-xs font-bold text-yellow-400">
                  {p.marcadorVivo} • Serie {p.serie}
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase shrink-0 border ${
                  comprado
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                    : "bg-blue-600 text-white border-white"
                }`}
              >
                {comprado
                  ? "✓ Desbloqueado"
                  : `$${p.precioBoleto.toLocaleString("es-CL")}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* PANTALLA DE SEÑAL DESBLOQUEADA O MURO DE PAGO (PAYWALL) */}
      {tieneBoleto ? (
        <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border-2 border-emerald-500 space-y-4 shadow-2xl">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded uppercase">
                🔓 SEÑAL HD DESBLOQUEADA • BOLETO OFICIAL ACTIVO
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                {partidoActivo.localNombre} vs {partidoActivo.visitaNombre} (
                {partidoActivo.marcadorVivo})
              </h2>
            </div>
            {ultimoTicketCodigo && (
              <span className="font-mono text-xs font-black text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-emerald-500/40">
                Código Ticket: {ultimoTicketCodigo}
              </span>
            )}
          </div>

          <div className="aspect-video w-full rounded-xl overflow-hidden border-2 border-slate-800 bg-black">
            <iframe
              src={partidoActivo.streamUrl}
              title={partidoActivo.enunciado}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        /* MURO DE PAGO (PAYWALL VISUAL DE ESTADIO) */
        <div className="relative rounded-2xl border-2 border-slate-700 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-10 text-center space-y-5 max-w-2xl mx-auto">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-3xl">
              🔒
            </div>

            <div className="space-y-2">
              <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded uppercase">
                SEÑAL PROTEGIDA POR PAYWALL • TAQUILLA DIGITAL SAN FABIÁN
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {partidoActivo.localNombre} vs {partidoActivo.visitaNombre}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400">
                {partidoActivo.enunciado} • 📍 {partidoActivo.cancha} • Serie{" "}
                {partidoActivo.serie}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 inline-block">
              <span className="text-[11px] font-black uppercase text-slate-400 block">
                VALOR E-TICKET ACCESO INMEDIATO
              </span>
              <span className="text-3xl font-black text-emerald-400">
                ${partidoActivo.precioBoleto.toLocaleString("es-CL")} CLP
              </span>
            </div>

            {!modalPagoAbierto ? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setModalPagoAbierto(true);
                    setPasoPasarela("FORMULARIO");
                  }}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase px-8 py-4 rounded-2xl border-2 border-white shadow-xl text-sm transition"
                >
                  💳 Comprar Boleto Digital y Desbloquear Señal Ahora
                </button>
              </div>
            ) : (
              /* PASARELA DE PAGO SIMULADA (WEBPAY / CUENTARUT / MERCADOPAGO) */
              <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-blue-500 text-left space-y-4 mt-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-400 block">
                      PASARELA SEGURA SSL • SIMULADOR DE PAGO
                    </span>
                    <h3 className="text-base font-black text-white">
                      Checkout Boletería Asociación San Fabián
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalPagoAbierto(false)}
                    className="text-xs font-black text-slate-400 hover:text-white"
                  >
                    ✕ Cerrar
                  </button>
                </div>

                {pasoPasarela === "FORMULARIO" && (
                  <form
                    onSubmit={simularAutorizacionBancaria}
                    className="space-y-4"
                  >
                    {/* Selector de Medio de Pago */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "WEBPAY_TARJETA", label: "💳 Webpay / Redcompra" },
                        { id: "CUENTA_RUT", label: "🏦 BancoEstado RUT" },
                        { id: "MERCADOPAGO", label: "🤝 MercadoPago" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMetodoPago(m.id as any)}
                          className={`p-2.5 rounded-xl border-2 text-center text-[11px] font-black uppercase transition ${
                            metodoPago === m.id
                              ? "bg-blue-600 text-white border-white"
                              : "bg-slate-950 text-slate-400 border-slate-800"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                          Nombre del Comprador
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Juan Pérez"
                          value={nombreHincha}
                          onChange={(e) => setNombreHincha(e.target.value)}
                          className="w-full bg-slate-950 text-white border border-slate-700 p-2.5 rounded-xl text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                          Correo para Comprobante
                        </label>
                        <input
                          type="email"
                          placeholder="hincha@correo.cl"
                          value={emailHincha}
                          onChange={(e) => setEmailHincha(e.target.value)}
                          className="w-full bg-slate-950 text-white border border-slate-700 p-2.5 rounded-xl text-xs font-bold"
                          required
                        />
                      </div>
                    </div>

                    {/* Datos Simulados de Tarjeta / Banco */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-yellow-400">
                          Datos de Tarjeta de Prueba (Pre-cargados)
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          ✓ Ambiente de Simulación Activo
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            Número de Tarjeta / CuentaRUT
                          </label>
                          <input
                            type="text"
                            value={numTarjeta}
                            onChange={(e) => setNumTarjeta(e.target.value)}
                            className="w-full bg-slate-900 text-white border border-slate-700 p-2 rounded-lg font-mono text-xs"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              Mes/Año
                            </label>
                            <input
                              type="text"
                              value={vencimiento}
                              onChange={(e) => setVencimiento(e.target.value)}
                              className="w-full bg-slate-900 text-white border border-slate-700 p-2 rounded-lg font-mono text-xs text-center"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              CVV
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value)}
                              className="w-full bg-slate-900 text-white border border-slate-700 p-2 rounded-lg font-mono text-xs text-center"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Clave Bancaria / PIN de Autorización (Cualquier 4 dígitos)
                        </label>
                        <input
                          type="password"
                          placeholder="••••"
                          value={claveBanco}
                          onChange={(e) => setClaveBanco(e.target.value)}
                          className="w-full bg-slate-900 text-yellow-400 border border-slate-700 p-2 rounded-lg font-mono text-sm tracking-widest"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-3.5 rounded-xl border-2 border-white shadow-lg text-xs sm:text-sm"
                    >
                      🔒 Autorizar Pago de $
                      {partidoActivo.precioBoleto.toLocaleString("es-CL")} CLP y
                      Ver Partido
                    </button>
                  </form>
                )}

                {pasoPasarela === "PROCESANDO_BANCO" && (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-black text-white uppercase">
                      Validando transacción con entidad emisora ({metodoPago})...
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      Generando boleto digital encriptado y habilitando señal de video...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}