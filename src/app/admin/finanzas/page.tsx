// src/app/admin/finanzas/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { CargoFinanciero, Club, TipoCargoFinanciero } from "@/types";
import {
  registrarAccionAuditoria,
  descargarArchivoAuditoria,
} from "@/lib/auditLogger";

const CATALOGO_COBROS: {
  tipo: TipoCargoFinanciero;
  etiqueta: string;
  montoSugerido: number;
}[] = [
  {
    tipo: "CUOTA_INSCRIPCION_1",
    etiqueta: "Cuota 1 de Inscripción Campeonato",
    montoSugerido: 50000,
  },
  {
    tipo: "CUOTA_INSCRIPCION_2",
    etiqueta: "Cuota 2 de Inscripción Campeonato",
    montoSugerido: 50000,
  },
  {
    tipo: "INASISTENCIA_REUNION",
    etiqueta: "Sanción por No Asistir a Reunión de Consejo",
    montoSugerido: 15000,
  },
  {
    tipo: "NO_PRESENTACION_SERIE",
    etiqueta: "Sanción por No Presentar una Serie en Cancha",
    montoSugerido: 25000,
  },
  {
    tipo: "CUOTA_COMPARTIR",
    etiqueta: "Cuota para Compartir / Actividad Asociación",
    montoSugerido: 20000,
  },
  {
    tipo: "OTRO_COBRO",
    etiqueta: "Otro Arancel o Cobro Extraordinario",
    montoSugerido: 10000,
  },
];

