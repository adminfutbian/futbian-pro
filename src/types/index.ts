// src/types/index.ts

export type UserRole =
  | 'hincha'
  | 'delegado'
  | 'turno'
  | 'arbitro'
  | 'multimedia'
  | 'adminasociacion'
  | 'admingeneral'
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

// Duración en minutos por tiempo reglamentario según la serie (ej: 45 min por tiempo = 90 total)
export const TIEMPOS_JUEGO_POR_DEFECTO: Record<SerieOficial, number> = {
  Honor: 45,
  Primera: 40,
  Segunda: 35,
  'Super Senior 35': 35,
  'Super Senior 40': 30,
  Damas: 30,
  Juvenil: 35,
};

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

export interface TarifarioOficial {
  multaAmarilla: number;
  multaDobleAmarilla: number;
  fechasDobleAmarilla: number;
  multaRojaJuegoBrusco: number;
  fechasRojaJuegoBrusco: number;
  multaAgresionVerbal: number;
  fechasAgresionVerbal: number;
  multaAgresionFisica: number;
  fechasAgresionFisica: number;
  cuotaInscripcion1: number;
  cuotaInscripcion2: number;
  multaInasistenciaReunion: number;
  multaNoPresentacionSerie: number;
  cuotaCompartir: number;
  precioBoletoStreaming: number;
  tiemposPorSerie?: Record<SerieOficial, number>;
}

export const TARIFARIO_POR_DEFECTO: TarifarioOficial = {
  multaAmarilla: 2000,
  multaDobleAmarilla: 5000,
  fechasDobleAmarilla: 1,
  multaRojaJuegoBrusco: 15000,
  fechasRojaJuegoBrusco: 2,
  multaAgresionVerbal: 25000,
  fechasAgresionVerbal: 3,
  multaAgresionFisica: 50000,
  fechasAgresionFisica: 6,
  cuotaInscripcion1: 50000,
  cuotaInscripcion2: 50000,
  multaInasistenciaReunion: 15000,
  multaNoPresentacionSerie: 25000,
  cuotaCompartir: 20000,
  precioBoletoStreaming: 2000,
  tiemposPorSerie: TIEMPOS_JUEGO_POR_DEFECTO,
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
  clubFavoritoId?: string;
  permisos?: string[];
  fechaRegistro?: string;
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
  instagramUrl?: string; // URL directa a Instagram del club
  redesSociales?: RedesSocialesClub;
  canchaLocal?: string;
  prioridadCancha?: boolean;
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
  tiempoSegundo?: string; // Ej: "14:22"
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
  registradoPor?: string; // Turno o Árbitro
}

export interface ActaPartido {
  id: string;
  fixtureMatchId?: string;
  torneoId?: string;
  torneoNombre?: string;
  jornada: number;
  serie: string;
  cancha?: string;
  duracionTiempoMinutos?: number;
  clubLocalId: string;
  clubLocalNombre: string;
  clubVisitaId: string;
  clubVisitaNombre: string;
  golesLocal: number;
  golesVisita: number;
  incidencias: Incidencia[];
  informeArbitralTexto?: string;
  estado:
    | 'programado'
    | 'en_juego'
    | 'pendiente_ratificacion_arbitro'
    | 'cerrado_inmutable';
  nombreTurno?: string;
  firmaTurno?: string;
  ratificadoPorArbitro?: boolean;
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
  sitioWeb?: string;
}

export interface AnuncioPublicitario {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl?: string;
  enlaceUrl?: string;
  etiqueta?: string; // Ej: "PROMOCIÓN AUSPICIADOR", "AVISO OFICIAL"
}

export interface ConfigIdentidadAsociacion {
  nombreAsociacion: string;
  logoAsociacionUrl: string;
  auspiciadores: Auspiciador[];
  anuncios?: AnuncioPublicitario[];
}

export interface PartidoTransmision {
  id: string;
  enunciado: string; // Ej: "Gran Clásico Precordillerano - Fecha 3"
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