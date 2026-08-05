import { useState, useEffect } from 'react';
import { Container } from '../models/container';
import { TERMINAL_PROFILES, TerminalConfig } from '../models/terminal';
import { parseBaplieText, BaplieHeaderInfo } from '../parser/baplieParser';
import { parseMovinsText, MovinsMovement } from '../parser/movinsParser';
import { generateSampleBaplieContainers, generateSampleMovinsEDIString } from '../parser/demoData';
import { processMovinsPlanning, MovinsProcessingResult } from '../business/movinsEngine';
import { checkIsDischargeContainer } from '../business/restowEngine';
import { normalizePortCode } from '../parser/portNormalizer';
import { resetPodColors } from '../business/colorEngine';
import { FilterState, DEFAULT_FILTER_STATE } from '../models/filter';
import { applyFilters } from '../business/filterEngine';

import { executeStowageAdjustment, AdjustmentActionRequest, AdjustmentResult, validateContainerStackingRules, StackingRuleViolation } from '../business/adjustmentEngine';

export type ViewMode = 'MATRIZ' | 'ISLA' | 'PATIO' | 'ISLA_OPERATIVA';
export type OperationView = 'DESCARGA' | 'CARGA';

export interface StowageState {
  parsedContainers: Container[]; // Points to active collection based on activeOperationView
  parsedDischargeContainers: Container[]; // 100% BAPLIE (Arrival state - Immutable)
  parsedLoadContainers: Container[]; // BAPLIE Transit + MOVINS Loads (Departure state)
  activeOperationView: OperationView;
  filteredContainers: Container[];
  filters: FilterState;
  uniqueBays: string[];
  activeTerminalKey: string;
  activeTerminal: TerminalConfig;
  activeSelectedBay: string | null;
  currentViewMode: ViewMode;
  selectedContainer: Container | null;
  excelReconciliationList: Partial<Container>[];
  podSequence: string[];
  isTerminalGateOpen: boolean;
  fileName: string;
  movinsFileName: string;
  baplieHeader?: BaplieHeaderInfo;
  movinsMovements: MovinsMovement[];
  restowReport: MovinsProcessingResult | null;
}

function extractUniqueBays(containers: Container[]): string[] {
  const baySet = new Set<string>();
  containers.forEach(c => {
    if (c.bay && c.bay !== 'Dato no disponible') baySet.add(c.bay);
  });
  return Array.from(baySet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

const TERMINAL_STORAGE_KEY = 'stowage_terminal_config';

interface SavedTerminalSettings {
  terminalCode: string;
  terminalName: string;
  currentPort: string;
  updatedAt: string;
}

function getStoredTerminalKey(): string | null {
  try {
    const raw = localStorage.getItem(TERMINAL_STORAGE_KEY);
    if (!raw) return null;
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed.terminalCode && TERMINAL_PROFILES[parsed.terminalCode]) {
        return parsed.terminalCode;
      }
    } else if (TERMINAL_PROFILES[raw]) {
      return raw;
    }
  } catch (e) {
    console.warn('Error reading terminal config from localStorage', e);
  }
  return null;
}

