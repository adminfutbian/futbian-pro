// src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { AnuncioPublicitario, Auspiciador, Club, Jugador } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

export default function HomePage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [goleadores, setGoleadores] = useState<Jugador[]>([]);
  const [fechaHoy, setFechaHoy] = useState<string>("");
  const [rolUsuario, setRolUsuario] = useState<string>("hincha");

  const [logoAsociacion, setLogoAsociacion] = useState<string>("");
  const [auspiciadores, setAuspiciadores] = useState<Auspiciador[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioPublicitario[]>([]);

  // Estados para crear un anuncio en el apartado de Publicidad
  const [tituloAnuncio, setTituloAnuncio] = useState("");
  const [descAnuncio, setDescAnuncio] = useState("");
  const [linkAnuncio, setLinkAnuncio] = useState("");
  const [imgAnuncio, setImgAnuncio] = useState("");

  useEffect(() => {
    const actualizarReloj = () => {
      setFechaHoy(
        new Date().toLocaleDateString("es-CL", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    actualizarReloj();
    const timer = setInterval(actualizarReloj, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const s = await getDoc(doc(db, "users", u.uid));
        if (s.exists()) setRolUsuario(s.data().rol || "hincha");
      }
    });

    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        escudoUrl: d.data().escudoUrl || "",
        instagramUrl:
          d.data().instagramUrl || d.data().redesSociales?.instagram || "",
        canchaLocal: d.data().canchaLocal || "Estadio Municipal",
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      lista.sort((a, b) => b.puntos - a.puntos);
      setClubes(lista);
    });

    const unsubJug = onSnapshot(collection(db, "jugadores"), (snap) => {
      const lista: Jugador[] = snap.docs
        .map((d) => ({
          id: d.id,
          nombre: d.data().nombre || "",
          club: d.data().club || "",
          clubId: d.data().clubId || "",
          serie: d.data().serie || "Honor",
          goles: Number(d.data().goles || 0),
          sancionado: d.data().sancionado || false,
        }))
        .filter((j) => j.goles > 0);
      setGoleadores(lista);
    });

    const unsubIdentidad = onSnapshot(
      doc(db, "configuracion", "identidad_asociacion"),
      (snap) => {
        if (snap.exists()) {
          setLogoAsociacion(snap.data().logoAsociacionUrl || "");
          setAuspiciadores(snap.data().auspiciadores || []);
          setAnuncios(snap.data().anuncios || []);
        }
      }
    );

    return () => {
      unsubAuth();
      unsubClubes();
      unsubJug();
      unsubIdentidad();
    };
  }, []);

  const comprimirImagen = (
    file: File,
    callback: (dataUrl: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 320 / img.width);
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

  const publicarAnuncioPublicitario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloAnuncio.trim()) return;

    const nuevo: AnuncioPublicitario = {
      id: Date.now().toString(),
      titulo: tituloAnuncio.trim(),
      descripcion: descAnuncio.trim(),
      imagenUrl: imgAnuncio,
      enlaceUrl: linkAnuncio.trim(),
      etiqueta: "ESPACIO PUBLICITARIO OFICIAL",
    };

    const nuevaLista = [nuevo, ...anuncios];
    setAnuncios(nuevaLista);
    await setDoc(
      doc(db, "configuracion", "identidad_asociacion"),
      { anuncios: nuevaLista },
      { merge: true }
    );

    await registrarAccionAuditoria(
      "PUBLICIDAD_INICIO",
      "PUBLICAR_ANUNCIO",
      `Anuncio publicado: ${nuevo.titulo}`
    );

    setTituloAnuncio("");
    setDescAnuncio("");
    setLinkAnuncio("");
    setImgAnuncio("");
  };

  const borrarAnuncio = async (id: string) => {
    const nuevaLista = anuncios.filter((a) => a.id !== id);
    setAnuncios(nuevaLista);
    await setDoc(
      doc(db, "configuracion", "identidad_asociacion"),
      { anuncios: nuevaLista },
      { merge: true }
    );
  };

  const puedeEditarPublicidad =
    rolUsuario === "admingeneral" ||
    rolUsuario === "admin" ||
    rolUsuario === "adminasociacion" ||
    rolUsuario === "multimedia";

  const maxPuntos = Math.max(...clubes.map((c) => c.puntos), 1);
  const maxGolesClub = Math.max(...clubes.map((c) => c.goles_favor), 1);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {logoAsociacion ? (
            <img
              src={logoAsociacion}
              alt="Logo Asociación"
              className="w-24 h-24 rounded-2xl object-contain bg-slate-950 border-2 border-blue-500 p-2"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-blue-600 border-2 border-white flex items-center justify-center font-black text-3xl text-white">
              ASF
            </div>
          )}

          <div>
            <span className="inline-block bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-black px-3 py-1 rounded uppercase mb-2">
              📅 EN VIVO AL DÍA: {fechaHoy}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Asociación de Fútbol San Fabián
            </h1>
            <p className="text-sm font-bold text-slate-400 mt-1">
              Estadísticas en tiempo real, redes oficiales de los clubes, comunidad Hazte Fan y transmisión en vivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 shrink-0">
          <Link
            href="/hazte-fan"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase px-5 py-4 rounded-2xl border-2 border-white shadow-xl text-xs sm:text-sm"
          >
            ⭐ ¡Hazte Fan!
          </Link>
          <Link
            href="/en-vivo"
            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase px-5 py-4 rounded-2xl border-2 border-white shadow-xl text-xs sm:text-sm animate-pulse"
          >
            🔴 Ver En Vivo
          </Link>
        </div>
      </div>

      {/* DIRECTORIO DE CLUBES CON BOTÓN DIRECTO A SU INSTAGRAM */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-blue-400">
          🌐 Clubes Federados y Acceso Directo a Instagram Oficial
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {clubes.map((c) => {
            const igHref = c.instagramUrl
              ? c.instagramUrl.startsWith("http")
                ? c.instagramUrl
                : `https://instagram.com/${c.instagramUrl.replace(/^@/, "")}`
              : "";
            return (
              <div
                key={c.id}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center gap-2"
              >
                <div className="flex items-center gap-2.5">
                  {c.escudoUrl ? (
                    <img
                      src={c.escudoUrl}
                      alt={c.nombre}
                      className="w-10 h-10 rounded-lg object-contain bg-slate-900 p-1"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: c.colorPrimario || "#2563eb" }}
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs text-white"
                    >
                      {c.nombre.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-white text-xs sm:text-sm">
                      {c.nombre}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">
                      📍 {c.canchaLocal}
                    </span>
                  </div>
                </div>

                {igHref && (
                  <a
                    href={igHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-pink-600 to-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-white/40 shrink-0"
                  >
                    📸 Instagram ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* APARTADO DE PUBLICIDAD Y ANUNCIOS DE AUSPICIADORES */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-yellow-400/60 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 block">
              ESPACIO COMERCIAL Y COMUNICADOS
            </span>
            <h2 className="text-lg font-black text-white uppercase">
              📢 Cartelera de Publicidad y Anuncios de Auspiciadores
            </h2>
          </div>
        </div>

        {puedeEditarPublicidad && (
          <form
            onSubmit={publicarAnuncioPublicitario}
            className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                Título del Anuncio / Promo
              </label>
              <input
                type="text"
                placeholder="Ej: 20% Dcto en Ferretería San Fabián"
                value={tituloAnuncio}
                onChange={(e) => setTituloAnuncio(e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-700 p-2 rounded-lg text-xs font-bold"
                required
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                Descripción Publicitaria
              </label>
              <input
                type="text"
                placeholder="Presentando tu cuenta Hazte Fan..."
                value={descAnuncio}
                onChange={(e) => setDescAnuncio(e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-700 p-2 rounded-lg text-xs font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                Link / Instagram / Web
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={linkAnuncio}
                onChange={(e) => setLinkAnuncio(e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-700 p-2 rounded-lg text-xs font-bold"
              />
            </div>

            <div className="md:col-span-3 flex gap-2">
              <label className="flex-1 cursor-pointer bg-slate-900 text-yellow-400 border border-slate-700 p-2 rounded-lg text-xs font-black uppercase text-center">
                {imgAnuncio ? "✓ Foto" : "📷 Imagen"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) comprimirImagen(f, setImgAnuncio);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                className="bg-yellow-400 text-black font-black uppercase px-3 py-2 rounded-lg text-xs"
              >
                + Publicar
              </button>
            </div>
          </form>
        )}

        {anuncios.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 text-center py-4">
            Espacio publicitario disponible para anuncios y promociones de los auspiciadores del torneo.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anuncios.map((an) => (
              <div
                key={an.id}
                className="bg-slate-950 rounded-xl border-2 border-slate-800 overflow-hidden flex flex-col justify-between p-4 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      {an.etiqueta}
                    </span>
                    {puedeEditarPublicidad && (
                      <button
                        type="button"
                        onClick={() => borrarAnuncio(an.id)}
                        className="text-xs font-black text-red-400"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {an.imagenUrl && (
                    <img
                      src={an.imagenUrl}
                      alt={an.titulo}
                      className="w-full h-36 object-cover rounded-lg border border-slate-800"
                    />
                  )}
                  <h3 className="text-base font-black text-white">
                    {an.titulo}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    {an.descripcion}
                  </p>
                </div>

                {an.enlaceUrl && (
                  <a
                    href={
                      an.enlaceUrl.startsWith("http")
                        ? an.enlaceUrl
                        : `https://${an.enlaceUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase py-2 rounded-lg border border-white/40"
                  >
                    Ver Promoción / Visitar ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gráficos Animados de Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-3">
          <h2 className="text-sm font-black uppercase text-blue-400">
            📊 Gráfico en Vivo: Puntos por Club
          </h2>
          {clubes.map((c) => {
            const pct = Math.max(8, Math.round((c.puntos / maxPuntos) * 100));
            return (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between text-xs font-black">
                  <span>{c.nombre}</span>
                  <span className="text-yellow-400">{c.puntos} PTS</span>
                </div>
                <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: c.colorPrimario || "#2563eb",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-3">
          <h2 className="text-sm font-black uppercase text-emerald-400">
            ⚽ Gráfico en Vivo: Goles por Club ({goleadores.length} artilleros)
          </h2>
          {clubes.map((c) => {
            const pct = Math.max(
              8,
              Math.round((c.goles_favor / maxGolesClub) * 100)
            );
            return (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between text-xs font-black">
                  <span>{c.nombre}</span>
                  <span className="text-emerald-400">
                    {c.goles_favor} Goles
                  </span>
                </div>
                <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-yellow-400 rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logos de Auspiciadores */}
      {auspiciadores.length > 0 && (
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800">
          <h3 className="text-xs font-black uppercase text-yellow-400 mb-3">
            Auspiciadores Oficiales
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {auspiciadores.map((aus) => (
              <div
                key={aus.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center"
              >
                <img
                  src={aus.logoUrl}
                  alt={aus.nombre}
                  className="h-12 object-contain"
                />
                <span className="text-[10px] font-black text-slate-300 mt-1">
                  {aus.nombre}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}