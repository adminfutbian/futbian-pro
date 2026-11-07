"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard/planilla");
    } catch (err) {
      setError("Credenciales inválidas. Verifica tu correo y contraseña.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Acceso Oficial</h1>
        <p className="text-sm text-gray-500 mb-6">Asociación de Fútbol San Fabián - Futbian.pro</p>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm mb-4 font-medium">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2.5 rounded-lg"
              placeholder="arbitro@futbian.pro"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-2.5 rounded-lg"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Iniciar Sesión
          </button>
        </div>
      </form>
    </div>
  );
}