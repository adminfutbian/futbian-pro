// src/app/admin/configuracion/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { Club, SERIES_OFICIALES, SerieOficial } from "@/types";

const CANCHAS_BASE = [
  "Estadio Municipal Cancha 1",
  "Estadio Municipal Cancha 2",
  "Cancha Rural La Punilla",
  "Recinto Las Guardias",
  "Cancha El Caracol",
];

export default function ConfiguracionPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Estado Formulario Paso 1: Crear Club
  const [nombre, setNombre] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#2563eb");
  const [colorSecundario, setColorSecundario] = useState("#facc15");
  const [seriesSeleccionadas, setSeriesSeleccionadas] = useState<SerieOficial[]>([
    "Segunda",
    "Primera",
    "Honor",
  ]);
  const [escudoUrl, setEscudoUrl] = useState("");
  const [canchaLocal, setCanchaLocal] = useState(CANCHAS_BASE[0]);
  const [otraCancha, setOtraCancha] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [otraRed, setOtraRed] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        colorSecundario: d.data().colorSecundario || "#ffffff",
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
    });
    return () => unsub();
  }, []);

  const generarSlug = (texto: string) =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const toggleSerie = (serie: SerieOficial) => {
    if (seriesSeleccionadas.includes(serie)) {
      setSeriesSeleccionadas(seriesSeleccionadas.filter((s) => s !== serie));
    } else {
      setSeriesSeleccionadas([...seriesSeleccionadas, serie]);
    }
  };

  // Compresión de imagen del escudo en cliente (150x150 WebP/PNG Base64)
  const manejarSubidaEscudo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 150;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        setEscudoUrl(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const guardarClubIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setErrorMsg("");

    if (!nombre.trim()) {
      setErrorMsg("Debe ingresar el nombre del club.");
      return;
    }
    if (seriesSeleccionadas.length === 0) {
      setErrorMsg("Seleccione al menos una serie activa para el club.");
      return;
    }

    setCargando(true);
    try {
      const id = generarSlug(nombre);
      const recintoFinal =
        canchaLocal === "OTRA" ? otraCancha.trim() || CANCHAS_BASE[0] : canchaLocal;

      const nuevoClub: Club = {
        id,
        nombre: nombre.trim(),
        colorPrimario,
        colorSecundario,
        series: seriesSeleccionadas,
        escudoUrl,
        canchaLocal: recintoFinal,
        redesSociales: {
          facebook: facebook.trim(),
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          otra: otraRed.trim(),
        },
        puntos: 0,
        goles_favor: 0,
        goles_contra: 0,
        saldoDeudor: 0,
        bloqueadoDeportivo: false,
      };

      await setDoc(doc(db, "equipos", id), nuevoClub, { merge: true });
      setMensaje(`✓ Club "${nombre}" registrado correctamente en Firestore.`);
      setNombre("");
      setEscudoUrl("");
      setFacebook("");
      setInstagram("");
      setYoutube("");
      setOtraRed("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al guardar el club en Firestore.");
    } finally {
      setCargando(false);
    }
  };

  // Descargar plantilla CSV de ejemplo para carga masiva de clubes
  const descargarPlantillaCSV = () => {
    const encabezados =
      "nombre,colorPrimario,colorSecundario,series,canchaLocal,instagram,facebook,youtube\n";
    const filasEjemplo = [
      "CD Los Halcones,#1d4ed8,#facc15,Segunda|Primera|Super Senior 35|Honor,Estadio Municipal Cancha 1,@halconessanfabian,fb.com/halcones,",
      "Estrella Precordillerana,#dc2626,#ffffff,Segunda|Primera|Damas|Honor,Estadio Municipal Cancha 1,@estrellaprecordillera,,",
      "Unión San Fabián,#059669,#ffffff,Segunda|Primera|Super Senior 40|Honor|Juvenil,Cancha Rural La Punilla,@unionsanfabian,,",
      "Deportivo Ñuble,#7c3aed,#facc15,Primera|Honor|Damas,Cancha Rural La Punilla,@deportivonuble,,",
      "Cóndores del Valle,#ea580c,#000000,Segunda|Primera|Honor,Recinto Las Guardias,@condoresdelvalle,,",
      "Juventud Alico,#0284c7,#ffffff,Segunda|Primera|Super Senior 35|Honor,Recinto Las Guardias,@juventudalico,,",
    ].join("\n");

    const blob = new Blob([encabezados + filasEjemplo], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "plantilla_clubes_futbian.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Procesar archivo CSV para carga masiva
  const procesarCargaMasivaCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setErrorMsg("El archivo CSV no contiene registros válidos.");
        setCargando(false);
        return;
      }

      let contador = 0;
      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].split(",").map((c) => c.trim());
        const nombreClub = cols[0];
        if (!nombreClub) continue;

        const id = generarSlug(nombreClub);
        const cPrimario = cols[1] || "#2563eb";
        const cSecundario = cols[2] || "#ffffff";
        const seriesRaw = cols[3] ? cols[3].split("|").map((s) => s.trim()) : ["Honor"];
        const seriesValidas = seriesRaw.filter((s) =>
          SERIES_OFICIALES.includes(s as SerieOficial)
        ) as SerieOficial[];

        const cancha = cols[4] || CANCHAS_BASE[0];
        const ig = cols[5] || "";
        const fb = cols[6] || "";
        const yt = cols[7] || "";

        const clubDoc: Club = {
          id,
          nombre: nombreClub,
          colorPrimario: cPrimario,
          colorSecundario: cSecundario,
          series: seriesValidas.length > 0 ? seriesValidas : ["Honor"],
          canchaLocal: cancha,
          redesSociales: {
            instagram: ig,
            facebook: fb,
            youtube: yt,
          },
          puntos: 0,
          goles_favor: 0,
          goles_contra: 0,
          saldoDeudor: 0,
          bloqueadoDeportivo: false,
        };

        await setDoc(doc(db, "equipos", id), clubDoc, { merge: true });
        contador++;
      }

      setMensaje(
        `⚡ Carga masiva completada: ${contador} clubes creados/actualizados con sus series y canchas.`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al procesar el archivo CSV. Verifique el formato.");
    } finally {
      setCargando(false);
      e.target.value = "";
    }
  };

  const eliminarClub = async (id: string) => {
    await deleteDoc(doc(db, "equipos", id));
  };

  // Detectar qué canchas están compartidas entre más de un club
  const conteoCanchas = clubes.reduce<Record<string, number>>((acc, c) => {
    const cancha = c.canchaLocal || "Sin Cancha";
    acc[cancha] = (acc[cancha] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            PASO 1 DE CARGA JERÁRQUICA • GESTIÓN DE CLUBES
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Registro Oficial y Carga Masiva de Clubes
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Configuración de identidad cromática, series habilitadas, escudos y recintos compartidos
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={descargarPlantillaCSV}
            className="bg-slate-950 hover:bg-slate-800 text-blue-400 font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border-2 border-blue-500/60 text-xs transition"
          >
            ⬇ Plantilla CSV Clubes
          </button>

          <label className="cursor-pointer bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border-2 border-white text-xs shadow-lg transition">
            📂 Subir CSV Masivo
            <input
              type="file"
              accept=".csv"
              onChange={procesarCargaMasivaCSV}
              className="hidden"
            />
          </label>
        </div>
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

      {/* Formulario de Creación de Club */}
      <form
        onSubmit={guardarClubIndividual}
        className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-6"
      >
        <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-center">
          <h2 className="text-lg font-black text-white uppercase tracking-wide">
            Ficha de Inscripción de Club Federado
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Todos los campos se sincronizan con Fixture y Tablas
          </span>
        </div>

        {/* Fila 1: Nombre, Colores y Escudo */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Nombre Oficial del Club
            </label>
            <input
              type="text"
              placeholder="Ej: CD Los Halcones"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 focus:border-blue-500 p-3 rounded-xl font-bold outline-none"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Color Principal
            </label>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border-2 border-slate-700">
              <input
                type="color"
                value={colorPrimario}
                onChange={(e) => setColorPrimario(e.target.value)}
                className="w-9 h-8 rounded cursor-pointer bg-transparent"
              />
              <span className="font-mono text-xs font-bold text-slate-300">
                {colorPrimario}
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Color Secundario
            </label>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border-2 border-slate-700">
              <input
                type="color"
                value={colorSecundario}
                onChange={(e) => setColorSecundario(e.target.value)}
                className="w-9 h-8 rounded cursor-pointer bg-transparent"
              />
              <span className="font-mono text-xs font-bold text-slate-300">
                {colorSecundario}
              </span>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Escudo del Club (Imagen)
            </label>
            <div className="flex items-center gap-3">
              {escudoUrl ? (
                <img
                  src={escudoUrl}
                  alt="Previsualización Escudo"
                  className="w-12 h-12 rounded-xl object-contain bg-slate-950 border-2 border-white p-1"
                />
              ) : (
                <div
                  style={{
                    backgroundColor: colorPrimario,
                    borderColor: colorSecundario,
                  }}
                  className="w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-xs text-white shadow"
                >
                  CLUB
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider py-3 px-3 rounded-xl border-2 border-slate-700 text-center">
                Subir Escudo
                <input
                  type="file"
                  accept="image/*"
                  onChange={manejarSubidaEscudo}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Fila 2: Selección Táctil de Series Activas */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
            Series en las que participa el Club ({seriesSeleccionadas.length} seleccionadas)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {SERIES_OFICIALES.map((serie) => {
              const activa = seriesSeleccionadas.includes(serie);
              return (
                <button
                  key={serie}
                  type="button"
                  onClick={() => toggleSerie(serie)}
                  className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition ${
                    activa
                      ? "bg-blue-600 text-white border-white shadow-md"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  {activa ? "✓ " : ""}{serie}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 3: Cancha Local (Con Soporte para Recintos Compartidos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Cancha Local Asignada (Detecta Recintos Compartidos)
            </label>
            <select
              value={canchaLocal}
              onChange={(e) => setCanchaLocal(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold"
            >
              {CANCHAS_BASE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="OTRA">+ Especificar otra cancha comunal...</option>
            </select>
          </div>

          {canchaLocal === "OTRA" && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-yellow-400 mb-1.5">
                Nombre del Nuevo Recinto Deportivo
              </label>
              <input
                type="text"
                placeholder="Ej: Cancha Sector Los Puquios"
                value={otraCancha}
                onChange={(e) => setOtraCancha(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-yellow-400 p-3 rounded-xl font-bold"
                required
              />
            </div>
          )}
        </div>

        {/* Fila 4: Redes Sociales */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
            Redes Sociales Oficiales del Club (Opcional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Instagram (ej: @halcones_sf)"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="bg-slate-950 text-white border-2 border-slate-800 p-2.5 rounded-xl text-xs font-bold"
            />
            <input
              type="text"
              placeholder="Facebook (URL o página)"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="bg-slate-950 text-white border-2 border-slate-800 p-2.5 rounded-xl text-xs font-bold"
            />
            <input
              type="text"
              placeholder="YouTube (Canal)"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              className="bg-slate-950 text-white border-2 border-slate-800 p-2.5 rounded-xl text-xs font-bold"
            />
            <input
              type="text"
              placeholder="TikTok / Web u otra red"
              value={otraRed}
              onChange={(e) => setOtraRed(e.target.value)}
              className="bg-slate-950 text-white border-2 border-slate-800 p-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider py-4 rounded-xl border-2 border-white shadow-lg transition text-sm"
        >
          {cargando ? "Guardando en Firestore..." : "✓ Guardar Club en el Padrón Oficial"}
        </button>
      </form>

      {/* Padrón de Clubes Registrados y Auditoría de Canchas Compartidas */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-lg font-black text-white uppercase">
            Padrón de Clubes Registrados ({clubes.length})
          </h2>
          <span className="text-xs font-bold text-amber-400">
            ⚠ Los recintos marcados como &ldquo;COMPARTIDA&rdquo; activan la restricción anti-tope en el Fixture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubes.map((club) => {
            const esCompartida =
              club.canchaLocal && conteoCanchas[club.canchaLocal] > 1;
            return (
              <div
                key={club.id}
                className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {club.escudoUrl ? (
                      <img
                        src={club.escudoUrl}
                        alt={club.nombre}
                        className="w-14 h-14 rounded-xl object-contain bg-slate-900 border-2 p-1"
                        style={{ borderColor: club.colorPrimario || "#2563eb" }}
                      />
                    ) : (
                      <div
                        style={{
                          backgroundColor: club.colorPrimario || "#2563eb",
                          borderColor: club.colorSecundario || "#ffffff",
                        }}
                        className="w-14 h-14 rounded-xl border-2 flex items-center justify-center font-black text-lg text-white shrink-0"
                      >
                        {club.nombre.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base">
                          {club.nombre}
                        </h3>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white"
                          style={{ backgroundColor: club.colorPrimario }}
                          title="Color Primario"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white"
                          style={{ backgroundColor: club.colorSecundario }}
                          title="Color Secundario"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold text-emerald-400">
                          📍 {club.canchaLocal}
                        </span>
                        {esCompartida && (
                          <span className="bg-amber-950 text-amber-300 border border-amber-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                            Cancha Compartida ({conteoCanchas[club.canchaLocal!]})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => eliminarClub(club.id)}
                    className="text-xs font-black text-red-400 hover:text-red-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                    title="Eliminar Club"
                  >
                    ✕
                  </button>
                </div>

                {/* Series inscritas */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-900">
                  {(club.series || ["Honor"]).map((s) => (
                    <span
                      key={s}
                      className="bg-slate-900 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}