export default function FinanzasPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [cargos, setCargos] = useState<CargoFinanciero[]>([]);
  const [ingresosTransmisiones, setIngresosTransmisiones] = useState<number>(0);
  const [cantidadBoletos, setCantidadBoletos] = useState<number>(0);

  const [busquedaClub, setBusquedaClub] = useState("");
  const [busquedaLibroMayor, setBusquedaLibroMayor] = useState("");

  const [clubDestinoId, setClubDestinoId] = useState<string>("TODOS");
  const [tipoCobro, setTipoCobro] = useState<TipoCargoFinanciero>(
    "CUOTA_INSCRIPCION_1"
  );
  const [conceptoPersonalizado, setConceptoPersonalizado] = useState("");
  const [montoCobro, setMontoCobro] = useState<number>(50000);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
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
    });

    const unsubCargos = onSnapshot(
      collection(db, "cargos_financieros"),
      (snap) => {
        const lista: CargoFinanciero[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<CargoFinanciero, "id">),
          id: d.id,
        }));
        lista.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
        setCargos(lista);
      }
    );

    // Escuchar recaudación general por concepto de Transmisiones En Vivo
    const unsubBoletos = onSnapshot(
      collection(db, "boletos_vendidos"),
      (snap) => {
        let suma = 0;
        snap.docs.forEach((d) => {
          suma += Number(d.data().montoPagado || 0);
        });
        setIngresosTransmisiones(suma);
        setCantidadBoletos(snap.size);
      }
    );

    return () => {
      unsubClubes();
      unsubCargos();
      unsubBoletos();
    };
  }, []);

  const seleccionarTipoCobro = (nuevoTipo: TipoCargoFinanciero) => {
    setTipoCobro(nuevoTipo);
    const item = CATALOGO_COBROS.find((c) => c.tipo === nuevoTipo);
    if (item) setMontoCobro(item.montoSugerido);
  };

  const emitirCobroFinanciero = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemCatalogo = CATALOGO_COBROS.find((c) => c.tipo === tipoCobro);
    const conceptoFinal =
      conceptoPersonalizado.trim() ||
      itemCatalogo?.etiqueta ||
      "Cargo Administrativo";

    const clubesAfectados =
      clubDestinoId === "TODOS"
        ? clubes
        : clubes.filter((c) => c.id === clubDestinoId);

    for (const club of clubesAfectados) {
      await addDoc(collection(db, "cargos_financieros"), {
        clubId: club.id,
        clubNombre: club.nombre,
        tipo: tipoCobro,
        concepto: conceptoFinal,
        monto: montoCobro,
        fecha: new Date().toISOString(),
        estado: "PENDIENTE",
        emitidoPor: "Tesorería / Administración",
      });

      await setDoc(
        doc(db, "equipos", club.id),
        {
          saldoDeudor: increment(montoCobro),
          bloqueadoDeportivo: true,
        },
        { merge: true }
      );
    }

    await registrarAccionAuditoria(
      "FINANZAS",
      "EMISION_COBRO",
      `Cobro "${conceptoFinal}" por $${montoCobro.toLocaleString("es-CL")} a ${
        clubesAfectados.length
      } club(es)`
    );

    setMensaje(
      `✓ Cobro "${conceptoFinal}" ($${montoCobro.toLocaleString(
        "es-CL"
      )}) emitido correctamente.`
    );
    setConceptoPersonalizado("");
  };

  const conciliarPagoTotalClub = async (club: Club) => {
    await updateDoc(doc(db, "equipos", club.id), {
      saldoDeudor: 0,
      bloqueadoDeportivo: false,
    });

    const pendientesClub = cargos.filter(
      (cg) => cg.clubId === club.id && cg.estado === "PENDIENTE"
    );
    for (const cg of pendientesClub) {
      if (cg.id) {
        await updateDoc(doc(db, "cargos_financieros", cg.id), {
          estado: "PAGADO",
        });
      }
    }

    await registrarAccionAuditoria(
      "FINANZAS",
      "CONCILIACION_PAGO",
      `Deuda conciliada para ${club.nombre}`
    );
  };

  const borrarCobroErroneoLibroMayor = async (cg: CargoFinanciero) => {
    if (!cg.id) return;

    if (cg.estado === "PENDIENTE" && cg.clubId) {
      const clubActual = clubes.find((c) => c.id === cg.clubId);
      const nuevoSaldo = Math.max(0, (clubActual?.saldoDeudor || 0) - cg.monto);

      await updateDoc(doc(db, "equipos", cg.clubId), {
        saldoDeudor: nuevoSaldo,
        bloqueadoDeportivo: nuevoSaldo > 0,
      });
    }

    await deleteDoc(doc(db, "cargos_financieros", cg.id));

    await registrarAccionAuditoria(
      "FINANZAS",
      "ANULAR_COBRO_ERRONEO",
      `Registro eliminado del Libro Mayor: ${cg.clubNombre} - ${
        cg.concepto
      } ($${cg.monto.toLocaleString("es-CL")})`
    );

    setMensaje(
      `✓ Registro "${cg.concepto}" de ${cg.clubNombre} eliminado del Libro Mayor y saldo deudor corregido.`
    );
  };

  const cargosFiltrados = cargos.filter((cg) => {
    const q = busquedaLibroMayor.toLowerCase();
    return (
      (cg.clubNombre || "").toLowerCase().includes(q) ||
      (cg.concepto || "").toLowerCase().includes(q) ||
      (cg.estado || "").toLowerCase().includes(q)
    );
  });

  const totalDeudaClubes = clubes.reduce((acc, c) => acc + c.saldoDeudor, 0);
  const totalPagadoClubes = cargos
    .filter((cg) => cg.estado === "PAGADO")
    .reduce((acc, cg) => acc + cg.monto, 0);
  const cajaGeneralAsociacion = totalPagadoClubes + ingresosTransmisiones;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
            TESORERÍA Y LIBRO MAYOR • CU-03
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            Finanzas, Ingresos por Transmisiones, Cuotas y Multas
          </h1>
        </div>

        <button
          type="button"
          onClick={descargarArchivoAuditoria}
          className="bg-slate-950 hover:bg-slate-800 text-amber-300 border-2 border-amber-400 px-4 py-2.5 rounded-xl text-xs font-black uppercase"
        >
          📥 Descargar Archivo de Auditoría
        </button>
      </div>

      {/* RESUMEN GENERAL DE INGRESOS (INCLUYE TRANSMISIONES = $XXXXX) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-pink-500/60 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-pink-400 block">
            🔴 INGRESOS STREAMING EN VIVO
          </span>
          <p className="text-xl sm:text-2xl font-mono font-black text-white mt-2">
            Transmisiones = ${ingresosTransmisiones.toLocaleString("es-CL")}
          </p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            {cantidadBoletos} boleto(s) digitales vendidos
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-emerald-500/60 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
            ✓ CUOTAS Y MULTAS PAGADAS
          </span>
          <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-2">
            Clubes = ${totalPagadoClubes.toLocaleString("es-CL")}
          </p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            Pagos conciliados en Tesorería
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-red-500/60 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-400 block">
            ⏳ POR COBRAR (MOROSIDAD)
          </span>
          <p className="text-xl sm:text-2xl font-mono font-black text-red-400 mt-2">
            Deuda = ${totalDeudaClubes.toLocaleString("es-CL")}
          </p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            Saldo pendiente de clubes
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-yellow-400 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 block">
            💰 TOTAL CAJA ASOCIACIÓN
          </span>
          <p className="text-xl sm:text-2xl font-mono font-black text-yellow-400 mt-2">
            Total = ${cajaGeneralAsociacion.toLocaleString("es-CL")}
          </p>
          <span className="text-xs font-bold text-slate-400 mt-1 block">
            Transmisiones + Pagos de Clubes
          </span>
        </div>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-xs sm:text-sm font-black">
          {mensaje}
        </div>
      )}

      {/* Emitir Cobro */}
      <form
        onSubmit={emitirCobroFinanciero}
        className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4"
      >
        <h2 className="text-base font-black text-yellow-400 uppercase border-b-2 border-slate-800 pb-2">
          Emitir Nuevo Cobro o Cuota
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Club Destinatario
            </label>
            <select
              value={clubDestinoId}
              onChange={(e) => setClubDestinoId(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-black text-xs"
            >
              <option value="TODOS">⚡ APLICAR A TODOS LOS CLUBES</option>
              {clubes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Índole del Cobro
            </label>
            <select
              value={tipoCobro}
              onChange={(e) =>
                seleccionarTipoCobro(e.target.value as TipoCargoFinanciero)
              }
              className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-3 rounded-xl font-black text-xs"
            >
              {CATALOGO_COBROS.map((item) => (
                <option key={item.tipo} value={item.tipo}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Monto ($)
            </label>
            <input
              type="number"
              step={1000}
              min={500}
              value={montoCobro}
              onChange={(e) => setMontoCobro(Number(e.target.value))}
              className="w-full bg-slate-950 text-red-400 border-2 border-slate-700 p-3 rounded-xl font-black text-base"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-8">
            <input
              type="text"
              placeholder="Glosa o detalle adicional del cobro..."
              value={conceptoPersonalizado}
              onChange={(e) => setConceptoPersonalizado(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-xs"
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase py-3.5 px-4 rounded-xl border-2 border-white shadow-lg text-xs"
            >
              💳 Imputar Cobro
            </button>
          </div>
        </div>
      </form>

      {/* Tabla Cuentas Corrientes con Buscador */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b-2 border-slate-800 flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-sm font-black uppercase text-white">
            Estado de Cuentas Corrientes por Club
          </h2>
          <input
            type="text"
            placeholder="🔍 Filtrar club..."
            value={busquedaClub}
            onChange={(e) => setBusquedaClub(e.target.value)}
            className="bg-slate-900 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-400">
                <th className="p-4">Club Federado</th>
                <th className="p-4 text-right">Deuda Acumulada</th>
                <th className="p-4 text-center">Estado Deportivo</th>
                <th className="p-4 text-right">Acción Tesorería</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {clubes
                .filter((c) =>
                  c.nombre.toLowerCase().includes(busquedaClub.toLowerCase())
                )
                .map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-black text-white">{c.nombre}</td>
                    <td className="p-4 text-right font-mono font-black text-lg">
                      <span
                        className={
                          c.saldoDeudor > 0
                            ? "text-red-400"
                            : "text-emerald-400"
                        }
                      >
                        ${c.saldoDeudor.toLocaleString("es-CL")}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {c.bloqueadoDeportivo ? (
                        <span className="bg-red-950 text-red-300 border-2 border-red-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                          🔒 Bloqueado por Deuda
                        </span>
                      ) : (
                        <span className="bg-emerald-950 text-emerald-300 border-2 border-emerald-500 px-3 py-1 rounded-lg text-xs font-black uppercase">
                          ✓ Habilitado
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {c.saldoDeudor > 0 && (
                        <button
                          onClick={() => conciliarPagoTotalClub(c)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase px-4 py-2 rounded-xl border border-white"
                        >
                          ✓ Conciliar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA: LIBRO MAYOR DE COBROS EMITIDOS */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b-2 border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-black uppercase text-white">
              Libro Mayor de Cobros Emitidos ({cargosFiltrados.length})
            </h3>
            <p className="text-[11px] font-bold text-slate-400">
              Si elimina un cobro pendiente mal emitido, el monto se descuenta automáticamente de la deuda del club.
            </p>
          </div>
          <input
            type="text"
            placeholder="🔍 Buscar en Libro Mayor por club o concepto..."
            value={busquedaLibroMayor}
            onChange={(e) => setBusquedaLibroMayor(e.target.value)}
            className="bg-slate-900 text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold w-full sm:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-400">
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Club</th>
                <th className="p-3.5">Concepto / Glosa</th>
                <th className="p-3.5 text-right">Monto</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-right">Corregir / Borrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {cargosFiltrados.map((cg) => (
                <tr key={cg.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 text-xs text-slate-400 font-mono">
                    {new Date(cg.fecha).toLocaleDateString("es-CL")}
                  </td>
                  <td className="p-3.5 font-black text-white">
                    {cg.clubNombre}
                  </td>
                  <td className="p-3.5 font-bold text-yellow-400">
                    {cg.concepto}
                  </td>
                  <td className="p-3.5 text-right font-mono font-black text-white">
                    ${cg.monto.toLocaleString("es-CL")}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                        cg.estado === "PAGADO"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500"
                          : "bg-red-950 text-red-300 border border-red-500"
                      }`}
                    >
                      {cg.estado}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => borrarCobroErroneoLibroMayor(cg)}
                      className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/50 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition"
                    >
                      🗑 Borrar Registro
                    </button>
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