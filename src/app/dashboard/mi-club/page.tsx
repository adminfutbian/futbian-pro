// src/app/dashboard/mi-club/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  Club,
  Jugador,
  NotificacionJornada,
  SERIES_OFICIALES,
  SerieOficial,
} from "@/types";

export default function MiClubPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [clubActivoId, setClubActivoId] = useState<string>("");
  const [esAdmin, setEsAdmin] = useState<boolean>(true);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [boletinesJornada, setBoletinesJornada] = useState<
    (NotificacionJornada & { observacionArbitral?: string })[]
  >([]);
  const [filtroSerie, setFiltroSerie] = useState<SerieOficial | "TODAS">(
    "TODAS"
  );

  // Estado para nuevo jugador (Sin número de camiseta)
  const [nombreJugador, setNombreJugador] = useState("");
  const [rutJugador, setRutJugador] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [serieJugador, setSerieJugador] = useState<SerieOficial>("Honor");

  // Selector de jornada para proyectar el Próximo Rival
  const [jornadaRival, setJornadaRival] = useState<number>(1);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cargando, setCargando] = useState(false);

  // 1. Detectar usuario logueado y su club asignado (si es delegado)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snapUser = await getDoc(doc(db, "users", user.uid));
          if (snapUser.exists()) {
            const data = snapUser.data();
            if (data.rol === "delegado" && data.clubId) {
              setEsAdmin(false);
              setClubActivoId(data.clubId);
            } else {
              setEsAdmin(true);
            }
          }
        } catch (e) {
          console.error("Error leyendo perfil de usuario:", e);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Escuchar todos los clubes en tiempo real
  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        colorSecundario: d.data().colorSecundario || "#facc15",
        series: d.data().series || ["Honor"],
        escudoUrl: d.data().escudoUrl || "",
        redesSociales: d.data().redesSociales || {},
        canchaLocal: d.data().canchaLocal || "Estadio Municipal Cancha 1",
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(lista);
      if (!clubActivoId && lista.length > 0) {
        setClubActivoId(lista[0].id);
      }
    });
    return () => unsubClubes();
  }, [clubActivoId]);

  // 3. Escuchar padrón de jugadores en tiempo real
  useEffect(() => {
    const unsubJugadores = onSnapshot(collection(db, "jugadores"), (snap) => {
      const lista: Jugador[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || "",
        rut: d.data().rut || "",
        fechaNacimiento: d.data().fechaNacimiento || "",
        club: d.data().club || "",
        clubId: d.data().clubId || "",
        serie: (d.data().serie as SerieOficial) || "Honor",
        goles: d.data().goles || 0,
        sancionado: d.data().sancionado || false,
        fechasPendientes: d.data().fechasPendientes || 0,
      }));
      setJugadores(lista);
    });
    return () => unsubJugadores();
  }, []);

  // 4. Escuchar Boletines e Informes Arbitrales de Fin de Jornada enviados al club
  useEffect(() => {
    const unsubNotif = onSnapshot(
      collection(db, "notificaciones_clubes"),
      (snap) => {
        const lista = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as NotificacionJornada & {
            observacionArbitral?: string;
          }),
        }));
        // Ordenar del más reciente al más antiguo
        lista.sort((a, b) =>
          (b.fechaEnvio || "").localeCompare(a.fechaEnvio || "")
        );
        setBoletinesJornada(lista);
      }
    );
    return () => unsubNotif();
  }, []);

  const miClub = clubes.find((c) => c.id === clubActivoId);
  const misJugadores = jugadores.filter(
    (j) => j.clubId === clubActivoId || (miClub && j.club === miClub.nombre)
  );
  const jugadoresFiltrados =
    filtroSerie === "TODAS"
      ? misJugadores
      : misJugadores.filter((j) => j.serie === filtroSerie);

  const misBoletines = boletinesJornada.filter((b) =>
    (b.clubesInvolucrados || []).includes(clubActivoId)
  );

  // Cálculo determinista Round-Robin del Próximo Rival según la jornada seleccionada
  const calcularProximoRival = (): {
    rival: Club | null;
    condicion: "LOCAL" | "VISITA";
    canchaPartido: string;
    compartenCancha: boolean;
  } => {
    if (!miClub || clubes.length < 2) {
      return {
        rival: null,
        condicion: "LOCAL",
        canchaPartido: "",
        compartenCancha: false,
      };
    }

    const participantes: (Club | null)[] = [...clubes];
    if (participantes.length % 2 !== 0) participantes.push(null);

    const n = participantes.length;
    const mitad = n / 2;
    const rotaciones = (jornadaRival - 1) % (n - 1);

    for (let r = 0; r < rotaciones; r++) {
      participantes.splice(1, 0, participantes.pop()!);
    }

    for (let i = 0; i < mitad; i++) {
      const a = participantes[i];
      const b = participantes[n - 1 - i];
      if (a?.id === miClub.id) {
        const comparten = !!b && b.canchaLocal === miClub.canchaLocal;
        return {
          rival: b,
          condicion: "LOCAL",
          canchaPartido: miClub.canchaLocal || "Estadio Municipal",
          compartenCancha: comparten,
        };
      }
      if (b?.id === miClub.id) {
        const comparten = !!a && a.canchaLocal === miClub.canchaLocal;
        return {
          rival: a,
          condicion: "VISITA",
          canchaPartido: a?.canchaLocal || "Estadio Municipal",
          compartenCancha: comparten,
        };
      }
    }

    return {
      rival: null,
      condicion: "LOCAL",
      canchaPartido: "",
      compartenCancha: false,
    };
  };

  const infoRival = calcularProximoRival();

  // Activar o desactivar series del propio club
  const alternarSerieDelClub = async (serie: SerieOficial) => {
    if (!miClub) return;
    const actuales = miClub.series || ["Honor"];
    const nuevas = actuales.includes(serie)
      ? actuales.filter((s) => s !== serie)
      : [...actuales, serie];

    if (nuevas.length === 0) {
      setErrorMsg("El club debe mantener al menos una serie activa.");
      return;
    }

    setErrorMsg("");
    await updateDoc(doc(db, "equipos", miClub.id), {
      series: nuevas,
    });
    setMensaje(`✓ Series de ${miClub.nombre} actualizadas.`);
  };

  // Inscribir jugador individual (Sin número de camiseta)
  const agregarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!miClub || !nombreJugador.trim()) return;

    setCargando(true);
    setMensaje("");
    setErrorMsg("");

    try {
      await addDoc(collection(db, "jugadores"), {
        nombre: nombreJugador.trim(),
        rut: rutJugador.trim() || "S/R",
        fechaNacimiento: fechaNacimiento || "",
        club: miClub.nombre,
        clubId: miClub.id,
        serie: serieJugador,
        goles: 0,
        sancionado: false,
        fechasPendientes: 0,
      });

      setNombreJugador("");
      setRutJugador("");
      setFechaNacimiento("");
      setMensaje(
        `✓ Jugador "${nombreJugador}" inscrito en serie ${serieJugador} de ${miClub.nombre}.`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al inscribir al jugador.");
    } finally {
      setCargando(false);
    }
  };

  // Plantilla CSV para Carga Masiva de Jugadores (Paso 2 Jerárquico)
  const descargarPlantillaJugadoresCSV = () => {
    const nombreClubRef = miClub?.nombre || "CD Los Halcones";
    const idClubRef = miClub?.id || "cd-los-halcones";
    const encabezados = "nombre,rut,fechaNacimiento,serie,clubId,clubNombre\n";
    const ejemplos = [
      `Matías Sepúlveda,18.456.789-0,1996-04-12,Honor,${idClubRef},${nombreClubRef}`,
      `Cristóbal Muñoz,19.234.567-8,1998-09-21,Primera,${idClubRef},${nombreClubRef}`,
      `Felipe Riquelme,17.888.999-1,1994-07-08,Segunda,${idClubRef},${nombreClubRef}`,
      `Jorge Contreras,12.345.678-9,1984-02-15,Super Senior 40,${idClubRef},${nombreClubRef}`,
      `Roberto Valdés,14.555.666-7,1988-10-20,Super Senior 35,${idClubRef},${nombreClubRef}`,
      `Valentina Soto,20.111.222-3,2001-11-03,Damas,${idClubRef},${nombreClubRef}`,
      `Lucas Riquelme,22.333.444-5,2007-06-19,Juvenil,${idClubRef},${nombreClubRef}`,
    ].join("\n");

    const blob = new Blob([encabezados + ejemplos], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nomina_${idClubRef}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Procesar CSV de Jugadores
  const procesarCargaMasivaJugadoresCSV = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !miClub) return;

    setCargando(true);
    setMensaje("");
    setErrorMsg("");

    try {
      const texto = await file.text();
      const lineas = texto
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lineas.length < 2) {
        setErrorMsg("El archivo CSV de jugadores está vacío.");
        setCargando(false);
        return;
      }

      let insertados = 0;
      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].split(",").map((c) => c.trim());
        const nombre = cols[0];
        if (!nombre) continue;

        const rut = cols[1] || "S/R";
        const nacimiento = cols[2] || "";
        const serieRaw = (cols[3] as SerieOficial) || "Honor";
        const serieValida: SerieOficial = SERIES_OFICIALES.includes(serieRaw)
          ? serieRaw
          : "Honor";

        const clubIdCsv = cols[4];
        const clubEncontrado = clubes.find((c) => c.id === clubIdCsv);
        const clubFinal = esAdmin && clubEncontrado ? clubEncontrado : miClub;

        const idDoc = `${clubFinal.id}-${serieValida
          .toLowerCase()
          .replace(/\s+/g, "")}-${
          rut.replace(/[^a-zA-Z0-9]/g, "") || Date.now() + i
        }`;

        await setDoc(
          doc(db, "jugadores", idDoc),
          {
            nombre,
            rut,
            fechaNacimiento: nacimiento,
            serie: serieValida,
            clubId: clubFinal.id,
            club: clubFinal.nombre,
            goles: 0,
            sancionado: false,
            fechasPendientes: 0,
          },
          { merge: true }
        );
        insertados++;
      }

      setMensaje(
        `⚡ Carga masiva exitosa: ${insertados} jugadores inscritos en el padrón oficial.`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al importar el CSV de jugadores.");
    } finally {
      setCargando(false);
      e.target.value = "";
    }
  };

  const eliminarJugador = async (id: string) => {
    await deleteDoc(doc(db, "jugadores", id));
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Barra Superior de Selección de Club (Para Admin) e Identidad */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {miClub?.escudoUrl ? (
            <img
              src={miClub.escudoUrl}
              alt={miClub.nombre}
              className="w-16 h-16 rounded-2xl object-contain bg-slate-950 border-2 p-1.5"
              style={{ borderColor: miClub.colorPrimario || "#2563eb" }}
            />
          ) : (
            <div
              style={{
                backgroundColor: miClub?.colorPrimario || "#2563eb",
                borderColor: miClub?.colorSecundario || "#ffffff",
              }}
              className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-black text-2xl text-white shadow-lg"
            >
              {miClub?.nombre?.substring(0, 2).toUpperCase() || "SF"}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                PORTAL OFICIAL DE CLUB • AUTOGESTIÓN Y NÓMINAS
              </span>
              {miClub?.bloqueadoDeportivo ? (
                <span className="bg-red-950 text-red-300 border border-red-500 text-xs font-black px-2.5 py-0.5 rounded uppercase">
                  🔒 Bloqueado en Tesorería ($
                  {miClub.saldoDeudor.toLocaleString("es-CL")})
                </span>
              ) : (
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-black px-2.5 py-0.5 rounded uppercase">
                  ✓ Club Habilitado
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {miClub?.nombre || "Seleccione un Club"}
            </h1>
            <p className="text-xs font-bold text-slate-400">
              📍 Localía Titular:{" "}
              <span className="text-emerald-400">{miClub?.canchaLocal}</span> •{" "}
              {misJugadores.length} jugadores inscritos en total
            </p>
          </div>
        </div>

        {/* Selector de Club para Admin */}
        {esAdmin && clubes.length > 0 && (
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-1">
              Modo Directiva: Administrar Club
            </label>
            <select
              value={clubActivoId}
              onChange={(e) => setClubActivoId(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-yellow-400 px-4 py-2.5 rounded-xl font-black text-sm"
            >
              {clubes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-sm font-black">
          {mensaje}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950 border-2 border-red-500 text-red-300 p-4 rounded-xl text-sm font-black">
          {errorMsg}
        </div>
      )}

      {/* Grilla: Información Institucional + Radar del Próximo Rival */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Estado del Club y Series Activas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-blue-400">
              Ficha Deportiva y Series Habilitadas del Club
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Toque una serie para activarla/desactivarla
            </span>
          </div>

          {/* KPIs del Club */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                PUNTOS
              </span>
              <span className="text-2xl font-black text-yellow-400">
                {miClub?.puntos ?? 0}
              </span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                DIF. GOLES
              </span>
              <span className="text-2xl font-black text-white">
                {(miClub?.goles_favor ?? 0) - (miClub?.goles_contra ?? 0)}
              </span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                PLANTILLA
              </span>
              <span className="text-2xl font-black text-emerald-400">
                {misJugadores.length}
              </span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                SUSPENDIDOS
              </span>
              <span className="text-2xl font-black text-red-400">
                {misJugadores.filter((j) => j.sancionado).length}
              </span>
            </div>
          </div>

          {/* Botones de Series del Club */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
              Series Activas ({miClub?.series?.length || 0} de 7)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SERIES_OFICIALES.map((serie) => {
                const activa = (miClub?.series || ["Honor"]).includes(serie);
                const cantJugadoresSerie = misJugadores.filter(
                  (j) => j.serie === serie
                ).length;
                return (
                  <button
                    key={serie}
                    type="button"
                    onClick={() => alternarSerieDelClub(serie)}
                    className={`p-2.5 rounded-xl text-left border-2 transition ${
                      activa
                        ? "bg-blue-600/20 border-blue-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase">
                        {serie}
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          activa
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {cantJugadoresSerie} jug.
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Radar del Próximo Rival (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 p-5 rounded-2xl border-2 border-yellow-400/60 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 block">
                INTELIGENCIA DEPORTIVA
              </span>
              <h2 className="text-base font-black text-white uppercase">
                Información de Próximo Rival
              </h2>
            </div>

            <select
              value={jornadaRival}
              onChange={(e) => setJornadaRival(Number(e.target.value))}
              className="bg-slate-950 text-yellow-400 border-2 border-slate-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase"
            >
              {[1, 2, 3, 4, 5].map((f) => (
                <option key={f} value={f}>
                  Fecha {f}
                </option>
              ))}
            </select>
          </div>

          {infoRival.rival ? (
            <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {infoRival.rival.escudoUrl ? (
                    <img
                      src={infoRival.rival.escudoUrl}
                      alt={infoRival.rival.nombre}
                      className="w-12 h-12 rounded-xl object-contain bg-slate-900 border-2 p-1"
                      style={{
                        borderColor: infoRival.rival.colorPrimario || "#ef4444",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        backgroundColor:
                          infoRival.rival.colorPrimario || "#ef4444",
                        borderColor:
                          infoRival.rival.colorSecundario || "#ffffff",
                      }}
                      className="w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-sm text-white"
                    >
                      {infoRival.rival.nombre.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      RIVAL EN FECHA {jornadaRival} ({infoRival.condicion})
                    </span>
                    <h3 className="text-lg font-black text-white">
                      {infoRival.rival.nombre}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-yellow-400 block">
                    {infoRival.rival.puntos} PTS
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    GF {infoRival.rival.goles_favor} / GC{" "}
                    {infoRival.rival.goles_contra}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">
                    Recinto del Duelo:
                  </span>
                  <span className="text-emerald-400 font-black">
                    📍 {infoRival.canchaPartido}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">
                    Estado Rival:
                  </span>
                  <span
                    className={
                      infoRival.rival.bloqueadoDeportivo
                        ? "text-red-400 font-black"
                        : "text-emerald-400 font-black"
                    }
                  >
                    {infoRival.rival.bloqueadoDeportivo
                      ? "🔒 Con Bloqueo Deportivo"
                      : "✓ Habilitado"}
                  </span>
                </div>
                {infoRival.compartenCancha && (
                  <div className="bg-amber-950/90 border border-amber-400 text-amber-300 p-2 rounded-lg text-[11px] font-black mt-2">
                    🏟 Ambos clubes comparten {miClub?.canchaLocal}: Duelo
                    directo en cancha única sin colisión.
                  </div>
                )}
              </div>

              {/* Series en común que disputarán la jornada */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                  Series del Rival ({infoRival.rival.series?.length || 1}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {(infoRival.rival.series || ["Honor"]).map((s) => {
                    const enComun = (miClub?.series || ["Honor"]).includes(s);
                    return (
                      <span
                        key={s}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                          enComun
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                            : "bg-slate-900 text-slate-500 border-slate-800"
                        }`}
                      >
                        {s} {enComun ? "✓" : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-6 rounded-xl border-2 border-dashed border-slate-800 text-center">
              <p className="text-sm font-black text-yellow-400">
                FECHA LIBRE EN JORNADA {jornadaRival}
              </p>
              <p className="text-xs font-bold text-slate-400 mt-1">
                A su club le corresponde descanso en esta fecha o faltan clubes
                por inscribir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bandeja de Informes Arbitrales y Sanciones de Fin de Jornada Recibidos por el Club */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/60 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
              NOTIFICACIÓN AUTOMÁTICA DE FIN DE JORNADA (PLANILLA → TESORERÍA → CLUB)
            </span>
            <h2 className="text-lg font-black text-white uppercase">
              Boletines Oficiales e Informes Recibidos por {miClub?.nombre} (
              {misBoletines.length})
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Sellados con Hash SHA-256 al cierre arbitral
          </span>
        </div>

        {misBoletines.length === 0 ? (
          <div className="bg-slate-950 p-6 rounded-xl border-2 border-dashed border-slate-800 text-center">
            <p className="text-xs font-bold text-slate-400">
              Aún no se han emitido boletines de cierre de jornada que involucren
              a {miClub?.nombre}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {misBoletines.map((bol) => (
              <div
                key={bol.id}
                className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 space-y-3 text-xs"
              >
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded font-black uppercase">
                      Fecha {bol.jornada} • Serie {bol.serie}
                    </span>
                    <span className="font-black text-yellow-400 text-sm">
                      {bol.resumenMarcador}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-slate-900 px-2.5 py-1 rounded border border-emerald-500/30">
                    SHA-256: {bol.selloHash?.substring(0, 20)}...
                  </span>
                </div>

                {bol.detalleGoles && bol.detalleGoles.length > 0 && (
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                    <span className="font-black text-blue-400 uppercase block mb-1">
                      ⚽ Goles Asociados en el Informe Arbitral:
                    </span>
                    <ul className="list-disc list-inside text-slate-200 font-bold space-y-0.5">
                      {bol.detalleGoles.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {bol.detalleSancionesYMultas &&
                  bol.detalleSancionesYMultas.length > 0 && (
                    <div className="bg-red-950/40 p-3 rounded-lg border border-red-500/40">
                      <span className="font-black text-red-400 uppercase block mb-1">
                        🟥 Sanciones Disciplinarias e Imputación en Tesorería:
                      </span>
                      <ul className="list-disc list-inside text-red-200 font-bold space-y-0.5">
                        {bol.detalleSancionesYMultas.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {bol.observacionArbitral && (
                  <p className="text-[11px] font-bold text-slate-400 italic">
                    Observación del Juez: &ldquo;{bol.observacionArbitral}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección de Administración de Jugadores (Individual y Masiva CSV, Sin Camiseta) */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-5">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b-2 border-slate-800 pb-4">
          <div>
            <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
              PADRÓN DE JUGADORES POR SERIE
            </span>
            <h2 className="text-xl font-black text-white mt-1">
              Inscripción Individual y Carga Masiva de Plantilla
            </h2>
            <p className="text-xs font-bold text-slate-400">
              Registro por Nombre, RUT y Serie (sin número de camiseta). Se
              vincula directo a Planilla, Goleadores y Tribunal.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={descargarPlantillaJugadoresCSV}
              className="bg-slate-950 hover:bg-slate-800 text-blue-400 font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border-2 border-blue-500/60 text-xs transition"
            >
              ⬇ Plantilla CSV Jugadores
            </button>
            <label className="cursor-pointer bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border-2 border-white text-xs shadow-lg transition">
              📂 Subir Nómina CSV
              <input
                type="file"
                accept=".csv"
                onChange={procesarCargaMasivaJugadoresCSV}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Formulario Rápido para Agregar Jugador */}
        <form
          onSubmit={agregarJugador}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end bg-slate-950 p-4 rounded-xl border-2 border-slate-800"
        >
          <div className="lg:col-span-4">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
              Nombre Completo del Jugador
            </label>
            <input
              type="text"
              placeholder="Ej: Matías Sepúlveda Rojas"
              value={nombreJugador}
              onChange={(e) => setNombreJugador(e.target.value)}
              className="w-full bg-slate-900 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-sm"
              required
            />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
              RUT / Identificación
            </label>
            <input
              type="text"
              placeholder="Ej: 18.456.789-0"
              value={rutJugador}
              onChange={(e) => setRutJugador(e.target.value)}
              className="w-full bg-slate-900 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-sm"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
              Fecha Nac.
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full bg-slate-900 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-sm"
            />
          </div>

          <div className="lg:col-span-3 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                Serie Asignada
              </label>
              <select
                value={serieJugador}
                onChange={(e) =>
                  setSerieJugador(e.target.value as SerieOficial)
                }
                className="w-full bg-slate-900 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-sm"
              >
                {(miClub?.series || SERIES_OFICIALES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="self-end bg-blue-600 hover:bg-blue-500 text-white font-black uppercase px-4 py-2.5 rounded-xl border-2 border-white text-xs h-[42px]"
            >
              + Inscribir
            </button>
          </div>
        </form>

        {/* Filtro por Serie y Tabla de Jugadores */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFiltroSerie("TODAS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border-2 ${
              filtroSerie === "TODAS"
                ? "bg-blue-600 text-white border-white"
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            Todas ({misJugadores.length})
          </button>
          {(miClub?.series || SERIES_OFICIALES).map((serie) => {
            const count = misJugadores.filter((j) => j.serie === serie).length;
            return (
              <button
                key={serie}
                type="button"
                onClick={() => setFiltroSerie(serie)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border-2 ${
                  filtroSerie === serie
                    ? "bg-blue-600 text-white border-white"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                {serie} ({count})
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-xl border-2 border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-3.5">Nombre del Jugador</th>
                <th className="p-3.5">RUT</th>
                <th className="p-3.5 text-center">Serie</th>
                <th className="p-3.5 text-center">Goles</th>
                <th className="p-3.5 text-center">Estado Tribunal</th>
                <th className="p-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {jugadoresFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-xs font-bold text-slate-500"
                  >
                    No hay jugadores registrados en esta serie para{" "}
                    {miClub?.nombre}.
                  </td>
                </tr>
              ) : (
                jugadoresFiltrados.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-black text-white">{j.nombre}</td>
                    <td className="p-3.5 font-mono text-xs font-bold text-slate-300">
                      {j.rut || "S/R"}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="bg-slate-950 text-blue-400 border border-blue-500/40 px-2.5 py-1 rounded text-xs font-black uppercase">
                        {j.serie}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-black text-yellow-400">
                      {j.goles}
                    </td>
                    <td className="p-3.5 text-center">
                      {j.sancionado ? (
                        <span className="bg-red-950 text-red-300 border border-red-500 px-2.5 py-0.5 rounded text-xs font-black uppercase">
                          🟥 Suspendido ({j.fechasPendientes || 1} f.)
                        </span>
                      ) : (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 px-2.5 py-0.5 rounded text-xs font-black uppercase">
                          ✓ Habilitado
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => eliminarJugador(j.id)}
                        className="text-xs font-black text-red-400 hover:text-red-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800"
                      >
                        Dar de Baja
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}