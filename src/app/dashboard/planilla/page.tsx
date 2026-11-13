// src/app/dashboard/planilla/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  ActaPartido,
  CATALOGO_CAUSALES_ROJA,
  CodigoCausalRoja,
  EncuentroFixture,
  Incidencia,
  Jugador,
  SERIES_OFICIALES,
  SerieOficial,
  TIEMPOS_JUEGO_POR_DEFECTO,
} from "@/types";
import {
  guardarActaOfflineFirst,
  sincronizarOutboxConFirestore,
} from "@/lib/offlineDb";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  increment,
} from "firebase/firestore";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

export default function PlanillaPage() {
  const [online, setOnline] = useState(true);
  const [rolUsuario, setRolUsuario] = useState<string>("turno");
  const [partidosFixture, setPartidosFixture] = useState<EncuentroFixture[]>(
    []
  );
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  // Selección de Fecha, Partido y Serie
  const [jornadaSel, setJornadaSel] = useState<number>(1);
  const [serieSel, setSerieSel] = useState<SerieOficial>("Honor");
  const [fixtureMatchIdSel, setFixtureMatchIdSel] = useState<string>("");

  // Cronómetro en Vivo y Tiempo por Serie
  const [duracionPorTiempo, setDuracionPorTiempo] = useState<number>(45);
  const [relojCorriendo, setRelojCorriendo] = useState<boolean>(false);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState<number>(0);
  const [mitadActual, setMitadActual] = useState<1 | 2>(1);
  const [minuto, setMinuto] = useState<number>(1);

  // Filtros rápidos de jugadores y causales
  const [busquedaJugLocal, setBusquedaJugLocal] = useState("");
  const [busquedaJugVisita, setBusquedaJugVisita] = useState("");
  const [jugadorLocalSel, setJugadorLocalSel] = useState("");
  const [jugadorVisitaSel, setJugadorVisitaSel] = useState("");
  const [causalLocal, setCausalLocal] = useState<CodigoCausalRoja>(
    "ROJA_DIRECTA_JUEGO_BRUSCO"
  );
  const [causalVisita, setCausalVisita] = useState<CodigoCausalRoja>(
    "ROJA_DIRECTA_JUEGO_BRUSCO"
  );

  // Flujo Turno -> Ratificación Árbitro
  const [nombreTurno, setNombreTurno] = useState("");
  const [firmaArbitro, setFirmaArbitro] = useState("");
  const [alertaOperativa, setAlertaOperativa] = useState("");

  const [acta, setActa] = useState<ActaPartido>({
    id: "partido-f1-honor",
    jornada: 1,
    serie: "Honor",
    duracionTiempoMinutos: 45,
    clubLocalId: "halcones",
    clubLocalNombre: "CD Los Halcones",
    clubVisitaId: "estrella",
    clubVisitaNombre: "Estrella Precordillerana",
    golesLocal: 0,
    golesVisita: 0,
    incidencias: [],
    estado: "programado",
    sincronizado: false,
  });

  const soloLectura = rolUsuario === "adminasociacion";

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const s = await getDoc(doc(db, "users", u.uid));
        if (s.exists()) setRolUsuario(s.data().rol || "turno");
      }
    });
    return () => unsubAuth();
  }, []);

  // Efecto del Cronómetro en Vivo: actualiza el minutaje automáticamente
  useEffect(() => {
    if (!relojCorriendo) return;
    const interval = setInterval(() => {
      setSegundosTranscurridos((prev) => {
        const nuevo = prev + 1;
        const minCalc = Math.floor(nuevo / 60) + 1;
        setMinuto(minCalc);
        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [relojCorriendo]);

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
    const unsubFix = onSnapshot(collection(db, "fixture_oficial"), (snap) => {
      const lista: EncuentroFixture[] = snap.docs.map(
        (d) => d.data() as EncuentroFixture
      );
      setPartidosFixture(lista);
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
      }));
      setJugadores(lista);
    });

    return () => {
      unsubFix();
      unsubJug();
    };
  }, []);

  const formatearCronometro = (totalSeg: number) => {
    const mins = Math.floor(totalSeg / 60)
      .toString()
      .padStart(2, "0");
    const segs = (totalSeg % 60).toString().padStart(2, "0");
    return `${mins}:${segs}`;
  };

  const cambiarSerieYAjustarTiempo = (nuevaSerie: SerieOficial) => {
    setSerieSel(nuevaSerie);
    const tiempoSugerido = TIEMPOS_JUEGO_POR_DEFECTO[nuevaSerie] || 40;
    setDuracionPorTiempo(tiempoSugerido);
    if (fixtureMatchIdSel) {
      seleccionarEncuentroDelFixture(
        fixtureMatchIdSel,
        nuevaSerie,
        tiempoSugerido
      );
    } else {
      setActa((prev) => ({
        ...prev,
        serie: nuevaSerie,
        duracionTiempoMinutos: tiempoSugerido,
      }));
    }
  };

  const seleccionarEncuentroDelFixture = (
    matchId: string,
    serieAct: SerieOficial,
    tiempoMin = duracionPorTiempo
  ) => {
    setFixtureMatchIdSel(matchId);
    const match = partidosFixture.find((m) => m.id === matchId);
    if (match) {
      setRelojCorriendo(false);
      setSegundosTranscurridos(0);
      setMinuto(1);
      setActa({
        id: `${match.id}-${serieAct.toLowerCase().replace(/\s+/g, "")}`,
        fixtureMatchId: match.id,
        jornada: match.jornada,
        serie: serieAct,
        cancha: match.canchaAsignada,
        duracionTiempoMinutos: tiempoMin,
        clubLocalId: match.localId,
        clubLocalNombre: match.localNombre,
        clubVisitaId: match.visitaId,
        clubVisitaNombre: match.visitaNombre,
        golesLocal: 0,
        golesVisita: 0,
        incidencias: [],
        estado: "programado",
        sincronizado: false,
      });
    }
  };

  const comenzarOPausarReloj = () => {
    if (acta.estado === "cerrado_inmutable") return;
    if (!relojCorriendo && acta.estado === "programado") {
      setActa((prev) => ({ ...prev, estado: "en_juego" }));
    }
    setRelojCorriendo(!relojCorriendo);
  };

  const iniciarSegundoTiempo = () => {
    setMitadActual(2);
    setSegundosTranscurridos(duracionPorTiempo * 60);
    setMinuto(duracionPorTiempo + 1);
    setRelojCorriendo(true);
  };

  const duelosDeLaFecha = partidosFixture.filter(
    (p) => p.jornada === jornadaSel
  );

  const nominaLocalFiltrada = jugadores.filter(
    (j) =>
      (j.clubId === acta.clubLocalId || j.club === acta.clubLocalNombre) &&
      j.serie === acta.serie &&
      !j.sancionado &&
      j.nombre.toLowerCase().includes(busquedaJugLocal.toLowerCase())
  );

  const nominaVisitaFiltrada = jugadores.filter(
    (j) =>
      (j.clubId === acta.clubVisitaId || j.club === acta.clubVisitaNombre) &&
      j.serie === acta.serie &&
      !j.sancionado &&
      j.nombre.toLowerCase().includes(busquedaJugVisita.toLowerCase())
  );

  const registrarEventoPartido = async (
    tipo: "gol" | "amarilla" | "roja",
    equipo: "local" | "visita"
  ) => {
    if (soloLectura || acta.estado === "cerrado_inmutable") return;
    setAlertaOperativa("");

    const jugId = equipo === "local" ? jugadorLocalSel : jugadorVisitaSel;
    const clubId = equipo === "local" ? acta.clubLocalId : acta.clubVisitaId;
    const clubNombre =
      equipo === "local" ? acta.clubLocalNombre : acta.clubVisitaNombre;

    const jugObj = jugadores.find((j) => j.id === jugId);
    if (!jugObj) {
      setAlertaOperativa(
        `⚠ Seleccione al jugador de ${clubNombre} (${acta.serie}) antes de anotar la incidencia.`
      );
      return;
    }

    const codigoCausal = equipo === "local" ? causalLocal : causalVisita;
    const reglaRoja =
      tipo === "roja" ? CATALOGO_CAUSALES_ROJA[codigoCausal] : undefined;
    const multaAmarilla = tipo === "amarilla" ? 2000 : 0;
    const montoCobro = reglaRoja ? reglaRoja.multaCLP : multaAmarilla;

    const nueva: Incidencia = {
      minuto,
      tiempoSegundo: formatearCronometro(segundosTranscurridos),
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
          ? "Tarjeta Amarilla"
          : "Gol Oficial",
      fechasCastigo: reglaRoja ? reglaRoja.fechasSuspension : 0,
      multaAsociada: montoCobro,
      registradoPor: nombreTurno.trim() || rolUsuario.toUpperCase(),
    };

    const nuevaActa: ActaPartido = {
      ...acta,
      estado:
        acta.estado === "programado" ? "en_juego" : acta.estado,
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

    if (online) {
      if (tipo === "gol") {
        await updateDoc(doc(db, "jugadores", jugObj.id), {
          goles: increment(1),
        });
      } else if (montoCobro > 0) {
        await addDoc(collection(db, "cargos_financieros"), {
          clubId,
          clubNombre,
          tipo: "MULTA_TRIBUNAL_CANCHA",
          concepto: `Sanción Cancha Min ${minuto}' (${tipo.toUpperCase()} - ${
            jugObj.nombre
          } - Serie ${acta.serie}): ${nueva.causalDetalle}`,
          monto: montoCobro,
          fecha: new Date().toISOString(),
          estado: "PENDIENTE",
          emitidoPor: `Planilla (${nombreTurno || "Turno/Árbitro"})`,
        });

        await setDoc(
          doc(db, "equipos", clubId),
          {
            saldoDeudor: increment(montoCobro),
            bloqueadoDeportivo: true,
          },
          { merge: true }
        );

        if (tipo === "roja" && reglaRoja) {
          await updateDoc(doc(db, "jugadores", jugObj.id), {
            sancionado: true,
            fechasPendientes: reglaRoja.fechasSuspension,
          });
        }
      }
    }
  };

  // Paso 1 de cierre: El Turno envía la planilla para que el Árbitro la ratifique
  const enviarPlanillaPorElTurno = async () => {
    if (!nombreTurno.trim()) {
      setAlertaOperativa(
        "⚠ Ingrese el nombre o RUT del Director de Turno para firmar el llenado de mesa."
      );
      return;
    }
    setRelojCorriendo(false);
    const actaTurno: ActaPartido = {
      ...acta,
      nombreTurno: nombreTurno.trim(),
      estado: "pendiente_ratificacion_arbitro",
      sincronizado: false,
    };
    setActa(actaTurno);
    await guardarActaOfflineFirst(actaTurno);
    setAlertaOperativa(
      `✓ Planilla completada por el Turno (${nombreTurno}). Lista para Ratificación del Árbitro.`
    );
  };

  // Paso 2 de cierre: El Árbitro ratifica lo llenado por el Turno y sella el acta con SHA-256
  const ratificarPorArbitroYSellar = async () => {
    if (soloLectura) return;
    if (!firmaArbitro.trim()) {
      setAlertaOperativa(
        "⚠ El Árbitro debe ingresar su PIN o Firma Digital para ratificar la planilla del Turno."
      );
      return;
    }

    setRelojCorriendo(false);
    const rawData = JSON.stringify({
      ...acta,
      nombreTurno,
      ratificadoPorArbitro: true,
    });
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawData)
    );
    const selloHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const actaCerrada: ActaPartido = {
      ...acta,
      nombreTurno: nombreTurno || "Turno Oficial",
      ratificadoPorArbitro: true,
      firmaArbitro,
      estado: "cerrado_inmutable",
      selloInmutabilidad: selloHex,
      sincronizado: false,
    };

    setActa(actaCerrada);
    await guardarActaOfflineFirst(actaCerrada);

    if (online) {
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

      // Actualizar tanto el acumulado del club como el desglose específico de la serie jugada
      await setDoc(
        doc(db, "equipos", acta.clubLocalId),
        {
          puntos: increment(ptsLocal),
          goles_favor: increment(acta.golesLocal),
          goles_contra: increment(acta.golesVisita),
          estadisticasPorSerie: {
            [acta.serie]: {
              puntos: increment(ptsLocal),
              goles_favor: increment(acta.golesLocal),
              goles_contra: increment(acta.golesVisita),
            },
          },
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "equipos", acta.clubVisitaId),
        {
          puntos: increment(ptsVisita),
          goles_favor: increment(acta.golesVisita),
          goles_contra: increment(acta.golesLocal),
          estadisticasPorSerie: {
            [acta.serie]: {
              puntos: increment(ptsVisita),
              goles_favor: increment(acta.golesVisita),
              goles_contra: increment(acta.golesLocal),
            },
          },
        },
        { merge: true }
      );

      await registrarAccionAuditoria(
        "PLANILLA",
        "RATIFICACION_ARBITRAL_SHA256",
        `Acta ratificada por Árbitro (${firmaArbitro}) y llenada por Turno (${
          nombreTurno || "Mesa"
        }): ${acta.clubLocalNombre} ${acta.golesLocal} - ${
          acta.golesVisita
        } ${acta.clubVisitaNombre} (${acta.serie})`
      );

      setAlertaOperativa(
        `✓ ACTA RATIFICADA POR EL ÁRBITRO Y SELLADA: Puntos sumados a la Serie ${acta.serie}.`
      );
    }
  };

  return (
    <div className="min-h-screen py-6 px-3 sm:px-6 bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Cabecera: Selección de Fecha, Partido, Serie y Duración de Tiempo */}
        <div className="p-5 rounded-2xl border-2 bg-slate-900 border-slate-800 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
                MESA DE TURNO & RATIFICACIÓN ARBITRAL • CU-01
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                Planilla con Cronómetro por Serie y Ratificación
              </h1>
            </div>

            <span
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border-2 ${
                acta.estado === "cerrado_inmutable"
                  ? "bg-red-600 text-white border-white"
                  : acta.estado === "pendiente_ratificacion_arbitro"
                  ? "bg-amber-500 text-black border-white animate-pulse"
                  : "bg-emerald-600 text-white border-emerald-300"
              }`}
            >
              {acta.estado === "cerrado_inmutable" && "🔒 RATIFICADA POR ÁRBITRO"}
              {acta.estado === "pendiente_ratificacion_arbitro" &&
                "⏳ LLENADA POR TURNO (FALTA RATIFICAR ÁRBITRO)"}
              {(acta.estado === "programado" || acta.estado === "en_juego") &&
                `⏱ ${relojCorriendo ? "RELOJ EN MARCHA" : "RELOJ DETENIDO"}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                1. Fecha del Campeonato
              </label>
              <select
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={jornadaSel}
                onChange={(e) => setJornadaSel(Number(e.target.value))}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-black"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Fecha {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-blue-400 mb-1">
                2. Encuentro del Fixture
              </label>
              <select
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={fixtureMatchIdSel}
                onChange={(e) =>
                  seleccionarEncuentroDelFixture(e.target.value, serieSel)
                }
                className="w-full bg-slate-950 text-white border-2 border-blue-500 p-2.5 rounded-xl text-xs font-black"
              >
                <option value="">-- Seleccionar Partido --</option>
                {duelosDeLaFecha.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.localNombre} vs {d.visitaNombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-yellow-400 mb-1">
                3. Serie en Cancha
              </label>
              <select
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={serieSel}
                onChange={(e) =>
                  cambiarSerieYAjustarTiempo(e.target.value as SerieOficial)
                }
                className="w-full bg-slate-950 text-yellow-400 border-2 border-yellow-400 p-2.5 rounded-xl text-xs font-black uppercase"
              >
                {SERIES_OFICIALES.map((s) => (
                  <option key={s} value={s}>
                    Serie {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-emerald-400 mb-1">
                4. Minutos por Tiempo ({serieSel})
              </label>
              <input
                type="number"
                min={15}
                max={50}
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={duracionPorTiempo}
                onChange={(e) => setDuracionPorTiempo(Number(e.target.value))}
                className="w-full bg-slate-950 text-emerald-400 border-2 border-emerald-500 p-2 rounded-xl text-xs font-black text-center"
              />
            </div>
          </div>
        </div>

        {alertaOperativa && (
          <div className="bg-slate-900 border-2 border-yellow-400 text-yellow-300 p-4 rounded-xl text-xs font-black">
            {alertaOperativa}
          </div>
        )}

        {/* CRONÓMETRO EN VIVO Y MARCADOR */}
        <div className="bg-slate-900 rounded-2xl border-4 border-slate-700 p-5 space-y-4 shadow-2xl">
          {/* Barra de Control del Reloj ("Comenzar") */}
          {!soloLectura && acta.estado !== "cerrado_inmutable" && (
            <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-950 p-3.5 rounded-xl border-2 border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl sm:text-3xl font-black text-yellow-400 bg-slate-900 px-4 py-1.5 rounded-xl border-2 border-yellow-400">
                  {formatearCronometro(segundosTranscurridos)}
                </span>
                <div>
                  <span className="text-xs font-black uppercase text-white block">
                    {mitadActual}° Tiempo • Minuto {minuto}&prime;
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Reglamentario Serie {acta.serie}: 2 tiempos de{" "}
                    {duracionPorTiempo} min ({duracionPorTiempo * 2} min total)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={comenzarOPausarReloj}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase border-2 shadow-lg transition ${
                    relojCorriendo
                      ? "bg-amber-500 text-black border-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border-white"
                  }`}
                >
                  {relojCorriendo
                    ? "⏸ Pausar Reloj"
                    : segundosTranscurridos === 0
                    ? "▶ Comenzar Partido"
                    : "▶ Reanudar Reloj"}
                </button>

                {mitadActual === 1 && (
                  <button
                    type="button"
                    onClick={iniciarSegundoTiempo}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase border-2 border-white"
                  >
                    ⏭ Iniciar 2° Tiempo ({duracionPorTiempo + 1}&prime;)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSegundosTranscurridos((s) => s + 60);
                    setMinuto((m) => m + 1);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2.5 rounded-xl font-black text-xs border border-slate-600"
                >
                  +1 Min
                </button>
              </div>
            </div>
          )}

          {/* Marcador */}
          <div className="grid grid-cols-7 items-center text-center gap-2">
            <div className="col-span-3 bg-slate-950 p-4 rounded-xl border-2 border-blue-500/50">
              <span className="text-[10px] font-black uppercase text-blue-400 block">
                LOCAL • {acta.serie}
              </span>
              <h2 className="text-base sm:text-lg font-black mt-1">
                {acta.clubLocalNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black my-2">
                {acta.golesLocal}
              </p>
            </div>

            <div className="col-span-1 flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                MINUTO
              </span>
              <span className="bg-yellow-400 text-black font-black text-xl px-3 py-1 rounded-lg border-2 border-white my-1">
                {minuto}&prime;
              </span>
            </div>

            <div className="col-span-3 bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">
                VISITA • {acta.serie}
              </span>
              <h2 className="text-base sm:text-lg font-black mt-1">
                {acta.clubVisitaNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black my-2">
                {acta.golesVisita}
              </p>
            </div>
          </div>
        </div>

        {/* Captura de Incidencias con Buscador Rápido por Equipo */}
        {!soloLectura && acta.estado !== "cerrado_inmutable" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Local */}
            <div className="bg-slate-900 p-4 rounded-2xl border-2 border-blue-500/60 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-blue-400">
                  Nómina Local: {acta.clubLocalNombre}
                </span>
                <input
                  type="text"
                  placeholder="🔍 Filtrar jugador..."
                  value={busquedaJugLocal}
                  onChange={(e) => setBusquedaJugLocal(e.target.value)}
                  className="bg-slate-950 text-white border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold w-36"
                />
              </div>

              <select
                value={jugadorLocalSel}
                onChange={(e) => setJugadorLocalSel(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-black"
              >
                <option value="">
                  -- Seleccionar Jugador ({nominaLocalFiltrada.length}) --
                </option>
                {nominaLocalFiltrada.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} (RUT: {j.rut || "S/R"})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => registrarEventoPartido("gol", "local")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
              >
                ⚽ + GOL LOCAL (Min {minuto}&prime;)
              </button>

              <select
                value={causalLocal}
                onChange={(e) =>
                  setCausalLocal(e.target.value as CodigoCausalRoja)
                }
                className="w-full bg-slate-950 text-red-300 border border-red-500/50 p-2 rounded-xl text-xs font-bold"
              >
                {Object.values(CATALOGO_CAUSALES_ROJA).map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.etiqueta} (${r.multaCLP.toLocaleString("es-CL")})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => registrarEventoPartido("amarilla", "local")}
                  className="py-2.5 bg-yellow-400 text-black font-black text-xs uppercase rounded-xl border-2 border-black"
                >
                  🟨 AMARILLA ({minuto}&prime;)
                </button>
                <button
                  type="button"
                  onClick={() => registrarEventoPartido("roja", "local")}
                  className="py-2.5 bg-red-600 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
                >
                  🟥 ROJA ({minuto}&prime;)
                </button>
              </div>
            </div>

            {/* Visita */}
            <div className="bg-slate-900 p-4 rounded-2xl border-2 border-emerald-500/60 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-emerald-400">
                  Nómina Visita: {acta.clubVisitaNombre}
                </span>
                <input
                  type="text"
                  placeholder="🔍 Filtrar jugador..."
                  value={busquedaJugVisita}
                  onChange={(e) => setBusquedaJugVisita(e.target.value)}
                  className="bg-slate-950 text-white border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold w-36"
                />
              </div>

              <select
                value={jugadorVisitaSel}
                onChange={(e) => setJugadorVisitaSel(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-black"
              >
                <option value="">
                  -- Seleccionar Jugador ({nominaVisitaFiltrada.length}) --
                </option>
                {nominaVisitaFiltrada.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} (RUT: {j.rut || "S/R"})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => registrarEventoPartido("gol", "visita")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
              >
                ⚽ + GOL VISITA (Min {minuto}&prime;)
              </button>

              <select
                value={causalVisita}
                onChange={(e) =>
                  setCausalVisita(e.target.value as CodigoCausalRoja)
                }
                className="w-full bg-slate-950 text-red-300 border border-red-500/50 p-2 rounded-xl text-xs font-bold"
              >
                {Object.values(CATALOGO_CAUSALES_ROJA).map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.etiqueta} (${r.multaCLP.toLocaleString("es-CL")})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => registrarEventoPartido("amarilla", "visita")}
                  className="py-2.5 bg-yellow-400 text-black font-black text-xs uppercase rounded-xl border-2 border-black"
                >
                  🟨 AMARILLA ({minuto}&prime;)
                </button>
                <button
                  type="button"
                  onClick={() => registrarEventoPartido("roja", "visita")}
                  className="py-2.5 bg-red-600 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
                >
                  🟥 ROJA ({minuto}&prime;)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bitácora con Minutaje Exacto */}
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-3">
          <h3 className="text-sm font-black uppercase">
            Incidencias Anotadas con Minutaje ({acta.incidencias.length})
          </h3>
          {acta.incidencias.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Presione &ldquo;▶ Comenzar Partido&rdquo; para iniciar el cronómetro y registrar incidencias.
            </p>
          ) : (
            <ul className="space-y-2">
              {acta.incidencias.map((inc, idx) => (
                <li
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-yellow-400 bg-slate-900 px-2.5 py-1 rounded">
                      {inc.minuto}&prime; ({inc.tiempoSegundo || "00:00"})
                    </span>
                    <span className="font-black uppercase px-2 py-0.5 rounded bg-slate-800">
                      {inc.tipo}
                    </span>
                    <span className="font-black text-white">
                      {inc.jugadorNombre}
                    </span>
                    <span className="text-slate-400">({inc.equipoNombre})</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Mesa: {inc.registradoPor}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FLUJO DE VALIDACIÓN EN 2 PASOS: 1. TURNO -> 2. RATIFICACIÓN ÁRBITRO */}
        {!soloLectura && acta.estado !== "cerrado_inmutable" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paso 1: Firma del Turno */}
            <div className="bg-slate-900 p-5 rounded-2xl border-2 border-amber-400/60 space-y-3">
              <span className="text-[10px] font-black uppercase text-amber-400 block">
                PASO 1 • MESA DE TURNO
              </span>
              <h3 className="text-sm font-black text-white uppercase">
                Cierre de Planilla por el Director de Turno
              </h3>
              <input
                type="text"
                placeholder="Nombre y RUT del Turno de Mesa"
                value={nombreTurno}
                onChange={(e) => setNombreTurno(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-bold"
              />
              <button
                type="button"
                onClick={enviarPlanillaPorElTurno}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase py-3 rounded-xl border-2 border-white text-xs shadow"
              >
                📋 1. Firmar como Turno y Pasar al Árbitro
              </button>
            </div>

            {/* Paso 2: Ratificación del Árbitro */}
            <div className="bg-slate-900 p-5 rounded-2xl border-2 border-emerald-500/60 space-y-3">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">
                PASO 2 • JUEZ CENTRAL DEL PARTIDO
              </span>
              <h3 className="text-sm font-black text-white uppercase">
                Ratificación del Árbitro y Sello SHA-256
              </h3>
              <input
                type="password"
                placeholder="PIN o Firma Digital del Árbitro Ratificador"
                value={firmaArbitro}
                onChange={(e) => setFirmaArbitro(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-bold"
              />
              <button
                type="button"
                onClick={ratificarPorArbitroYSellar}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-3 rounded-xl border-2 border-white text-xs shadow"
              >
                🔒 2. Ratificar como Árbitro y Sellar Acta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}