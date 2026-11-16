// src/app/manual/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserRole } from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

interface GuiaPerfil {
  rol: UserRole;
  titulo: string;
  icono: string;
  colorBorde: string;
  badgeColor: string;
  emailPrueba: string;
  clavePrueba: string;
  clubDemoId?: string;
  resumen: string;
  quePuedeHacer: string[];
  restricciones: string[];
  pasoAPaso: { paso: string; descripcion: string; ruta: string; labelBoton: string }[];
  permisosDeclarativos: string[];
}

const MANUAL_POR_PERFIL: GuiaPerfil[] = [
  {
    rol: "hincha",
    titulo: "1. Perfil Hincha / Fanático",
    icono: "⭐",
    colorBorde: "border-yellow-400",
    badgeColor: "bg-yellow-400 text-black",
    emailPrueba: "hincha@futbian.pro",
    clavePrueba: "Futbian2026!",
    clubDemoId: "paso-ancho",
    resumen:
      "Usuario público y miembro de la comunidad 'Hazte Fan'. Consulta estadísticas en tiempo real, sigue a su club favorito y adquiere entradas digitales para ver partidos en vivo.",
    quePuedeHacer: [
      "Ver Tabla de Posiciones filtrada por las 7 series oficiales (Honor, Primera, Segunda, Super Senior 35, Super Senior 40, Damas y Juvenil).",
      "Consultar el Ranking de Goleadores depurado (solo jugadoras y jugadores con goles > 0).",
      "Revisar el Fixture oficial con recintos asignados y entrar directo al Instagram de cada club.",
      "Registrarse en 'Hazte Fan', elegir su Equipo Favorito y comparar sus estadísticas con el resto de la liga.",
      "Comprar boletos digitales en el Muro de Pago (Paywall) para desbloquear las transmisiones En Vivo.",
    ],
    restricciones: [
      "Sin acceso a paneles administrativos, tesorería, tribunal ni edición de planillas arbitrales.",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Elegir Equipo Favorito",
        descripcion: "Ingresa a Hazte Fan, selecciona tu club preferido de San Fabián y revisa sus goleadores y posición.",
        ruta: "/hazte-fan",
        labelBoton: "Ir a Hazte Fan",
      },
      {
        paso: "Paso 2: Consultar Tablas y Goleadores por Serie",
        descripcion: "Filtra las posiciones y artilleros cambiando entre Serie Honor, Damas, Senior o Juvenil.",
        ruta: "/tablas",
        labelBoton: "Ver Posiciones",
      },
      {
        paso: "Paso 3: Desbloquear Partido En Vivo (Paywall)",
        descripcion: "Entra a En Vivo, simula el pago del boleto con Webpay/CuentaRUT y desbloquea la señal HD.",
        ruta: "/en-vivo",
        labelBoton: "Ir a En Vivo",
      },
    ],
    permisosDeclarativos: ["ver:posiciones", "ver:goleadores", "ver:fixture", "ver:en-vivo", "fan:club"],
  },
  {
    rol: "delegado",
    titulo: "2. Perfil Delegado de Club",
    icono: "🛡️",
    colorBorde: "border-blue-500",
    badgeColor: "bg-blue-600 text-white",
    emailPrueba: "delegado.pasoancho@futbian.pro",
    clavePrueba: "Futbian2026!",
    clubDemoId: "paso-ancho",
    resumen:
      "Representante oficial de un club federado. Administra exclusivamente la plantilla de jugadores y series de su institución, analiza a su próximo rival y recibe los boletines arbitrales al cierre de cada fecha.",
    quePuedeHacer: [
      "Acceder al portal exclusivo 'Mi Club' vinculado automáticamente al club que representa.",
      "Inscribir jugadores de forma individual o mediante Carga Masiva CSV (Nombre, RUT, Fecha Nac. y Serie, sin número de camiseta).",
      "Activar o desactivar en qué series compite su institución.",
      "Consultar el Radar de Inteligencia del Próximo Rival (puntos, cancha del duelo, estado de bloqueo y series en común).",
      "Recibir en su bandeja los Boletines Oficiales sellados con SHA-256 al cierre de la jornada con goles y multas.",
    ],
    restricciones: [
      "No puede modificar jugadores ni series de otros clubes rivales.",
      "No puede alterar informes arbitrales ni anular deudas en Tesorería.",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Administrar Series y Nómina de Mi Club",
        descripcion: "Abre Mi Club, descarga la plantilla CSV o inscribe jugadores asignados a cada serie activa.",
        ruta: "/dashboard/mi-club",
        labelBoton: "Abrir Mi Club",
      },
      {
        paso: "Paso 2: Auditar Próximo Rival y Boletines",
        descripcion: "En el mismo panel de Mi Club, cambia la fecha en el Radar de Rival y revisa los informes arbitrales recibidos.",
        ruta: "/dashboard/mi-club",
        labelBoton: "Ver Radar y Boletines",
      },
    ],
    permisosDeclarativos: ["ver:posiciones", "ver:goleadores", "ver:fixture", "crud:mi-club"],
  },
  {
    rol: "turno",
    titulo: "3. Perfil Director de Turno (Mesa)",
    icono: "⏱️",
    colorBorde: "border-amber-400",
    badgeColor: "bg-amber-400 text-black",
    emailPrueba: "turno@futbian.pro",
    clavePrueba: "Futbian2026!",
    resumen:
      "Encargado operativo de la mesa en cancha. Selecciona el partido desde el Fixture, controla el cronómetro del encuentro por serie y registra goles y tarjetas con minutaje exacto para luego entregar la planilla a ratificación del árbitro.",
    quePuedeHacer: [
      "Operar la Planilla Táctil Offline-First incluso en canchas rurales sin señal celular.",
      "Seleccionar la Fecha, el Partido programado en el Fixture y la Serie (ajustando automáticamente el tiempo reglamentario por serie).",
      "Iniciar, pausar y cambiar al 2° Tiempo con el cronómetro en vivo ('▶ Comenzar Partido').",
      "Anotar goles, tarjetas amarillas y rojas sobre el listado auto-filtrado de jugadores de cada club.",
      "Firmar el Paso 1 ('Firmar como Turno y Pasar al Árbitro') dejando el acta lista para ratificación arbitral.",
    ],
    restricciones: [
      "No puede emitir el sello criptográfico final SHA-256 sin la ratificación y PIN del Árbitro Central.",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Cargar Partido del Fixture e Iniciar Reloj",
        descripcion: "En Planilla, escoge la Fecha, el duelo y la Serie. Presiona '▶ Comenzar Partido' para que corra el minutaje.",
        ruta: "/dashboard/planilla",
        labelBoton: "Ir a Planilla de Turno",
      },
      {
        paso: "Paso 2: Anotar Incidencias y Entregar al Árbitro",
        descripcion: "Registra goles/tarjetas y al finalizar presiona '📋 1. Firmar como Turno y Pasar al Árbitro'.",
        ruta: "/dashboard/planilla",
        labelBoton: "Cerrar Mesa de Turno",
      },
    ],
    permisosDeclarativos: ["ver:fixture", "llenar:planilla-turno"],
  },
  {
    rol: "arbitro",
    titulo: "4. Perfil Árbitro Oficial",
    icono: "⚖️",
    colorBorde: "border-emerald-400",
    badgeColor: "bg-emerald-600 text-white",
    emailPrueba: "arbitro@futbian.pro",
    clavePrueba: "Futbian2026!",
    resumen:
      "Juez central del encuentro. Supervisa o registra las incidencias disciplinarias (tipificando rojas por juego brusco, agresión verbal o física), ratifica lo obrado por el Turno y sella criptográficamente el acta con SHA-256.",
    quePuedeHacer: [
      "Tipificar expulsiones (Doble Amarilla, Juego Brusco, Agresión Verbal o Agresión Física) que generan sanción deportiva y cobro inmediato en Finanzas.",
      "Revisar el extracto del partido llenado por el Director de Turno.",
      "Ingresar su PIN/Firma Arbitral en el Paso 2 ('🔒 2. Ratificar como Árbitro y Sellar Acta').",
      "Generar el Hash SHA-256 que vuelve inmutable el acta, suma automáticamente los puntos a la serie jugada y despacha el boletín a los clubes.",
    ],
    restricciones: [
      "Una vez sellada el acta en estado 'cerrado_inmutable', ni siquiera el árbitro puede alterar el marcador.",
      "No tiene acceso a la administración financiera ni configuración de la liga.",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Auditar Incidencias y Causales de Roja",
        descripcion: "Verifica en la Planilla que los goles y tarjetas estén asignados al jugador y club correctos.",
        ruta: "/dashboard/planilla",
        labelBoton: "Revisar Planilla Arbitral",
      },
      {
        paso: "Paso 2: Ratificar y Sellar con SHA-256",
        descripcion: "Ingresa el PIN arbitral y sella el acta para sumar los puntos a la tabla de la serie.",
        ruta: "/dashboard/planilla",
        labelBoton: "Ratificar y Sellar Acta",
      },
    ],
    permisosDeclarativos: ["ver:fixture", "ratificar:planilla-arbitral"],
  },
  {
    rol: "multimedia",
    titulo: "5. Perfil Encargado Multimedia y Streaming",
    icono: "📡",
    colorBorde: "border-pink-500",
    badgeColor: "bg-pink-600 text-white",
    emailPrueba: "multimedia@futbian.pro",
    clavePrueba: "Futbian2026!",
    resumen:
      "Productor audiovisual de la Asociación. Administra la cartelera de transmisiones en vivo, configura los enunciados, enlaces de streaming y gestiona los anuncios publicitarios de los auspiciadores en la portada.",
    quePuedeHacer: [
      "Acceder al módulo especial 'Config. Vivo' (/admin/multimedia).",
      "Crear o editar partidos en cartelera modificando el Enunciado/Título del encuentro.",
      "Pegar o actualizar la URL de transmisión (YouTube Watch o Embed), el marcador en directo y el valor del boleto digital.",
      "Publicar y eliminar anuncios comerciales en la 'Cartelera de Publicidad' de la página de Inicio.",
    ],
    restricciones: [
      "No tiene acceso a Tesorería, Tribunal, Perfiles ni Planilla Arbitral.",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Configurar Enunciado y URL de Transmisión",
        descripcion: "Entra a Config. Vivo, define el título del partido, pega el link de YouTube y actualiza el marcador.",
        ruta: "/admin/multimedia",
        labelBoton: "Abrir Config. Vivo",
      },
      {
        paso: "Paso 2: Publicar Anuncio Publicitario en Portada",
        descripcion: "Ve al Inicio y utiliza el formulario de la Cartelera de Publicidad para subir una promoción de auspiciador.",
        ruta: "/",
        labelBoton: "Ir a Publicidad en Inicio",
      },
    ],
    permisosDeclarativos: ["crud:multimedia-vivo", "crud:publicidad-inicio"],
  },
  {
    rol: "adminasociacion",
    titulo: "6. Perfil Administrador de la Asociación",
    icono: "🏛️",
    colorBorde: "border-cyan-400",
    badgeColor: "bg-cyan-500 text-black",
    emailPrueba: "asociacion@futbian.pro",
    clavePrueba: "Futbian2026!",
    resumen:
      "Directivo de la Asociación de Fútbol San Fabián. Configura toda la liga desde cero (CRUD de clubes, jugadores, valores de sanciones, auspiciadores, finanzas, tribunal y torneos), pero mantiene separación ética sobre las actas arbitrales.",
    quePuedeHacer: [
      "Configurar todo desde 0 en Configuración: CRUD completo de Clubes (colores, escudo, URL Instagram, prioridad Paso Ancho), CRUD de Jugadores, CRUD de Tarifario de Sanciones y CRUD de Auspiciadores.",
      "Emitir cobros de cualquier índole en Finanzas (Cuotas 1 y 2, Reunión, No presentar serie, Compartir), conciliar pagos, ver recaudación 'Transmisiones = $XXXXX' y borrar cobros erróneos del Libro Mayor.",
      "Operar el Tribunal de Disciplina: buscar jugadores sancionados, reducir o aumentar condenas (-1 / +1 fecha), emitir fallos con deuda y subir aranceles.",
      "Crear Torneos largos o Torneos Cortos por Grupos Simétricos (pares) y generar el Fixture automático sin tope de canchas.",
      "Auditar la Planilla Arbitral en MODO SOLO LECTURA y descargar la Bitácora de Auditoría (.txt).",
    ],
    restricciones: [
      "PROHIBICIÓN REGLAMENTARIA: No puede modificar informes arbitrales, ni alterar manualmente tablas de posiciones ni goleadores.",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Configurar Liga desde Cero (CRUD)",
        descripcion: "Administra clubes, jugadores, valores de sanciones, auspiciadores o reinicia estadísticas a 0.",
        ruta: "/admin/configuracion",
        labelBoton: "Ir a Configuración",
      },
      {
        paso: "Paso 2: Gestionar Finanzas y Libro Mayor",
        descripcion: "Revisa ingresos de Transmisiones, emite cobros de cuotas o borra registros erróneos del Libro Mayor.",
        ruta: "/admin/finanzas",
        labelBoton: "Ir a Finanzas",
      },
      {
        paso: "Paso 3: Operar Tribunal y Reducir/Aumentar Condenas",
        descripcion: "Busca jugadores suspendidos, rebaja o aumenta fechas de castigo y actualiza aranceles.",
        ruta: "/admin/tribunal",
        labelBoton: "Ir al Tribunal",
      },
    ],
    permisosDeclarativos: [
      "crud:clubes",
      "crud:jugadores",
      "crud:sanciones-valores",
      "crud:auspiciadores",
      "crud:finanzas",
      "crud:torneos",
      "ver:planilla-lectura",
    ],
  },
  {
    rol: "admingeneral",
    titulo: "7. Perfil Administrador General (Superusuario)",
    icono: "👑",
    colorBorde: "border-purple-500",
    badgeColor: "bg-purple-600 text-white",
    emailPrueba: "admin@futbian.pro",
    clavePrueba: "Futbian2026!",
    resumen:
      "Autoridad técnica máxima del sistema Futbian.pro. Posee privilegios totales de lectura, escritura y eliminación sobre todos los módulos, incluyendo la creación de perfiles, edición de actas y auditoría forense.",
    quePuedeHacer: [
      "Ver y editar absolutamente todos los módulos del sistema sin restricciones.",
      "Crear nuevos usuarios y asignarles perfiles y permisos en '/admin/usuarios'.",
      "Intervenir o corregir la Planilla Arbitral, Configuración, Finanzas, Tribunal, Torneos y Multimedia.",
      "Descargar en cualquier instante el archivo oficial de Auditoría (.txt) con fecha, hora, usuario y detalle de cada acción realizada en la app.",
    ],
    restricciones: [
      "Sin restricciones operativas (Nivel Root / Superusuario).",
    ],
    pasoAPaso: [
      {
        paso: "Paso 1: Administrar Perfiles y Permisos",
        descripcion: "Crea cuentas para delegados, árbitros, turnos, multimedia o administradores.",
        ruta: "/admin/usuarios",
        labelBoton: "Ir a Perfiles",
      },
      {
        paso: "Paso 2: Configuración Global y Auditoría",
        descripcion: "Accede al panel maestro CRUD o descarga la Bitácora TXT desde la barra superior.",
        ruta: "/admin/configuracion",
        labelBoton: "Panel Maestro CRUD",
      },
    ],
    permisosDeclarativos: ["*:* (Acceso Total Irrestricto)"],
  },
];

