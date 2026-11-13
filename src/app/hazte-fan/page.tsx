// src/app/hazte-fan/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { Club, Jugador, UserProfile } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

export default function HazteFanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [perfilHincha, setPerfilHincha] = useState<UserProfile | null>(null);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  // Formulario de Registro de Fan
  const [nombreFan, setNombreFan] = useState("");
  const [emailFan, setEmailFan] = useState("");
  const [passwordFan, setPasswordFan] = useState("");
  const [clubElegidoId, setClubElegidoId] = useState("");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        colorPrimario: d.data().colorPrimario || "#2563eb",
        colorSecundario: d.data().colorSecundario || "#facc15",
        escudoUrl: d.data().escudoUrl || "",
        canchaLocal: d.data().canchaLocal || "Estadio Municipal",
        series: d.data().series || ["Honor"],
        puntos: d.data().puntos || 0,
        goles_favor: d.data().goles_favor || 0,
        goles_contra: d.data().goles_contra || 0,
        saldoDeudor: d.data().saldoDeudor || 0,
        bloqueadoDeportivo: d.data().bloqueadoDeportivo || false,
      }));
      lista.sort((a, b) => b.puntos - a.puntos);
      setClubes(lista);
      if (lista.length > 0 && !clubElegidoId) {
        setClubElegidoId(lista[0].id);
      }
    });

    const unsubJug = onSnapshot(collection(db, "jugadores"), (snap) => {
      const lista: Jugador[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || "",
        club: d.data().club || "",
        clubId: d.data().clubId || "",
        serie: d.data().serie || "Honor",
        goles: Number(d.data().goles || 0),
        sancionado: d.data().sancionado || false,
      }));
      setJugadores(lista);
    });

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setPerfilHincha(data);
          if (data.clubFavoritoId) setClubElegidoId(data.clubFavoritoId);
        }
      } else {
        setPerfilHincha(null);
      }
    });

    return () => {
      unsubClubes();
      unsubJug();
      unsubAuth();
    };
  }, [clubElegidoId]);

  const registrarCuentaHincha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setErrorMsg("");

    if (passwordFan.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        emailFan.trim(),
        passwordFan
      );

      const nuevoHincha: UserProfile = {
        uid: cred.user.uid,
        nombre: nombreFan.trim(),
        email: emailFan.trim(),
        rol: "hincha",
        clubFavoritoId: clubElegidoId,
        permisos: [
          "ver:posiciones",
          "ver:goleadores",
          "ver:fixture",
          "ver:en-vivo",
          "fan:club",
        ],
        fechaRegistro: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", cred.user.uid), nuevoHincha);
      setPerfilHincha(nuevoHincha);

      await registrarAccionAuditoria(
        "HAZTE_FAN",
        "REGISTRO_HINCHA",
        `Nuevo hincha registrado: ${nombreFan} (${emailFan}) siguiendo al club ${clubElegidoId}`
      );

      setMensaje(
        `🎉 ¡Bienvenido(a) ${nombreFan}! Ya eres Fan Oficial en Futbian.pro.`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message || "No se pudo registrar la cuenta. Intente con otro correo."
      );
    } finally {
      setCargando(false);
    }
  };

  const cambiarEquipoFavorito = async (nuevoClubId: string) => {
    setClubElegidoId(nuevoClubId);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        clubFavoritoId: nuevoClubId,
      });
    }
  };

  const miEquipoFavorito = clubes.find((c) => c.id === clubElegidoId);
  const posicionMiEquipo =
    clubes.findIndex((c) => c.id === clubElegidoId) + 1;
  const artillerosMiEquipo = jugadores
    .filter(
      (j) =>
        (j.clubId === clubElegidoId ||
          j.club === miEquipoFavorito?.nombre) &&
        j.goles > 0
    )
    .sort((a, b) => b.goles - a.goles);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera Hazte Fan */}
      <div className="bg-slate-900 p-6 rounded-2xl border-2 border-yellow-400 shadow-2xl flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded uppercase tracking-wider">
            ⭐ COMUNIDAD OFICIAL DE HINCHAS • SAN FABIÁN
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            ¡Hazte Fan! Sigue a tu Club Favorito en Tiempo Real
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
            Crea tu cuenta gratuita de hincha, elige los colores de tu equipo y revisa sus estadísticas y las de todos sus rivales.
          </p>
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

      {/* Si el hincha aún no tiene sesión iniciada, mostrar Formulario de Registro */}
      {!user && (
        <form
          onSubmit={registrarCuentaHincha}
          className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4"
        >
          <h2 className="text-base font-black text-blue-400 uppercase border-b-2 border-slate-800 pb-2">
            1. Crea tu Perfil de Hincha Oficial
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Tu Nombre o Apodo
              </label>
              <input
                type="text"
                placeholder="Ej: Fabián Hincha"
                value={nombreFan}
                onChange={(e) => setNombreFan(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="tucorreo@ejemplo.cl"
                value={emailFan}
                onChange={(e) => setEmailFan(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={passwordFan}
                onChange={(e) => setPasswordFan(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-yellow-400 mb-1">
                Elige tu Equipo Favorito ❤️
              </label>
              <select
                value={clubElegidoId}
                onChange={(e) => setClubElegidoId(e.target.value)}
                className="w-full bg-slate-950 text-yellow-400 border-2 border-yellow-400 p-3 rounded-xl font-black text-sm"
              >
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase py-3.5 rounded-xl border-2 border-white shadow-lg text-sm transition"
          >
            {cargando
              ? "Registrando tu cuenta de Fan..."
              : "⭐ Registrarme como Hincha y Seguir a mi Equipo"}
          </button>
        </form>
      )}

      {/* Selector Rápido de Equipo Favorito */}
      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 space-y-3">
        <span className="text-xs font-black uppercase text-slate-300 block">
          Selecciona tu Equipo Preferido para ver su Rendimiento a Fondo:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {clubes.map((c) => {
            const activo = c.id === clubElegidoId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => cambiarEquipoFavorito(c.id)}
                className={`p-3 rounded-xl border-2 text-center transition ${
                  activo
                    ? "bg-blue-600 text-white border-white shadow-lg"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600"
                }`}
              >
                <span className="font-black text-xs block truncate">
                  {activo ? "❤️ " : ""}
                  {c.nombre}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel Destacado de Mi Equipo Preferido */}
      {miEquipoFavorito && (
        <div
          className="bg-slate-900 p-6 rounded-2xl border-4 space-y-5 shadow-2xl"
          style={{ borderColor: miEquipoFavorito.colorPrimario || "#2563eb" }}
        >
          <div className="flex flex-wrap justify-between items-center gap-4 border-b-2 border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              {miEquipoFavorito.escudoUrl ? (
                <img
                  src={miEquipoFavorito.escudoUrl}
                  alt={miEquipoFavorito.nombre}
                  className="w-16 h-16 rounded-2xl object-contain bg-slate-950 p-1.5 border-2 border-white"
                />
              ) : (
                <div
                  style={{
                    backgroundColor:
                      miEquipoFavorito.colorPrimario || "#2563eb",
                  }}
                  className="w-16 h-16 rounded-2xl border-2 border-white flex items-center justify-center font-black text-2xl text-white"
                >
                  {miEquipoFavorito.nombre.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-xs font-black uppercase text-yellow-400">
                  ❤️ TU EQUIPO PREFERIDO • POSICIÓN #{posicionMiEquipo} EN LA LIGA
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {miEquipoFavorito.nombre}
                </h2>
                <p className="text-xs font-bold text-emerald-400">
                  📍 Estadio Local: {miEquipoFavorito.canchaLocal}
                </p>
              </div>
            </div>

            <div className="flex gap-3 text-center">
              <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  PUNTOS
                </span>
                <span className="text-2xl font-black text-yellow-400">
                  {miEquipoFavorito.puntos}
                </span>
              </div>
              <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  GOLES A FAVOR
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  {miEquipoFavorito.goles_favor}
                </span>
              </div>
              <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  DIFERENCIA
                </span>
                <span className="text-2xl font-black text-white">
                  {miEquipoFavorito.goles_favor - miEquipoFavorito.goles_contra}
                </span>
              </div>
            </div>
          </div>

          {/* Goleadores de Mi Equipo */}
          <div>
            <h3 className="text-xs font-black uppercase text-blue-400 mb-2">
              ⚽ Artilleros de {miEquipoFavorito.nombre} ({artillerosMiEquipo.length})
            </h3>
            {artillerosMiEquipo.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold">
                Aún no se registran goleadores con tantos convertidos para este club.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {artillerosMiEquipo.map((art) => (
                  <div
                    key={art.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-black text-white">{art.nombre}</p>
                      <span className="text-[10px] font-bold text-blue-400 uppercase">
                        Serie {art.serie}
                      </span>
                    </div>
                    <span className="text-lg font-black text-yellow-400">
                      {art.goles} ⚽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparativa de Estadísticas con los Demás Equipos de la Liga */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4">
        <h2 className="text-base font-black text-white uppercase border-b-2 border-slate-800 pb-2">
          📊 Estadísticas Comparativas de Todos los Equipos de la Asociación
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubes.map((c, index) => {
            const esFavorito = c.id === clubElegidoId;
            return (
              <div
                key={c.id}
                className={`p-4 rounded-xl border-2 space-y-2 ${
                  esFavorito
                    ? "bg-slate-950 border-yellow-400"
                    : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm text-white">
                    #{index + 1} {c.nombre} {esFavorito && "❤️"}
                  </span>
                  <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-0.5 rounded">
                    {c.puntos} PTS
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>GF: {c.goles_favor}</span>
                  <span>GC: {c.goles_contra}</span>
                  <span>DIF: {c.goles_favor - c.goles_contra}</span>
                </div>
                <p className="text-[11px] font-bold text-emerald-400">
                  📍 {c.canchaLocal}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}