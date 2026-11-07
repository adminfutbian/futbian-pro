// src/types/index.ts

export type UserRole = 'admin' | 'arbitro' | 'tesorero' | 'tribunal' | 'delegado' | 'user';

export interface UserProfile {
  uid: string;
  nombre: string;
  email: string;
  rol: UserRole;
  clubId?: string;
}

export interface Club {
  id: string;
  nombre: string;
  puntos: number;
  goles_favor: number;
  goles_contra: number;
  saldoDeudor: number;
  bloqueadoDeportivo: boolean;
}

export interface Jugador {
  id: string;
  nombre: string;
  club: string;
  serie: string;
  goles: number;
  sancionado: boolean;
}

export interface Incidencia {
  minuto: number;
  tipo: 'gol' | 'amarilla' | 'roja' | 'cambio';
  jugadorNombre: string;
  equipoId: string;
}

export interface ActaPartido {
  id: string;
  jornada: number;
  serie: string;
  clubLocalId: string;
  clubLocalNombre: string;
  clubVisitaId: string;
  clubVisitaNombre: string;
  golesLocal: number;
  golesVisita: number;
  incidencias: Incidencia[];
  estado: 'programado' | 'en_juego' | 'cerrado_inmutable';
  firmaArbitro?: string;
  selloInmutabilidad?: string;
  sincronizado: boolean;
}

export interface Sancion {
  id: string;
  clubId: string;
  clubNombre: string;
  jugador: string;
  fechasCastigo: number;
  montoMulta: number;
  motivo: string;
  fechaEmision: string;
}