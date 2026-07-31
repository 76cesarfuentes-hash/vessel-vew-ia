import { Container } from './container';

export interface FilterState {
  category: 'ALL' | 'IMPORT' | 'EXPORT' | 'TRANSIT';
  status: 'ALL' | 'FULL' | 'EMPTY';
  cargoType: 'ALL' | 'DG' | 'RF' | 'OS' | 'TK' | 'DC';
  operator: string;
  pod: string;
  pol: string;
  bay: string;
  row: string;
  tier: string;
  iso: string;
  imoClass: string;
  searchQuery: string;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  category: 'ALL',
  status: 'ALL',
  cargoType: 'ALL',
  operator: 'ALL',
  pod: 'ALL',
  pol: 'ALL',
  bay: 'ALL',
  row: 'ALL',
  tier: 'ALL',
  iso: 'ALL',
  imoClass: 'ALL',
  searchQuery: ''
};