function saveTerminalSetting(key: string) {
  try {
    const profile = TERMINAL_PROFILES[key] || TERMINAL_PROFILES.VER;
    const data: SavedTerminalSettings = {
      terminalCode: key,
      terminalName: profile.name,
      currentPort: profile.homePorts[0] || key,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Error saving terminal config to localStorage', e);
  }
}

const savedTerminalKey = getStoredTerminalKey();
const initialTerminalKey = savedTerminalKey || 'CLSAI';
const hasSavedTerminal = Boolean(savedTerminalKey);

let globalState: StowageState = {
  parsedContainers: [],
  parsedDischargeContainers: [],
  parsedLoadContainers: [],
  activeOperationView: 'DESCARGA',
  filteredContainers: [],
  filters: { ...DEFAULT_FILTER_STATE },
  uniqueBays: [],
  activeTerminalKey: initialTerminalKey,
  activeTerminal: TERMINAL_PROFILES[initialTerminalKey] || TERMINAL_PROFILES.CLSAI || TERMINAL_PROFILES.VER,
  activeSelectedBay: null,
  currentViewMode: 'MATRIZ',
  selectedContainer: null,
  excelReconciliationList: [],
  podSequence: [],
  isTerminalGateOpen: !hasSavedTerminal,
  fileName: 'Sin archivo EDI',
  movinsFileName: 'Sin MOVINS',
  movinsMovements: [],
  restowReport: null
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

function updateFilteredState(state: StowageState): StowageState {
  // Always select source dataset based on activeOperationView
  const sourceDataset = state.activeOperationView === 'CARGA'
    ? state.parsedLoadContainers
    : state.parsedDischargeContainers;

  const filtered = applyFilters(sourceDataset, state.filters, state.activeTerminalKey);
  const bays = extractUniqueBays(filtered.length > 0 ? filtered : sourceDataset);
  const activeBay = state.activeSelectedBay && bays.includes(state.activeSelectedBay)
    ? state.activeSelectedBay
    : (bays.length > 0 ? bays[0] : null);

  return {
    ...state,
    parsedContainers: sourceDataset,
    filteredContainers: filtered,
    uniqueBays: bays,
    activeSelectedBay: activeBay
  };
}

export const stowageStore = {
  getState: () => globalState,

  setTerminal: (key: string) => {
    saveTerminalSetting(key);
    const profile = TERMINAL_PROFILES[key] || TERMINAL_PROFILES.VER;
    resetPodColors();

    const currentDischarge = globalState.parsedDischargeContainers;
    let updatedDischarge = currentDischarge;
    let updatedLoad = globalState.parsedLoadContainers;

    if (currentDischarge.length > 0) {
      updatedDischarge = currentDischarge.map(c => ({
        ...c,
        operation: checkIsDischargeContainer(c, key) ? 'DISCHARGE' as const : 'NO MOVE' as const
      }));

      if (globalState.movinsMovements.length > 0) {
        const result = processMovinsPlanning(updatedDischarge, globalState.movinsMovements, key);
        updatedDischarge = result.parsedDischargeContainers;
        updatedLoad = result.parsedLoadContainers;
      } else {
        updatedLoad = updatedDischarge.filter(c => !checkIsDischargeContainer(c, key));
      }
    }

    globalState = updateFilteredState({
      ...globalState,
      activeTerminalKey: key,
      activeTerminal: profile,
      isTerminalGateOpen: false,
      parsedDischargeContainers: updatedDischarge,
      parsedLoadContainers: updatedLoad
    });
    notify();
  },

  openTerminalGate: () => {
    globalState = { ...globalState, isTerminalGateOpen: true };
    notify();
  },

  closeTerminalGate: () => {
    globalState = { ...globalState, isTerminalGateOpen: false };
    notify();
  },

  setOperationView: (view: OperationView) => {
    globalState = updateFilteredState({
      ...globalState,
      activeOperationView: view
    });
    notify();
  },

  loadBaplieContent: (text: string, fileName: string) => {
    const result = parseBaplieText(text);
    resetPodColors();

    // Auto-detect terminal key matching LOC+11+<PUERTO> (POD)
    let targetTerminalKey = globalState.activeTerminalKey;
    const rawPod = result.headerInfo.pod || (result.containers.find(c => c.pod && c.pod !== 'Dato no disponible')?.pod);

    if (rawPod) {
      const norm = normalizePortCode(rawPod);
      const foundKey = Object.keys(TERMINAL_PROFILES).find(k => {
        const prof = TERMINAL_PROFILES[k];
        return k === norm || prof.homePorts.some(hp => normalizePortCode(hp) === norm || hp.toUpperCase() === rawPod.toUpperCase());
      });
      if (foundKey) {
        targetTerminalKey = foundKey;
        saveTerminalSetting(foundKey);
      }
    }

    const dischargeContainers = result.containers.map(c => ({
      ...c,
      operation: checkIsDischargeContainer(c, targetTerminalKey) ? 'DISCHARGE' as const : 'NO MOVE' as const
    }));

    // Initial load containers = Transit containers from BAPLIE
    const initialLoadContainers = dischargeContainers.filter(
      c => !checkIsDischargeContainer(c, targetTerminalKey)
    );

    globalState = updateFilteredState({
      ...globalState,
      activeTerminalKey: targetTerminalKey,
      activeTerminal: TERMINAL_PROFILES[targetTerminalKey] || TERMINAL_PROFILES.CLSAI || TERMINAL_PROFILES.VER,
      parsedDischargeContainers: dischargeContainers,
      parsedLoadContainers: initialLoadContainers,
      activeOperationView: 'DESCARGA',
      movinsMovements: [],
      movinsFileName: 'Sin MOVINS',
      restowReport: null,
      filters: { ...DEFAULT_FILTER_STATE },
      fileName,
      baplieHeader: result.headerInfo
    });
    notify();
  },

  loadMovinsContent: (text: string, fileName: string) => {
    const movements = parseMovinsText(text);
    const baplieBase = globalState.parsedDischargeContainers.length > 0
      ? globalState.parsedDischargeContainers
      : globalState.parsedContainers;

    const result = processMovinsPlanning(baplieBase, movements, globalState.activeTerminalKey);

    globalState = updateFilteredState({
      ...globalState,
      parsedDischargeContainers: result.parsedDischargeContainers,
      parsedLoadContainers: result.parsedLoadContainers,
      movinsMovements: movements,
      movinsFileName: fileName,
      restowReport: result,
      activeOperationView: 'CARGA'
    });
    notify();
  },

  setContainers: (containers: Container[]) => {
    resetPodColors();
    const dischargeContainers = containers.map(c => ({
      ...c,
      operation: checkIsDischargeContainer(c, globalState.activeTerminalKey) ? 'DISCHARGE' as const : 'NO MOVE' as const
    }));

    const initialLoadContainers = dischargeContainers.filter(
      c => !checkIsDischargeContainer(c, globalState.activeTerminalKey)
    );

    globalState = updateFilteredState({
      ...globalState,
      parsedDischargeContainers: dischargeContainers,
      parsedLoadContainers: initialLoadContainers,
      activeOperationView: 'DESCARGA',
      movinsMovements: [],
      movinsFileName: 'Sin MOVINS',
      restowReport: null
    });
    notify();
  },

  loadFullRealisticDemo: () => {
    const baplie = generateSampleBaplieContainers();
    const movinsStr = generateSampleMovinsEDIString();
    const movements = parseMovinsText(movinsStr);

    resetPodColors();
    const terminalKey = 'CLSAI';
    saveTerminalSetting(terminalKey);
    const profile = TERMINAL_PROFILES.CLSAI || TERMINAL_PROFILES.VER;

    const dischargeContainers = baplie.map(c => ({
      ...c,
      operation: checkIsDischargeContainer(c, terminalKey) ? 'DISCHARGE' as const : 'NO MOVE' as const
    }));

    const result = processMovinsPlanning(dischargeContainers, movements, terminalKey);

    globalState = updateFilteredState({
      ...globalState,
      activeTerminalKey: terminalKey,
      activeTerminal: profile,
      isTerminalGateOpen: false,
      parsedDischargeContainers: result.parsedDischargeContainers,
      parsedLoadContainers: result.parsedLoadContainers,
      movinsMovements: movements,
      fileName: 'BAPLIE_DEMO_CLSAI.edi',
      movinsFileName: 'MOVINS_DEMO_CLSAI.edi',
      restowReport: result,
      activeOperationView: 'DESCARGA',
      filters: { ...DEFAULT_FILTER_STATE }
    });
    notify();
  },

  setFilters: (newFilters: Partial<FilterState>) => {
    globalState = updateFilteredState({
      ...globalState,
      filters: {
        ...globalState.filters,
        ...newFilters
      }
    });
    notify();
  },

  resetFilters: () => {
    globalState = updateFilteredState({
      ...globalState,
      filters: { ...DEFAULT_FILTER_STATE }
    });
    notify();
  },

  setSelectedBay: (bay: string) => {
    globalState = { ...globalState, activeSelectedBay: bay };
    notify();
  },

  setViewMode: (mode: ViewMode) => {
    globalState = { ...globalState, currentViewMode: mode };
    notify();
  },

  setSelectedContainer: (container: Container | null) => {
    globalState = { ...globalState, selectedContainer: container };
    notify();
  },

  setExcelList: (list: Partial<Container>[]) => {
    globalState = { ...globalState, excelReconciliationList: list };
    notify();
  },

  setPodSequence: (seq: string[]) => {
    globalState = { ...globalState, podSequence: seq };
    notify();
  },

  executeAdjustment: (request: AdjustmentActionRequest): AdjustmentResult => {
    const currentDataset = globalState.activeOperationView === 'CARGA'
      ? globalState.parsedLoadContainers
      : globalState.parsedDischargeContainers;

    const result = executeStowageAdjustment(currentDataset, request);

    if (result.success) {
      if (globalState.activeOperationView === 'CARGA') {
        globalState = updateFilteredState({
          ...globalState,
          parsedLoadContainers: result.updatedContainers
        });
      } else {
        globalState = updateFilteredState({
          ...globalState,
          parsedDischargeContainers: result.updatedContainers
        });
      }
      notify();
    }

    return result;
  },

  validateStackingRules: (customContainers?: Container[]): StackingRuleViolation[] => {
    const isBaplieLoaded = Boolean(
      globalState.fileName &&
      globalState.fileName !== 'Sin archivo EDI' &&
      globalState.parsedDischargeContainers.length > 0
    );

    if (!isBaplieLoaded) {
      return [];
    }

    const dataset = customContainers || globalState.parsedContainers;
    return validateContainerStackingRules(dataset);
  }
};

export function useStowageStore() {
  const [state, setState] = useState<StowageState>(globalState);

  useEffect(() => {
    const onChange = () => setState({ ...globalState });
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    ...state,
    setTerminal: stowageStore.setTerminal,
    openTerminalGate: stowageStore.openTerminalGate,
    closeTerminalGate: stowageStore.closeTerminalGate,
    setOperationView: stowageStore.setOperationView,
    loadBaplieContent: stowageStore.loadBaplieContent,
    loadMovinsContent: stowageStore.loadMovinsContent,
    setSelectedBay: stowageStore.setSelectedBay,
    setViewMode: stowageStore.setViewMode,
    setSelectedContainer: stowageStore.setSelectedContainer,
    setExcelList: stowageStore.setExcelList,
    setPodSequence: stowageStore.setPodSequence,
    setContainers: stowageStore.setContainers,
    loadFullRealisticDemo: stowageStore.loadFullRealisticDemo,
    setFilters: stowageStore.setFilters,
    resetFilters: stowageStore.resetFilters,
    executeAdjustment: stowageStore.executeAdjustment,
    validateStackingRules: stowageStore.validateStackingRules
  };
}
