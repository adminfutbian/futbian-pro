// src/types/index.ts

export type UserRole = 'admin' | 'arbitro' | 'tesorero' | 'tribunal' | 'delegado' | 'user';

export type SerieOficial =
  | 'Segunda'
  | 'Primera'
  | 'Super Senior 35'
  | 'Super Senior 40'
  | 'Damas'
  | 'Honor'
  | 'Juvenil';

export const SERIES_OFICIALES: SerieOficial[] = [
  'Segunda',
  'Primera',
  'Super Senior 35',
  'Super Senior 40',
  'Damas',
  'Honor',
  'Juvenil',
];

// Catálogo oficial de causales disciplinarias con sanción deportiva y económica automática
export type CodigoCausalRoja =
  | 'DOBLE_AMARILLA'
  | 'ROJA_DIRECTA_JUEGO_BRUSCO'
  | 'AGRESION_VERBAL'
  | 'AGRESION_FISICA';

export interface ReglaCausalDisciplinaria {
  codigo: CodigoCausalRoja;
  etiqueta: string;
  fechasSuspension: number;
  multaCLP: number;
}

export const CATALOGO_CAUSALES_ROJA: Record<CodigoCausalRoja, ReglaCausalDisciplinaria> = {
  DOBLE_AMARILLA: {
    codigo: 'DOBLE_AMARILLA',
    etiqueta: 'Doble Amarilla (Conducta Antideportiva)',
    fechasSuspension: 1,
    multaCLP: 5000,
  },
  ROJA_DIRECTA_JUEGO_BRUSCO: {
    codigo: 'ROJA_DIRECTA_JUEGO_BRUSCO',
    etiqueta: 'Roja Directa - Juego Brusco Grave',
    fechasSuspension: 2,
    multaCLP: 15000,
  },
  AGRESION_VERBAL: {
    codigo: 'AGRESION_VERBAL',
    etiqueta: 'Roja Directa - Agresión Verbal / Insultos al Árbitro o Rival',
    fechasSuspension: 3,
    multaCLP: 25000,
  },
  AGRESION_FISICA: {
    codigo: 'AGRESION_FISICA',
    etiqueta: 'Roja Directa - Agresión Física / Riña en Cancha',
    fechasSuspension: 6,
    multaCLP: 50000,
  },
};

export interface RedesSocialesClub {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  otra?: string;
}

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
  colorPrimario?: string;
  colorSecundario?: string;
  series?: SerieOficial[];
  escudoUrl?: string;
  redesSociales?: RedesSocialesClub;
  canchaLocal?: string;
  puntos: number;
  goles_favor: number;
  goles_contra: number;
  saldoDeudor: number;
  bloqueadoDeportivo: boolean;
}

export interface Jugador {
  id: string;
  nombre: string;
  rut?: string;
  fechaNacimiento?: string;
  club: string;
  clubId: string;
  serie: SerieOficial;
  goles: number;
  sancionado: boolean;
  fechasPendientes?: number;
}

export interface Incidencia {
  minuto: number;
  tipo: 'gol' | 'amarilla' | 'roja' | 'cambio';
  jugadorId: string;
  jugadorNombre: string;
  equipoId: string;
  equipoNombre: string;
  serie: string;
  causalRoja?: CodigoCausalRoja;
  causalDetalle?: string;
  fechasCastigo?: number;
  multaAsociada?: number;
}

export interface ActaPartido {
  id: string;
  torneoId?: string;
  torneoNombre?: string;
  jornada: number;
  serie: string;
  clubLocalId: string;
  clubLocalNombre: string;
  clubVisitaId: string;
  clubVisitaNombre: string;
  golesLocal: number;
  golesVisita: number;
  incidencias: Incidencia[];
  informeArbitralTexto?: string;
  estado: 'programado' | 'en_juego' | 'cerrado_inmutable';
  firmaArbitro?: string;
  selloInmutabilidad?: string;
  sincronizado: boolean;
  notificadoAClubes?: boolean;
}

export interface Sancion {
  id: string;
  clubId: string;
  clubNombre: string;
  jugadorId?: string;
  jugador: string;
  serie?: string;
  causalCodigo?: CodigoCausalRoja;
  fechasCastigo: number;
  montoMulta: number;
  motivo: string;
  fechaEmision: string;
  origenActaId?: string;
}

export interface NotificacionJornada {
  id?: string;
  actaId: string;
  jornada: number;
  serie: string;
  fechaEnvio: string;
  clubesInvolucrados: string[]; // IDs de local y visita
  resumenMarcador: string;
  detalleGoles: string[];
  detalleSancionesYMultas: string[];
  totalMultaLocal: number;
  totalMultaVisita: number;
  selloHash: string;
}

export interface GrupoTorneo {
  nombreGrupo: string; // Ej: "Grupo A", "Grupo B"
  clubesIds: string[];
  clubesNombres: string[];
}

export interface Torneo {
  id: string;
  nombre: string; // Ej: "Clausura 2026 Minas Ñuble"
  formato: 'LIGA_TODOS_CONTRA_TODOS' | 'GRUPOS_SIMETRICOS_ELIMINATORIA';
  seriesHabilitadas: SerieOficial[];
  cantidadEquipos: number; // Siempre par para grupos simétricos
  clubesParticipantesIds: string[];
  grupos?: GrupoTorneo[];
  faseFinalClasificados: 'CUARTOS' | 'SEMIFINAL' | 'FINAL';
  estado: 'ACTIVO' | 'FINALIZADO';
  fechaCreacion: string;
}