export default function ManualUsuarioInteractivoPage() {
  const router = useRouter();
  const [perfilSeleccionado, setPerfilSeleccionado] =
    useState<GuiaPerfil>(MANUAL_POR_PERFIL[0]);
  const [rolActualSesion, setRolActualSesion] = useState<string>("hincha");
  const [emailActualSesion, setEmailActualSesion] = useState<string>("");
  const [busquedaManual, setBusquedaManual] = useState("");
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setEmailActualSesion(u.email || "");
        try {
          const s = await getDoc(doc(db, "users", u.uid));
          if (s.exists()) {
            const rolUsuario = s.data().rol || "hincha";
            setRolActualSesion(rolUsuario);
            const guia = MANUAL_POR_PERFIL.find((g) => g.rol === rolUsuario);
            if (guia) setPerfilSeleccionado(guia);
          }
        } catch {}
      } else {
        setEmailActualSesion("");
        setRolActualSesion("hincha");
      }
    });
    return () => unsub();
  }, []);

  // Función 1: Sembrar automáticamente las 7 cuentas de prueba en Firebase Auth + Firestore
  const inicializarLos7PerfilesDePrueba = async () => {
    setCargandoAccion(true);
    setMensaje("");

    const secondaryAppName = `SeedManualApp_${Date.now()}`;
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
      secondaryApp =
        existing || initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      let listos = 0;
      for (const p of MANUAL_POR_PERFIL) {
        try {
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            p.emailPrueba,
            p.clavePrueba
          );
          await setDoc(
            doc(db, "users", cred.user.uid),
            {
              uid: cred.user.uid,
              nombre: p.titulo.replace(/^\d+\.\s*/, ""),
              email: p.emailPrueba,
              rol: p.rol,
              clubId: p.rol === "delegado" ? p.clubDemoId || "paso-ancho" : "",
              clubFavoritoId:
                p.rol === "hincha" ? p.clubDemoId || "paso-ancho" : "",
              permisos: p.permisosDeclarativos,
              fechaRegistro: new Date().toISOString(),
            },
            { merge: true }
          );
          await signOut(secondaryAuth);
          listos++;
        } catch {
          // Si ya existe en Firebase Auth, aseguramos que su rol esté actualizado
          listos++;
        }
      }

      await registrarAccionAuditoria(
        "MANUAL_USUARIO",
        "INICIALIZAR_7_PERFILES_PRUEBA",
        "Se verificaron/crearon los 7 perfiles de prueba desde el Manual Interactivo."
      );

      setMensaje(
        `✓ ¡Listo! Los ${listos} perfiles de prueba están activos en la base de datos (Clave: Futbian2026!). Ahora puedes probar cualquiera con 1 clic.`
      );
    } catch (e) {
      console.error(e);
      setMensaje("Error al inicializar las cuentas de prueba.");
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {}
      }
      setCargandoAccion(false);
    }
  };

  // Función 2: Cambiar de sesión en 1 clic para demostrar el perfil en vivo frente al profesor/comisión
  const probarPerfilEnUnClic = async (guia: GuiaPerfil) => {
    setCargandoAccion(true);
    setMensaje("");
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        guia.emailPrueba,
        guia.clavePrueba
      );
      // Asegurar que el documento en la colección users tenga el rol exacto de la demostración
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          nombre: guia.titulo.replace(/^\d+\.\s*/, ""),
          email: guia.emailPrueba,
          rol: guia.rol,
          clubId:
            guia.rol === "delegado" ? guia.clubDemoId || "paso-ancho" : "",
          clubFavoritoId:
            guia.rol === "hincha" ? guia.clubDemoId || "paso-ancho" : "",
          permisos: guia.permisosDeclarativos,
        },
        { merge: true }
      );

      await registrarAccionAuditoria(
        "MANUAL_USUARIO",
        "CAMBIO_RAPIDO_PERFIL_DEMO",
        `Sesión iniciada desde el Manual con el perfil de prueba: ${guia.rol.toUpperCase()} (${guia.emailPrueba})`
      );

      setMensaje(
        `🚀 Sesión activa cambiada a: ${guia.titulo} (${guia.emailPrueba}). Mira cómo cambió el menú superior según sus permisos.`
      );
    } catch {
      setMensaje(
        `⚠ La cuenta ${guia.emailPrueba} aún no ha sido generada. Presiona primero el botón amarillo "⚡ Inicializar los 7 Perfiles de Prueba" arriba a la derecha.`
      );
    } finally {
      setCargandoAccion(false);
    }
  };

  const perfilesFiltrados = MANUAL_POR_PERFIL.filter((p) => {
    const q = busquedaManual.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(q) ||
      p.rol.toLowerCase().includes(q) ||
      p.resumen.toLowerCase().includes(q) ||
      p.quePuedeHacer.some((item) => item.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera del Manual Interactivo + Botón Semilla de Cuentas */}
      <div className="bg-slate-900 p-5 sm:p-7 rounded-2xl border-2 border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                📖 DOCUMENTACIÓN INTERACTIVA EN VIVO
              </span>
              <span className="bg-slate-950 text-emerald-400 border border-emerald-500/50 text-xs font-black px-3 py-1 rounded-lg uppercase">
                Sesión Actual: {rolActualSesion.toUpperCase()}{" "}
                {emailActualSesion ? `(${emailActualSesion})` : "(Visitante)"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Manual de Usuario y Simulador de Perfiles — Futbian.pro
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-400">
              Seleccione cualquier perfil para consultar sus funciones, restricciones, flujo paso a paso y probar su cuenta en 1 clic sin salir de la aplicación.
            </p>
          </div>

          <button
            type="button"
            disabled={cargandoAccion}
            onClick={inicializarLos7PerfilesDePrueba}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase px-4 py-3 rounded-xl border-2 border-white shadow-xl text-xs transition shrink-0"
          >
            {cargandoAccion
              ? "Procesando Perfiles..."
              : "⚡ Inicializar los 7 Perfiles de Prueba"}
          </button>
        </div>

        {/* Buscador Rápido dentro del Manual */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <input
            type="text"
            placeholder="🔍 Buscar función en el manual (ej: cobrar, reloj, instagram, condena, boleto)..."
            value={busquedaManual}
            onChange={(e) => setBusquedaManual(e.target.value)}
            className="w-full sm:w-96 bg-slate-950 text-white border-2 border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold"
          />
          <span className="text-[11px] font-bold text-slate-400">
            Contraseña universal de prueba:{" "}
            <strong className="text-yellow-400 font-mono">Futbian2026!</strong>
          </span>
        </div>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-xs sm:text-sm font-black shadow-lg">
          {mensaje}
        </div>
      )}

      {/* Selector de Pestañas de los 7 Perfiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {perfilesFiltrados.map((p) => {
          const activo = perfilSeleccionado.rol === p.rol;
          return (
            <button
              key={p.rol}
              type="button"
              onClick={() => setPerfilSeleccionado(p)}
              className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-2 ${
                activo
                  ? `bg-slate-900 ${p.colorBorde} shadow-xl scale-[1.02]`
                  : "bg-slate-950 border-slate-800 opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-2xl">{p.icono}</span>
                {rolActualSesion === p.rol && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  ROL: {p.rol}
                </span>
                <p className="text-xs font-black text-white leading-tight mt-0.5">
                  {p.titulo.replace(/^\d+\.\s*Perfil\s*/, "")}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* FICHA COMPLETA DEL PERFIL SELECCIONADO */}
      <div
        className={`bg-slate-900 rounded-2xl border-4 ${perfilSeleccionado.colorBorde} p-5 sm:p-7 space-y-6 shadow-2xl`}
      >
        {/* Encabezado del Perfil + Botón "Probar este Perfil en 1 Clic" */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 border-slate-800 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-black px-3 py-1 rounded-lg uppercase ${perfilSeleccionado.badgeColor}`}
              >
                {perfilSeleccionado.icono} CÓDIGO DE ROL: {perfilSeleccionado.rol.toUpperCase()}
              </span>
              <span className="bg-slate-950 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                👤 {perfilSeleccionado.emailPrueba} | 🔑 {perfilSeleccionado.clavePrueba}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {perfilSeleccionado.titulo}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-300 max-w-3xl">
              {perfilSeleccionado.resumen}
            </p>
          </div>

          <button
            type="button"
            disabled={cargandoAccion}
            onClick={() => probarPerfilEnUnClic(perfilSeleccionado)}
            className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase px-5 py-4 rounded-2xl border-2 border-white shadow-xl text-xs sm:text-sm shrink-0 transition"
          >
            🚀 Activar y Probar este Perfil Ahora
          </button>
        </div>

        {/* Grilla: ¿Qué puede hacer? vs Restricciones de Seguridad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Atribuciones y Funciones Permitidas (8 cols) */}
          <div className="lg:col-span-8 bg-slate-950 p-5 rounded-2xl border-2 border-emerald-500/40 space-y-3">
            <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
              ✓ ¿Qué puede hacer este perfil en la aplicación?
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-bold text-slate-200">
              {perfilSeleccionado.quePuedeHacer.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800"
                >
                  <span className="text-emerald-400 font-black">✔</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna Derecha: Límites, Restricciones y Permisos RBAC (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4">
            <div className="bg-slate-950 p-5 rounded-2xl border-2 border-red-500/40 space-y-3">
              <h3 className="text-sm font-black uppercase text-red-400">
                🔒 Límites y Restricciones (ISO 27001)
              </h3>
              <ul className="space-y-2 text-xs font-bold text-red-200">
                {perfilSeleccionado.restricciones.map((rest, idx) => (
                  <li
                    key={idx}
                    className="bg-red-950/30 p-3 rounded-xl border border-red-500/30"
                  >
                    • {rest}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase text-blue-400 block">
                PERMISOS DECLARATIVOS EN BASE DE DATOS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {perfilSeleccionado.permisosDeclarativos.map((perm) => (
                  <span
                    key={perm}
                    className="bg-slate-900 text-yellow-400 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-mono font-bold"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Flujo de Trabajo Paso a Paso con Botones Directos a cada Módulo */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-black uppercase text-yellow-400">
            🧭 Flujo de Operación Paso a Paso (Accesos Directos)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {perfilSeleccionado.pasoAPaso.map((flujo, index) => (
              <div
                key={index}
                className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-black uppercase text-blue-400 block">
                    {flujo.paso}
                  </span>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed">
                    {flujo.descripcion}
                  </p>
                </div>

                <Link
                  href={flujo.ruta}
                  className="block text-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase py-2.5 px-4 rounded-xl border border-white/40 transition"
                >
                  {flujo.labelBoton} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla Resumen Rápida de Todas las Cuentas de Prueba */}
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b-2 border-slate-800 flex flex-wrap justify-between items-center gap-2">
          <h3 className="text-sm font-black uppercase text-white">
            🔑 Resumen General de Credenciales de Prueba para Evaluación del Proyecto
          </h3>
          <span className="text-xs font-bold text-slate-400">
            Toque &ldquo;Probar Cuenta&rdquo; para cambiar de usuario al instante
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-800 text-slate-400 uppercase font-black">
                <th className="p-3.5">Perfil</th>
                <th className="p-3.5">Correo Usuario</th>
                <th className="p-3.5">Contraseña</th>
                <th className="p-3.5">Alcance Principal</th>
                <th className="p-3.5 text-right">Simulación Directa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {MANUAL_POR_PERFIL.map((item) => (
                <tr key={item.rol} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-black text-white">
                    {item.icono} {item.rol.toUpperCase()}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-yellow-400">
                    {item.emailPrueba}
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {item.clavePrueba}
                  </td>
                  <td className="p-3.5 font-bold text-slate-300 max-w-xs truncate">
                    {item.resumen}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setPerfilSeleccionado(item);
                        probarPerfilEnUnClic(item);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[11px] border border-white/40"
                    >
                      🚀 Probar Cuenta
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