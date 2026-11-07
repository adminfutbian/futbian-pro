// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Futbian.pro - Asociación San Fabián",
  description: "Plataforma PWA Offline-First de Gestión Arbitral y Deportiva",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-white min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="pb-12">{children}</main>
      </body>
    </html>
  );
}