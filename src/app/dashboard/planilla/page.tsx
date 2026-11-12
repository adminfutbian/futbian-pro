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
  const [rolUsuario, setRolUsuario] = useState<string>("arbitro");
  const [partidosFixture, setPartidosFixture] = useState<EncuentroFixture[]>(
    []
  );
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  const [jornadaSel, setJornadaSel] = useState<number>(1);
  const [serieSel, setSerieSel] = useState<SerieOficial>("Honor");
  const [fixtureMatchIdSel, setFixtureMatchIdSel] = useState<string>("");

  const [minuto, setMinuto] = useState(1);
  const [jugadorLocalSel, setJugadorLocalSel] = useState("");
  const [jugadorVisitaSel, setJugadorVisitaSel] = useState("");
  const [causalLocal, setCausalLocal] = useState<CodigoCausalRoja>(
    "ROJA_DIRECTA_JUEGO_BRUSCO"
  );
  const [causalVisita, setCausalVisita] = useState<CodigoCausalRoja>(
    "ROJA_DIRECTA_JUEGO_BRUSCO"
  );
  const [firmaArbitro, setFirmaArbitro] = useState("");
  const [alertaOperativa, setAlertaOperativa] = useState("");

  const [acta, setActa] = useState<ActaPartido>({
    id: "partido-f1-honor",
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
  });

  // Verificar si el usuario es adminasociacion (solo lectura en Planilla)
  const soloLectura = rolUsuario === "adminasociacion";

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const s = await getDoc(doc(db, "users", u.uid));
        if (s.exists()) setRolUsuario(s.data().rol || "arbitro");
      }
    });
    return () => unsubAuth();
  }, []);

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

  // Cargar encuentros desde el Fixture Oficial y Jugadores desde el Padrón
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
        goles: d.data().goles || 0,
        sancionado: d.data().sancionado || false,
      }));
      setJugadores(lista);
    });

    return () => {
      unsubFix();
      unsubJug();
    };
  }, []);

  // Filtrar encuentros del fixture para la fecha escogida por el árbitro
  const duelosDeLaFecha = partidosFixture.filter(
    (p) => p.jornada === jornadaSel
  );

  // Cuando el árbitro escoge Fecha, Partido del Fixture o Serie, actualizar el Acta automáticamente
  const seleccionarEncuentroDelFixture = (
    matchId: string,
    serieAct: SerieOficial
  ) => {
    setFixtureMatchIdSel(matchId);
    const match = partidosFixture.find((m) => m.id === matchId);
    if (match) {
      setJugadorLocalSel("");
      setJugadorVisitaSel("");
      setActa({
        id: `${match.id}-${serieAct.toLowerCase().replace(/\s+/g, "")}`,
        fixtureMatchId: match.id,
        jornada: match.jornada,
        serie: serieAct,
        cancha: match.canchaAsignada,
        clubLocalId: match.localId,
        clubLocalNombre: match.localNombre,
        clubVisitaId: match.visitaId,
        clubVisitaNombre: match.visitaNombre,
        golesLocal: 0,
        golesVisita: 0,
        incidencias: [],
        estado: "en_juego",
        sincronizado: false,
      });
    }
  };

  // Auto-filtrado de los jugadores del club local y visita que pertenecen a la serie escogida
  const nominaLocalFiltrada = jugadores.filter(
    (j) =>
      (j.clubId === acta.clubLocalId || j.club === acta.clubLocalNombre) &&
      j.serie === acta.serie &&
      !j.sancionado
  );

  const nominaVisitaFiltrada = jugadores.filter(
    (j) =>
      (j.clubId === acta.clubVisitaId || j.club === acta.clubVisitaNombre) &&
      j.serie === acta.serie &&
      !j.sancionado
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
        `⚠ Seleccione un jugador de la lista auto-filtrada de ${clubNombre} (${acta.serie}).`
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

    if (online) {
      if (tipo === "gol") {
        await updateDoc(doc(db, "jugadores", jugObj.id), {
          goles: increment(1),
        });
        await registrarAccionAuditoria(
          "PLANILLA",
          "GOL_JUGADOR",
          `Gol de ${jugObj.nombre} (${clubNombre} - Serie ${acta.serie})`
        );
      } else if (montoCobro > 0) {
        // Enviar cobro inmediatamente a Finanzas
        await addDoc(collection(db, "cargos_financieros"), {
          clubId,
          clubNombre,
          tipo: "MULTA_TRIBUNAL_CANCHA",
          concepto: `Sanción Cancha (${tipo.toUpperCase()} - ${
            jugObj.nombre
          } - Serie ${acta.serie}): ${nueva.causalDetalle}`,
          monto: montoCobro,
          fecha: new Date().toISOString(),
          estado: "PENDIENTE",
          emitidoPor: "Árbitro en Planilla (CU-01)",
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

        await registrarAccionAuditoria(
          "PLANILLA",
          `SANCION_${tipo.toUpperCase()}`,
          `${jugObj.nombre} (${clubNombre}) sancionado. Cobro de $${montoCobro.toLocaleString(
            "es-CL"
          )} enviado a Finanzas.`
        );
      }
    }
  };

  const cerrarPartidoYSumarPuntosPorSerie = async () => {
    if (soloLectura) return;
    if (!firmaArbitro.trim()) {
      setAlertaOperativa("⚠ Ingrese su PIN o Firma Arbitral para cerrar el acta.");
      return;
    }

    const rawData = JSON.stringify(acta);
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawData)
    );
    const selloHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const actaCerrada: ActaPartido = {
      ...acta,
      estado: "cerrado_inmutable",
      firmaArbitro,
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

      // Sumar puntos y goles al club general y a la serie específica jugada
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
        "CIERRE_ACTA_SUMA_PUNTOS",
        `Acta cerrada (${acta.clubLocalNombre} ${acta.golesLocal} - ${acta.golesVisita} ${acta.clubVisitaNombre}, Serie ${acta.serie}). Puntos sumados.`
      );

      setAlertaOperativa(
        `✓ Acta sellada: Puntos (${ptsLocal} y ${ptsVisita}) y goles sumados a la tabla general y a la Serie ${acta.serie}.`
      );
    }
  };

  return (
    <div className="min-h-screen py-6 px-3 sm:px-6 bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        {soloLectura && (
          <div className="bg-amber-950 border-2 border-amber-400 text-amber-300 p-4 rounded-xl text-xs font-black uppercase">
            👁 MODO SOLO LECTURA (Perfil Admin Asociación): Puede auditar el informe arbitral, pero no modificar goles ni sanciones.
          </div>
        )}

        {/* Selector de Fecha, Encuentro del Fixture y Serie */}
        <div className="p-5 rounded-2xl border-2 bg-slate-900 border-slate-800 space-y-4">
          <h1 className="text-xl sm:text-2xl font-black">
            Planilla Arbitral Alimentada desde el Fixture (CU-01)
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                1. Escoger Fecha del Campeonato
              </label>
              <select
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={jornadaSel}
                onChange={(e) => setJornadaSel(Number(e.target.value))}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-black"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    Fecha {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-blue-400 mb-1">
                2. Escoger Partido del Fixture (Fecha {jornadaSel})
              </label>
              <select
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={fixtureMatchIdSel}
                onChange={(e) =>
                  seleccionarEncuentroDelFixture(e.target.value, serieSel)
                }
                className="w-full bg-slate-950 text-white border-2 border-blue-500 p-2.5 rounded-xl text-xs font-black"
              >
                <option value="">-- Seleccione duelo programado --</option>
                {duelosDeLaFecha.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.localNombre} vs {d.visitaNombre} ({d.canchaAsignada})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-yellow-400 mb-1">
                3. Escoger Serie a Arbitrar
              </label>
              <select
                disabled={soloLectura || acta.estado === "cerrado_inmutable"}
                value={serieSel}
                onChange={(e) => {
                  const nuevaSerie = e.target.value as SerieOficial;
                  setSerieSel(nuevaSerie);
                  if (fixtureMatchIdSel) {
                    seleccionarEncuentroDelFixture(
                      fixtureMatchIdSel,
                      nuevaSerie
                    );
                  } else {
                    setActa({ ...acta, serie: nuevaSerie });
                  }
                }}
                className="w-full bg-slate-950 text-yellow-400 border-2 border-yellow-400 p-2.5 rounded-xl text-xs font-black uppercase"
              >
                {SERIES_OFICIALES.map((s) => (
                  <option key={s} value={s}>
                    Serie {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {alertaOperativa && (
          <div className="bg-slate-900 border-2 border-yellow-400 text-yellow-300 p-4 rounded-xl text-xs font-black">
            {alertaOperativa}
          </div>
        )}

        {/* Marcador */}
        <div className="bg-slate-900 rounded-2xl border-4 border-slate-700 p-5">
          <div className="grid grid-cols-7 items-center text-center gap-2">
            <div className="col-span-3 bg-slate-950 p-4 rounded-xl border-2 border-blue-500/50">
              <span className="text-[10px] font-black uppercase text-blue-400 block">
                LOCAL • SERIE {acta.serie}
              </span>
              <h2 className="text-base sm:text-lg font-black mt-1">
                {acta.clubLocalNombre}
              </h2>
              <p className="text-5xl sm:text-7xl font-black my-2">
                {acta.golesLocal}
              </p>
            </div>

            <div className="col-span-1">
              <span className="bg-yellow-400 text-black font-black text-xl px-3 py-1 rounded-lg border-2 border-white">
                {minuto}&prime;
              </span>
            </div>

            <div className="col-span-3 bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">
                VISITA • SERIE {acta.serie}
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

        {/* Listados Auto-Filtrados de Jugadores para Gol, Amarilla y Roja */}
        {!soloLectura && acta.estado !== "cerrado_inmutable" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Equipo Local */}
            <div className="bg-slate-900 p-4 rounded-2xl border-2 border-blue-500/60 space-y-3">
              <span className="text-xs font-black uppercase text-blue-400 block">
                Nómina Auto-Filtrada: {acta.clubLocalNombre} ({acta.serie})
              </span>
              <select
                value={jugadorLocalSel}
                onChange={(e) => setJugadorLocalSel(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-black"
              >
                <option value="">
                  -- Escoger Jugador ({nominaLocalFiltrada.length} en {acta.serie}) --
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
                ⚽ + GOL LOCAL
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
                  🟨 AMARILLA
                </button>
                <button
                  type="button"
                  onClick={() => registrarEventoPartido("roja", "local")}
                  className="py-2.5 bg-red-600 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
                >
                  🟥 ROJA + COBRO
                </button>
              </div>
            </div>

            {/* Equipo Visita */}
            <div className="bg-slate-900 p-4 rounded-2xl border-2 border-emerald-500/60 space-y-3">
              <span className="text-xs font-black uppercase text-emerald-400 block">
                Nómina Auto-Filtrada: {acta.clubVisitaNombre} ({acta.serie})
              </span>
              <select
                value={jugadorVisitaSel}
                onChange={(e) => setJugadorVisitaSel(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl text-xs font-black"
              >
                <option value="">
                  -- Escoger Jugador ({nominaVisitaFiltrada.length} en {acta.serie}) --
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
                ⚽ + GOL VISITA
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
                  🟨 AMARILLA
                </button>
                <button
                  type="button"
                  onClick={() => registrarEventoPartido("roja", "visita")}
                  className="py-2.5 bg-red-600 text-white font-black text-xs uppercase rounded-xl border-2 border-white"
                >
                  🟥 ROJA + COBRO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cierre de Partido */}
        {!soloLectura && acta.estado !== "cerrado_inmutable" && (
          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              placeholder="PIN Arbitral para cerrar acta y sumar puntos a la serie"
              value={firmaArbitro}
              onChange={(e) => setFirmaArbitro(e.target.value)}
              className="flex-1 bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold"
            />
            <button
              type="button"
              onClick={cerrarPartidoYSumarPuntosPorSerie}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase px-6 py-3.5 rounded-xl border-2 border-white"
            >
              🔒 Sellar Acta y Sumar Puntos ({acta.serie})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}