import React, { useState, useMemo } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { Container, getEffectiveCargoType, hasValidTemp } from '../core/models/container';
import {
  getContainerColor,
  getMiniPlanClassificationAndColor,
  IMPORT_ORANGE,
  TRANSIT_GRAY,
  RESTOW_RED,
  getPortColor
} from '../core/business/colorEngine';
import { normalizePortCode } from '../core/parser/portNormalizer';
import { exportToExcel, exportMiniPlanToPDF, printElementViaIframe } from '../core/services/exportService';
import { detectRestows } from '../core/business/restowEngine';
import { RestowAnalysisModal } from '../components/restow/RestowAnalysisModal';
import {
  FileText,
  Download,
  Filter,
  Snowflake,
  Skull,
  ArrowRight,
  ArrowLeftRight,
  Anchor,
  Box,
  Layers,
  X,
  Search,
  Grid,
  CheckCircle2,
  Ship,
  Sparkles,
  Printer,
  RefreshCw,
  Scale
} from 'lucide-react';

export const MiniPlanProView: React.FC = () => {
  const {
    filteredContainers,
    parsedContainers,
    activeTerminalKey,
    activeTerminal,
    activeOperationView,
    setOperationView,
    baplieHeader,
    fileName,
    setSelectedContainer,
    loadBaplieContent
  } = useStowageStore();

  // Active dataset
  const containers = filteredContainers.length > 0 ? filteredContainers : parsedContainers;

  // Filter States
  const [selectedPodFilter, setSelectedPodFilter] = useState<string | null>(null);
  const [selectedCargoFilter, setSelectedCargoFilter] = useState<'ALL' | 'IMO' | 'REEFER' | 'EMPTY' | 'OVERSIZE' | 'TRANSIT'>('ALL');
  const [selectedViewMode, setSelectedViewMode] = useState<'GENERAL' | '20' | '40'>('GENERAL');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isRestowModalOpen, setIsRestowModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Parse container prefix vs number helper (e.g. FFAU7542310 -> prefix: FFAU, number: 7542310)
  const getContainerParts = (id: string) => {
    const clean = (id || '').trim().toUpperCase();
    const match = clean.match(/^([A-Z]{3,4})([0-9A-Z]+)$/i);
    if (match) {
      return { prefix: match[1], number: match[2] };
    }
    return { prefix: '', number: clean };
  };

  // Header Details
  const vesselName = baplieHeader?.vesselName && baplieHeader.vesselName.trim().length > 0
    ? baplieHeader.vesselName.toUpperCase()
    : 'MAERSK SENTOSA';

  const voyage = baplieHeader?.voyage && baplieHeader.voyage.trim().length > 0
    ? baplieHeader.voyage.toUpperCase()
    : '2507W';

  const pol = baplieHeader?.pol && baplieHeader.pol.trim().length > 0
    ? baplieHeader.pol.toUpperCase()
    : 'SHA';

  const date = baplieHeader?.date && baplieHeader.date.trim().length > 0
    ? baplieHeader.date.toUpperCase()
    : '25 JUL 2025';

  // Helper to determine if container is discharge at active terminal
  const checkIsDischarge = (c: Container): boolean => {
    if (!c) return false;
    const rawPod = c.pod || '';
    const normPod = normalizePortCode(rawPod);
    return c.operation === 'DISCHARGE' ||
      normPod === activeTerminalKey ||
      (activeTerminalKey === 'VER' && (normPod === 'VER' || rawPod.includes('VER') || rawPod.includes('ICAVE'))) ||
      (activeTerminalKey === 'LZC' && (normPod === 'LZC' || rawPod.includes('LZC') || rawPod.includes('LAZ') || rawPod.includes('LCT'))) ||
      (activeTerminalKey === 'ZLO' && (normPod === 'ZLO' || rawPod.includes('ZLO') || rawPod.includes('MAN') || rawPod.includes('TIMSA'))) ||
      (activeTerminalKey === 'ETI' && (normPod === 'ETI' || rawPod.includes('ESE') || rawPod.includes('ENS') || rawPod.includes('EIT')));
  };

  // Unique PODs & colors
  const uniquePods = useMemo(() => {
    const pods = new Set<string>();
    containers.forEach(c => {
      if (c.pod && c.pod !== 'Dato no disponible') {
        pods.add(c.pod);
      }
    });
    const arr = Array.from(pods).sort();
    if (arr.length === 0) return ['LZC', 'VAP', 'SAI', 'CLL', 'FIS', 'PEC', 'OTR'];
    return arr;
  }, [containers]);

  // Apply active filters to containers
  const displayedContainers = useMemo(() => {
    return containers.filter(c => {
      // POD Filter
      if (selectedPodFilter && c.pod !== selectedPodFilter) return false;

      // Cargo Type Filter
      const effType = getEffectiveCargoType(c);
      if (selectedCargoFilter === 'IMO') {
        if (effType !== 'DG') return false;
      } else if (selectedCargoFilter === 'REEFER') {
        if (effType !== 'RF') return false;
      } else if (selectedCargoFilter === 'EMPTY') {
        if (effType !== 'MT') return false;
      } else if (selectedCargoFilter === 'OVERSIZE') {
        if (effType !== 'OS') return false;
      } else if (selectedCargoFilter === 'TRANSIT') {
        if (checkIsDischarge(c)) return false;
      }

      // View Mode (Size Filter)
      if (selectedViewMode === '20' && c.size !== 20) return false;
      if (selectedViewMode === '40' && (c.size !== 40 && c.size !== 45)) return false;

      // Search term (supports single or multiple containers separated by comma, space, semicolon or newline)
      if (searchTerm.trim().length > 0) {
        const terms = searchTerm.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);
        if (terms.length > 0) {
          const matchesAnyTerm = terms.some(rawTerm => {
            const term = rawTerm.toLowerCase();
            const digits = rawTerm.replace(/\D/g, '');

            const idMatch = c.id.toLowerCase().includes(term) ||
              (digits.length >= 2 && c.id.replace(/\D/g, '').includes(digits));
            const isoMatch = c.iso?.toLowerCase().includes(term);
            const podMatch = c.pod.toLowerCase().includes(term);
            return idMatch || isoMatch || podMatch;
          });

          if (!matchesAnyTerm) return false;
        }
      }

      return true;
    });
  }, [containers, selectedPodFilter, selectedCargoFilter, selectedViewMode, searchTerm]);

  // Auto-complete suggestion calculation for container search (matches active/last term to full container IDs)
  const searchSuggestions = useMemo(() => {
    const raw = searchTerm.trim();
    if (!raw) return [];
    
    // Extract the active term (the last term typed by user)
    const terms = raw.split(/[\s,;\n]+/).filter(t => t.length > 0);
    const activeTerm = terms[terms.length - 1] || '';
    if (!activeTerm || activeTerm.length < 2) return [];

    const term = activeTerm.toLowerCase();
    const digits = activeTerm.replace(/\D/g, '');

    const matches: Container[] = [];
    const seen = new Set<string>();

    for (const c of containers) {
      if (!c.id || seen.has(c.id)) continue;
      const cIdLower = c.id.toLowerCase();
      const cIdDigits = c.id.replace(/\D/g, '');

      let isMatch = false;
      if (cIdLower.includes(term)) {
        isMatch = true;
      } else if (digits.length >= 2 && cIdDigits.includes(digits)) {
        isMatch = true;
      } else if (c.iso?.toLowerCase().includes(term) || c.pod?.toLowerCase().includes(term)) {
        isMatch = true;
      }

      if (isMatch) {
        matches.push(c);
        seen.add(c.id);
        if (matches.length >= 8) break;
      }
    }

    return matches;
  }, [searchTerm, containers]);

  const handleSelectSuggestion = (c: Container) => {
    const raw = searchTerm.trim();
    const terms = raw.split(/[\s,;\n]+/).filter(t => t.length > 0);
    if (terms.length <= 1) {
      setSearchTerm(c.id);
    } else {
      // Replace last term with chosen container ID
      terms[terms.length - 1] = c.id;
      setSearchTerm(terms.join(', '));
    }
    setSelectedContainer(c);
    setShowSuggestions(false);
  };

  // Normalize container position extraction (bay, row, tier)
  const getNormalizedPos = (c: Container): { bay: number; row: string; tier: string } => {
    let pos = (c.position || '').replace(/\D/g, '');
    let b = (c.bay || '').trim();
    let r = (c.row || '').trim();
    let t = (c.tier || '').trim();

    if (pos.length === 6) {
      if (!b || b === 'Dato no disponible') b = pos.substring(0, 2);
      if (!r || r === 'Dato no disponible') r = pos.substring(2, 4);
      if (!t || t === 'Dato no disponible') t = pos.substring(4, 6);
    } else if (pos.length === 5) {
      pos = pos.padStart(6, '0');
      if (!b || b === 'Dato no disponible') b = pos.substring(0, 2);
      if (!r || r === 'Dato no disponible') r = pos.substring(2, 4);
      if (!t || t === 'Dato no disponible') t = pos.substring(4, 6);
    }

    const bNum = parseInt(b, 10);
    const rNum = parseInt(r, 10);
    const tNum = parseInt(t, 10);

    const normBay = !isNaN(bNum) ? bNum : 1;
    const normRow = !isNaN(rNum) ? rNum.toString().padStart(2, '0') : '00';
    const normTier = !isNaN(tNum) ? tNum.toString().padStart(2, '0') : '82';

    return { bay: normBay, row: normRow, tier: normTier };
  };

  // Group containers by Bay Section
  const bayNumbersList = useMemo(() => {
    const baySet = new Set<number>();
    containers.forEach(c => {
      const { bay } = getNormalizedPos(c);
      if (bay > 0) {
        const oddBay = bay % 2 === 0 ? bay - 1 : bay;
        baySet.add(oddBay);
      }
    });

    const arr = Array.from(baySet).sort((a, b) => b - a); // Descending order (stern to bow)
    if (arr.length === 0) {
      return [21, 17, 13, 9, 5, 1, 29, 19, 15, 11, 7, 3, 40, 35, 33, 31, 27, 23];
    }
    return arr;
  }, [containers]);

  // Map containers to bay numbers
  const bayMap = useMemo(() => {
    const map = new Map<number, Container[]>();
    displayedContainers.forEach(c => {
      const { bay } = getNormalizedPos(c);
      if (bay <= 0) return;

      const oddBay = bay % 2 === 0 ? bay - 1 : bay;
      if (!map.has(oddBay)) {
        map.set(oddBay, []);
      }
      map.get(oddBay)!.push(c);
    });
    return map;
  }, [displayedContainers]);

  // Mapeo de Código de Letra Única por Puerto de Destino (TOS Loading Plan Standard)
  const portLetterMap = useMemo(() => {
    const map = new Map<string, string>();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let letterIndex = 0;

    const predefined: Record<string, string> = {
      'MXZLO': 'X', 'ZLO': 'X',
      'MXLZC': 'M', 'LZC': 'M',
      'MXVER': 'V', 'VER': 'V',
      'CNSHA': 'N', 'SHA': 'N',
      'HKHKG': 'A', 'HKG': 'A',
      'MXESE': 'E', 'ETI': 'E',
      'PECLL': 'P', 'CLL': 'P',
      'CLSAI': 'S', 'SAI': 'S',
      'CLVAP': 'L', 'VAP': 'L',
      'CNNGB': 'C', 'NGB': 'C',
      'TWKHH': 'T', 'KHH': 'T',
      'KRPUS': 'K', 'PUS': 'K',
      'GTPRQ': 'G', 'PRQ': 'G',
      'ECGYE': 'Y', 'GYE': 'Y',
      'ECMEC': 'G', 'MEC': 'G'
    };

    uniquePods.forEach(pod => {
      const norm = normalizePortCode(pod);
      let letter = predefined[norm] || predefined[pod.toUpperCase()];
      if (!letter || Array.from(map.values()).includes(letter)) {
        while (letterIndex < alphabet.length && Array.from(map.values()).includes(alphabet[letterIndex])) {
          letterIndex++;
        }
        if (letterIndex < alphabet.length) {
          letter = alphabet[letterIndex];
          letterIndex++;
        } else {
          letter = pod.charAt(0).toUpperCase();
        }
      }
      map.set(pod, letter);
    });

    return map;
  }, [uniquePods]);

  // Tabla Resumen de Carga por Puerto y Tamaño / Tipo (Identica a la imagen TOS)
  const portSummaryTable = useMemo(() => {
    interface PortRow {
      port: string;
      letter: string;
      c20_F: number;
      c20_E: number;
      c40_R: number;
      c40_F: number;
      c40_E: number;
      c40HC_R: number;
      c40HC_F: number;
      c40HC_E: number;
      c45_R: number;
      c45_F: number;
      c45_E: number;
      total20: number;
      total40: number;
      total45: number;
      grandTotal: number;
    }

    const summaryMap = new Map<string, PortRow>();

    uniquePods.forEach(pod => {
      summaryMap.set(pod, {
        port: pod,
        letter: portLetterMap.get(pod) || pod.charAt(0),
        c20_F: 0, c20_E: 0,
        c40_R: 0, c40_F: 0, c40_E: 0,
        c40HC_R: 0, c40HC_F: 0, c40HC_E: 0,
        c45_R: 0, c45_F: 0, c45_E: 0,
        total20: 0, total40: 0, total45: 0, grandTotal: 0
      });
    });

    displayedContainers.forEach(c => {
      const pod = c.pod || 'OTROS';
      let row = summaryMap.get(pod);
      if (!row) {
        row = {
          port: pod,
          letter: portLetterMap.get(pod) || pod.charAt(0),
          c20_F: 0, c20_E: 0,
          c40_R: 0, c40_F: 0, c40_E: 0,
          c40HC_R: 0, c40HC_F: 0, c40HC_E: 0,
          c45_R: 0, c45_F: 0, c45_E: 0,
          total20: 0, total40: 0, total45: 0, grandTotal: 0
        };
        summaryMap.set(pod, row);
      }

      const effType = getEffectiveCargoType(c);
      const isEmpty = effType === 'MT';
      const isReefer = effType === 'RF';
      const isHC = c.iso?.endsWith('51') || c.iso?.includes('HC') || c.size === 45 || c.iso?.startsWith('45');

      if (c.size === 20) {
        if (isEmpty) row.c20_E++; else row.c20_F++;
        row.total20++;
      } else if (c.size === 40) {
        if (isHC) {
          if (isReefer) row.c40HC_R++;
          else if (isEmpty) row.c40HC_E++;
          else row.c40HC_F++;
        } else {
          if (isReefer) row.c40_R++;
          else if (isEmpty) row.c40_E++;
          else row.c40_F++;
        }
        row.total40++;
      } else if (c.size === 45) {
        if (isReefer) row.c45_R++;
        else if (isEmpty) row.c45_E++;
        else row.c45_F++;
        row.total45++;
      } else {
        row.c20_F++;
        row.total20++;
      }
      row.grandTotal++;
    });

    const rows = Array.from(summaryMap.values());

    const totals: PortRow = {
      port: 'Total',
      letter: '',
      c20_F: rows.reduce((acc, r) => acc + r.c20_F, 0),
      c20_E: rows.reduce((acc, r) => acc + r.c20_E, 0),
      c40_R: rows.reduce((acc, r) => acc + r.c40_R, 0),
      c40_F: rows.reduce((acc, r) => acc + r.c40_F, 0),
      c40_E: rows.reduce((acc, r) => acc + r.c40_E, 0),
      c40HC_R: rows.reduce((acc, r) => acc + r.c40HC_R, 0),
      c40HC_F: rows.reduce((acc, r) => acc + r.c40HC_F, 0),
      c40HC_E: rows.reduce((acc, r) => acc + r.c40HC_E, 0),
      c45_R: rows.reduce((acc, r) => acc + r.c45_R, 0),
      c45_F: rows.reduce((acc, r) => acc + r.c45_F, 0),
      c45_E: rows.reduce((acc, r) => acc + r.c45_E, 0),
      total20: rows.reduce((acc, r) => acc + r.total20, 0),
      total40: rows.reduce((acc, r) => acc + r.total40, 0),
      total45: rows.reduce((acc, r) => acc + r.total45, 0),
      grandTotal: rows.reduce((acc, r) => acc + r.grandTotal, 0)
    };

    return { rows, totals };
  }, [displayedContainers, uniquePods, portLetterMap]);

  // Dynamically compute Rows (including row '00') and Deck/Hold Tiers based on BAPLIE dataset
  const { dynamicRows, dynamicDeckTiers, dynamicHoldTiers } = useMemo(() => {
    const rowNums = new Set<number>();
    const deckTierNums = new Set<number>();
    const holdTierNums = new Set<number>();

    containers.forEach(c => {
      const { row, tier } = getNormalizedPos(c);
      const rVal = parseInt(row, 10);
      const tVal = parseInt(tier, 10);

      if (!isNaN(rVal)) rowNums.add(rVal);
      if (!isNaN(tVal)) {
        if (tVal >= 70) deckTierNums.add(tVal);
        else holdTierNums.add(tVal);
      }
    });

    const evenRows = Array.from(rowNums).filter(r => r % 2 === 0 && r > 0);
    const oddRows = Array.from(rowNums).filter(r => r % 2 !== 0);

    let maxEven = Math.max(12, ...evenRows);
    if (maxEven % 2 !== 0) maxEven++;

    let maxOdd = Math.max(11, ...oddRows);
    if (maxOdd % 2 === 0) maxOdd++;

    const rows: string[] = [];
    // Even rows descending (Port/Babor side)
    for (let i = maxEven; i >= 2; i -= 2) {
      rows.push(i.toString().padStart(2, '0'));
    }
    // Mandatory Row 00 in center
    rows.push('00');
    // Odd rows ascending (Starboard/Estribor side)
    for (let i = 1; i <= maxOdd; i += 2) {
      rows.push(i.toString().padStart(2, '0'));
    }

    // Deck Tiers (>= 70)
    let deckTiers: string[] = [];
    if (deckTierNums.size > 0) {
      let maxDeck = Math.max(90, ...deckTierNums);
      if (maxDeck % 2 !== 0) maxDeck++;
      let minDeck = Math.min(74, ...deckTierNums);
      if (minDeck % 2 !== 0) minDeck--;
      for (let t = maxDeck; t >= Math.max(70, minDeck); t -= 2) {
        deckTiers.push(t.toString().padStart(2, '0'));
      }
    } else {
      deckTiers = ['90', '88', '86', '84', '82', '80', '78', '76', '74'];
    }

    // Hold Tiers (< 70)
    let holdTiers: string[] = [];
    if (holdTierNums.size > 0) {
      let maxHold = Math.max(12, ...holdTierNums);
      if (maxHold % 2 !== 0) maxHold++;
      let minHold = Math.min(2, ...holdTierNums);
      if (minHold % 2 !== 0) minHold--;
      for (let t = maxHold; t >= Math.max(0, minHold); t -= 2) {
        holdTiers.push(t.toString().padStart(2, '0'));
      }
    } else {
      holdTiers = ['12', '10', '08', '06', '04', '02', '00'];
    }

    return {
      dynamicRows: rows,
      dynamicDeckTiers: deckTiers,
      dynamicHoldTiers: holdTiers
    };
  }, [containers]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Handle Visual A3 PDF Export directly capturing MiniPlanProView
  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      try {
        const res = await exportMiniPlanToPDF('mini-plan-print-area', `Mini_Plan_${vesselName.replace(/\s+/g, '_')}`);
        if (!res.success) {
          console.warn('PDF Canvas error, falling back to iframe print wrapper:', res.message);
          printElementViaIframe('mini-plan-print-area');
        }
      } catch (err) {
        console.error('Error al exportar Mini Plan PDF, ejecutando impresion mediante iframe:', err);
        printElementViaIframe('mini-plan-print-area');
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 120);
  };

  // Handle direct isolated browser print (A3 Landscape via dedicated iframe)
  const handlePrint = () => {
    printElementViaIframe('mini-plan-print-area');
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    exportToExcel(displayedContainers, 'Mini_Plan_Estiba_Veronica');
  };

  // Restow calculations
  const restowItems = useMemo(() => {
    return detectRestows(containers, activeTerminalKey);
  }, [containers, activeTerminalKey]);

  const restowSet = useMemo(() => {
    return new Set(restowItems.map(r => r.id));
  }, [restowItems]);

  // Render Search Input with autocomplete dropdown & multi-container support
  const renderSearchInputWithAutocomplete = (placeholder = "Buscar varios N° (ej: 7542310, 8912341)...") => {
    const topSuggestion = searchSuggestions[0];
    const terms = searchTerm.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);
    const isMultiSearch = terms.length > 1;
    const isNumericOnly = /^\d+$/.test(searchTerm.trim());

    return (
      <div className="relative flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-[#030914] border border-[#1B3452] focus-within:border-cyan-400 rounded-lg px-3 py-1.5 transition-all shadow-inner">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchSuggestions.length > 0) {
                e.preventDefault();
                handleSelectSuggestion(searchSuggestions[0]);
              }
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
          />
          {isMultiSearch && (
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
              {terms.length} N°s
            </span>
          )}
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSuggestions(false);
              }}
              className="text-slate-400 hover:text-white cursor-pointer"
              title="Limpiar Búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Floating Autocomplete Dropdown */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[#091526] border border-cyan-500/50 rounded-lg shadow-2xl z-50 overflow-hidden font-mono divide-y divide-slate-800 animate-fadeIn">
            <div className="bg-[#050D19] px-3 py-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Sugerencias ({searchSuggestions.length})
              </span>
              <span className="text-slate-500 text-[9px]">Presiona [Enter] para elegir</span>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {searchSuggestions.map((s) => {
                const { prefix, number } = getContainerParts(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="px-3 py-2 hover:bg-[#10243E] cursor-pointer flex items-center justify-between text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {prefix ? (
                        <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-black px-1.5 py-0.5 rounded text-[10px]">
                          {prefix}
                        </span>
                      ) : null}
                      <span className="font-bold text-white group-hover:text-cyan-300">
                        {number}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({s.id})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-amber-400 font-bold">POD: {s.pod}</span>
                      <span className="text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded">
                        Pos: {s.bay}-{s.row}-{s.tier}
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {s.size}' {s.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fast autocomplete pill for numeric search */}
        {isNumericOnly && topSuggestion && (
          <div className="absolute left-0 top-full mt-1 z-40 flex items-center gap-1.5 bg-[#030A16] border border-cyan-500/50 px-2 py-1 rounded-md shadow-lg">
            <span className="text-[10px] text-slate-400 font-mono">Autocompletado:</span>
            <button
              onClick={() => handleSelectSuggestion(topSuggestion)}
              className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{topSuggestion.id}</span>
              <span className="text-[9px] text-slate-400">(POD: {topSuggestion.pod})</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="mini-plan-print-area" className="flex flex-col h-full bg-[#030914] text-slate-100 font-sans overflow-hidden select-none" style={{ backgroundColor: '#030914', color: '#F1F5F9' }}>
      
      {/* ── 1. MAIN TOP HEADER BAR (Matching reference image) ── */}
      <header className="bg-[#051120] border-b border-[#13263B] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0" style={{ backgroundColor: '#051120', borderColor: '#13263B' }}>
        
        {/* Left Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
            <Anchor className="w-5 h-5 text-black font-black" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-black tracking-wider text-white flex items-center gap-2 leading-none" style={{ color: '#FFFFFF' }}>
              VERONICA
            </h1>
            <span className="text-[9px] font-mono text-cyan-400 tracking-widest block mt-0.5 font-bold uppercase" style={{ color: '#22D3EE' }}>
              STOWAGE OPTIMIZATION SYSTEM
            </span>
          </div>
        </div>

        {/* Center Vessel Parameters */}
        <div className="flex items-center gap-6 font-mono text-xs flex-wrap bg-[#030A16] px-4 py-1.5 rounded-lg border border-[#142A42]" style={{ backgroundColor: '#030A16', borderColor: '#142A42' }}>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold" style={{ color: '#64748B' }}>M.V.</span>
            <span className="text-white font-black uppercase tracking-wide" style={{ color: '#FFFFFF' }}>{vesselName}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" style={{ backgroundColor: '#1E293B' }} />
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold" style={{ color: '#64748B' }}>VOYAGE</span>
            <span className="text-white font-black uppercase" style={{ color: '#FFFFFF' }}>{voyage}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" style={{ backgroundColor: '#1E293B' }} />
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold" style={{ color: '#64748B' }}>POL</span>
            <span className="text-cyan-400 font-black uppercase" style={{ color: '#22D3EE' }}>{pol}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" style={{ backgroundColor: '#1E293B' }} />
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold" style={{ color: '#64748B' }}>DATE</span>
            <span className="text-white font-black uppercase" style={{ color: '#FFFFFF' }}>{date}</span>
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2 print:hidden">
          {/* Quick Search Input with Numeric Autocomplete */}
          <div className="w-64 hidden sm:block">
            {renderSearchInputWithAutocomplete("Buscar sólo N° (ej: 7542310)...")}
          </div>

          {/* Restow & Weight Audit Button */}
          <button
            onClick={() => setIsRestowModalOpen(true)}
            className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/60 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            title="Detección de restibas y reglas de buena estiba (malla de pesos)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            Restibas ({restowItems.length})
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="bg-[#09182A] hover:bg-[#0E243D] text-slate-200 border border-[#1C3654] hover:border-cyan-500/50 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            {isGeneratingPDF ? 'Generando PDF...' : 'Exportar PDF'}
          </button>

          {/* Direct Print Button */}
          <button
            onClick={handlePrint}
            className="bg-[#09182A] hover:bg-[#0E243D] text-slate-200 border border-[#1C3654] hover:border-blue-500/50 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Imprimir o guardar como PDF mediante el diálogo del navegador"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" /> Imprimir A3
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="bg-[#09182A] hover:bg-[#0E243D] text-slate-200 border border-[#1C3654] hover:border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Excel
          </button>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isFilterDrawerOpen
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                : 'bg-[#0066FF] hover:bg-blue-600 text-white shadow-[0_0_12px_rgba(0,102,255,0.4)]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
          </button>
        </div>
      </header>

      {/* ── 2. SECOND TOOLBAR BAR: OPERATION SELECTOR, BUSINESS CLASSIFICATION LEGEND & POD LEGEND ── */}
      <div className="bg-[#050D1A] border-b border-[#102033] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono flex-shrink-0">
        
        {/* Selector de Modo de Operación (DESCARGA vs CARGA) & Clasificación REGLAS DE NEGOCIO */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#030A16] p-1 rounded-lg border border-[#142A42]">
            <button
              onClick={() => setOperationView('DESCARGA')}
              className={`px-3 py-1 rounded text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                activeOperationView === 'DESCARGA'
                  ? 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>DESCARGA</span>
            </button>
            <button
              onClick={() => setOperationView('CARGA')}
              className={`px-3 py-1 rounded text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                activeOperationView === 'CARGA'
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>CARGA</span>
            </button>
          </div>

          {/* Business Rules Color Classification Legend */}
          <div className="flex items-center gap-2 bg-[#020710] px-3 py-1 rounded-lg border border-[#132438]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              REGLAS MINI PLANO ({activeOperationView}):
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
              {activeOperationView === 'DESCARGA' ? (
                <>
                  <span className="px-2 py-0.5 rounded text-white font-mono flex items-center gap-1 shadow-xs" style={{ backgroundColor: IMPORT_ORANGE }}>
                    IMPORTACIÓN (NARANJA)
                  </span>
                  <span className="px-2 py-0.5 rounded text-white font-mono flex items-center gap-1 shadow-xs" style={{ backgroundColor: TRANSIT_GRAY }}>
                    TRÁNSITO (GRIS)
                  </span>
                  <span className="px-2 py-0.5 rounded text-white font-mono flex items-center gap-1 shadow-xs ring-1 ring-red-400 animate-pulse" style={{ backgroundColor: RESTOW_RED }}>
                    RESTIBA (ROJO)
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded text-white font-mono flex items-center gap-1 shadow-xs" style={{ backgroundColor: getPortColor(activeTerminalKey) }}>
                    EXPORTACIÓN ({activeTerminalKey})
                  </span>
                  <span className="px-2 py-0.5 rounded text-white font-mono flex items-center gap-1 shadow-xs" style={{ backgroundColor: TRANSIT_GRAY }}>
                    TRÁNSITO (GRIS)
                  </span>
                  <span className="px-2 py-0.5 rounded text-white font-mono flex items-center gap-1 shadow-xs ring-1 ring-red-400 animate-pulse" style={{ backgroundColor: RESTOW_RED }}>
                    RESTIBA (ROJO)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Leyenda POD */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">POD:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {uniquePods.map(pod => {
              const color = getContainerColor(pod, activeTerminalKey);
              const isSelected = selectedPodFilter === pod;
              const count = containers.filter(c => c.pod === pod).length;

              return (
                <button
                  key={pod}
                  onClick={() => setSelectedPodFilter(isSelected ? null : pod)}
                  className={`px-2 py-0.5 rounded text-[10px] font-black font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 scale-105 shadow-[0_0_10px_rgba(0,229,255,0.4)] border-white'
                      : 'border-transparent opacity-90 hover:opacity-100 hover:border-slate-600'
                  }`}
                  style={{
                    backgroundColor: color,
                    color: '#FFFFFF'
                  }}
                >
                  <span>{pod}</span>
                  {count > 0 && (
                    <span className="bg-black/40 text-white px-1 rounded text-[8.5px]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {selectedPodFilter && (
              <button
                onClick={() => setSelectedPodFilter(null)}
                className="text-slate-400 hover:text-white text-[10px] underline ml-1 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tipo de Carga */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">TIPO DE CARGA:</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedCargoFilter(selectedCargoFilter === 'IMO' ? 'ALL' : 'IMO')}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                selectedCargoFilter === 'IMO'
                  ? 'bg-red-950 text-red-300 border-red-500 ring-1 ring-red-400'
                  : 'bg-[#0A1626] text-slate-300 border-[#182C44] hover:border-slate-600'
              }`}
            >
              <Skull className="w-3 h-3 text-red-400" /> IMO
            </button>

            <button
              onClick={() => setSelectedCargoFilter(selectedCargoFilter === 'REEFER' ? 'ALL' : 'REEFER')}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                selectedCargoFilter === 'REEFER'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500 ring-1 ring-cyan-400'
                  : 'bg-[#0A1626] text-slate-300 border-[#182C44] hover:border-slate-600'
              }`}
            >
              <Snowflake className="w-3 h-3 text-cyan-400" /> Reefer
            </button>

            <button
              onClick={() => setSelectedCargoFilter(selectedCargoFilter === 'EMPTY' ? 'ALL' : 'EMPTY')}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                selectedCargoFilter === 'EMPTY'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 ring-1 ring-emerald-400'
                  : 'bg-[#0A1626] text-slate-300 border-[#182C44] hover:border-slate-600'
              }`}
            >
              <span className="w-3 h-3 rounded-full border border-emerald-400 flex items-center justify-center text-[8px] font-black text-emerald-400">E</span> Empty
            </button>

            <button
              onClick={() => setSelectedCargoFilter(selectedCargoFilter === 'OVERSIZE' ? 'ALL' : 'OVERSIZE')}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                selectedCargoFilter === 'OVERSIZE'
                  ? 'bg-amber-950 text-amber-300 border-amber-500 ring-1 ring-amber-400'
                  : 'bg-[#0A1626] text-slate-300 border-[#182C44] hover:border-slate-600'
              }`}
            >
              <ArrowRight className="w-3 h-3 text-amber-400" /> Oversize
            </button>

            <button
              onClick={() => setSelectedCargoFilter(selectedCargoFilter === 'TRANSIT' ? 'ALL' : 'TRANSIT')}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                selectedCargoFilter === 'TRANSIT'
                  ? 'bg-purple-950 text-purple-300 border-purple-500 ring-1 ring-purple-400'
                  : 'bg-[#0A1626] text-slate-300 border-[#182C44] hover:border-slate-600'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3 text-purple-400" /> Tránsito
            </button>

            {selectedCargoFilter !== 'ALL' && (
              <button
                onClick={() => setSelectedCargoFilter('ALL')}
                className="text-slate-400 hover:text-white text-[10px] underline ml-1 cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>
        </div>

        {/* Vista Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">VISTA:</span>
          <div className="flex bg-[#030A16] p-0.5 rounded-lg border border-[#142A42]">
            <button
              onClick={() => setSelectedViewMode('GENERAL')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                selectedViewMode === 'GENERAL'
                  ? 'bg-[#0066FF] text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setSelectedViewMode('20')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                selectedViewMode === '20'
                  ? 'bg-[#0066FF] text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              20' HC
            </button>
            <button
              onClick={() => setSelectedViewMode('40')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                selectedViewMode === '40'
                  ? 'bg-[#0066FF] text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              40' HC
            </button>
          </div>
        </div>

      </div>

      {/* Filter Drawer (Optional expandable search panel) */}
      {isFilterDrawerOpen && (
        <div className="bg-[#071526] border-b border-[#1B3452] p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-fadeIn flex-shrink-0">
          <div className="flex-1 max-w-lg">
            {renderSearchInputWithAutocomplete("Escribe número de contenedor (ej: 7542310)...")}
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span>Total mostrados: <strong className="text-cyan-400 font-bold">{displayedContainers.length}</strong> / {containers.length}</span>
            <button
              onClick={() => {
                setSelectedPodFilter(null);
                setSelectedCargoFilter('ALL');
                setSelectedViewMode('GENERAL');
                setSearchTerm('');
              }}
              className="text-xs text-cyan-400 hover:underline font-bold"
            >
              Restablecer Filtros
            </button>
          </div>
        </div>
      )}

      {/* ── 3. MAIN WORKSPACE GRID OF BAY CARDS (Identical layout to reference image) ── */}
      <main className="flex-1 overflow-y-auto p-3.5 space-y-4" style={{ backgroundColor: '#030914' }}>
        
        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {bayNumbersList.map(bayNum => {
            const bayStr = bayNum.toString().padStart(2, '0');
            const evenBayStr = (bayNum + 1).toString().padStart(2, '0');
            
            // Container list for this bay
            const bayContainers = bayMap.get(bayNum) || [];

            // Counts
            const dischargeCount = bayContainers.filter(c => checkIsDischarge(c)).length;
            const transitCount = bayContainers.filter(c => !checkIsDischarge(c)).length;
            const totalCount = bayContainers.length;

            const imoCount = bayContainers.filter(c => getEffectiveCargoType(c) === 'DG').length;
            const reeferCount = bayContainers.filter(c => getEffectiveCargoType(c) === 'RF').length;
            const emptyCount = bayContainers.filter(c => getEffectiveCargoType(c) === 'MT').length;
            const osCount = bayContainers.filter(c => getEffectiveCargoType(c) === 'OS').length;

            // Secondary label (e.g., "(18)" or "(20' only in hold)" or "(02)")
            let subTitle = `(${evenBayStr})`;
            if (bayNum === 21 || bayNum === 29) subTitle = "(20' only in hold)";
            if (bayNum === 40) subTitle = "";
            if (bayNum === 35) subTitle = "";

            return (
              <div
                key={bayNum}
                className="bg-[#071322] border border-[#13263B] rounded-xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all group"
                style={{ backgroundColor: '#071322', borderColor: '#13263B' }}
              >
                
                {/* ── BAY CARD HEADER ── */}
                <div className="bg-[#081729] border-b border-[#122438] px-2.5 py-1.5 flex items-center justify-between" style={{ backgroundColor: '#081729', borderColor: '#122438' }}>
                  <span className="font-mono text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#FFFFFF' }}>
                    BAY {bayStr} <span className="text-[10px] text-slate-400 font-normal" style={{ color: '#94A3B8' }}>{subTitle}</span>
                  </span>
                  {totalCount > 0 && (
                    <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800" style={{ backgroundColor: '#083344', borderColor: '#155E75', color: '#22D3EE' }}>
                      {totalCount}U
                    </span>
                  )}
                </div>

                {/* ── BAY CROSS-SECTION CANVAS (Deck & Hold Matrix Grid) ── */}
                <div className="p-2 font-mono text-[9px] bg-[#071322] space-y-2" style={{ backgroundColor: '#071322' }}>
                  
                  {/* 1. TOP COLUMN ROW HEADERS (18 16 14 12 10 08 06 04 02 00 01 03 05 07 09 11...) */}
                  <div
                    className="grid text-[8.5px] font-black text-slate-400 items-center border-b border-[#13263B] pb-1"
                    style={{
                      gridTemplateColumns: `22px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                      gap: '2px'
                    }}
                  >
                    <div className="text-[7.5px] text-slate-500 font-bold text-center">T/R</div>
                    {dynamicRows.map(row => (
                      <div key={row} className="text-center font-mono font-bold text-slate-300">
                        {row}
                      </div>
                    ))}
                  </div>

                  {/* 2. DECK SECTION GRID */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black tracking-wider text-cyan-400 uppercase bg-[#081A2E] px-1.5 py-0.5 rounded-xs border border-[#142A42]">
                      <span>CUBIERTA / DECK</span>
                      <span className="text-[7px] text-slate-400 font-normal">Tiers {dynamicDeckTiers[0] || '90'}-{dynamicDeckTiers[dynamicDeckTiers.length - 1] || '80'}</span>
                    </div>

                    <div className="space-y-0.5">
                      {dynamicDeckTiers.map(tier => (
                        <div
                          key={tier}
                          className="grid items-center"
                          style={{
                            gridTemplateColumns: `22px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                            gap: '2px'
                          }}
                        >
                          {/* Tier Label Sidebar */}
                          <div className="text-[7.5px] font-extrabold text-slate-400 text-right pr-1 flex-shrink-0 font-mono">
                            {tier}
                          </div>

                          {/* Grid Cells for each Row */}
                          {dynamicRows.map(row => {
                            const matched = bayContainers.find(c => {
                              const pos = getNormalizedPos(c);
                              return pos.row === row && pos.tier === tier;
                            });

                            if (matched) {
                              const isRestow = restowSet.has(matched.id || matched.containerId);
                              const classRes = getMiniPlanClassificationAndColor(
                                matched,
                                activeOperationView,
                                activeTerminalKey,
                                isRestow
                              );
                              const effTypeDeck = getEffectiveCargoType(matched);
                              const isEmptyDeck = effTypeDeck === 'MT';
                              const isDgDeck = effTypeDeck === 'DG';
                              const isRfDeck = effTypeDeck === 'RF';
                              const isOsDeck = effTypeDeck === 'OS';
                              const portLetter = portLetterMap.get(matched.pod) || matched.pod.charAt(0);

                              const topLabel = isRestow ? '🔄' : isDgDeck ? 'DG' : isRfDeck ? 'RF' : isEmptyDeck ? 'MT' : isOsDeck ? 'OOG' : `${matched.size}'`;
                              const bottomLabel = matched.pod || portLetter;

                              return (
                                <div
                                  key={row}
                                  onClick={() => setSelectedContainer(matched)}
                                  title={`[${matched.containerId}] POD: ${matched.pod} (Letra: ${portLetter}) | Tipo: ${classRes.label} | Position: Bay ${bayStr} Row ${row} Tier ${tier} | ${matched.size}' ${matched.status}${isRestow ? ' | 🔄 RESTIBA REQUERIDA' : ''}`}
                                  className={`aspect-[1/1.05] rounded-xs border border-black/50 flex flex-col items-center justify-center font-mono cursor-pointer transition-all hover:scale-150 hover:z-40 shadow-xs leading-none overflow-hidden p-[1px] select-none ${
                                    isRestow ? 'ring-2 ring-red-400 animate-pulse font-extrabold' : ''
                                  }`}
                                  style={{ backgroundColor: classRes.color, color: '#FFFFFF' }}
                                >
                                  <span className="text-[6px] font-black text-white/90 leading-none truncate max-w-full drop-shadow-xs">
                                    {topLabel}
                                  </span>
                                  <span className="text-[7px] font-black uppercase tracking-tighter text-white leading-none truncate max-w-full drop-shadow-xs mt-[1px]">
                                    {bottomLabel}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={row}
                                className="aspect-[1/1.05] rounded-xs border border-[#13263B]/60 bg-[#040C16]/60 flex items-center justify-center font-mono select-none"
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. HATCH COVER / DECK SEPARATION LINE (TAPA DE ESCOTILLA) */}
                  <div className="my-1.5 border-t-2 border-b-2 border-cyan-500/70 bg-[#0A1D30] py-0.5 px-2 text-[7.5px] font-mono font-black text-cyan-300 uppercase tracking-widest text-center flex items-center justify-center gap-1.5 rounded-xs shadow-xs">
                    <div className="h-0.5 flex-1 bg-cyan-500/50" />
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      CUBIERTA / HATCH COVER
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </span>
                    <div className="h-0.5 flex-1 bg-cyan-500/50" />
                  </div>

                  {/* 4. HOLD SECTION GRID */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black tracking-wider text-slate-300 uppercase bg-[#081A2E] px-1.5 py-0.5 rounded-xs border border-[#142A42]">
                      <span>BODEGA / HOLD</span>
                      <span className="text-[7px] text-slate-400 font-normal">Tiers {dynamicHoldTiers[0] || '18'}-{dynamicHoldTiers[dynamicHoldTiers.length - 1] || '02'}</span>
                    </div>

                    <div className="space-y-0.5">
                      {dynamicHoldTiers.map(tier => (
                        <div
                          key={tier}
                          className="grid items-center"
                          style={{
                            gridTemplateColumns: `22px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                            gap: '2px'
                          }}
                        >
                          {/* Tier Label Sidebar */}
                          <div className="text-[7.5px] font-extrabold text-slate-400 text-right pr-1 flex-shrink-0 font-mono">
                            {tier}
                          </div>

                          {/* Grid Cells for each Row */}
                          {dynamicRows.map(row => {
                            const matched = bayContainers.find(c => {
                              const pos = getNormalizedPos(c);
                              return pos.row === row && pos.tier === tier;
                            });

                            if (matched) {
                              const isRestow = restowSet.has(matched.id || matched.containerId);
                              const classRes = getMiniPlanClassificationAndColor(
                                matched,
                                activeOperationView,
                                activeTerminalKey,
                                isRestow
                              );
                              const effTypeHold = getEffectiveCargoType(matched);
                              const isEmptyHold = effTypeHold === 'MT';
                              const isDgHold = effTypeHold === 'DG';
                              const isRfHold = effTypeHold === 'RF';
                              const isOsHold = effTypeHold === 'OS';
                              const portLetter = portLetterMap.get(matched.pod) || matched.pod.charAt(0);

                              const topLabel = isRestow ? '🔄' : isDgHold ? 'DG' : isRfHold ? 'RF' : isEmptyHold ? 'MT' : isOsHold ? 'OOG' : `${matched.size}'`;
                              const bottomLabel = matched.pod || portLetter;

                              return (
                                <div
                                  key={row}
                                  onClick={() => setSelectedContainer(matched)}
                                  title={`[${matched.containerId}] POD: ${matched.pod} (Letra: ${portLetter}) | Tipo: ${classRes.label} | Position: Bay ${bayStr} Row ${row} Tier ${tier} | ${matched.size}' ${matched.status}${isRestow ? ' | 🔄 RESTIBA REQUERIDA' : ''}`}
                                  className={`aspect-[1/1.05] rounded-xs border border-black/50 flex flex-col items-center justify-center font-mono cursor-pointer transition-all hover:scale-150 hover:z-40 shadow-xs leading-none overflow-hidden p-[1px] select-none ${
                                    isRestow ? 'ring-2 ring-red-400 animate-pulse font-extrabold' : ''
                                  }`}
                                  style={{ backgroundColor: classRes.color, color: '#FFFFFF' }}
                                >
                                  <span className="text-[6px] font-black text-white/90 leading-none truncate max-w-full drop-shadow-xs">
                                    {topLabel}
                                  </span>
                                  <span className="text-[7.5px] font-black uppercase tracking-tighter text-white leading-none truncate max-w-full drop-shadow-xs mt-[1px]">
                                    {bottomLabel}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={row}
                                className="aspect-[1/1.05] rounded-xs border border-[#13263B]/60 bg-[#040C16]/60 flex items-center justify-center font-mono select-none"
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* ── BAY SUMMARY FOOTER PANEL (Exact match to reference image with forced WHITE text for PDF visibility) ── */}
                <div className="bg-[#061220] border-t border-[#1B3554] p-2 font-mono text-[9.5px]" style={{ backgroundColor: '#061220', borderColor: '#1B3554' }}>
                  
                  {/* Top Counts Row: DESCARGA | TRÁNSITO | TOTAL */}
                  <div className="grid grid-cols-3 text-center border-b border-[#1B3554] pb-1.5 mb-1.5" style={{ borderColor: '#1B3554' }}>
                    <div>
                      <span className="text-white text-[8.5px] font-bold block uppercase tracking-wide" style={{ color: '#FFFFFF' }}>DESCARGA</span>
                      <span className="font-black text-white text-xs block mt-0.5" style={{ color: '#FFFFFF' }}>{dischargeCount.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="border-x border-[#1B3554]" style={{ borderColor: '#1B3554' }}>
                      <span className="text-white text-[8.5px] font-bold block uppercase tracking-wide" style={{ color: '#FFFFFF' }}>TRÁNSITO</span>
                      <span className="font-black text-white text-xs block mt-0.5" style={{ color: '#FFFFFF' }}>{transitCount.toString().padStart(2, '0')}</span>
                    </div>
                    <div>
                      <span className="text-white text-[8.5px] font-bold block uppercase tracking-wide" style={{ color: '#FFFFFF' }}>TOTAL</span>
                      <span className="font-black text-white text-xs block mt-0.5" style={{ color: '#FFFFFF' }}>{totalCount.toString().padStart(2, '0')}</span>
                    </div>
                  </div>

                  {/* Bottom Icon Counters Row */}
                  <div className="flex items-center justify-between text-[9px]">
                    <span title="IMO / Dangerous Goods" className="flex items-center gap-0.5">
                      <Skull className="w-2.5 h-2.5 text-red-400" style={{ color: '#F87171' }} />
                      <strong className="text-white font-bold" style={{ color: '#FFFFFF' }}>{imoCount.toString().padStart(2, '0')}</strong>
                    </span>
                    <span title="Reefers" className="flex items-center gap-0.5">
                      <Snowflake className="w-2.5 h-2.5 text-cyan-400" style={{ color: '#38BDF8' }} />
                      <strong className="text-white font-bold" style={{ color: '#FFFFFF' }}>{reeferCount.toString().padStart(2, '0')}</strong>
                    </span>
                    <span title="Vacíos (Empty)" className="flex items-center gap-0.5">
                      <span className="text-[7.5px] font-bold border border-emerald-400 text-emerald-400 rounded-full w-2.5 h-2.5 flex items-center justify-center" style={{ borderColor: '#34D399', color: '#34D399' }}>E</span>
                      <strong className="text-white font-bold" style={{ color: '#FFFFFF' }}>{emptyCount.toString().padStart(2, '0')}</strong>
                    </span>
                    <span title="Oversize" className="flex items-center gap-0.5">
                      <ArrowRight className="w-2.5 h-2.5 text-amber-400" style={{ color: '#FBBF24' }} />
                      <strong className="text-white font-bold" style={{ color: '#FFFFFF' }}>{osCount.toString().padStart(2, '0')}</strong>
                    </span>
                    <span title="Tránsito" className="flex items-center gap-0.5">
                      <ArrowLeftRight className="w-2.5 h-2.5 text-purple-400" style={{ color: '#C084FC' }} />
                      <strong className="text-white font-bold" style={{ color: '#FFFFFF' }}>{transitCount.toString().padStart(2, '0')}</strong>
                    </span>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

        {/* ── 3. BOTTOM SUMMARY & LEGEND TABLES (EXACT MATCH TO TOS LOADING PLAN IMAGE) ── */}
        <div className="mt-6 border-t border-[#13263B] pt-4 grid grid-cols-1 lg:grid-cols-4 gap-4 font-mono">
          
          {/* Table 1: Letter / Port Legend (Bottom-Left) */}
          <div className="bg-[#050D1A] border border-[#13263B] rounded-xl overflow-hidden shadow-md flex flex-col">
            <div className="bg-[#081729] text-cyan-300 font-bold px-3 py-1.5 border-b border-[#13263B] text-center text-xs uppercase tracking-wider flex items-center justify-between">
              <span>LETTER / PORT LEGEND</span>
              <span className="text-[10px] text-slate-400 font-normal">{uniquePods.length} PORTS</span>
            </div>
            <div className="p-1 overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-[#13263B] text-slate-400 text-[9px]">
                    <th className="p-1 text-center w-12">Letter</th>
                    <th className="p-1">Port</th>
                  </tr>
                </thead>
                <tbody>
                  {uniquePods.map(pod => {
                    const letter = portLetterMap.get(pod) || pod.charAt(0);
                    const pColor = getPortColor(pod);
                    return (
                      <tr key={pod} className="border-b border-[#13263B]/40 hover:bg-[#081B30] transition-colors">
                        <td className="p-1 text-center font-black">
                          <span
                            className="inline-block w-4 h-4 rounded-xs text-white text-[9px] font-black leading-4 text-center shadow-xs"
                            style={{ backgroundColor: pColor }}
                          >
                            {letter}
                          </span>
                        </td>
                        <td className="p-1 text-slate-200 font-bold tracking-wide">{pod}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Container Breakdown Summary Table by Port & Size (Bottom-Right / Spans 3 Cols) */}
          <div className="lg:col-span-3 bg-[#050D1A] border border-[#13263B] rounded-xl overflow-hidden shadow-md flex flex-col">
            <div className="bg-[#081729] text-cyan-300 font-bold px-3 py-1.5 border-b border-[#13263B] text-center text-xs uppercase tracking-wider flex items-center justify-between">
              <span>RESUMEN GENERAL DE CARGA POR PUERTO Y TIPO DE CONTENEDOR</span>
              <span className="text-[10px] text-cyan-400 font-bold">TOTAL: {portSummaryTable.totals.grandTotal} UNITS</span>
            </div>
            <div className="p-1 overflow-x-auto">
              <table className="w-full text-center border-collapse text-[9.5px]">
                <thead>
                  <tr className="bg-[#0A1828] text-slate-300 border-b border-[#13263B]">
                    <th rowSpan={2} className="p-1 border-r border-[#13263B]">Port</th>
                    <th rowSpan={2} className="p-1 border-r border-[#13263B] w-10">Ltr</th>
                    <th colSpan={2} className="p-1 border-r border-[#13263B]">10'/20'</th>
                    <th colSpan={3} className="p-1 border-r border-[#13263B]">30'/40'</th>
                    <th colSpan={3} className="p-1 border-r border-[#13263B]">40'HC</th>
                    <th colSpan={3} className="p-1 border-r border-[#13263B]">45'</th>
                    <th colSpan={4} className="p-1">Total</th>
                  </tr>
                  <tr className="bg-[#081320] text-slate-400 border-b border-[#13263B]">
                    {/* 20' */}
                    <th className="p-1 border-r border-[#13263B]/60 text-emerald-400">F</th>
                    <th className="p-1 border-r border-[#13263B]">E</th>
                    {/* 40' */}
                    <th className="p-1 border-r border-[#13263B]/60 text-cyan-400">R</th>
                    <th className="p-1 border-r border-[#13263B]/60 text-emerald-400">F</th>
                    <th className="p-1 border-r border-[#13263B]">E</th>
                    {/* 40'HC */}
                    <th className="p-1 border-r border-[#13263B]/60 text-cyan-400">R</th>
                    <th className="p-1 border-r border-[#13263B]/60 text-emerald-400">F</th>
                    <th className="p-1 border-r border-[#13263B]">E</th>
                    {/* 45' */}
                    <th className="p-1 border-r border-[#13263B]/60 text-cyan-400">R</th>
                    <th className="p-1 border-r border-[#13263B]/60 text-emerald-400">F</th>
                    <th className="p-1 border-r border-[#13263B]">E</th>
                    {/* Total */}
                    <th className="p-1 border-r border-[#13263B]/60 font-bold">20'</th>
                    <th className="p-1 border-r border-[#13263B]/60 font-bold">40'</th>
                    <th className="p-1 border-r border-[#13263B]/60 font-bold">45'</th>
                    <th className="p-1 font-black text-white">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {portSummaryTable.rows.map(r => {
                    const pColor = getPortColor(r.port);
                    return (
                      <tr key={r.port} className="border-b border-[#13263B]/40 hover:bg-[#081B30] transition-colors">
                        <td className="p-1 border-r border-[#13263B] font-black text-left text-slate-200">{r.port}</td>
                        <td className="p-1 border-r border-[#13263B] font-black">
                          <span className="inline-block w-4 h-4 rounded-xs text-white text-[9px] font-black leading-4 text-center" style={{ backgroundColor: pColor }}>
                            {r.letter}
                          </span>
                        </td>
                        <td className="p-1 border-r border-[#13263B]/60 text-slate-300">{r.c20_F || 0}</td>
                        <td className="p-1 border-r border-[#13263B] text-slate-300">{r.c20_E || 0}</td>

                        <td className="p-1 border-r border-[#13263B]/60 text-cyan-400 font-bold">{r.c40_R || 0}</td>
                        <td className="p-1 border-r border-[#13263B]/60 text-slate-300">{r.c40_F || 0}</td>
                        <td className="p-1 border-r border-[#13263B] text-slate-300">{r.c40_E || 0}</td>

                        <td className="p-1 border-r border-[#13263B]/60 text-cyan-400 font-bold">{r.c40HC_R || 0}</td>
                        <td className="p-1 border-r border-[#13263B]/60 text-slate-300">{r.c40HC_F || 0}</td>
                        <td className="p-1 border-r border-[#13263B] text-slate-300">{r.c40HC_E || 0}</td>

                        <td className="p-1 border-r border-[#13263B]/60 text-cyan-400 font-bold">{r.c45_R || 0}</td>
                        <td className="p-1 border-r border-[#13263B]/60 text-slate-300">{r.c45_F || 0}</td>
                        <td className="p-1 border-r border-[#13263B] text-slate-300">{r.c45_E || 0}</td>

                        <td className="p-1 border-r border-[#13263B]/60 font-bold text-slate-200">{r.total20 || 0}</td>
                        <td className="p-1 border-r border-[#13263B]/60 font-bold text-slate-200">{r.total40 || 0}</td>
                        <td className="p-1 border-r border-[#13263B]/60 font-bold text-slate-200">{r.total45 || 0}</td>
                        <td className="p-1 font-black text-cyan-300 bg-cyan-950/40">{r.grandTotal || 0}</td>
                      </tr>
                    );
                  })}
                  {/* Grand Total Row */}
                  <tr className="bg-[#0A1D30] font-black text-white border-t-2 border-[#13263B]">
                    <td className="p-1.5 text-left border-r border-[#13263B] uppercase">Total</td>
                    <td className="p-1 border-r border-[#13263B]">-</td>
                    <td className="p-1 border-r border-[#13263B]/60">{portSummaryTable.totals.c20_F}</td>
                    <td className="p-1 border-r border-[#13263B]">{portSummaryTable.totals.c20_E}</td>

                    <td className="p-1 border-r border-[#13263B]/60 text-cyan-300">{portSummaryTable.totals.c40_R}</td>
                    <td className="p-1 border-r border-[#13263B]/60">{portSummaryTable.totals.c40_F}</td>
                    <td className="p-1 border-r border-[#13263B]">{portSummaryTable.totals.c40_E}</td>

                    <td className="p-1 border-r border-[#13263B]/60 text-cyan-300">{portSummaryTable.totals.c40HC_R}</td>
                    <td className="p-1 border-r border-[#13263B]/60">{portSummaryTable.totals.c40HC_F}</td>
                    <td className="p-1 border-r border-[#13263B]">{portSummaryTable.totals.c40HC_E}</td>

                    <td className="p-1 border-r border-[#13263B]/60 text-cyan-300">{portSummaryTable.totals.c45_R}</td>
                    <td className="p-1 border-r border-[#13263B]/60">{portSummaryTable.totals.c45_F}</td>
                    <td className="p-1 border-r border-[#13263B]">{portSummaryTable.totals.c45_E}</td>

                    <td className="p-1 border-r border-[#13263B]/60 text-cyan-300">{portSummaryTable.totals.total20}</td>
                    <td className="p-1 border-r border-[#13263B]/60 text-cyan-300">{portSummaryTable.totals.total40}</td>
                    <td className="p-1 border-r border-[#13263B]/60 text-cyan-300">{portSummaryTable.totals.total45}</td>
                    <td className="p-1 font-black text-cyan-300 text-xs bg-cyan-900/60">{portSummaryTable.totals.grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      {/* ── 4. FOOTER STATUS BAR (Identical to reference image) ── */}
      <footer className="bg-[#020812] border-t border-[#102033] px-4 py-2 flex items-center justify-between font-mono text-[10px] text-slate-500 flex-shrink-0">
        <div>
          © 2025 VERONICA STOWAGE SYSTEM. TODOS LOS DERECHOS RESERVADOS.
        </div>
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Datos en tiempo real</span>
        </div>
        <div>
          Versión 2.0.1
        </div>
      </footer>

      {/* Restow & Weight Audit Modal */}
      <RestowAnalysisModal
        isOpen={isRestowModalOpen}
        onClose={() => setIsRestowModalOpen(false)}
        containers={containers}
        activeTerminalKey={activeTerminalKey}
      />

    </div>
  );
};
