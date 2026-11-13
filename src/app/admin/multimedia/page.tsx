// src/app/admin/multimedia/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  Club,
  PartidoTransmision,
  SERIES_OFICIALES,
  SerieOficial,
} from "@/types";
import { registrarAccionAuditoria } from "@/lib/auditLogger";

export default function ConfigMultimediaVivoPage() {
  const [transmisiones, setTransmisiones] = useState<PartidoTransmision[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enunciado, setEnunciado] = useState(
    "Transmisión Oficial - Clásico Comunal San Fabián"
  );
  const [jornada, setJornada] = useState(1);
  const [serie, setSerie] = useState<SerieOficial>("Honor");
  const [localNombre, setLocalNombre] = useState("Paso Ancho");
  const [visitaNombre, setVisitaNombre] = useState("CD Los Halcones");
  const [cancha, setCancha] = useState("Estadio Paso Ancho");
  const [precioBoleto, setPrecioBoleto] = useState(2000);
  const [streamUrl, setStreamUrl] = useState(
    "https://www.youtube.com/embed/jfKfPfyJRdk"
  );
  const [marcadorVivo, setMarcadorVivo] = useState("0 - 0 (En Curso)");
  const [enVivo, setEnVivo] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const unsubTrans = onSnapshot(
      collection(db, "transmisiones_vivo"),
      (snap) => {
        const lista: PartidoTransmision[] = snap.docs.map((d) => ({
          ...(d.data() as PartidoTransmision),
          id: d.id,
        }));
        setTransmisiones(lista);
      }
    );

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
    });

    return () => {
      unsubTrans();
      unsubClubes();
    };
  }, []);

  // Convierte links normales de YouTube watch?v=XXX a formato embed automáticamente
  const normalizarStreamUrl = (url: string) => {
    const limpia = url.trim();
    const matchYt = limpia.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (matchYt && matchYt[1]) {
      return `https://www.youtube.com/embed/${matchYt[1]}`;
    }
    return limpia;
  };

  const guardarTransmision = async (e: React.FormEvent) => {
    e.preventDefault();
    const idDoc = editandoId || `live-${Date.now()}`;
    const urlFinal = normalizarStreamUrl(streamUrl);

    const payload: PartidoTransmision = {
      id: idDoc,
      enunciado: enunciado.trim(),
      jornada,
      serie,
      localNombre,
      visitaNombre,
      cancha,
      precioBoleto,
      streamUrl: urlFinal,
      enVivo,
      marcadorVivo,
    };

    await setDoc(doc(db, "transmisiones_vivo", idDoc), payload, {
      merge: true,
    });

    await registrarAccionAuditoria(
      "MULTIMEDIA_VIVO",
      editandoId ? "EDITAR_TRANSMISION" : "CREAR_TRANSMISION",
      `Señal configurada: "${enunciado}" (${localNombre} vs ${visitaNombre}) - URL: ${urlFinal}`
    );

    setMensaje(
      `✓ Señal en vivo "${enunciado}" actualizada y publicada en el módulo En Vivo.`
    );
    setEditandoId(null);
  };

  const cargarParaEditar = (t: PartidoTransmision) => {
    setEditandoId(t.id);
    setEnunciado(t.enunciado || "");
    setJornada(t.jornada);
    setSerie(t.serie);
    setLocalNombre(t.localNombre);
    setVisitaNombre(t.visitaNombre);
    setCancha(t.cancha);
    setPrecioBoleto(t.precioBoleto);
    setStreamUrl(t.streamUrl);
    setMarcadorVivo(t.marcadorVivo);
    setEnVivo(t.enVivo);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-red-500/60">
        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase">
          PERFIL MULTIMEDIA & PRODUCCIÓN STREAMING
        </span>
        <h1 className="text-2xl font-black text-white mt-2">
          Configuración de Partidos En Vivo, Enunciados y URL de Transmisión
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">
          Modifique el título/enunciado de cada transmisión, pegue el link de YouTube/Streaming y actualice el marcador en directo.
        </p>
      </div>

      {mensaje && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-300 p-4 rounded-xl text-xs font-black">
          {mensaje}
        </div>
      )}

      <form
        onSubmit={guardarTransmision}
        className="bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-800 space-y-4"
      >
        <h2 className="text-base font-black text-yellow-400 uppercase border-b-2 border-slate-800 pb-2">
          {editandoId
            ? `Editando Transmisión: ${enunciado}`
            : "Crear / Configurar Señal de Partido en Vivo"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Enunciado / Título del Partido En Vivo
            </label>
            <input
              type="text"
              placeholder="Ej: Gran Clásico Fecha 4 - Transmisión Oficial HD"
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-3 rounded-xl font-bold text-xs"
              required
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-black uppercase text-emerald-400 mb-1">
              URL de Transmisión (YouTube Watch o Embed URL)
            </label>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=... o link embed"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              className="w-full bg-slate-950 text-emerald-300 border-2 border-emerald-500/60 p-3 rounded-xl font-mono text-xs"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Equipo Local
            </label>
            <input
              type="text"
              list="lista-clubes-multimedia"
              value={localNombre}
              onChange={(e) => setLocalNombre(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Equipo Visita
            </label>
            <input
              type="text"
              list="lista-clubes-multimedia"
              value={visitaNombre}
              onChange={(e) => setVisitaNombre(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-xs"
              required
            />
            <datalist id="lista-clubes-multimedia">
              {clubes.map((c) => (
                <option key={c.id} value={c.nombre} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Serie
            </label>
            <select
              value={serie}
              onChange={(e) => setSerie(e.target.value as SerieOficial)}
              className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-xs"
            >
              {SERIES_OFICIALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Marcador / Estado en Vivo
            </label>
            <input
              type="text"
              placeholder="Ej: 2 - 1 (65' ST)"
              value={marcadorVivo}
              onChange={(e) => setMarcadorVivo(e.target.value)}
              className="w-full bg-slate-950 text-yellow-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Recinto / Estadio
            </label>
            <input
              type="text"
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
              className="w-full bg-slate-950 text-white border-2 border-slate-700 p-2.5 rounded-xl font-bold text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">
              Valor Boleto Digital ($)
            </label>
            <input
              type="number"
              step={500}
              value={precioBoleto}
              onChange={(e) => setPrecioBoleto(Number(e.target.value))}
              className="w-full bg-slate-950 text-emerald-400 border-2 border-slate-700 p-2.5 rounded-xl font-black text-xs"
            />
          </div>

          <button
            type="submit"
            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase py-3 px-4 rounded-xl border-2 border-white shadow-lg text-xs"
          >
            {editandoId
              ? "💾 Actualizar Señal en Vivo"
              : "📡 Publicar Partido en Vivo"}
          </button>
        </div>
      </form>

      {/* Cartelera Configurada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {transmisiones.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 p-4 rounded-2xl border-2 border-slate-800 space-y-2"
          >
            <span className="text-[10px] font-black uppercase text-red-400 block">
              ● {t.enunciado}
            </span>
            <h3 className="text-base font-black text-white">
              {t.localNombre} vs {t.visitaNombre} ({t.marcadorVivo})
            </h3>
            <p className="text-xs font-mono text-slate-400 truncate">
              URL: {t.streamUrl}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => cargarParaEditar(t)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase"
              >
                Editar Enunciado / URL
              </button>
              <button
                type="button"
                onClick={() => deleteDoc(doc(db, "transmisiones_vivo", t.id))}
                className="bg-slate-950 text-red-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase"
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}