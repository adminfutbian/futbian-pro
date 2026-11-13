// src/app/admin/usuarios/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Club, UserProfile, UserRole } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

const MATRIZ_PERMISOS_POR_ROL: Record<
  string,
  { etiqueta: string; descripcion: string; permisos: string[] }
> = {
  hincha: {
    etiqueta: "Hincha / Fanático",
    descripcion: "Ve tabla de posiciones, goleadores, fixture, su equipo favorito y streaming.",
    permisos: ["ver:posiciones", "ver:goleadores", "ver:fixture", "ver:en-vivo", "fan:club"],
  },
  delegado: {
    etiqueta: "Delegado de Club",
    descripcion: "Ve posiciones, goleadores, fixture y administra exclusivamente su Club.",
    permisos: ["ver:posiciones", "ver:goleadores", "ver:fixture", "crud:mi-club"],
  },
  turno: {
    etiqueta: "Director de Turno (Mesa)",
    descripcion: "Inicia el reloj del partido, anota goles/tarjetas con minutaje y envía la planilla para ratificación del árbitro.",
    permisos: ["ver:fixture", "llenar:planilla-turno"],
  },
  arbitro: {
    etiqueta: "Árbitro Oficial",
    descripcion: "Revisa y ratifica con su PIN/Firma las planillas llenadas por el Turno y sella el acta SHA-256.",
    permisos: ["ver:fixture", "ratificar:planilla-arbitral"],
  },
  multimedia: {
    etiqueta: "Encargado Multimedia y Streaming",
    descripcion: "Configura los partidos En Vivo (enunciado, URL de transmisión, marcador) y publica anuncios publicitarios.",
    permisos: ["crud:multimedia-vivo", "crud:publicidad-inicio"],
  },
  adminasociacion: {
    etiqueta: "Administrador Asociación",
    descripcion:
      "Configura todo desde 0 (CRUD Clubes, Jugadores, Sanciones, Auspiciadores, Finanzas, Torneos). No modifica informes arbitrales ni tablas cerradas.",
    permisos: [
      "crud:clubes",
      "crud:jugadores",
      "crud:sanciones-valores",
      "crud:auspiciadores",
      "crud:finanzas",
      "crud:torneos",
      "ver:planilla-lectura",
    ],
  },
  admingeneral: {
    etiqueta: "Administrador General (Superusuario)",
    descripcion: "Control total sin restricciones sobre todos los módulos, actas, tablas y usuarios.",
    permisos: ["*:* (Acceso Total Irrestricto)"],
  },
};

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState("");

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolSeleccionado, setRolSeleccionado] = useState<UserRole>("delegado");
  const [clubAsignadoId, setClubAsignadoId] = useState<string>("");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const lista: UserProfile[] = snap.docs.map((d) => ({
        uid: d.id,
        nombre: d.data().nombre || "Usuario",
        email: d.data().email || "",
        rol: (d.data().rol as UserRole) || "hincha",
        clubId: d.data().clubId || "",
        clubFavoritoId: d.data().clubFavoritoId || "",
        permisos: d.data().permisos || [],
        fechaRegistro: d.data().fechaRegistro || "",
      }));
      setUsuarios(lista);
    });

    const unsubClubes = onSnapshot(collection(db, "equipos"), (snap) => {
      const lista: Club[] = snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.id,
        puntos: 0,
        goles_favor: 0,
        goles_contra: 0,
        saldoDeudor: 0,
        bloqueadoDeportivo: false,
      }));
      setClubes(lista);
      if (lista.length > 0 && !clubAsignadoId) {
        setClubAsignadoId(lista[0].id);
      }
    });

    return () => {
      unsubUsers();
      unsubClubes();
    };
  }, [clubAsignadoId]);

  const crearNuevoPerfilUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    const secondaryAppName = `SecondaryAuthApp_${Date.now()}`;
    let secondaryApp: any = null;

    try {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      const existing = getApps().find((a) => a.name === secondaryAppName);
      secondaryApp = existing || initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        password
      );

      const uid = cred.user.uid;
      await signOut(secondaryAuth);

      const infoPermisos =
        MATRIZ_PERMISOS_POR_ROL[rolSeleccionado] ||
        MATRIZ_PERMISOS_POR_ROL.hincha;

      const nuevoPerfil: UserProfile = {
        uid,
        nombre: nombre.trim(),
        email: email.trim(),
        rol: rolSeleccionado,
        clubId: rolSeleccionado === "delegado" ? clubAsignadoId : "",
        clubFavoritoId: rolSeleccionado === "hincha" ? clubAsignadoId : "",
        permisos: infoPermisos.permisos,
        fechaRegistro: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), nuevoPerfil);

      await registrarAccionAuditoria(
        "USUARIOS_Y_PERFILES",
        "CREAR_PERFIL",
        `Usuario creado: ${email} con perfil ${rolSeleccionado.toUpperCase()}`
      );

      setMensaje(
        `✓ Perfil "${nombre}" (${email}) creado con rol ${rolSeleccionado.toUpperCase()}.`
      );
      setNombre("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message || "Error al crear la cuenta. Verifique el correo."
      );
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {
          // Ignorar limpieza secundaria
        }
      }
      setCargando(false);
    }
  };

  const cambiarRolEnVivo = async (u: UserProfile, nuevoRol: UserRole) => {
    const infoPermisos =
      MATRIZ_PERMISOS_POR_ROL[nuevoRol] || MATRIZ_PERMISOS_POR_ROL.hincha;
    await updateDoc(doc(db, "users", u.uid), {
      rol: nuevoRol,
      permisos: infoPermisos.permisos,
    });
    await registrarAccionAuditoria(
      "USUARIOS_Y_PERFILES",
      "CAMBIO_ROL_PERMISOS",
      `Se actualizó el perfil de ${u.email} a ${nuevoRol.toUpperCase()}`
    );
  };

  const cambiarClubDelegado = async (u: UserProfile, nuevoClubId: string) => {
    await updateDoc(doc(db, "users", u.uid), {
      clubId: nuevoClubId,
    });
  };

  const eliminarPerfil = async (u: UserProfile) => {
    await deleteDoc(doc(db, "users", u.uid));
    await registrarAccionAuditoria(
      "USUARIOS_Y_PERFILES",
      "ELIMINAR_PERFIL",
      `Se eliminó el perfil de ${u.email}`
    );
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busquedaUsuario.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800">
        <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
          CONTROL DE IDENTIDADES Y ACCESOS (RBAC)
        </span>
        <h1 className="text-2xl font-black text-white mt-2">
          Creador de Perfiles y Asignación de Permisos
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">
          Cree cuentas para Hinchas, Delegados, Turnos de Mesa, Árbitros, Multimedia, Admin Asociación y Admin General.
        </p>
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

      <form
        onSubmit={crearNuevoPerfilUsuario}
        className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-5"
      >
        <h2 className="text-base font-black text-yellow-400 uppercase border-b-2 border-slate-800 pb-2">
          Registrar Nuevo Usuario y Asignar Perfil
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              placeholder="Ej: Carlos Muñoz"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Correo Electrónico (Login)
            </label>
            <input
              type="email"
              placeholder="usuario@futbian.pro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Contraseña Inicial
            </label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Perfil y Nivel de Permisos
            </label>
            <select
              value={rolSeleccionado}
              onChange={(e) => setRolSeleccionado(e.target.value as UserRole)}
              className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-3 rounded-xl font-black text-sm"
            >
              <option value="hincha">HINCHA (Tablas, Goleadores, Fixture, En Vivo)</option>
              <option value="delegado">DELEGADO (Representante de un Club específico)</option>
              <option value="turno">TURNO (Llena planilla y cronómetro en cancha)</option>
              <option value="arbitro">ÁRBITRO (Ratifica planilla del Turno y sella SHA-256)</option>
              <option value="multimedia">MULTIMEDIA (Configura En Vivo y Publicidad)</option>
              <option value="adminasociacion">
                ADMIN ASOCIACIÓN (Configura todo desde 0; no edita actas ni tablas)
              </option>
              <option value="admingeneral">
                ADMIN GENERAL (Superusuario: Ver y Editar Todo)
              </option>
            </select>
          </div>

          {(rolSeleccionado === "delegado" || rolSeleccionado === "hincha") && (
            <div>
              <label className="block text-xs font-black uppercase text-emerald-400 mb-1">
                {rolSeleccionado === "delegado"
                  ? "Club que Representa (Acceso exclusivo en Mi Club)"
                  : "Equipo Favorito del Hincha"}
              </label>
              <select
                value={clubAsignadoId}
                onChange={(e) => setClubAsignadoId(e.target.value)}
                className="w-full bg-slate-950 text-white border-2 border-emerald-500 p-3 rounded-xl font-black text-sm"
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

        {MATRIZ_PERMISOS_POR_ROL[rolSeleccionado] && (
          <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 space-y-2">
            <span className="text-xs font-black text-blue-400 uppercase block">
              Permisos Declarativos para {MATRIZ_PERMISOS_POR_ROL[rolSeleccionado].etiqueta}:
            </span>
            <p className="text-xs font-bold text-slate-300">
              {MATRIZ_PERMISOS_POR_ROL[rolSeleccionado].descripcion}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MATRIZ_PERMISOS_POR_ROL[rolSeleccionado].permisos.map((perm) => (
                <span
                  key={perm}
                  className="bg-slate-900 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold"
                >
                  ✓ {perm}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider py-4 rounded-xl border-2 border-white shadow-lg text-sm transition"
        >
          {cargando ? "Creando Cuenta..." : "🔐 Crear Perfil y Habilitar Permisos"}
        </button>
      </form>

      {/* Tabla de Usuarios con Filtro de Búsqueda */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b-2 border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-sm font-black uppercase text-white">
            Padrón de Perfiles Registrados ({usuariosFiltrados.length})
          </h2>
          <input
            type="text"
            placeholder="🔍 Buscar usuario por nombre, correo o rol..."
            value={busquedaUsuario}
            onChange={(e) => setBusquedaUsuario(e.target.value)}
            className="bg-slate-900 text-white border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-400">
                <th className="p-3.5">Nombre / Correo</th>
                <th className="p-3.5">Perfil Asignado</th>
                <th className="p-3.5">Club Asociado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
              {usuariosFiltrados.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <p className="font-black text-white">{u.nombre}</p>
                    <p className="text-xs font-bold text-slate-400">{u.email}</p>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={u.rol}
                      onChange={(e) =>
                        cambiarRolEnVivo(u, e.target.value as UserRole)
                      }
                      className="bg-slate-950 text-yellow-400 border border-slate-700 p-2 rounded-lg font-black text-xs uppercase"
                    >
                      <option value="hincha">hincha</option>
                      <option value="delegado">delegado</option>
                      <option value="turno">turno</option>
                      <option value="arbitro">arbitro</option>
                      <option value="multimedia">multimedia</option>
                      <option value="adminasociacion">adminasociacion</option>
                      <option value="admingeneral">admingeneral</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    {u.rol === "delegado" ? (
                      <select
                        value={u.clubId || ""}
                        onChange={(e) => cambiarClubDelegado(u, e.target.value)}
                        className="bg-slate-950 text-emerald-400 border border-slate-700 p-2 rounded-lg font-bold text-xs"
                      >
                        <option value="">-- Sin Club --</option>
                        {clubes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    ) : u.clubFavoritoId ? (
                      <span className="text-xs font-bold text-blue-400">
                        ❤️ Fan: {u.clubFavoritoId}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Global</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => eliminarPerfil(u)}
                      className="bg-slate-950 hover:bg-red-950 text-red-400 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-black uppercase"
                    >
                      Revocar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}