export type PriorityLevel = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'INFO';

export interface AuditError {
  id: string;
  categoria: 'CUADRE' | 'POSICIONES' | 'HUECOS' | 'DESCARGA' | 'CONSISTENCIA' | 'IMO' | 'ESTRUCTURA';
  tipo: string;
  ubicacion: string;
  contenedor: string;
  prioridad: PriorityLevel;
  descripcion: string;
  _above?: any;
  _below?: any;
  _pos?: string;
}

export interface BaplieValidationReport {
  duplicateErrors: Array<{
    position: string;
    bay: string;
    row: string;
    tier: string;
    count: number;
    containers: Array<{ id: string; iso: string; pod?: string }>;
  }>;
  bundles: Array<{
    position: string;
    bay: string;
    row: string;
    tier: string;
    count: number;
    containers: Array<{ id: string; iso: string; pod?: string }>;
  }>;
  floatingContainers: Array<{
    position: string;
    bay: string;
    row: string;
    tier: string;
    id: string;
    iso: string;
    pod: string;
    posBelow: string;
  }>;
  status: 'VALID' | 'INVALID';
  bundleSet: Set<string>;
  dupErrSet: Set<string>;
  floatSet: Set<string>;
  byPos: Record<string, any[]>;
}
