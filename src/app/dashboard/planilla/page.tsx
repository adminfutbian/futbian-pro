// src/app/dashboard/planilla/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  ActaPartido,
  CATALOGO_CAUSALES_ROJA,
  Club,
  CodigoCausalRoja,
  Incidencia,
  Jugador,
  SERIES_OFICIALES,
  SerieOficial,
} from "@/types";
import {
  guardarActaOfflineFirst,
  sincronizarOutboxConFirestore,
} from "@/lib/offlineDb";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  increment,
} from "firebase/firestore";

export default function PlanillaPage() {
  const [online, setOnline] = useState(true);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  const [minuto, setMinuto] = useState(1);
  const [jugadorLocalSel, setJugadorLocalSel] = useState("");
  const [jugadorVisitaSel, setJugadorVisitaSel] = useState("");

  // Estado para tipificación de Tarjeta Roja (Verbal, Física, Juego Brusco, Doble Amarilla)
  const [causalLocal, setCausalLocal] = useState<CodigoCausalRoja>(
    "ROJA_DIRECTA_JUEGO_BRUSCO"
  );
  const [causalVisita, setCausalVisita] = useState<CodigoCausalRoja>(
    "ROJA_DIRECTA_JUEGO_BRUSCO"
  );
  const [observacionArbitral, setObservacionArbitral] = useState("");
  const [firmaArbitro, setFirmaArbitro] = useState("");
  const [alertaOperativa, setAlertaOperativa] = useState("");

  const [acta, setActa] = useState<ActaPartido>({
    id: "partido-fecha1-honor",
    jornada: 1,
    serie: "Honor",
    clubLocalId: "halcones",
    clubLocalNombre: "CD Los Halcones",
    clubVisitaId: "estrella",
    clubVisitaNombre: "Estrella Precordillerana",
    golesLocal: 0,
    golesVisita: 0,
    incidencias: [],
    estado: "en_juego",
    sincronizado: false,
    notificadoAClubes: false,
  });

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      sincronizarOutboxConFirestore();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        series: d.data().series || ["Honor"],
        canchaLocal: d.data().canchaLocal || "Estadio Municipal",
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(lista);
      if (lista.length >= 2) {
        setActa((prev) => ({
          ...prev,
          clubLocalId:
            lista.find((c) => c.id === prev.clubLocalId)?.id || lista[0].id,
          clubLocalNombre:
            lista.find((c) => c.id === prev.clubLocalId)?.nombre ||
            lista[0].nombre,
          clubVisitaId:
            lista.find((c) => c.id === prev.clubVisitaId)?.id || lista[1].id,
          clubVisitaNombre:
            lista.find((c) => c.id === prev.clubVisitaId)?.nombre ||
            lista[1].nombre,
        }));
      }
    });

    const unsubJug = onSnapshot(collection(db, "jugadores"), (snap) => {
      const lista: Jugador[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || "",
        rut: d.data().rut || "",
        club: d.data().club || "",
        clubId: d.data().clubId || "",
        serie: (d.data().serie as SerieOficial) || "Honor",
        goles: d.data().goles || 0,
        sancionado: d.data().sancionado || false,
        fechasPendientes: d.data().fechasPendientes || 0,
      }));
      setJugadores(lista);
    });

    return () => {
      unsubClubes();
      unsubJug();
    };
  }, []);

  const nominaLocal = jugadores.filter(
    (j) =>
      (j.clubId === acta.clubLocalId || j.club === acta.clubLocalNombre) &&
      j.serie === acta.serie &&
      !j.sancionado
  );

  const nominaVisita = jugadores.filter(
    (j) =>
      (j.clubId === acta.clubVisitaId || j.club === acta.clubVisitaNombre) &&
      j.serie === acta.serie &&
      !j.sancionado
  );

  const registrarEventoPartido = async (
    tipo: "gol" | "amarilla" | "roja",
    equipo: "local" | "visita"
  ) => {
    if (acta.estado === "cerrado_inmutable") return;
    setAlertaOperativa("");

    const jugId = equipo === "local" ? jugadorLocalSel : jugadorVisitaSel;
    const clubId = equipo === "local" ? acta.clubLocalId : acta.clubVisitaId;
    const clubNombre =
      equipo === "local" ? acta.clubLocalNombre : acta.clubVisitaNombre;

    const jugObj = jugadores.find((j) => j.id === jugId);

    if (!jugObj) {
      setAlertaOperativa(
        `⚠ Seleccione primero al jugador de ${clubNombre} en la nómina (${acta.serie}) antes de marcar ${tipo.toUpperCase()}.`
      );
      return;
    }

    const codigoCausal = equipo === "local" ? causalLocal : causalVisita;
    const reglaRoja =
      tipo === "roja" ? CATALOGO_CAUSALES_ROJA[codigoCausal] : undefined;
    const multaAmarilla = tipo === "amarilla" ? 2000 : 0;

    const nueva: Incidencia = {
      minuto,
      tipo,
      jugadorId: jugObj.id,
      jugadorNombre: jugObj.nombre,
      equipoId: clubId,
      equipoNombre: clubNombre,
      serie: acta.serie,
      causalRoja: reglaRoja?.codigo,
      causalDetalle:
        tipo === "roja"
          ? reglaRoja?.etiqueta
          : tipo === "amarilla"
          ? "Amonestación Reglamentaria"
          : "Gol Convertido",
      fechasCastigo: reglaRoja ? reglaRoja.fechasSuspension : 0,
      multaAsociada: reglaRoja ? reglaRoja.multaCLP : multaAmarilla,
    };

    const nuevaActa: ActaPartido = {
      ...acta,
      golesLocal:
        tipo === "gol" && equipo === "local"
          ? acta.golesLocal + 1
          : acta.golesLocal,
      golesVisita:
        tipo === "gol" && equipo === "visita"
          ? acta.golesVisita + 1
          : acta.golesVisita,
      incidencias: [nueva, ...acta.incidencias],
      sincronizado: false,
    };

    setActa(nuevaActa);
    await guardarActaOfflineFirst(nuevaActa);

    // IMPACTO INMEDIATO EN GOLEADORES, TRIBUNAL Y TESORERÍA
    if (online) {
      try {
        if (tipo === "gol") {
          // 1. Asociar gol al jugador y al club en las tablas
          await updateDoc(doc(db, "jugadores", jugObj.id), {
            goles: increment(1),
          });
          setAlertaOperativa(
            `⚽ GOL registrado: ${jugObj.nombre} (${clubNombre} • Serie ${acta.serie}). Tabla de goleadores actualizada.`
          );
        } else if (tipo === "roja" && reglaRoja) {
          // 2. Suspender al jugador con las fechas correspondientes a la causal
          await updateDoc(doc(db, "jugadores", jugObj.id), {
            sancionado: true,
            fechasPendientes: reglaRoja.fechasSuspension,
          });

          // 3. Emitir el expediente automático al Tribunal de Disciplina
          await addDoc(collection(db, "sanciones"), {
            clubId,
            clubNombre,
            jugadorId: jugObj.id,
            jugador: jugObj.nombre,
            serie: acta.serie,
            causalCodigo: reglaRoja.codigo,
            fechasCastigo: reglaRoja.fechasSuspension,
            montoMulta: reglaRoja.multaCLP,
            motivo: `${reglaRoja.etiqueta} (Min ${minuto}' • Serie ${acta.serie})`,
            fechaEmision: new Date().toISOString(),
            origenActaId: acta.id,
          });

          // 4. Imputar la multa inmediatamente en Tesorería y bloquear al club por mora
          await setDoc(
            doc(db, "equipos", clubId),
            {
              nombre: clubNombre,
              saldoDeudor: increment(reglaRoja.multaCLP),
              bloqueadoDeportivo: true,
            },
            { merge: true }
          );

          setAlertaOperativa(
            `🟥 SANCIÓN INMEDIATA ENVIADA A TESORERÍA: ${jugObj.nombre} (${clubNombre}) — ${
              reglaRoja.etiqueta
            } | ${
              reglaRoja.fechasSuspension
            } fecha(s) de suspensión y multa de $${reglaRoja.multaCLP.toLocaleString(
              "es-CL"
            )} cargada al club.`
          );
        } else if (tipo === "amarilla") {
          await setDoc(
            doc(db, "equipos", clubId),
            {
              nombre: clubNombre,
              saldoDeudor: increment(multaAmarilla),
            },
            { merge: true }
          );
          setAlertaOperativa(
            `🟨 Amarilla registrada a ${jugObj.nombre} (${clubNombre}). Arancel de $${multaAmarilla.toLocaleString(
              "es-CL"
            )} cargado en Tesorería.`
          );
        }
      } catch (err) {
        console.error("Error sincronizando evento en vivo:", err);
      }
    }
  };

  // Cierre Criptográfico SHA-256 + Despacho Automático de Fin de Jornada a los Clubes Involucrados
  const cerrarSellarYNotificarClubes = async () => {
    if (!firmaArbitro.trim()) {
      setAlertaOperativa(
        "⚠ Ingrese la firma digital o PIN del árbitro y delegados para sellar el acta y despachar el informe a los clubes."
      );
      return;
    }

    const payloadParaHash = {
      ...acta,
      informeArbitralTexto: observacionArbitral,
    };
    const rawData = JSON.stringify(payloadParaHash);
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawData)
    );
    const selloHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const actaCerrada: ActaPartido = {
      ...acta,
      informeArbitralTexto: observacionArbitral,
      estado: "cerrado_inmutable",
      firmaArbitro,
      selloInmutabilidad: selloHex,
      sincronizado: false,
      notificadoAClubes: true,
    };

    setActa(actaCerrada);
    await guardarActaOfflineFirst(actaCerrada);

    if (online) {
      try {
        // Actualizar puntos y goles de ambos clubes al cierre de la jornada
        const ptsLocal =
          acta.golesLocal > acta.golesVisita
            ? 3
            : acta.golesLocal === acta.golesVisita
            ? 1
            : 0;
        const ptsVisita =
          acta.golesVisita > acta.golesLocal
            ? 3
            : acta.golesLocal === acta.golesVisita
            ? 1
            : 0;

        await setDoc(
          doc(db, "equipos", acta.clubLocalId),
          {
            puntos: increment(ptsLocal),
            goles_favor: increment(acta.golesLocal),
            goles_contra: increment(acta.golesVisita),
          },
          { merge: true }
        );

        await setDoc(
          doc(db, "equipos", acta.clubVisitaId),
          {
            puntos: increment(ptsVisita),
            goles_favor: increment(acta.golesVisita),
            goles_contra: increment(acta.golesLocal),
          },
          { merge: true }
        );

        // Construir Boletín Oficial de Fin de Jornada para ambos clubes
        const detalleGoles = acta.incidencias
          .filter((i) => i.tipo === "gol")
          .map(
            (g) =>
              `Min ${g.minuto}': ${g.jugadorNombre} (${g.equipoNombre} • Serie ${g.serie})`
          );

        const detalleSanciones = acta.incidencias
          .filter((i) => i.tipo === "roja" || i.tipo === "amarilla")
          .map(
            (s) =>
              `Min ${s.minuto}' [${s.tipo.toUpperCase()}]: ${
                s.jugadorNombre
              } (${s.equipoNombre}) — ${s.causalDetalle} | Castigo: ${
                s.fechasCastigo || 0
              } fecha(s) | Multa Club: $${(
                s.multaAsociada || 0
              ).toLocaleString("es-CL")}`
          );

        const totalMultaLocal = acta.incidencias
          .filter((i) => i.equipoId === acta.clubLocalId)
          .reduce((acc, i) => acc + (i.multaAsociada || 0), 0);

        const totalMultaVisita = acta.incidencias
          .filter((i) => i.equipoId === acta.clubVisitaId)
          .reduce((acc, i) => acc + (i.multaAsociada || 0), 0);

        await addDoc(collection(db, "notificaciones_clubes"), {
          actaId: acta.id,
          jornada: acta.jornada,
          serie: acta.serie,
          fechaEnvio: new Date().toISOString(),
          clubesInvolucrados: [acta.clubLocalId, acta.clubVisitaId],
          resumenMarcador: `${acta.clubLocalNombre} (${acta.golesLocal}) vs (${acta.golesVisita}) ${acta.clubVisitaNombre}`,
          detalleGoles,
          detalleSancionesYMultas: detalleSanciones,
          observacionArbitral:
            observacionArbitral || "Sin observaciones adicionales.",
          totalMultaLocal,
          totalMultaVisita,
          selloHash: selloHex,
        });

        setAlertaOperativa(
          `✓ JORNADA CERRADA: Acta sellada y Boletín Oficial enviado automáticamente a ${acta.clubLocalNombre}, ${acta.clubVisitaNombre} y Tesorería.`
        );
      } catch (err) {
        console.error("Error enviando notificación a clubes:", err);
      }
    }
  };

  return (
    <div className="min-h-screen py-6 px-3 sm:px-6 bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Cabecera Operativa */}
        <div className="p-5 rounded-2xl border-2 bg-slate-900 border-slate-800 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
                  SERIE {acta.serie} • FECHA {acta.jornada}
                </span>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-black px-2.5 py-1 rounded uppercase">
                  CONEXIÓN DIRECTA TESORERÍA Y CLUBES
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                Planilla e Informe Arbitral Automatizado (CU-01)
              </h1>
            </div>

            <span
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border-2 ${
                acta.estado === "cerrado_inmutable"
                  ? "bg-red-600 text-white border-white"
                  : "bg-emerald-600 text-white border-emerald-300"
              }`}
            >
              {acta.estado === "cerrado_inmutable"
                ? "🔒 JORNADA CERRADA Y NOTIFICADA"
                : "⏱ PARTIDO EN CURSO"}
            </span>
          </div>

          {/* Selección de Serie, Fecha y Clubes */}
          {acta.estado !== "cerrado_inmutable" && clubes.length >= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Fecha / Jornada
                </label>
                <input
                  type="number"
                  min={1}
                  value={acta.jornada}
                  onChange={(e) =>
                    setActa({ ...acta, jornada: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2 rounded-xl text-xs font-black"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-yellow-400 mb-1">
                  Serie Oficial
                </label>
                <select
                  value={acta.serie}
                  onChange={(e) =>
                    setActa({
                      ...acta,
                      serie: e.target.value,
                      id: `partido-f${acta.jornada}-${e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "")}`,
                    })
                  }
                  className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2 rounded-xl text-xs font-black uppercase"
                >
                  {SERIES_OFICIALES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-400 mb-1">
                  Club Local
                </label>
                <select
                  value={acta.clubLocalId}
                  onChange={(e) => {
                    const c = clubes.find((cl) => cl.id === e.target.value);
                    if (c)
                      setActa({
                        ...acta,
                        clubLocalId: c.id,
                        clubLocalNombre: c.nombre,
                      });
                  }}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2 rounded-xl text-xs font-black"
                >
                  {clubes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-emerald-400 mb-1">
                  Club Visita
                </label>
                <select
                  value={acta.clubVisitaId}
                  onChange={(e) => {
                    const c = clubes.find((cl) => cl.id === e.target.value);
                    if (c)
                      setActa({
                        ...acta,
                        clubVisitaId: c.id,
                        clubVisitaNombre: c.nombre,
                      });
                  }}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2 rounded-xl text-xs font-black"
                >
                  {clubes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Banner de Confirmación de Imputación a Tesorería / Goleadores */}
        {alertaOperativa && (
          <div className="bg-slate-900 border-2 border-yellow-400 text-yellow-300 p-4 rounded-xl text-xs sm:text-sm font-black shadow-lg">
            {alertaOperativa}
          </div>
        )}

        {/* Marcador Electrónico */}
        <div className="bg-slate-900 text-white rounded-2xl border-4 border-slate-700 p-5 shadow-xl">
          <div className="grid grid-cols-7 items-center text-center gap-2">
            <div className="col-span-3 bg-slate-950 p-4 rounded-xl border-2 border-blue-500/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                LOCAL • {acta.serie}
              </span>
              <h2 className="text-base sm:text-lg font-black mt-1">
                {acta.clubLocalNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black text-white my-2">
                {acta.golesLocal}
              </p>
            </div>

            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-400 uppercase">
                Min
              </span>
              <span className="bg-yellow-400 text-black font-black text-xl px-3 py-1 rounded-lg border-2 border-white my-1">
                {minuto}&prime;
              </span>
              <span className="text-xs font-black text-slate-500">VS</span>
            </div>

            <div className="col-span-3 bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                VISITA • {acta.serie}
              </span>
              <h2 className="text-base sm:text-lg font-black mt-1">
                {acta.clubVisitaNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black text-white my-2">
                {acta.golesVisita}
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Registro Arbitral Asociado a Jugador, Club y Causal de Sanción */}
        {acta.estado !== "cerrado_inmutable" && (
          <div className="p-5 rounded-2xl border-2 bg-slate-900 border-slate-800 space-y-5">
            {/* Selector Rápido de Minuto */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-300 mr-2">
                Minuto Incidencia:
              </span>
              <input
                type="number"
                min={1}
                max={120}
                value={minuto}
                onChange={(e) => setMinuto(Number(e.target.value))}
                className="w-20 bg-slate-950 text-white border-2 border-slate-600 rounded-lg p-2 font-black text-center"
              />
              {[1, 5, 45, 90].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() =>
                    setMinuto((m) =>
                      val >= 45 ? val : Math.min(120, m + val)
                    )
                  }
                  className="bg-slate-800 hover:bg-slate-700 text-yellow-400 font-black text-xs px-3.5 py-2.5 rounded-lg border-2 border-slate-600"
                >
                  {val >= 45 ? `${val}'` : `+${val}'`}
                </button>
              ))}
            </div>

            {/* Tarjetas de Acción por Club */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* BLOQUE CLUB LOCAL */}
              <div className="p-4 rounded-xl border-2 border-blue-500/60 bg-slate-950 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-blue-400">
                    1. Jugador Local ({acta.clubLocalNombre})
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {nominaLocal.length} habilitados
                  </span>
                </div>

                <select
                  value={jugadorLocalSel}
                  onChange={(e) => setJugadorLocalSel(e.target.value)}
                  className="w-full bg-slate-900 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-black"
                >
                  <option value="">
                    -- Seleccionar Jugador de {acta.clubLocalNombre} --
                  </option>
                  {nominaLocal.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nombre} (RUT: {j.rut || "S/R"} • {j.goles} goles)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => registrarEventoPartido("gol", "local")}
                  className="w-full min-h-[50px] bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase rounded-xl border-2 border-white shadow"
                >
                  ⚽ ASOCIAR GOL A JUGADOR Y CLUB LOCAL
                </button>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-[10px] font-black uppercase text-red-400">
                    2. Tipificación de Sanción / Expulsión (Impacto en Tesorería):
                  </label>
                  <select
                    value={causalLocal}
                    onChange={(e) =>
                      setCausalLocal(e.target.value as CodigoCausalRoja)
                    }
                    className="w-full bg-slate-900 text-red-300 border-2 border-red-500/50 p-2.5 rounded-xl text-xs font-black"
                  >
                    {Object.values(CATALOGO_CAUSALES_ROJA).map((regla) => (
                      <option key={regla.codigo} value={regla.codigo}>
                        {regla.etiqueta} ({regla.fechasSuspension} fechas | $
                        {regla.multaCLP.toLocaleString("es-CL")})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        registrarEventoPartido("amarilla", "local")
                      }
                      className="min-h-[48px] bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase rounded-xl border-2 border-black"
                    >
                      🟨 AMARILLA ($2.000)
                    </button>
                    <button
                      type="button"
                      onClick={() => registrarEventoPartido("roja", "local")}
                      className="min-h-[48px] bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
                    >
                      🟥 APLICAR ROJA Y MULTA
                    </button>
                  </div>
                </div>
              </div>

              {/* BLOQUE CLUB VISITA */}
              <div className="p-4 rounded-xl border-2 border-emerald-500/60 bg-slate-950 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-emerald-400">
                    1. Jugador Visita ({acta.clubVisitaNombre})
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {nominaVisita.length} habilitados
                  </span>
                </div>

                <select
                  value={jugadorVisitaSel}
                  onChange={(e) => setJugadorVisitaSel(e.target.value)}
                  className="w-full bg-slate-900 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-black"
                >
                  <option value="">
                    -- Seleccionar Jugador de {acta.clubVisitaNombre} --
                  </option>
                  {nominaVisita.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nombre} (RUT: {j.rut || "S/R"} • {j.goles} goles)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => registrarEventoPartido("gol", "visita")}
                  className="w-full min-h-[50px] bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase rounded-xl border-2 border-white shadow"
                >
                  ⚽ ASOCIAR GOL A JUGADOR Y CLUB VISITA
                </button>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-[10px] font-black uppercase text-red-400">
                    2. Tipificación de Sanción / Expulsión (Impacto en Tesorería):
                  </label>
                  <select
                    value={causalVisita}
                    onChange={(e) =>
                      setCausalVisita(e.target.value as CodigoCausalRoja)
                    }
                    className="w-full bg-slate-900 text-red-300 border-2 border-red-500/50 p-2.5 rounded-xl text-xs font-black"
                  >
                    {Object.values(CATALOGO_CAUSALES_ROJA).map((regla) => (
                      <option key={regla.codigo} value={regla.codigo}>
                        {regla.etiqueta} ({regla.fechasSuspension} fechas | $
                        {regla.multaCLP.toLocaleString("es-CL")})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        registrarEventoPartido("amarilla", "visita")
                      }
                      className="min-h-[48px] bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase rounded-xl border-2 border-black"
                    >
                      🟨 AMARILLA ($2.000)
                    </button>
                    <button
                      type="button"
                      onClick={() => registrarEventoPartido("roja", "visita")}
                      className="min-h-[48px] bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
                    >
                      🟥 APLICAR ROJA Y MULTA
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones del Informe Arbitral */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                Observaciones Adicionales del Informe Arbitral (Se incluye en notificación a clubes)
              </label>
              <textarea
                rows={2}
                placeholder="Detalle de comportamiento de bancas, público o incidentes adicionales..."
                value={observacionArbitral}
                onChange={(e) => setObservacionArbitral(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        )}

        {/* Bitácora Detallada con Desglose de Multas para Tesorería */}
        <div className="p-5 rounded-2xl border-2 bg-slate-900 border-slate-800 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Extracto Oficial del Partido ({acta.incidencias.length} Eventos)
          </h3>

          {acta.incidencias.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center border-2 border-dashed border-slate-800 rounded-xl">
              Sin goles ni sanciones registradas aún.
            </p>
          ) : (
            <ul className="space-y-2">
              {acta.incidencias.map((inc, i) => (
                <li
                  key={i}
                  className="flex flex-wrap justify-between items-center gap-2 p-3 rounded-xl bg-slate-950 border-2 border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-yellow-400 bg-slate-900 px-2 py-1 rounded">
                      {inc.minuto}&prime;
                    </span>
                    <span
                      className={`font-black uppercase px-2.5 py-0.5 rounded ${
                        inc.tipo === "gol"
                          ? "bg-blue-600 text-white"
                          : inc.tipo === "amarilla"
                          ? "bg-yellow-400 text-black"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {inc.tipo}
                    </span>
                    <div>
                      <span className="font-black text-white">
                        {inc.jugadorNombre}
                      </span>{" "}
                      <span className="text-slate-400 font-bold">
                        ({inc.equipoNombre})
                      </span>
                      {inc.causalDetalle && (
                        <p className="text-[11px] font-bold text-slate-300">
                          {inc.causalDetalle}
                        </p>
                      )}
                    </div>
                  </div>

                  {(inc.multaAsociada || 0) > 0 && (
                    <div className="text-right">
                      <span className="bg-red-950 text-red-300 border border-red-500 px-2.5 py-1 rounded font-black text-[11px] block">
                        Multa Tesorería: $
                        {inc.multaAsociada?.toLocaleString("es-CL")}
                      </span>
                      {(inc.fechasCastigo || 0) > 0 && (
                        <span className="text-[10px] font-black text-amber-400">
                          Suspensión: {inc.fechasCastigo} fecha(s)
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cierre de Jornada, Sello SHA-256 y Despacho Automático a Clubes */}
        <div className="p-5 rounded-2xl border-2 bg-slate-900 border-slate-800">
          {acta.estado !== "cerrado_inmutable" ? (
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase text-emerald-400">
                Fin de Jornada Deportiva • Sellar Acta y Enviar Informe Automático a los Clubes Involucrados
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  placeholder="PIN o Firma Digital de Árbitro y Delegados"
                  value={firmaArbitro}
                  onChange={(e) => setFirmaArbitro(e.target.value)}
                  className="flex-1 p-3 rounded-xl border-2 bg-slate-950 text-white border-slate-700 font-bold"
                />
                <button
                  type="button"
                  onClick={cerrarSellarYNotificarClubes}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase px-6 py-3.5 rounded-xl border-2 border-white shadow-lg"
                >
                  🔒 Cerrar Jornada y Notificar a Clubes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-emerald-400 block">
                ✓ ACTA SELLADA Y BOLETÍN DESPACHADO AUTOMÁTICAMENTE A{" "}
                {acta.clubLocalNombre.toUpperCase()} Y{" "}
                {acta.clubVisitaNombre.toUpperCase()}
              </span>
              <p className="text-xs font-mono bg-slate-950 p-3 rounded-lg border border-emerald-500/40 break-all text-emerald-300">
                SHA-256: {acta.selloInmutabilidad}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}