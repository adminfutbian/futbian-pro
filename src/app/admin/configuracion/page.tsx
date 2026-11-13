// src/app/admin/configuracion/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  Auspiciador,
  Club,
  Jugador,
  SERIES_OFICIALES,
  SerieOficial,
  TARIFARIO_POR_DEFECTO,
  TarifarioOficial,
} from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

const CANCHAS_BASE = [
  "Estadio Paso Ancho",
  "Estadio Municipal",
  "Cancha Rural La Punilla",
  "Recinto Las Guardias",
  "Cancha El Caracol",
];

export default function ConfiguracionPage() {
  const [tabActiva, setTabActiva] = useState<
    "CLUBES" | "JUGADORES" | "VALORES_SANCIONES" | "AUSPICIADORES_SISTEMA"
  >("CLUBES");

  const [clubes, setClubes] = useState<Club[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [tarifario, setTarifario] = useState<TarifarioOficial>(
    TARIFARIO_POR_DEFECTO
  );
  const [logoAsociacion, setLogoAsociacion] = useState("");
  const [nombreAsociacion, setNombreAsociacion] = useState(
    "Asociación de Fútbol San Fabián"
  );
  const [auspiciadores, setAuspiciadores] = useState<Auspiciador[]>([]);

  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // --- ESTADOS CRUD CLUB ---
  const [clubEditandoId, setClubEditandoId] = useState<string | null>(null);
  const [nombreClub, setNombreClub] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#2563eb");
  const [colorSecundario, setColorSecundario] = useState("#facc15");
  const [seriesClub, setSeriesClub] = useState<SerieOficial[]>([
    "Segunda",
    "Primera",
    "Honor",
  ]);
  const [escudoUrl, setEscudoUrl] = useState("");
  const [canchaLocal, setCanchaLocal] = useState(CANCHAS_BASE[0]);
  const [prioridadCancha, setPrioridadCancha] = useState(false);

  // --- ESTADOS CRUD JUGADOR ---
  const [jugadorEditandoId, setJugadorEditandoId] = useState<string | null>(
    null
  );
  const [nombreJug, setNombreJug] = useState("");
  const [rutJug, setRutJug] = useState("");
  const [clubJugId, setClubJugId] = useState("");
  const [serieJug, setSerieJug] = useState<SerieOficial>("Honor");
  const [filtroClubJug, setFiltroClubJug] = useState("TODOS");

  // --- ESTADOS CRUD AUSPICIADORES ---
  const [ausEditandoId, setAusEditandoId] = useState<string | null>(null);
  const [nombreAus, setNombreAus] = useState("");
  const [webAus, setWebAus] = useState("");
  const [logoAus, setLogoAus] = useState("");

  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        colorSecundario: d.data().colorSecundario || "#facc15",
        series: d.data().series || ["Honor"],
        escudoUrl: d.data().escudoUrl || "",
        canchaLocal: d.data().canchaLocal || CANCHAS_BASE[0],
        prioridadCancha: d.data().prioridadCancha || false,
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      setClubes(lista);
      if (lista.length > 0 && !clubJugId) setClubJugId(lista[0].id);
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
        fechasPendientes: d.data().fechasPendientes || 0,
      }));
      setJugadores(lista);
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

    const unsubIdentidad = onSnapshot(
      doc(db, "configuracion", "identidad_asociacion"),
      (snap) => {
        if (snap.exists()) {
          setNombreAsociacion(
            snap.data().nombreAsociacion || "Asociación de Fútbol San Fabián"
          );
          setLogoAsociacion(snap.data().logoAsociacionUrl || "");
          setAuspiciadores(snap.data().auspiciadores || []);
        }
      }
    );

    return () => {
      unsubClubes();
      unsubJug();
      unsubTarifas();
      unsubIdentidad();
    };
  }, [clubJugId]);

  const comprimirImagen = (
    file: File,
    callback: (dataUrl: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 160;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ================= 1. FUNCIONES CRUD CLUBES =================
  const guardarClubCRUD = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setErrorMsg("");

    const idFinal =
      clubEditandoId ||
      nombreClub
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-");

    await setDoc(
      doc(db, "equipos", idFinal),
      {
        id: idFinal,
        nombre: nombreClub.trim(),
        colorPrimario,
        colorSecundario,
        series: seriesClub,
        escudoUrl,
        canchaLocal,
        prioridadCancha,
      },
      { merge: true }
    );

    await registrarAccionAuditoria(
      "CONFIGURACION_CLUBES",
      clubEditandoId ? "EDITAR_CLUB" : "CREAR_CLUB",
      `Club "${nombreClub}" (${idFinal}) guardado con cancha ${canchaLocal}`
    );

    setMensaje(
      clubEditandoId
        ? `✓ Club "${nombreClub}" actualizado correctamente.`
        : `✓ Club "${nombreClub}" creado desde cero.`
    );
    limpiarFormularioClub();
  };

  const cargarClubParaEditar = (c: Club) => {
    setClubEditandoId(c.id);
    setNombreClub(c.nombre);
    setColorPrimario(c.colorPrimario || "#2563eb");
    setColorSecundario(c.colorSecundario || "#facc15");
    setSeriesClub(c.series || ["Honor"]);
    setEscudoUrl(c.escudoUrl || "");
    setCanchaLocal(c.canchaLocal || CANCHAS_BASE[0]);
    setPrioridadCancha(!!c.prioridadCancha);
  };

  const limpiarFormularioClub = () => {
    setClubEditandoId(null);
    setNombreClub("");
    setEscudoUrl("");
    setPrioridadCancha(false);
  };

  const eliminarClubCRUD = async (c: Club) => {
    await deleteDoc(doc(db, "equipos", c.id));
    await registrarAccionAuditoria(
      "CONFIGURACION_CLUBES",
      "ELIMINAR_CLUB",
      `Club eliminado: ${c.nombre}`
    );
    setMensaje(`Club "${c.nombre}" eliminado del sistema.`);
  };

  // ================= 2. FUNCIONES CRUD JUGADORES =================
  const guardarJugadorCRUD = async (e: React.FormEvent) => {
    e.preventDefault();
    const clubObj = clubes.find((c) => c.id === clubJugId);
    if (!clubObj || !nombreJug.trim()) return;

    if (jugadorEditandoId) {
      await updateDoc(doc(db, "jugadores", jugadorEditandoId), {
        nombre: nombreJug.trim(),
        rut: rutJug.trim() || "S/R",
        clubId: clubObj.id,
        club: clubObj.nombre,
        serie: serieJug,
      });
      await registrarAccionAuditoria(
        "CONFIGURACION_JUGADORES",
        "EDITAR_JUGADOR",
        `Jugador editado: ${nombreJug} (${clubObj.nombre} - ${serieJug})`
      );
      setMensaje(`✓ Jugador "${nombreJug}" actualizado.`);
    } else {
      await addDoc(collection(db, "jugadores"), {
        nombre: nombreJug.trim(),
        rut: rutJug.trim() || "S/R",
        clubId: clubObj.id,
        club: clubObj.nombre,
        serie: serieJug,
        goles: 0,
        sancionado: false,
        fechasPendientes: 0,
      });
      await registrarAccionAuditoria(
        "CONFIGURACION_JUGADORES",
        "CREAR_JUGADOR",
        `Jugador creado: ${nombreJug} (${clubObj.nombre} - ${serieJug})`
      );
      setMensaje(`✓ Jugador "${nombreJug}" inscrito.`);
    }

    setJugadorEditandoId(null);
    setNombreJug("");
    setRutJug("");
  };

  const cargarJugadorParaEditar = (j: Jugador) => {
    setJugadorEditandoId(j.id);
    setNombreJug(j.nombre);
    setRutJug(j.rut || "");
    setClubJugId(j.clubId);
    setSerieJug(j.serie);
  };

  // ================= 3. FUNCIONES CRUD VALORES SANCIONES Y CUOTAS =================
  const guardarTarifarioOficial = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "configuracion", "aranceles_oficiales"), tarifario, {
      merge: true,
    });
    await registrarAccionAuditoria(
      "CONFIGURACION_TARIFARIO",
      "ACTUALIZAR_VALORES_SANCIONES",
      `Tarifario de multas, rojas y cuotas actualizado en Firestore.`
    );
    setMensaje(
      "✓ Valores oficiales de Sanciones, Tarjetas, Cuotas y Boletos actualizados en toda la app."
    );
  };

  // ================= 4. FUNCIONES CRUD AUSPICIADORES Y REINICIO =================
  const guardarAuspiciadorCRUD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreAus.trim()) return;

    let nuevaLista: Auspiciador[];
    if (ausEditandoId) {
      nuevaLista = auspiciadores.map((a) =>
        a.id === ausEditandoId
          ? {
              ...a,
              nombre: nombreAus.trim(),
              sitioWeb: webAus.trim(),
              logoUrl: logoAus || a.logoUrl,
            }
          : a
      );
    } else {
      nuevaLista = [
        ...auspiciadores,
        {
          id: Date.now().toString(),
          nombre: nombreAus.trim(),
          sitioWeb: webAus.trim(),
          logoUrl: logoAus,
        },
      ];
    }

    await setDoc(
      doc(db, "configuracion", "identidad_asociacion"),
      {
        nombreAsociacion,
        logoAsociacionUrl: logoAsociacion,
        auspiciadores: nuevaLista,
      },
      { merge: true }
    );

    await registrarAccionAuditoria(
      "CONFIGURACION_AUSPICIADORES",
      ausEditandoId ? "EDITAR_AUSPICIADOR" : "CREAR_AUSPICIADOR",
      `Auspiciador gestionado: ${nombreAus}`
    );

    setAusEditandoId(null);
    setNombreAus("");
    setWebAus("");
    setLogoAus("");
    setMensaje("✓ Padrón de Auspiciadores e Identidad actualizado.");
  };

  const eliminarAuspiciadorCRUD = async (id: string) => {
    const nuevaLista = auspiciadores.filter((a) => a.id !== id);
    await setDoc(
      doc(db, "configuracion", "identidad_asociacion"),
      { auspiciadores: nuevaLista },
      { merge: true }
    );
    setMensaje("Auspiciador eliminado.");
  };

  const reiniciarEstadisticasTemporadaCero = async () => {
    for (const c of clubes) {
      await updateDoc(doc(db, "equipos", c.id), {
        puntos: 0,
        goles_favor: 0,
        goles_contra: 0,
        estadisticasPorSerie: {},
      });
    }
    for (const j of jugadores) {
      await updateDoc(doc(db, "jugadores", j.id), {
        goles: 0,
        sancionado: false,
        fechasPendientes: 0,
      });
    }
    await registrarAccionAuditoria(
      "CONFIGURACION_SISTEMA",
      "REINICIO_TEMPORADA_DESDE_CERO",
      "Se reiniciaron puntos y goles de todos los clubes y jugadores a 0 para nueva temporada."
    );
    setMensaje(
      "✓ Temporada reiniciada a 0: Clubes y jugadores conservan sus fichas, con puntos y goles en 0."
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera y Pestañas del Centro de Control */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
        <div>
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
            PANEL MAESTRO ADMIN ASOCIACIÓN & ADMIN GENERAL
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Configuración Integral desde Cero (CRUD Completo)
          </h1>
          <p className="text-xs font-bold text-slate-400">
            Administre clubes, nóminas de jugadores, valores de sanciones/cuotas, auspiciadores e identidad de la liga.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-slate-800">
          {[
            { id: "CLUBES", label: `1. CRUD Clubes (${clubes.length})` },
            { id: "JUGADORES", label: `2. CRUD Jugadores (${jugadores.length})` },
            {
              id: "VALORES_SANCIONES",
              label: "3. Valores Sanciones, Tarjetas y Cuotas",
            },
            {
              id: "AUSPICIADORES_SISTEMA",
              label: `4. Auspiciadores (${auspiciadores.length}) y Sistema`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTabActiva(t.id as any);
                setMensaje("");
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase border-2 transition ${
                tabActiva === t.id
                  ? "bg-yellow-400 text-black border-white shadow"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-xs sm:text-sm font-black">
          {mensaje}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950 border-2 border-red-500 text-red-300 p-4 rounded-xl text-xs sm:text-sm font-black">
          {errorMsg}
        </div>
      )}

      {/* ================= PESTAÑA 1: CRUD CLUBES ================= */}
      {tabActiva === "CLUBES" && (
        <div className="space-y-6">
          <form
            onSubmit={guardarClubCRUD}
            className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-5"
          >
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
              <h2 className="text-base font-black text-yellow-400 uppercase">
                {clubEditandoId
                  ? `Editando Club: ${nombreClub}`
                  : "Crear Nuevo Club Federado"}
              </h2>
              {clubEditandoId && (
                <button
                  type="button"
                  onClick={limpiarFormularioClub}
                  className="text-xs font-black text-slate-300 bg-slate-950 px-3 py-1 rounded border border-slate-700"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4">
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Nombre del Club
                </label>
                <input
                  type="text"
                  placeholder="Ej: Paso Ancho FC"
                  value={nombreClub}
                  onChange={(e) => setNombreClub(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Color 1
                </label>
                <input
                  type="color"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-950 border-2 border-slate-700 p-1 cursor-pointer"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Color 2
                </label>
                <input
                  type="color"
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-950 border-2 border-slate-700 p-1 cursor-pointer"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Escudo del Club
                </label>
                <div className="flex items-center gap-3">
                  {escudoUrl && (
                    <img
                      src={escudoUrl}
                      alt="Escudo"
                      className="w-11 h-11 rounded-xl object-contain bg-slate-950 border border-white p-1"
                    />
                  )}
                  <label className="flex-1 cursor-pointer bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase py-3 px-3 rounded-xl border-2 border-slate-700 text-center">
                    Subir Imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) comprimirImagen(f, setEscudoUrl);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Cancha / Estadio Local (1 Cancha por Estadio)
                </label>
                <select
                  value={canchaLocal}
                  onChange={(e) => setCanchaLocal(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
                >
                  {CANCHAS_BASE.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-3 cursor-pointer bg-slate-950 p-3 rounded-xl border-2 border-amber-400/50">
                  <input
                    type="checkbox"
                    checked={prioridadCancha}
                    onChange={(e) => setPrioridadCancha(e.target.checked)}
                    className="w-5 h-5 accent-yellow-400"
                  />
                  <span className="text-xs font-black uppercase text-amber-300">
                    ★ Tiene Prioridad Exclusiva sobre su Estadio (Ej: Paso Ancho)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-2">
                Series Activas del Club
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {SERIES_OFICIALES.map((s) => {
                  const act = seriesClub.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSeriesClub(
                          act
                            ? seriesClub.filter((x) => x !== s)
                            : [...seriesClub, s]
                        )
                      }
                      className={`p-2.5 rounded-xl text-xs font-black uppercase border-2 ${
                        act
                          ? "bg-blue-600 text-white border-white"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}
                    >
                      {act ? "✓ " : ""}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-3.5 rounded-xl border-2 border-white text-xs shadow-lg"
            >
              {clubEditandoId
                ? "💾 Guardar Cambios en el Club"
                : "+ Crear Club en Padrón Oficial"}
            </button>
          </form>

          {/* Listado de Clubes con Editar y Eliminar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clubes.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 p-4 rounded-2xl border-2 border-slate-800 flex justify-between items-center gap-3"
              >
                <div className="flex items-center gap-3">
                  {c.escudoUrl ? (
                    <img
                      src={c.escudoUrl}
                      alt={c.nombre}
                      className="w-12 h-12 rounded-xl object-contain bg-slate-950 p-1 border border-slate-700"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: c.colorPrimario }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white border border-white"
                    >
                      {c.nombre.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-white text-sm">
                      {c.nombre}{" "}
                      {c.prioridadCancha && (
                        <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded ml-1">
                          ★ Prioridad Cancha
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-bold text-emerald-400">
                      📍 {c.canchaLocal} • {(c.series || []).length} series
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cargarClubParaEditar(c)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarClubCRUD(c)}
                    className="bg-slate-950 hover:bg-red-950 text-red-400 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-black uppercase"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= PESTAÑA 2: CRUD GLOBAL DE JUGADORES ================= */}
      {tabActiva === "JUGADORES" && (
        <div className="space-y-6">
          <form
            onSubmit={guardarJugadorCRUD}
            className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black text-yellow-400 uppercase">
                {jugadorEditandoId
                  ? `Editando Jugador: ${nombreJug}`
                  : "Inscribir Jugador en Cualquier Club y Serie"}
              </h2>
              {jugadorEditandoId && (
                <button
                  type="button"
                  onClick={() => {
                    setJugadorEditandoId(null);
                    setNombreJug("");
                    setRutJug("");
                  }}
                  className="text-xs font-black text-slate-300 bg-slate-950 px-3 py-1 rounded border border-slate-700"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Nombre Jugador(a)
                </label>
                <input
                  type="text"
                  value={nombreJug}
                  onChange={(e) => setNombreJug(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  RUT / DNI
                </label>
                <input
                  type="text"
                  value={rutJug}
                  onChange={(e) => setRutJug(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Club Federado
                </label>
                <select
                  value={clubJugId}
                  onChange={(e) => setClubJugId(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-black"
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
                  Serie
                </label>
                <select
                  value={serieJug}
                  onChange={(e) => setSerieJug(e.target.value as SerieOficial)}
                  className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl text-xs font-black"
                >
                  {SERIES_OFICIALES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-2.5 px-4 rounded-xl border-2 border-white text-xs h-[40px]"
              >
                {jugadorEditandoId ? "💾 Actualizar" : "+ Inscribir"}
              </button>
            </div>
          </form>

          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <span className="text-xs font-black uppercase text-slate-300">
                Filtrar Padrón por Club:
              </span>
              <select
                value={filtroClubJug}
                onChange={(e) => setFiltroClubJug(e.target.value)}
                className="bg-slate-950 text-white border-2 border-slate-700 px-3 py-1.5 rounded-xl text-xs font-black"
              >
                <option value="TODOS">Todos los Clubes ({jugadores.length})</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b-2 border-slate-800 text-slate-400 uppercase font-black">
                    <th className="p-3">Jugador</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Club</th>
                    <th className="p-3 text-center">Serie</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Acciones CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {jugadores
                    .filter(
                      (j) =>
                        filtroClubJug === "TODOS" || j.clubId === filtroClubJug
                    )
                    .map((j) => (
                      <tr key={j.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-black text-white">{j.nombre}</td>
                        <td className="p-3 font-mono text-slate-300">
                          {j.rut || "S/R"}
                        </td>
                        <td className="p-3 font-bold text-slate-300">{j.club}</td>
                        <td className="p-3 text-center">
                          <span className="bg-slate-950 text-blue-400 px-2 py-0.5 rounded font-black">
                            {j.serie}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateDoc(doc(db, "jugadores", j.id), {
                                sancionado: !j.sancionado,
                              })
                            }
                            className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                              j.sancionado
                                ? "bg-red-950 text-red-300 border border-red-500"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-500"
                            }`}
                          >
                            {j.sancionado ? "🟥 Suspendido" : "✓ Habilitado"}
                          </button>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => cargarJugadorParaEditar(j)}
                            className="bg-blue-600 text-white px-2.5 py-1 rounded font-black uppercase"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDoc(doc(db, "jugadores", j.id))}
                            className="bg-slate-950 text-red-400 border border-slate-700 px-2.5 py-1 rounded font-black uppercase"
                          >
                            Borrar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= PESTAÑA 3: CRUD VALORES SANCIONES Y CUOTAS ================= */}
      {tabActiva === "VALORES_SANCIONES" && (
        <form
          onSubmit={guardarTarifarioOficial}
          className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-6"
        >
          <div className="border-b-2 border-slate-800 pb-3">
            <h2 className="text-lg font-black text-yellow-400 uppercase">
              Configuración de Valores de Sanciones, Tarjetas, Cuotas y Boletos
            </h2>
            <p className="text-xs font-bold text-slate-400">
              Cualquier cambio aquí actualiza inmediatamente los cobros automáticos de la Planilla Arbitral y del Módulo de Finanzas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-yellow-400 mb-1">
                Tarjeta Amarilla (CLP $)
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
                className="w-full bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-red-400 mb-1">
                Roja por Doble Amarilla (CLP $ / Fechas)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step={1000}
                  value={tarifario.multaDobleAmarilla}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      multaDobleAmarilla: Number(e.target.value),
                    })
                  }
                  className="flex-1 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
                />
                <input
                  type="number"
                  min={1}
                  value={tarifario.fechasDobleAmarilla}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      fechasDobleAmarilla: Number(e.target.value),
                    })
                  }
                  className="w-20 bg-slate-900 text-yellow-400 border border-slate-700 p-2.5 rounded-lg font-black text-center"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-red-400 mb-1">
                Roja Juego Brusco (CLP $ / Fechas)
              </label>
              <div className="flex gap-2">
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
                  className="flex-1 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
                />
                <input
                  type="number"
                  min={1}
                  value={tarifario.fechasRojaJuegoBrusco}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      fechasRojaJuegoBrusco: Number(e.target.value),
                    })
                  }
                  className="w-20 bg-slate-900 text-yellow-400 border border-slate-700 p-2.5 rounded-lg font-black text-center"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-red-400 mb-1">
                Roja Agresión Verbal (CLP $ / Fechas)
              </label>
              <div className="flex gap-2">
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
                  className="flex-1 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
                />
                <input
                  type="number"
                  min={1}
                  value={tarifario.fechasAgresionVerbal}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      fechasAgresionVerbal: Number(e.target.value),
                    })
                  }
                  className="w-20 bg-slate-900 text-yellow-400 border border-slate-700 p-2.5 rounded-lg font-black text-center"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-red-400 mb-1">
                Roja Agresión Física (CLP $ / Fechas)
              </label>
              <div className="flex gap-2">
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
                  className="flex-1 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
                />
                <input
                  type="number"
                  min={1}
                  value={tarifario.fechasAgresionFisica}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      fechasAgresionFisica: Number(e.target.value),
                    })
                  }
                  className="w-20 bg-slate-900 text-yellow-400 border border-slate-700 p-2.5 rounded-lg font-black text-center"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-emerald-400 mb-1">
                Cuota Inscripción 1 y 2 (CLP $)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step={1000}
                  value={tarifario.cuotaInscripcion1}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      cuotaInscripcion1: Number(e.target.value),
                    })
                  }
                  className="w-1/2 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
                />
                <input
                  type="number"
                  step={1000}
                  value={tarifario.cuotaInscripcion2}
                  onChange={(e) =>
                    setTarifario({
                      ...tarifario,
                      cuotaInscripcion2: Number(e.target.value),
                    })
                  }
                  className="w-1/2 bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-blue-400 mb-1">
                Multa Inasistencia Reunión (CLP $)
              </label>
              <input
                type="number"
                step={1000}
                value={tarifario.multaInasistenciaReunion}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    multaInasistenciaReunion: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-blue-400 mb-1">
                Multa No Presentar Serie (CLP $)
              </label>
              <input
                type="number"
                step={1000}
                value={tarifario.multaNoPresentacionSerie}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    multaNoPresentacionSerie: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-black uppercase text-yellow-400 mb-1">
                Valor Boleto Transmisión En Vivo ($)
              </label>
              <input
                type="number"
                step={500}
                value={tarifario.precioBoletoStreaming}
                onChange={(e) =>
                  setTarifario({
                    ...tarifario,
                    precioBoletoStreaming: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg font-black"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase py-4 rounded-xl border-2 border-white shadow-lg text-sm"
          >
            💾 Guardar Tarifario Oficial de Sanciones y Aranceles
          </button>
        </form>
      )}

      {/* ================= PESTAÑA 4: CRUD AUSPICIADORES Y SISTEMA ================= */}
      {tabActiva === "AUSPICIADORES_SISTEMA" && (
        <div className="space-y-6">
          {/* Identidad Asociación */}
          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              {logoAsociacion ? (
                <img
                  src={logoAsociacion}
                  alt="Logo Asociación"
                  className="w-16 h-16 rounded-xl object-contain bg-slate-950 p-1.5 border border-blue-500"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl">
                  ASF
                </div>
              )}
              <div>
                <h3 className="text-lg font-black text-white">
                  Logo e Identidad de la Asociación
                </h3>
                <p className="text-xs font-bold text-slate-400">
                  Se muestra en la portada principal de Futbian.pro
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-black uppercase px-4 py-2.5 rounded-xl border border-white text-xs">
                Subir / Cambiar Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      comprimirImagen(f, async (dataUrl) => {
                        setLogoAsociacion(dataUrl);
                        await setDoc(
                          doc(db, "configuracion", "identidad_asociacion"),
                          { logoAsociacionUrl: dataUrl },
                          { merge: true }
                        );
                      });
                    }
                  }}
                  className="hidden"
                />
              </label>
              {logoAsociacion && (
                <button
                  type="button"
                  onClick={async () => {
                    setLogoAsociacion("");
                    await setDoc(
                      doc(db, "configuracion", "identidad_asociacion"),
                      { logoAsociacionUrl: "" },
                      { merge: true }
                    );
                  }}
                  className="bg-slate-950 text-red-400 border border-slate-700 px-3 py-2.5 rounded-xl text-xs font-black uppercase"
                >
                  Quitar Logo
                </button>
              )}
            </div>
          </div>

          {/* CRUD Auspiciadores */}
          <form
            onSubmit={guardarAuspiciadorCRUD}
            className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-4"
          >
            <h3 className="text-base font-black text-yellow-400 uppercase">
              {ausEditandoId
                ? `Editando Auspiciador: ${nombreAus}`
                : "Agregar Nuevo Auspiciador Oficial"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Nombre Empresa / Marca
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ferretería San Fabián"
                  value={nombreAus}
                  onChange={(e) => setNombreAus(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Sitio Web / Red Social
                </label>
                <input
                  type="text"
                  placeholder="Opcional: @marca"
                  value={webAus}
                  onChange={(e) => setWebAus(e.target.value)}
                  className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Logo del Auspiciador
                </label>
                <label className="block cursor-pointer bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl text-xs font-black uppercase text-center">
                  {logoAus ? "✓ Imagen Lista" : "Seleccionar Imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) comprimirImagen(f, setLogoAus);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-2.5 px-4 rounded-xl border-2 border-white text-xs h-[42px]"
              >
                {ausEditandoId ? "💾 Actualizar" : "+ Agregar Auspiciador"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
              {auspiciadores.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-950 p-3.5 rounded-xl border-2 border-slate-800 flex justify-between items-center gap-3"
                >
                  <div className="flex items-center gap-3">
                    {a.logoUrl && (
                      <img
                        src={a.logoUrl}
                        alt={a.nombre}
                        className="w-12 h-12 object-contain bg-slate-900 rounded-lg p-1"
                      />
                    )}
                    <div>
                      <p className="font-black text-white text-xs">{a.nombre}</p>
                      <p className="text-[10px] text-slate-400">{a.sitioWeb}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAusEditandoId(a.id);
                        setNombreAus(a.nombre);
                        setWebAus(a.sitioWeb || "");
                        setLogoAus(a.logoUrl);
                      }}
                      className="bg-blue-600 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarAuspiciadorCRUD(a.id)}
                      className="bg-slate-900 text-red-400 border border-slate-700 px-2.5 py-1 rounded text-[10px] font-black uppercase"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </form>

          {/* Recomendación: Reinicio de Temporada desde 0 */}
          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-red-500/50 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-xs font-black uppercase text-red-400 block">
                HERRAMIENTA DE INICIO DE TEMPORADA
              </span>
              <h3 className="text-base font-black text-white">
                Reiniciar Puntos y Goles del Campeonato a Cero
              </h3>
              <p className="text-xs font-bold text-slate-400">
                Conserva todos los clubes, escudos y jugadores, pero deja en 0 puntos, goles y suspensiones para arrancar un torneo desde 0.
              </p>
            </div>
            <button
              type="button"
              onClick={reiniciarEstadisticasTemporadaCero}
              className="bg-red-600 hover:bg-red-500 text-white font-black uppercase px-5 py-3 rounded-xl border-2 border-white text-xs shadow-lg"
            >
              🔄 Reiniciar Estadísticas a 0
            </button>
          </div>
        </div>
      )}
    </div>
  );
}