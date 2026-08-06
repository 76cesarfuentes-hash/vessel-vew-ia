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
  Scale,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft
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
    setSelectedContainer
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

  // Parse container prefix vs number helper
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
    : 'CMA CGM ENSENADA';

  const voyage = baplieHeader?.voyage && baplieHeader.voyage.trim().length > 0
    ? baplieHeader.voyage.toUpperCase()
    : '0ACMA2025028';

  const service = baplieHeader?.service && baplieHeader.service.trim().length > 0
    ? baplieHeader.service.toUpperCase()
    : 'AL4 - US GULF EXPRESS';

  const terminalName = activeTerminal?.name || 'VERACRUZ (VER)';

  const date = baplieHeader?.date && baplieHeader.date.trim().length > 0
    ? baplieHeader.date.toUpperCase()
    : '30/04/2025 12:10';

  const baplieFileName = fileName || 'BAPLIE_2505.EDI';

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

  // Unique PODs
  const uniquePods = useMemo(() => {
    const pods = new Set<string>();
    containers.forEach(c => {
      if (c.pod && c.pod !== 'Dato no disponible') {
        pods.add(c.pod);
      }
    });
    const arr = Array.from(pods).sort();
    if (arr.length === 0) return ['VERACRUZ (VER)', 'HOUSTON (HOU)', 'NEW ORLEANS (MSY)', 'ALTAMIRA (ALT)', 'MIAMI (MIA)', 'KINGSTON (KIN)', 'CAUCEDO (CAU)', 'FREEPORT (FPO)'];
    return arr;
  }, [containers]);

  // Apply active filters to containers
  const displayedContainers = useMemo(() => {
    return containers.filter(c => {
      if (selectedPodFilter && c.pod !== selectedPodFilter) return false;

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

      if (selectedViewMode === '20' && c.size !== 20) return false;
      if (selectedViewMode === '40' && (c.size !== 40 && c.size !== 45)) return false;

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

  // Auto-complete suggestion calculation
  const searchSuggestions = useMemo(() => {
    const raw = searchTerm.trim();
    if (!raw) return [];
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
      terms[terms.length - 1] = c.id;
      setSearchTerm(terms.join(', '));
    }
    setSelectedContainer(c);
    setShowSuggestions(false);
  };

  // Normalize container position
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

    const arr = Array.from(baySet).sort((a, b) => a - b); // Ascending order (bow to stern or viceversa)
    if (arr.length === 0) {
      return [27, 25, 23, 21, 19, 17, 15, 41, 39, 37, 35, 33, 31, 29, 47, 45, 43, 41, 39, 37, 35, 53, 51, 49, 47, 45, 43, 41];
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

  // Overall General Statistics for top-right Resumen General & Footer Summary Table
  const generalStats = useMemo(() => {
    const total = containers.length || 1;
    let dry = 0;
    let reefer = 0;
    let dg = 0;
    let oog = 0;
    let empty = 0;
    let tank = 0;
    let discharge = 0;
    let transit = 0;

    containers.forEach(c => {
      if (checkIsDischarge(c)) {
        discharge++;
      } else {
        transit++;
      }

      const eff = getEffectiveCargoType(c);
      const iso = (c.iso || '').toUpperCase();
      const isTankIso = iso.includes('T1') || iso.includes('T3') || iso.includes('TN') || iso.startsWith('22T') || iso.startsWith('42T');

      if (isTankIso) {
        tank++;
      } else if (eff === 'DG') {
        dg++;
      } else if (eff === 'RF') {
        reefer++;
      } else if (eff === 'MT' || c.status === 'EMPTY') {
        empty++;
      } else if (eff === 'OS') {
        oog++;
      } else {
        dry++;
      }
    });

    return {
      total: containers.length,
      discharge,
      dischargePct: ((discharge / total) * 100).toFixed(1),
      transit,
      transitPct: ((transit / total) * 100).toFixed(1),
      dry,
      dryPct: ((dry / total) * 100).toFixed(1),
      reefer,
      reeferPct: ((reefer / total) * 100).toFixed(1),
      dg,
      dgPct: ((dg / total) * 100).toFixed(1),
      oog,
      oogPct: ((oog / total) * 100).toFixed(1),
      empty,
      emptyPct: ((empty / total) * 100).toFixed(1),
      tank,
      tankPct: ((tank / total) * 100).toFixed(1)
    };
  }, [containers, activeTerminalKey]);

  // Dynamic Rows and Tiers
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

    let maxEven = Math.max(10, ...evenRows);
    if (maxEven % 2 !== 0) maxEven++;

    let maxOdd = Math.max(9, ...oddRows);
    if (maxOdd % 2 === 0) maxOdd++;

    const rows: string[] = [];
    for (let i = maxEven; i >= 2; i -= 2) {
      rows.push(i.toString().padStart(2, '0'));
    }
    rows.push('00');
    for (let i = 1; i <= maxOdd; i += 2) {
      rows.push(i.toString().padStart(2, '0'));
    }

    let deckTiers: string[] = [];
    if (deckTierNums.size > 0) {
      let maxDeck = Math.max(88, ...deckTierNums);
      if (maxDeck % 2 !== 0) maxDeck++;
      let minDeck = Math.min(80, ...deckTierNums);
      if (minDeck % 2 !== 0) minDeck--;
      for (let t = maxDeck; t >= Math.max(70, minDeck); t -= 2) {
        deckTiers.push(t.toString().padStart(2, '0'));
      }
    } else {
      deckTiers = ['88', '86', '84', '82', '80'];
    }

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

  // Handle Visual A3 PDF Export
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
        console.error('Error al exportar Mini Plan PDF:', err);
        printElementViaIframe('mini-plan-print-area');
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 120);
  };

  const handlePrint = () => {
    printElementViaIframe('mini-plan-print-area');
  };

  const handleExportExcel = () => {
    exportToExcel(displayedContainers, 'Mini_Plan_Estiba_Poseidon');
  };

  const restowItems = useMemo(() => {
    return detectRestows(containers, activeTerminalKey);
  }, [containers, activeTerminalKey]);

  const restowSet = useMemo(() => {
    return new Set(restowItems.map(r => r.id));
  }, [restowItems]);

  // Render IMDG Hazard Diamond Badge
  const renderImdgDiamond = (imoClass?: string) => {
    if (!imoClass || imoClass === 'Dato no disponible') return null;
    const clean = imoClass.replace(/[^0-9.]/g, '');

    let bg = 'bg-red-600 text-white';
    if (clean.startsWith('2.1') || clean.startsWith('2') || clean === '3') {
      bg = 'bg-red-600 text-white';
    } else if (clean.startsWith('4')) {
      bg = 'bg-[#DC2626] text-white border-x border-white';
    } else if (clean.startsWith('5')) {
      bg = 'bg-yellow-400 text-black';
    } else if (clean.startsWith('6')) {
      bg = 'bg-white text-black border border-black';
    } else if (clean.startsWith('8')) {
      bg = 'bg-slate-900 text-white';
    } else if (clean.startsWith('9')) {
      bg = 'bg-slate-800 text-white';
    }

    return (
      <div className={`w-3.5 h-3.5 rotate-45 flex items-center justify-center ${bg} shadow-xs border border-black/40 shrink-0`}>
        <span className="-rotate-45 text-[6.5px] font-black leading-none">{clean || '3'}</span>
      </div>
    );
  };

  // Render OOG Arrow
  const renderOogArrow = (c: Container) => {
    let arrow = '↑';
    if (c.oogTop) arrow = '↑';
    else if (c.oogLeft) arrow = '←';
    else if (c.oogRight) arrow = '→';
    else if (c.oogFront) arrow = '↗';
    else if (c.oogBack) arrow = '↘';

    return <span className="text-red-600 font-black text-[10px] leading-none shrink-0" title="OOG">{arrow}</span>;
  };

  // Search input component
  const renderSearchInputWithAutocomplete = (placeholder = "Buscar varios N° (ej: 7542310, 8912341)...") => {
    const topSuggestion = searchSuggestions[0];
    const terms = searchTerm.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);
    const isMultiSearch = terms.length > 1;

    return (
      <div className="relative flex-1 max-w-md print:hidden">
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

        {/* Autocomplete Dropdown */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[#091526] border border-cyan-500/50 rounded-lg shadow-2xl z-50 overflow-hidden font-mono divide-y divide-slate-800">
            <div className="bg-[#050D19] px-3 py-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Sugerencias ({searchSuggestions.length})
              </span>
              <span className="text-slate-500 text-[9px]">Presiona [Enter]</span>
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
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-amber-400 font-bold">POD: {s.pod}</span>
                      <span className="text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded">
                        Pos: {s.bay}-{s.row}-{s.tier}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#030914] text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ── INTERACTIVE TOP TOOLBAR (EXCLUDED FROM PRINT) ── */}
      <header className="bg-[#051120] border-b border-[#13263B] px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
            <Anchor className="w-5 h-5 text-black font-black" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-black tracking-wider text-white leading-none">
              POSEIDON - MINI PLANOS PDF
            </h1>
            <span className="text-[9px] font-mono text-cyan-400 tracking-widest block mt-0.5 font-bold uppercase">
              VISTA DE IMPRESIÓN Y EXPORTACIÓN VECTORIAL A3
            </span>
          </div>
        </div>

        {/* Quick Search */}
        <div className="w-64 hidden sm:block">
          {renderSearchInputWithAutocomplete("Buscar contenedor (ej: 7542310)...")}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Operation View Selector */}
          <div className="flex items-center gap-1 bg-[#030A16] p-1 rounded-lg border border-[#142A42]">
            <button
              onClick={() => setOperationView('DESCARGA')}
              className={`px-2.5 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                activeOperationView === 'DESCARGA'
                  ? 'bg-orange-500 text-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DESCARGA
            </button>
            <button
              onClick={() => setOperationView('CARGA')}
              className={`px-2.5 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                activeOperationView === 'CARGA'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CARGA
            </button>
          </div>

          <button
            onClick={() => setIsRestowModalOpen(true)}
            className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/60 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Restibas ({restowItems.length})
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold border border-cyan-400 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.4)] disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-black" />
            {isGeneratingPDF ? 'Generando PDF...' : 'Exportar PDF A3'}
          </button>

          <button
            onClick={handlePrint}
            className="bg-[#09182A] hover:bg-[#0E243D] text-slate-200 border border-[#1C3654] hover:border-blue-500/50 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" /> Imprimir
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-[#09182A] hover:bg-[#0E243D] text-slate-200 border border-[#1C3654] hover:border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Excel
          </button>
        </div>
      </header>

      {/* ── MAIN DOCUMENT PRINT AREA (DARK MARITIME THEME) ── */}
      <main className="flex-1 overflow-y-auto bg-[#030914] text-slate-100 p-4 font-sans select-text">
        <div
          id="mini-plan-print-area"
          className="bg-[#030914] text-slate-100 p-4 border border-[#1B3452] shadow-2xl mx-auto max-w-[1800px] space-y-4 font-sans"
          style={{ backgroundColor: '#030914', color: '#F8FAFC' }}
        >
          {/* ── 1. HEADER SECTION ── */}
          <div className="border border-[#1B3452] rounded-lg p-3 bg-[#071527] grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            
            {/* Top Left Branding Logo */}
            <div className="lg:col-span-3 flex items-center gap-2.5 border-r border-[#1B3452] pr-3">
              <div className="w-10 h-10 rounded bg-cyan-600 text-black flex items-center justify-center font-black text-xl shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <Anchor className="w-6 h-6 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-cyan-400 text-base tracking-tight font-mono">ONS IA</span>
                </div>
                <div className="text-[8px] font-bold text-slate-400 tracking-tight uppercase leading-none mt-0.5">
                  SOLUCIONES INTELIGENTES PARA OPERACIONES MARÍTIMAS
                </div>
                <div className="mt-1 flex items-center gap-1 text-blue-400 font-mono font-black text-xs">
                  <Anchor className="w-3 h-3 text-cyan-400" />
                  <span>POSEIDON</span>
                  <span className="text-[8px] text-slate-400 font-normal">STOWAGE PLANNER PRO</span>
                </div>
              </div>
            </div>

            {/* Top Center Document Title & Metadata Grid */}
            <div className="lg:col-span-6 text-center space-y-1.5">
              <h1 className="text-base font-black tracking-wider text-white font-mono uppercase">
                {activeOperationView === 'DESCARGA' ? 'DISCHARGE PLAN' : 'LOADING PLAN'} - MINI PLANOS
              </h1>
              <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase font-mono">
                VISTA TRANSVERSAL POR BAHÍA
              </div>

              {/* Metadata Grid Box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 bg-[#0B1A2F] border border-[#162E4A] rounded p-2 text-left font-mono text-[9px] text-slate-300">
                <div>
                  <span className="text-slate-400 font-bold block text-[8px]">BUQUE / VOYAGE</span>
                  <strong className="text-white text-[9.5px] truncate block">{vesselName} / {voyage}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[8px]">TERMINAL</span>
                  <strong className="text-white text-[9.5px] truncate block">{terminalName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[8px]">ARCHIVO</span>
                  <strong className="text-cyan-400 text-[9.5px] truncate block">{baplieFileName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[8px]">SERVICIO</span>
                  <strong className="text-white text-[9.5px] truncate block">{service}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[8px]">FECHA / HORA</span>
                  <strong className="text-white text-[9.5px] truncate block">{date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[8px]">TOTAL CONTENEDORES</span>
                  <strong className="text-emerald-400 text-[10px] font-black block">{containers.length.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Top Right Resumen General Box (Including DESCARGA and TRÁNSITO explicitly!) */}
            <div className="lg:col-span-3 border border-[#1B3452] rounded p-2 bg-[#0B1A2F] font-mono text-[9.5px]">
              <div className="text-[10px] font-black text-cyan-400 border-b border-[#162E4A] pb-1 mb-1.5 uppercase text-center tracking-wider flex items-center justify-between">
                <span>RESUMEN GENERAL</span>
                <span className="text-[8px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-700/60">{containers.length} U</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex items-center justify-between bg-[#071527] px-1.5 py-0.5 rounded border border-[#1B3452]">
                  <span className="flex items-center gap-1 font-bold text-orange-400">
                    <ArrowRight className="w-3 h-3 text-orange-400" /> DESCARGA
                  </span>
                  <strong className="text-white">{generalStats.discharge} <span className="text-[8px] text-slate-400">({generalStats.dischargePct}%)</span></strong>
                </div>
                <div className="flex items-center justify-between bg-[#071527] px-1.5 py-0.5 rounded border border-[#1B3452]">
                  <span className="flex items-center gap-1 font-bold text-slate-300">
                    <RefreshCw className="w-3 h-3 text-slate-400" /> TRÁNSITO
                  </span>
                  <strong className="text-white">{generalStats.transit} <span className="text-[8px] text-slate-400">({generalStats.transitPct}%)</span></strong>
                </div>
                <div className="flex items-center justify-between bg-[#071527] px-1.5 py-0.5 rounded border border-[#1B3452]">
                  <span className="flex items-center gap-1 font-bold text-slate-300">
                    <Box className="w-3 h-3 text-slate-400" /> DRY
                  </span>
                  <strong className="text-white">{generalStats.dry} <span className="text-[8px] text-slate-400">({generalStats.dryPct}%)</span></strong>
                </div>
                <div className="flex items-center justify-between bg-[#071527] px-1.5 py-0.5 rounded border border-[#1B3452]">
                  <span className="flex items-center gap-1 font-bold text-cyan-400">
                    <Snowflake className="w-3 h-3 text-cyan-400" /> REEFER
                  </span>
                  <strong className="text-white">{generalStats.reefer} <span className="text-[8px] text-slate-400">({generalStats.reeferPct}%)</span></strong>
                </div>
                <div className="flex items-center justify-between bg-[#071527] px-1.5 py-0.5 rounded border border-[#1B3452]">
                  <span className="flex items-center gap-1 font-bold text-red-400">
                    <Skull className="w-3 h-3 text-red-400" /> DG
                  </span>
                  <strong className="text-white">{generalStats.dg} <span className="text-[8px] text-slate-400">({generalStats.dgPct}%)</span></strong>
                </div>
                <div className="flex items-center justify-between bg-[#071527] px-1.5 py-0.5 rounded border border-[#1B3452]">
                  <span className="flex items-center gap-1 font-bold text-slate-400">
                    <span className="w-3 h-3 rounded-full border border-slate-400 text-[8px] flex items-center justify-center font-black">E</span> EMPTY
                  </span>
                  <strong className="text-white">{generalStats.empty} <span className="text-[8px] text-slate-400">({generalStats.emptyPct}%)</span></strong>
                </div>
              </div>
            </div>

          </div>

          {/* ── 2. MAIN BAYS MATRIX GRID (7 COLUMNS ACROSS) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {bayNumbersList.map(bayNum => {
              const bayStr = bayNum.toString().padStart(2, '0');
              const bayContainers = bayMap.get(bayNum) || [];

              const dischargeCount = bayContainers.filter(c => checkIsDischarge(c)).length;
              const transitCount = bayContainers.filter(c => !checkIsDischarge(c)).length;
              const totalCount = bayContainers.length;
              const imoCount = bayContainers.filter(c => getEffectiveCargoType(c) === 'DG').length;
              const reeferCount = bayContainers.filter(c => getEffectiveCargoType(c) === 'RF').length;

              const isPortSide = bayNum % 4 === 1;
              const isStarboard = bayNum % 4 === 3;
              const sideLabel = isPortSide ? '(P)' : isStarboard ? '(S)' : '';

              return (
                <div
                  key={bayNum}
                  className="bg-[#071527] border border-[#1B3452] rounded overflow-hidden flex flex-col justify-between shadow-xs font-mono text-[8px]"
                >
                  {/* Bay Card Header */}
                  <div className="bg-[#0D223A] border-b border-[#1B3452] px-1.5 py-1 text-center font-black text-white text-[10px] uppercase flex items-center justify-between">
                    <span>BAHÍA {bayStr} <span className="text-slate-400 font-normal">{sideLabel}</span></span>
                    <span className="text-[8.5px] text-cyan-300 bg-cyan-950 px-1 rounded border border-cyan-800">{totalCount}U</span>
                  </div>

                  {/* Bay Matrix Content */}
                  <div className="p-1 space-y-1">
                    {/* Top Row Number Headers */}
                    <div
                      className="grid text-[7px] font-extrabold text-slate-400 text-center border-b border-[#162E4A] pb-0.5"
                      style={{
                        gridTemplateColumns: `14px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                        gap: '1px'
                      }}
                    >
                      <div className="text-[6px] text-slate-500">T/R</div>
                      {dynamicRows.map(row => (
                        <div key={row}>{row}</div>
                      ))}
                    </div>

                    {/* Deck Tiers Grid */}
                    <div className="space-y-0.5">
                      {dynamicDeckTiers.map(tier => (
                        <div
                          key={tier}
                          className="grid items-center"
                          style={{
                            gridTemplateColumns: `14px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                            gap: '1px'
                          }}
                        >
                          <div className="text-[6.5px] font-bold text-slate-500 text-right pr-0.5">{tier}</div>
                          {dynamicRows.map(row => {
                            const matched = bayContainers.find(c => {
                              const pos = getNormalizedPos(c);
                              return pos.row === row && pos.tier === tier;
                            });

                            if (matched) {
                              const isRestow = restowSet.has(matched.id || matched.containerId);
                              const podColor = getContainerColor(matched.pod, activeTerminalKey);
                              const eff = getEffectiveCargoType(matched);
                              const isDg = eff === 'DG';
                              const isRf = eff === 'RF';
                              const isOs = eff === 'OS';
                              const isEmpty = eff === 'MT';

                              return (
                                <div
                                  key={row}
                                  onClick={() => setSelectedContainer(matched)}
                                  className={`aspect-[1/1] rounded-xs border border-black/40 flex flex-col items-center justify-center font-mono cursor-pointer transition-transform hover:scale-125 hover:z-20 p-[0.5px] select-none leading-none ${
                                    isRestow ? 'ring-2 ring-red-500 font-extrabold' : ''
                                  }`}
                                  style={{ backgroundColor: podColor, color: '#FFFFFF' }}
                                  title={`[${matched.id}] POD: ${matched.pod} Pos: ${bayStr}-${row}-${tier}`}
                                >
                                  {isDg ? (
                                    renderImdgDiamond(matched.imoClass)
                                  ) : isRf ? (
                                    <Snowflake className="w-2.5 h-2.5 text-white drop-shadow-xs" />
                                  ) : isOs ? (
                                    renderOogArrow(matched)
                                  ) : isEmpty ? (
                                    <span className="text-[6px] font-black text-black bg-white rounded-full w-2.5 h-2.5 flex items-center justify-center">E</span>
                                  ) : (
                                    <span className="text-[5.5px] font-black text-white truncate max-w-full drop-shadow-xs">
                                      {matched.operator || matched.pod?.substring(0, 3)}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={row}
                                className="aspect-[1/1] rounded-xs border border-[#12253B] bg-[#050D1A]"
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Hatch Cover Divider */}
                    <div className="my-0.5 border-t border-b border-blue-500/80 bg-[#0A2240] py-0.2 text-[6px] font-bold text-cyan-300 text-center uppercase tracking-tighter">
                      ESCOTILLA
                    </div>

                    {/* Hold Tiers Grid */}
                    <div className="space-y-0.5">
                      {dynamicHoldTiers.map(tier => (
                        <div
                          key={tier}
                          className="grid items-center"
                          style={{
                            gridTemplateColumns: `14px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                            gap: '1px'
                          }}
                        >
                          <div className="text-[6.5px] font-bold text-slate-500 text-right pr-0.5">{tier}</div>
                          {dynamicRows.map(row => {
                            const matched = bayContainers.find(c => {
                              const pos = getNormalizedPos(c);
                              return pos.row === row && pos.tier === tier;
                            });

                            if (matched) {
                              const isRestow = restowSet.has(matched.id || matched.containerId);
                              const podColor = getContainerColor(matched.pod, activeTerminalKey);
                              const eff = getEffectiveCargoType(matched);
                              const isDg = eff === 'DG';
                              const isRf = eff === 'RF';
                              const isOs = eff === 'OS';
                              const isEmpty = eff === 'MT';

                              return (
                                <div
                                  key={row}
                                  onClick={() => setSelectedContainer(matched)}
                                  className={`aspect-[1/1] rounded-xs border border-black/40 flex flex-col items-center justify-center font-mono cursor-pointer transition-transform hover:scale-125 hover:z-20 p-[0.5px] select-none leading-none ${
                                    isRestow ? 'ring-2 ring-red-500 font-extrabold' : ''
                                  }`}
                                  style={{ backgroundColor: podColor, color: '#FFFFFF' }}
                                  title={`[${matched.id}] POD: ${matched.pod} Pos: ${bayStr}-${row}-${tier}`}
                                >
                                  {isDg ? (
                                    renderImdgDiamond(matched.imoClass)
                                  ) : isRf ? (
                                    <Snowflake className="w-2.5 h-2.5 text-white drop-shadow-xs" />
                                  ) : isOs ? (
                                    renderOogArrow(matched)
                                  ) : isEmpty ? (
                                    <span className="text-[6px] font-black text-black bg-white rounded-full w-2.5 h-2.5 flex items-center justify-center">E</span>
                                  ) : (
                                    <span className="text-[5.5px] font-black text-white truncate max-w-full drop-shadow-xs">
                                      {matched.operator || matched.pod?.substring(0, 3)}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={row}
                                className="aspect-[1/1] rounded-xs border border-[#12253B] bg-[#050D1A]"
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Bottom Bay Summary Stats Row */}
                  <div className="bg-[#0D223A] border-t border-[#1B3452] p-1 font-mono text-[7.5px] flex items-center justify-around font-extrabold">
                    <span className="text-orange-400" title="Descarga">{dischargeCount.toString().padStart(2, '0')}</span>
                    <span className="text-slate-300" title="Tránsito">{transitCount.toString().padStart(2, '0')}</span>
                    <span className="text-cyan-400" title="Total">{totalCount.toString().padStart(2, '0')}</span>
                    <span className="text-red-400" title="IMO">{imoCount.toString().padStart(2, '0')}</span>
                    <span className="text-blue-400" title="Reefer">{reeferCount.toString().padStart(2, '0')}</span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* ── 3. FOOTER LEGENDS & SUMMARY PANELS (5 PANELS IN DARK THEME) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 font-mono text-[9px] border-t border-[#1B3452]">
            
            {/* Panel 1: LEYENDA DE CONTENEDORES */}
            <div className="border border-[#1B3452] rounded p-2 bg-[#071527] space-y-1.5 text-slate-200">
              <div className="font-black text-cyan-400 border-b border-[#162E4A] pb-1 uppercase tracking-wider text-[9.5px]">
                LEYENDA DE CONTENEDORES
              </div>
              <div className="space-y-1 text-[8.5px]">
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                  <span><strong className="text-white">DRY</strong> (Carga Seca)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                  <span><strong className="text-cyan-300">REEFER</strong> (Refrigerado)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  <span><strong className="text-red-300">DG</strong> (Mercancía Peligrosa)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  <span><strong className="text-amber-300">OOG</strong> (Fuera de Dimensión)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-white bg-slate-800 font-black text-[8px] text-white flex items-center justify-center">E</span>
                  <span><strong className="text-white">EMPTY</strong> (Vacío)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🛢️</span>
                  <span><strong className="text-white">TANK</strong> (Tanque)</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5 border-t border-[#162E4A]">
                  <span className="w-3.5 h-3.5 rounded-xs bg-slate-500 border border-slate-300 flex items-center justify-center text-[7px] font-bold text-white">TR</span>
                  <span><strong className="text-slate-200">TRÁNSITO</strong> (Sigue a bordo)</span>
                </div>
              </div>
            </div>

            {/* Panel 2: MERCANCÍA PELIGROSA (IMDG) */}
            <div className="border border-[#1B3452] rounded p-2 bg-[#071527] space-y-1.5 text-slate-200">
              <div className="font-black text-cyan-400 border-b border-[#162E4A] pb-1 uppercase tracking-wider text-[9.5px]">
                MERCANCÍA PELIGROSA (IMDG)
              </div>
              <div className="grid grid-cols-2 gap-1 text-[8px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-red-600 text-white font-black text-[6px] flex items-center justify-center"><span className="-rotate-45">2.1</span></span>
                  <span><strong className="text-white">2.1</strong> Gas Inflamable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-red-600 text-white font-black text-[6px] flex items-center justify-center"><span className="-rotate-45">3</span></span>
                  <span><strong className="text-white">3</strong> Líquidos Infl.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-red-600 text-white font-black text-[6px] flex items-center justify-center border-x border-white"><span className="-rotate-45">4.1</span></span>
                  <span><strong className="text-white">4.1</strong> Sólidos Infl.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-yellow-400 text-black font-black text-[6px] flex items-center justify-center"><span className="-rotate-45">5.1</span></span>
                  <span><strong className="text-white">5.1</strong> Oxidantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-white text-black border border-black font-black text-[6px] flex items-center justify-center"><span className="-rotate-45">6.1</span></span>
                  <span><strong className="text-white">6.1</strong> Tóxicos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-slate-900 text-white font-black text-[6px] flex items-center justify-center"><span className="-rotate-45">8</span></span>
                  <span><strong className="text-white">8</strong> Corrosivos</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 bg-slate-800 text-white font-black text-[6px] flex items-center justify-center"><span className="-rotate-45">9</span></span>
                  <span><strong className="text-white">9</strong> Varios Peligrosos</span>
                </div>
              </div>
            </div>

            {/* Panel 3: SÍMBOLOS ESPECIALES */}
            <div className="border border-[#1B3452] rounded p-2 bg-[#071527] space-y-1.5 text-slate-200">
              <div className="font-black text-cyan-400 border-b border-[#162E4A] pb-1 uppercase tracking-wider text-[9.5px]">
                SÍMBOLOS ESPECIALES
              </div>
              <div className="text-[8px] space-y-1">
                <div>
                  <strong className="text-cyan-300 block mb-0.5">REEFER CONECTADO:</strong>
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[7.5px] text-slate-300">
                    <span>❄️ -25°C o menos</span>
                    <span>❄️ -18°C</span>
                    <span>❄️ -12°C</span>
                    <span>❄️ -5°C</span>
                    <span>❄️ 0°C a +5°C</span>
                    <span>❄️ +5°C o más</span>
                  </div>
                </div>
                <div className="pt-0.5 border-t border-[#162E4A]">
                  <strong className="text-amber-400 block mb-0.5">OOG (FUERA DE DIMENSIÓN):</strong>
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[7.5px] text-slate-300">
                    <span>↑ Arriba</span>
                    <span>↓ Abajo</span>
                    <span>← Babor (Izq)</span>
                    <span>→ Estribor (Der)</span>
                    <span>↗ Esquina Sup Der</span>
                    <span>↖ Esquina Sup Izq</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 4: COLORES POR POD (DESTINO) */}
            <div className="border border-[#1B3452] rounded p-2 bg-[#071527] space-y-1.5 text-slate-200">
              <div className="font-black text-cyan-400 border-b border-[#162E4A] pb-1 uppercase tracking-wider text-[9.5px] flex items-center justify-between">
                <span>COLORES POR POD</span>
                <span className="text-[8px] text-slate-400 font-normal">PORT CODES</span>
              </div>
              <div className="space-y-1 text-[8px]">
                {uniquePods.slice(0, 7).map(pod => {
                  const color = getPortColor(pod);
                  const podCount = containers.filter(c => c.pod === pod).length;
                  return (
                    <div key={pod} className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-3 h-3 rounded-xs border border-white/20 shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                        <span className="font-bold text-white truncate">{pod}</span>
                      </div>
                      <span className="text-[8px] text-slate-400 font-mono">{podCount}U</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-[#162E4A]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs border border-slate-300 shrink-0 bg-slate-500 shadow-2xs" />
                    <span className="font-bold text-slate-200">TRÁNSITO</span>
                  </div>
                  <span className="text-[8px] text-slate-300 font-mono font-bold">{generalStats.transit}U</span>
                </div>
              </div>
            </div>

            {/* Panel 5: RESUMEN POR TIPO DE CONTENEDOR */}
            <div className="border border-[#1B3452] rounded p-2 bg-[#071527] space-y-1.5 flex flex-col justify-between text-slate-200">
              <div>
                <div className="font-black text-cyan-400 border-b border-[#162E4A] pb-1 uppercase tracking-wider text-[9.5px]">
                  RESUMEN POR TIPO
                </div>
                <table className="w-full text-left text-[8px] border-collapse mt-1 font-mono">
                  <thead>
                    <tr className="border-b border-[#162E4A] text-slate-400 font-bold">
                      <th className="pb-0.5">CONCEPTO</th>
                      <th className="pb-0.5 text-right">CANT.</th>
                      <th className="pb-0.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#162E4A]/60">
                    <tr>
                      <td className="py-0.5 font-bold text-orange-400">DESCARGA</td>
                      <td className="text-right text-white font-bold">{generalStats.discharge}</td>
                      <td className="text-right text-slate-300">{generalStats.dischargePct}%</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold text-slate-300">TRÁNSITO</td>
                      <td className="text-right text-white font-bold">{generalStats.transit}</td>
                      <td className="text-right text-slate-300">{generalStats.transitPct}%</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold text-slate-200">DRY</td>
                      <td className="text-right">{generalStats.dry}</td>
                      <td className="text-right text-slate-400">{generalStats.dryPct}%</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold text-cyan-400">REEFER</td>
                      <td className="text-right">{generalStats.reefer}</td>
                      <td className="text-right text-slate-400">{generalStats.reeferPct}%</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold text-red-400">DG (IMDG)</td>
                      <td className="text-right">{generalStats.dg}</td>
                      <td className="text-right text-slate-400">{generalStats.dgPct}%</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold text-amber-400">OOG</td>
                      <td className="text-right">{generalStats.oog}</td>
                      <td className="text-right text-slate-400">{generalStats.oogPct}%</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold text-slate-400">EMPTY</td>
                      <td className="text-right">{generalStats.empty}</td>
                      <td className="text-right text-slate-400">{generalStats.emptyPct}%</td>
                    </tr>
                    <tr className="font-black border-t-2 border-[#1B3452] text-white bg-[#0D223A]">
                      <td className="py-0.5 px-1">TOTAL</td>
                      <td className="text-right">{generalStats.total}</td>
                      <td className="text-right px-1">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div className="text-[7.5px] text-slate-400 font-mono space-y-0.5 border-t border-[#162E4A] pt-1">
                <div>• Planos generados desde {baplieFileName}</div>
                <div>• Sistema POSEIDON v2.5.0 - ONS IA</div>
              </div>
            </div>

          </div>

        </div>
      </main>

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
