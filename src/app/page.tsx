import Link from "next/link";

export default function HomePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-3 max-w-xl">
          <span className="bg-blue-600 text-xs font-black uppercase px-3 py-1 rounded-full">
            Arquitectura PWA Offline-First
          </span>
          <h1 className="text-4xl font-black tracking-tight">
            FUTBIAN.PRO — Asociación Deportiva Local San Fabián
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Plataforma integral de gestión arbitral con actas digitales inmutables (SHA-256), conciliación financiero-disciplinaria en tiempo real y programación algorítmica multicancha.
          </p>
          <div className="pt-2 flex gap-3">
            <Link href="/tablas" className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm">
              Ver Tabla de Posiciones
            </Link>
            <Link href="/dashboard/planilla" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-5 py-2.5 rounded-lg text-sm">
              Abrir Planilla en Cancha
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full md:w-72 text-center">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-2xl font-black text-emerald-400">&lt; 100ms</p>
            <p className="text-xs text-slate-400">Latencia Local IndexedDB</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-2xl font-black text-blue-400">&le; 5 seg</p>
            <p className="text-xs text-slate-400">Sincronización Outbox</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-2xl font-black text-yellow-400">100%</p>
            <p className="text-xs text-slate-400">Actas Inmutables</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-2xl font-black text-purple-400">11 Clubes</p>
            <p className="text-xs text-slate-400">5 Series Oficiales</p>
          </div>
        </div>
      </div>
    </div>
  );
}