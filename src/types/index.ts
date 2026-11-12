// src/types/index.ts

export type UserRole =
  | 'hincha'
  | 'delegado'
  | 'adminasociacion'
  | 'admingeneral'
  | 'arbitro'
  | 'tesorero'
  | 'tribunal'
  | 'admin'
  | 'user';

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

export const CATALOGO_CAUSALES_ROJA: Record<
  CodigoCausalRoja,
  ReglaCausalDisciplinaria
> = {
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
    etiqueta: 'Roja Directa - Agresión Verbal / Insultos',
    fechasSuspension: 3,
    multaCLP: 25000,
  },
  AGRESION_FISICA: {
    codigo: 'AGRESION_FISICA',
    etiqueta: 'Roja Directa - Agresión Física / Riña',
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

export interface EstadisticaSerieClub {
  puntos: number;
  goles_favor: number;
  goles_contra: number;
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
  prioridadCancha?: boolean; // Prioridad absoluta (ej: Paso Ancho en Estadio Paso Ancho)
  puntos: number;
  goles_favor: number;
  goles_contra: number;
  estadisticasPorSerie?: Record<string, EstadisticaSerieClub>;
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
  fixtureMatchId?: string;
  torneoId?: string;
  torneoNombre?: string;
  jornada: number;
  serie: string;
  cancha?: string;
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

export interface EncuentroFixture {
  id: string;
  jornada: number;
  localId: string;
  localNombre: string;
  visitaId: string;
  visitaNombre: string;
  canchaAsignada: string;
  motivoAsignacion:
    | 'DUELO_MISMO_RECINTO'
    | 'PRIORIDAD_PASO_ANCHO'
    | 'TITULAR_LIBRE'
    | 'LOCALIA_INVERTIDA_ANTITOPE'
    | 'REUBICADO_ESTADIO_LIBRE';
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

export type TipoCargoFinanciero =
  | 'CUOTA_INSCRIPCION_1'
  | 'CUOTA_INSCRIPCION_2'
  | 'INASISTENCIA_REUNION'
  | 'NO_PRESENTACION_SERIE'
  | 'CUOTA_COMPARTIR'
  | 'MULTA_TRIBUNAL_CANCHA'
  | 'OTRO_COBRO';

export interface CargoFinanciero {
  id?: string;
  clubId: string;
  clubNombre: string;
  tipo: TipoCargoFinanciero;
  concepto: string;
  monto: number;
  fecha: string;
  estado: 'PENDIENTE' | 'PAGADO';
  emitidoPor: string;
}

export interface AuditLog {
  id?: string;
  fechaHoraISO: string;
  fechaLegible: string;
  usuarioEmail: string;
  usuarioRol: string;
  modulo: string;
  accion: string;
  detalle: string;
}

export interface Auspiciador {
  id: string;
  nombre: string;
  logoUrl: string;
}

export interface ConfigIdentidadAsociacion {
  nombreAsociacion: string;
  logoAsociacionUrl: string;
  auspiciadores: Auspiciador[];
}

export interface PartidoTransmision {
  id: string;
  jornada: number;
  serie: SerieOficial;
  localNombre: string;
  visitaNombre: string;
  cancha: string;
  precioBoleto: number;
  streamUrl: string;
  enVivo: boolean;
  marcadorVivo: string;
}

export interface NotificacionJornada {
  id?: string;
  actaId: string;
  jornada: number;
  serie: string;
  fechaEnvio: string;
  clubesInvolucrados: string[];
  resumenMarcador: string;
  detalleGoles: string[];
  detalleSancionesYMultas: string[];
  totalMultaLocal: number;
  totalMultaVisita: number;
  selloHash: string;
}

export interface GrupoTorneo {
  nombreGrupo: string;
  clubesIds: string[];
  clubesNombres: string[];
}

export interface Torneo {
  id: string;
  nombre: string;
  formato: 'LIGA_TODOS_CONTRA_TODOS' | 'GRUPOS_SIMETRICOS_ELIMINATORIA';
  seriesHabilitadas: SerieOficial[];
  cantidadEquipos: number;
  clubesParticipantesIds: string[];
  grupos?: GrupoTorneo[];
  faseFinalClasificados: 'CUARTOS' | 'SEMIFINAL' | 'FINAL';
  estado: 'ACTIVO' | 'FINALIZADO';
  fechaCreacion: string;
}