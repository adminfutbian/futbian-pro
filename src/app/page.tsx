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
import { Auspiciador, Club, Jugador } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

export default function HomePage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [goleadores, setGoleadores] = useState<Jugador[]>([]);
  const [fechaHoy, setFechaHoy] = useState<string>("");
  const [rolUsuario, setRolUsuario] = useState<string>("hincha");

  // Estado de Logos de Asociación y Auspiciadores
  const [logoAsociacion, setLogoAsociacion] = useState<string>("");
  const [auspiciadores, setAuspiciadores] = useState<Auspiciador[]>([]);
  const [nombreAuspiciador, setNombreAuspiciador] = useState("");

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
        .filter((j) => j.goles > 0)
        .sort((a, b) => b.goles - a.goles);
      setGoleadores(lista);
    });

    const unsubIdentidad = onSnapshot(
      doc(db, "configuracion", "identidad_asociacion"),
      (snap) => {
        if (snap.exists()) {
          setLogoAsociacion(snap.data().logoAsociacionUrl || "");
          setAuspiciadores(snap.data().auspiciadores || []);
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

  const comprimirImagenBase64 = (
    file: File,
    maxW: number,
    callback: (dataUrl: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxW / img.width);
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

  const subirLogoAsociacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    comprimirImagenBase64(file, 180, async (dataUrl) => {
      setLogoAsociacion(dataUrl);
      await setDoc(
        doc(db, "configuracion", "identidad_asociacion"),
        { logoAsociacionUrl: dataUrl },
        { merge: true }
      );
      await registrarAccionAuditoria(
        "INICIO",
        "ACTUALIZAR_LOGO_ASOCIACION",
        "Logo institucional de la Asociación actualizado."
      );
    });
  };

  const agregarLogoAuspiciador = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    comprimirImagenBase64(file, 180, async (dataUrl) => {
      const nuevo: Auspiciador = {
        id: Date.now().toString(),
        nombre: nombreAuspiciador.trim() || "Auspiciador Oficial",
        logoUrl: dataUrl,
      };
      const nuevaLista = [...auspiciadores, nuevo];
      setAuspiciadores(nuevaLista);
      setNombreAuspiciador("");
      await setDoc(
        doc(db, "configuracion", "identidad_asociacion"),
        { auspiciadores: nuevaLista },
        { merge: true }
      );
      await registrarAccionAuditoria(
        "INICIO",
        "AGREGAR_AUSPICIADOR",
        `Auspiciador agregado: ${nuevo.nombre}`
      );
    });
  };

  const maxPuntos = Math.max(...clubes.map((c) => c.puntos), 1);
  const maxGolesClub = Math.max(...clubes.map((c) => c.goles_favor), 1);
  const puedeEditarIdentidad =
    rolUsuario === "admingeneral" ||
    rolUsuario === "admin" ||
    rolUsuario === "adminasociacion";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera Institucional con Logo de la Asociación y Fecha en Vivo */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative group">
            {logoAsociacion ? (
              <img
                src={logoAsociacion}
                alt="Logo Asociación San Fabián"
                className="w-24 h-24 rounded-2xl object-contain bg-slate-950 border-2 border-blue-500 p-2 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-blue-600 border-2 border-white flex items-center justify-center font-black text-3xl text-white shadow-lg">
                ASF
              </div>
            )}
            {puedeEditarIdentidad && (
              <label className="mt-2 block cursor-pointer bg-slate-950 hover:bg-slate-800 text-[10px] font-black uppercase text-yellow-400 px-2.5 py-1 rounded border border-yellow-400/50 text-center">
                Cambiar Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={subirLogoAsociacion}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <span className="inline-block bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-black px-3 py-1 rounded uppercase tracking-wider mb-2">
              📅 AL DÍA EN TIEMPO REAL: {fechaHoy}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Asociación de Fútbol San Fabián
            </h1>
            <p className="text-sm font-bold text-slate-400 mt-1">
              Estadísticas oficiales al instante, tabla de posiciones, goleadores y transmisión en vivo.
            </p>
          </div>
        </div>

        <Link
          href="/en-vivo"
          className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider px-6 py-4 rounded-2xl border-2 border-white shadow-xl text-xs sm:text-sm animate-pulse shrink-0"
        >
          🔴 Ver Transmisión En Vivo
        </Link>
      </div>

      {/* Gráficos Animados de Estadísticas en Tiempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Animado 1: Rendimiento de Puntos por Club */}
        <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase text-blue-400">
              📊 Gráfico en Vivo: Puntos por Club
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Actualización automática
            </span>
          </div>

          <div className="space-y-3">
            {clubes.map((c) => {
              const porcentaje = Math.max(
                8,
                Math.round((c.puntos / maxPuntos) * 100)
              );
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-white">{c.nombre}</span>
                    <span className="text-yellow-400">{c.puntos} PTS</span>
                  </div>
                  <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${porcentaje}%`,
                        backgroundColor: c.colorPrimario || "#2563eb",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico Animado 2: Poder Ofensivo (Goles a Favor por Club) */}
        <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase text-emerald-400">
              ⚽ Gráfico en Vivo: Poder Goleador por Club
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Total Goles Convertidos
            </span>
          </div>

          <div className="space-y-3">
            {clubes.map((c) => {
              const porcentajeGoles = Math.max(
                8,
                Math.round((c.goles_favor / maxGolesClub) * 100)
              );
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-white">{c.nombre}</span>
                    <span className="text-emerald-400">
                      {c.goles_favor} Goles
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${porcentajeGoles}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Carrusel / Vitrina de Auspiciadores Oficiales */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b-2 border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 block">
              PATROCINADORES COMUNALES
            </span>
            <h2 className="text-lg font-black text-white uppercase">
              Auspiciadores Oficiales de la Liga
            </h2>
          </div>

          {puedeEditarIdentidad && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Nombre Auspiciador..."
                value={nombreAuspiciador}
                onChange={(e) => setNombreAuspiciador(e.target.value)}
                className="bg-slate-950 text-white border-2 border-slate-700 px-3 py-2 rounded-xl text-xs font-bold"
              />
              <label className="cursor-pointer bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase px-4 py-2 rounded-xl border-2 border-white text-xs">
                + Subir Logo Auspiciador
                <input
                  type="file"
                  accept="image/*"
                  onChange={agregarLogoAuspiciador}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {auspiciadores.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 text-center py-4">
            Espacio disponible para logos de auspiciadores oficiales de la Asociación.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {auspiciadores.map((aus) => (
              <div
                key={aus.id}
                className="bg-slate-950 p-3 rounded-xl border-2 border-slate-800 flex flex-col items-center justify-center gap-2 hover:border-yellow-400 transition"
              >
                <img
                  src={aus.logoUrl}
                  alt={aus.nombre}
                  className="h-14 object-contain"
                />
                <span className="text-[11px] font-black text-slate-300 text-center truncate w-full">
                  {aus.nombre}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}