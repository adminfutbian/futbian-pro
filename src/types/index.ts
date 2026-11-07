export type UserRole = 'admin' | 'arbitro' | 'tesorero' | 'tribunal' | 'delegado';

export interface Club {
  id: string;
  nombre: string;
  puntos: number;
  goles_favor: number;
  goles_contra: number;
  saldoDeudor: number;
  bloqueadoDeportivo: boolean;
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