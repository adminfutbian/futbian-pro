// src/app/admin/tribunal/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  increment,
} from "firebase/firestore";
import {
  Club,
  Jugador,
  Sancion,
  SERIES_OFICIALES,
  SerieOficial,
  TARIFARIO_POR_DEFECTO,
  TarifarioOficial,
} from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

export default function TribunalPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [tarifario, setTarifario] = useState<TarifarioOficial>(
    TARIFARIO_POR_DEFECTO
  );

  // Buscadores para las tablas
  const [busquedaSancionados, setBusquedaSancionados] = useState("");
  const [filtroSerieSancionados, setFiltroSerieSancionados] = useState<
    SerieOficial | "TODAS"
  >("TODAS");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  // Estado para emitir nueva sanción y deuda
  const [clubSelId, setClubSelId] = useState("");
  const [serieSel, setSerieSel] = useState<SerieOficial>("Honor");
  const [jugadorSelId, setJugadorSelId] = useState("");
  const [fechasCastigo, setFechasCastigo] = useState(2);
  const [montoMulta, setMontoMulta] = useState(15000);
  const [motivo, setMotivo] = useState(
    "Roja Directa - Conducta violenta informada en acta"
  );
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
      if (lista.length > 0 && !clubSelId) setClubSelId(lista[0].id);
    });

    const unsubJug = onSnapshot(collection(db, "jugadores"), (snap) => {
      const lista: Jugador[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || "",
        rut: d.data().rut || "",
        club: d.data().club || "",
        clubId: d.data().clubId || "",
        serie: (d.data().serie as SerieOficial) || "Honor",
        goles: Number(d.data().goles || 0),
        sancionado: d.data().sancionado || false,
        fechasPendientes: Number(d.data().fechasPendientes || 0),
      }));
      setJugadores(lista);
    });

    const unsubSanciones = onSnapshot(collection(db, "sanciones"), (snap) => {
      const lista: Sancion[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Sancion, "id">),
        id: d.id,
      }));
      lista.sort((a, b) =>
        (b.fechaEmision || "").localeCompare(a.fechaEmision || "")
      );
      setSanciones(lista);
    });

    const unsubTarifas = onSnapshot(
      doc(db, "configuracion", "aranceles_oficiales"),
      (snap) => {
        if (snap.exists()) {
          setTarifario({
            ...TARIFARIO_POR_DEFECTO,
            ...(snap.data() as TarifarioOficial),
          });
        }
      }
    );

    return () => {
      unsubClubes();
      unsubJug();
      unsubSanciones();
      unsubTarifas();
    };
  }, [clubSelId]);

  const clubSeleccionadoObj = clubes.find((c) => c.id === clubSelId);
  const jugadoresDelClubYSerie = jugadores.filter(
    (j) =>
      (j.clubId === clubSelId || j.club === clubSeleccionadoObj?.nombre) &&
      j.serie === serieSel
  );

  // Filtrado de jugadores actualmente sancionados
  const jugadoresSancionados = jugadores.filter((j) => {
    if (!j.sancionado && (j.fechasPendientes || 0) <= 0) return false;
    if (
      filtroSerieSancionados !== "TODAS" &&
      j.serie !== filtroSerieSancionados
    )
      return false;
    const q = busquedaSancionados.toLowerCase();
    return (
      j.nombre.toLowerCase().includes(q) ||
      (j.rut || "").toLowerCase().includes(q) ||
      j.club.toLowerCase().includes(q)
    );
  });

  // Reducir o aumentar condena de fechas de un jugador sancionado
  const modificarCondenaJugador = async (j: Jugador, deltaFechas: number) => {
    const actuales = j.fechasPendientes || 1;
    const nuevasFechas = Math.max(0, actuales + deltaFechas);
    const sigueSancionado = nuevasFechas > 0;

    await updateDoc(doc(db, "jugadores", j.id), {
      fechasPendientes: nuevasFechas,
      sancionado: sigueSancionado,
    });

    await registrarAccionAuditoria(
      "TRIBUNAL",
      deltaFechas > 0 ? "AUMENTAR_CONDENA" : "REDUCIR_CONDENA",
      `Jugador ${j.nombre} (${j.club}): condena ajustada de ${actuales} a ${nuevasFechas} fecha(s).`
    );

    setMensaje(
      sigueSancionado
        ? `✓ Condena de ${j.nombre} actualizada a ${nuevasFechas} fecha(s) de suspensión.`
        : `✓ Condena cumplida/absuelta: ${j.nombre} ha quedado HABILITADO para jugar.`
    );
  };

  // Emitir nueva sanción deportiva y generar deuda inmediata en Finanzas
  const emitirSancionYDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubSeleccionadoObj) return;

    const jugObj = jugadores.find((j) => j.id === jugadorSelId);
    const nombreInfractor = jugObj
      ? jugObj.nombre
      : "Sanción Institucional al Club";

    await addDoc(collection(db, "sanciones"), {
      clubId: clubSeleccionadoObj.id,
      clubNombre: clubSeleccionadoObj.nombre,
      jugadorId: jugObj?.id || "",
      jugador: nombreInfractor,
      serie: serieSel,
      fechasCastigo,
      montoMulta,
      motivo,
      fechaEmision: new Date().toISOString(),
    });

    if (jugObj && fechasCastigo > 0) {
      await updateDoc(doc(db, "jugadores", jugObj.id), {
        sancionado: true,
        fechasPendientes: fechasCastigo,
      });
    }

    if (montoMulta > 0) {
      await addDoc(collection(db, "cargos_financieros"), {
        clubId: clubSeleccionadoObj.id,
        clubNombre: clubSeleccionadoObj.nombre,
        tipo: "MULTA_TRIBUNAL_CANCHA",
        concepto: `Fallo Tribunal (${nombreInfractor} - Serie ${serieSel}): ${motivo}`,
        monto: montoMulta,
        fecha: new Date().toISOString(),
        estado: "PENDIENTE",
        emitidoPor: "Tribunal de Disciplina (CU-02)",
      });

      await setDoc(
        doc(db, "equipos", clubSeleccionadoObj.id),
        {
          saldoDeudor: increment(montoMulta),
          bloqueadoDeportivo: true,
        },
        { merge: true }
      );
    }

    await registrarAccionAuditoria(
      "TRIBUNAL",
      "EMITIR_SANCION_Y_DEUDA",
      `Sanción a ${nombreInfractor} (${clubSeleccionadoObj.nombre}): ${fechasCastigo} fechas y multa de $${montoMulta.toLocaleString("es-CL")}`
    );

    setMensaje(
      `✓ Sanción aplicada a ${nombreInfractor} (${fechasCastigo} fechas) y deuda de $${montoMulta.toLocaleString(
        "es-CL"
      )} cargada a ${clubSeleccionadoObj.nombre} en Finanzas.`
    );
  };

  const actualizarArancelesDesdeTribunal = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "configuracion", "aranceles_oficiales"), tarifario, {
      merge: true,
    });
    await registrarAccionAuditoria(
      "TRIBUNAL",
      "SUBIR_ARANCELES_MULTAS",
      "El Tribunal actualizó los valores de los aranceles disciplinarios."
    );
    setMensaje("✓ Aranceles disciplinarios actualizados en el sistema.");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800">
        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
          TRIBUNAL DE DISCIPLINA CONECTADO AL PADRÓN • CU-02
        </span>
        <h1 className="text-2xl font-black text-white mt-2">
          Control de Sancionados, Reducción/Aumento de Condenas y Aranceles
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">
          Busque jugadores suspendidos para rebajar o aumentar fechas, emita sanciones con cargo a Finanzas y ajuste los aranceles.
        </p>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-sm font-black">
          {mensaje}
        </div>
      )}

      {/* 1. TABLA CON BUSCADOR DE JUGADORES SANCIONADOS */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-red-500/60 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b-2 border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-black text-white uppercase">
              🟥 Jugadores Actualmente Sancionados ({jugadoresSancionados.length})
            </h2>
            <p className="text-xs font-bold text-slate-400">
              Aumente o reduzca las fechas de castigo o rehabilite al jugador cuando cumpla su condena.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="🔍 Buscar por jugador, RUT o club..."
              value={busquedaSancionados}
              onChange={(e) => setBusquedaSancionados(e.target.value)}
              className="bg-slate-950 text-white border-2 border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold"
            />
            <select
              value={filtroSerieSancionados}
              onChange={(e) => setFiltroSerieSancionados(e.target.value as any)}
              className="bg-slate-950 text-yellow-400 border-2 border-slate-700 px-3 py-2 rounded-xl text-xs font-black uppercase"
            >
              <option value="TODAS">Todas las Series</option>
              {SERIES_OFICIALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-400">
                <th className="p-3.5">Jugador Sancionado</th>
                <th className="p-3.5">Club</th>
                <th className="p-3.5 text-center">Serie</th>
                <th className="p-3.5 text-center">Condena Pendiente</th>
                <th className="p-3.5 text-right">Modificar Condena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {jugadoresSancionados.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-xs font-bold text-slate-400"
                  >
                    No se encontraron jugadores sancionados con ese criterio.
                  </td>
                </tr>
              ) : (
                jugadoresSancionados.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-black text-white">{j.nombre}</p>
                      <span className="text-[11px] font-mono text-slate-400">
                        RUT: {j.rut || "S/R"}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-300">{j.club}</td>
                    <td className="p-3.5 text-center">
                      <span className="bg-slate-950 text-blue-400 border border-blue-500/40 px-2.5 py-0.5 rounded text-xs font-black uppercase">
                        {j.serie}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="bg-red-950 text-red-300 border-2 border-red-500 px-3 py-1 rounded-lg font-black text-xs">
                        {j.fechasPendientes || 1} Fecha(s)
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => modificarCondenaJugador(j, -1)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-black uppercase"
                      >
                        -1 Fecha
                      </button>
                      <button
                        type="button"
                        onClick={() => modificarCondenaJugador(j, 1)}
                        className="bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1.5 rounded-lg text-xs font-black uppercase"
                      >
                        +1 Fecha
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          modificarCondenaJugador(
                            j,
                            -(j.fechasPendientes || 10)
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-black uppercase"
                      >
                        ✓ Habilitar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. GENERAR NUEVA SANCIÓN Y DEUDA + SUBIR ARANCELES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={emitirSancionYDeuda}
          className="lg:col-span-7 bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4"
        >
          <h2 className="text-base font-black text-yellow-400 uppercase border-b-2 border-slate-800 pb-2">
            ⚖ Generar Nueva Sanción y Deuda al Club
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                1. Club Infractor
              </label>
              <select
                value={clubSelId}
                onChange={(e) => {
                  setClubSelId(e.target.value);
                  setJugadorSelId("");
                }}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl font-black text-xs"
              >
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                2. Serie del Jugador
              </label>
              <select
                value={serieSel}
                onChange={(e) => {
                  setSerieSel(e.target.value as SerieOficial);
                  setJugadorSelId("");
                }}
                className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-xs uppercase"
              >
                {SERIES_OFICIALES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              3. Seleccionar Jugador del Padrón ({jugadoresDelClubYSerie.length} en{" "}
              {serieSel})
            </label>
            <select
              value={jugadorSelId}
              onChange={(e) => setJugadorSelId(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-xs"
            >
              <option value="">
                -- Sanción directa al Club (o elija un jugador) --
              </option>
              {jugadoresDelClubYSerie.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre} (RUT: {j.rut || "S/R"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Fechas de Suspensión
              </label>
              <input
                type="number"
                min={0}
                value={fechasCastigo}
                onChange={(e) => setFechasCastigo(Number(e.target.value))}
                className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Multa / Deuda a Finanzas ($)
              </label>
              <input
                type="number"
                step={1000}
                min={0}
                value={montoMulta}
                onChange={(e) => setMontoMulta(Number(e.target.value))}
                className="w-full bg-slate-950 text-red-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Motivo / Resolución del Tribunal
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase py-3.5 rounded-xl border-2 border-white shadow-lg text-xs"
          >
            ⚖ Aplicar Sanción e Imputar Deuda en Finanzas
          </button>
        </form>

        {/* Subir Aranceles */}
        <form
          onSubmit={actualizarArancelesDesdeTribunal}
          className="lg:col-span-5 bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <h2 className="text-base font-black text-emerald-400 uppercase border-b-2 border-slate-800 pb-2">
              📈 Subir / Ajustar Aranceles de Multas
            </h2>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                Arancel Tarjeta Amarilla ($)
              </label>
              <input
                type="number"
                step={500}
                value={tarifario.multaAmarilla}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    multaAmarilla: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 text-white border border-slate-700 p-2 rounded-lg font-black text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                Arancel Roja Juego Brusco ($)
              </label>
              <input
                type="number"
                step={1000}
                value={tarifario.multaRojaJuegoBrusco}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    multaRojaJuegoBrusco: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 text-white border border-slate-700 p-2 rounded-lg font-black text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                Arancel Roja Agresión Verbal ($)
              </label>
              <input
                type="number"
                step={1000}
                value={tarifario.multaAgresionVerbal}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    multaAgresionVerbal: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 text-white border border-slate-700 p-2 rounded-lg font-black text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-300 mb-1">
                Arancel Roja Agresión Física ($)
              </label>
              <input
                type="number"
                step={1000}
                value={tarifario.multaAgresionFisica}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    multaAgresionFisica: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 text-white border border-slate-700 p-2 rounded-lg font-black text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-3 rounded-xl border-2 border-white text-xs shadow"
          >
            💾 Guardar Nuevos Aranceles Oficiales
          </button>
        </form>
      </div>

      {/* 3. HISTORIAL DE FALLOS CON BUSCADOR */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="text-sm font-black uppercase text-slate-300">
            Boletín Histórico de Fallos ({sanciones.length})
          </h3>
          <input
            type="text"
            placeholder="🔍 Buscar fallo por jugador, club o motivo..."
            value={busquedaHistorial}
            onChange={(e) => setBusquedaHistorial(e.target.value)}
            className="bg-slate-950 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {sanciones
            .filter((s) => {
              const q = busquedaHistorial.toLowerCase();
              return (
                (s.jugador || "").toLowerCase().includes(q) ||
                (s.clubNombre || "").toLowerCase().includes(q) ||
                (s.motivo || "").toLowerCase().includes(q)
              );
            })
            .map((s) => (
              <div
                key={s.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs"
              >
                <div>
                  <span className="font-black text-white">{s.jugador}</span>
                  <span className="text-slate-400 mx-2">•</span>
                  <span className="font-bold text-blue-400">{s.clubNombre}</span>
                  <p className="text-[11px] text-slate-400">{s.motivo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-amber-950 text-amber-300 border border-amber-500 px-2 py-0.5 rounded font-black">
                    {s.fechasCastigo} fecha(s)
                  </span>
                  <span className="font-mono font-black text-red-400">
                    ${(s.montoMulta || 0).toLocaleString("es-CL")}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, "sanciones", s.id))}
                    className="text-slate-500 hover:text-red-400 font-black px-1"
                    title="Eliminar registro de fallo"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}