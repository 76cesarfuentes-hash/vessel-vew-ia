import React, { useState, useMemo, useEffect } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { RealisticWorldMap } from '../components/map/RealisticWorldMap';
import { Container, getEffectiveCargoType } from '../core/models/container';
import { checkIsDischargeContainer } from '../core/business/restowEngine';
import { TERMINAL_PROFILES } from '../core/models/terminal';
import {
  Globe,
  ArrowDownLeft,
  ArrowUpRight,
  Ship,
  Anchor,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';

// Geographic port coordinates on 1000x500 Equirectangular Map
interface PortGeo {
  code: string;
  name: string;
  country: string;
  x: number; // 0..1000
  y: number; // 0..500
}

const KNOWN_PORT_COORDS: Record<string, PortGeo> = {
  // South America
  CLSAI: { code: 'CLSAI', name: 'San Antonio', country: 'Chile', x: 288, y: 435 },
  CLVAP: { code: 'CLVAP', name: 'Valparaíso', country: 'Chile', x: 286, y: 432 },
  PECLL: { code: 'PECLL', name: 'Callao', country: 'Perú', x: 278, y: 305 },
  ECMEC: { code: 'ECMEC', name: 'Guayaquil', country: 'Ecuador', x: 268, y: 268 },
  BRSSZ: { code: 'BRSSZ', name: 'Santos', country: 'Brasil', x: 375, y: 355 },
  ARBUE: { code: 'ARBUE', name: 'Buenos Aires', country: 'Argentina', x: 335, y: 425 },

  // North America & Central America
  MXVER: { code: 'MXVER', name: 'Veracruz', country: 'México', x: 222, y: 198 },
  VER: { code: 'MXVER', name: 'Veracruz', country: 'México', x: 222, y: 198 },
  MXLZC: { code: 'MXLZC', name: 'Lázaro Cárdenas', country: 'México', x: 212, y: 195 },
  LZC: { code: 'MXLZC', name: 'Lázaro Cárdenas', country: 'México', x: 212, y: 195 },
  MXZLO: { code: 'MXZLO', name: 'Manzanillo', country: 'México', x: 208, y: 192 },
  ZLO: { code: 'MXZLO', name: 'Manzanillo', country: 'México', x: 208, y: 192 },
  USHOU: { code: 'USHOU', name: 'Houston', country: 'EE.UU.', x: 220, y: 175 },
  HOU: { code: 'USHOU', name: 'Houston', country: 'EE.UU.', x: 220, y: 175 },
  USLAX: { code: 'USLAX', name: 'Los Angeles', country: 'EE.UU.', x: 172, y: 155 },
  LAX: { code: 'USLAX', name: 'Los Angeles', country: 'EE.UU.', x: 172, y: 155 },
  USNYC: { code: 'USNYC', name: 'New York', country: 'EE.UU.', x: 285, y: 142 },

  // Europe
  NLRTM: { code: 'NLRTM', name: 'Rotterdam', country: 'Países Bajos', x: 495, y: 118 },
  DEHAM: { code: 'DEHAM', name: 'Hamburg', country: 'Alemania', x: 518, y: 112 },
  GBLON: { code: 'GBLON', name: 'London', country: 'Reino Unido', x: 488, y: 115 },
  ESBCN: { code: 'ESBCN', name: 'Barcelona', country: 'España', x: 492, y: 142 },

  // Asia
  CNSHA: { code: 'CNSHA', name: 'Shanghai', country: 'China', x: 840, y: 160 },
  SHA: { code: 'CNSHA', name: 'Shanghai', country: 'China', x: 840, y: 160 },
  SGSIN: { code: 'SGSIN', name: 'Singapore', country: 'Singapur', x: 788, y: 238 },
  HKHKG: { code: 'HKHKG', name: 'Hong Kong', country: 'China', x: 820, y: 178 },
  HKG: { code: 'HKHKG', name: 'Hong Kong', country: 'China', x: 820, y: 178 },
  KRPUS: { code: 'KRPUS', name: 'Busan', country: 'Corea del Sur', x: 850, y: 145 },
  PUS: { code: 'KRPUS', name: 'Busan', country: 'Corea del Sur', x: 850, y: 145 },
  JPYOK: { code: 'JPYOK', name: 'Yokohama', country: 'Japón', x: 872, y: 148 },

  // Oceania & Africa
  AUSYD: { code: 'AUSYD', name: 'Sydney', country: 'Australia', x: 910, y: 335 },
  ZADUR: { code: 'ZADUR', name: 'Durban', country: 'Sudáfrica', x: 575, y: 345 }
};

// Fallback generator for unmapped port codes using deterministic string hashing
function getPortCoords(portCode: string): PortGeo {
  const clean = (portCode || 'UNK').trim().toUpperCase();
  if (KNOWN_PORT_COORDS[clean]) {
    return KNOWN_PORT_COORDS[clean];
  }

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate plausible oceanic/coastal coordinates
  const x = 150 + Math.abs(hash % 750);
  const y = 80 + Math.abs((hash >> 3) % 360);

  return {
    code: clean,
    name: clean,
    country: 'Internacional',
    x,
    y
  };
}

export const ImportExportTradeView: React.FC = () => {
  const {
    parsedDischargeContainers,
    parsedLoadContainers,
    activeTerminalKey,
    activeTerminal,
    setTerminal,
    fileName,
    movinsFileName,
    baplieHeader,
    loadFullRealisticDemo
  } = useStowageStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'IMPORT' | 'EXPORT'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPortFilter, setSelectedPortFilter] = useState<string>('ALL');
  const [hoveredPort, setHoveredPort] = useState<PortGeo | null>(null);

  // UTC Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hub Working Port coordinates
  const hubPortGeo = useMemo(() => {
    return getPortCoords(activeTerminalKey);
  }, [activeTerminalKey]);

  // Combined dataset processing: Real BAPLIE & MOVINS data
  const tradeAnalysis = useMemo(() => {
    // Import Containers (Descarga): POD matches working terminal or marked DISCHARGE
    const importList = parsedDischargeContainers.filter(c => 
      checkIsDischargeContainer(c, activeTerminalKey) || 
      c.pod === activeTerminalKey || 
      c.operation === 'DISCHARGE'
    );

    // Export Containers (Carga): POL matches working terminal or in MOVINS load list
    const exportList = (parsedLoadContainers.length > 0 ? parsedLoadContainers : parsedDischargeContainers).filter(c =>
      c.pol === activeTerminalKey || 
      c.operation === 'LOAD'
    );

    // Transit Containers: Onboard containers passing through
    const transitList = parsedDischargeContainers.filter(c =>
      !checkIsDischargeContainer(c, activeTerminalKey) &&
      c.pol !== activeTerminalKey &&
      c.pod !== activeTerminalKey &&
      c.operation !== 'DISCHARGE' &&
      c.operation !== 'LOAD'
    );

    // TEU calculations (20' = 1 TEU, 40'/45' = 2 TEUs)
    const calcTeus = (list: Container[]) => list.reduce((acc, c) => acc + (c.size === 20 ? 1 : 2), 0);
    const calcWeightTons = (list: Container[]) => {
      const kgSum = list.reduce((acc, c) => {
        if (c.weightKg && !isNaN(c.weightKg)) return acc + c.weightKg;
        const parsed = parseFloat(c.weight || '0');
        return acc + (isNaN(parsed) ? 14000 : parsed);
      }, 0);
      return Math.round(kgSum / 1000);
    };

    const importTeu = calcTeus(importList);
    const exportTeu = calcTeus(exportList);
    const transitTeu = calcTeus(transitList);
    const totalTeu = importTeu + exportTeu + transitTeu;

    const importTons = calcWeightTons(importList);
    const exportTons = calcWeightTons(exportList);

    // Grouping by Origin Ports (POLs for Import)
    const importPortMap: Record<string, { portCode: string; count: number; teu: number; tons: number }> = {};
    importList.forEach(c => {
      const pol = c.pol || 'DESCONOCIDO';
      if (!importPortMap[pol]) {
        importPortMap[pol] = { portCode: pol, count: 0, teu: 0, tons: 0 };
      }
      importPortMap[pol].count += 1;
      importPortMap[pol].teu += c.size === 20 ? 1 : 2;
      importPortMap[pol].tons += (c.weightKg || 14000) / 1000;
    });

    // Grouping by Destination Ports (PODs for Export)
    const exportPortMap: Record<string, { portCode: string; count: number; teu: number; tons: number }> = {};
    exportList.forEach(c => {
      const pod = c.pod || 'DESCONOCIDO';
      if (!exportPortMap[pod]) {
        exportPortMap[pod] = { portCode: pod, count: 0, teu: 0, tons: 0 };
      }
      exportPortMap[pod].count += 1;
      exportPortMap[pod].teu += c.size === 20 ? 1 : 2;
      exportPortMap[pod].tons += (c.weightKg || 14000) / 1000;
    });

    // Unique connected ports
    const allConnectedPorts = Array.from(
      new Set([...Object.keys(importPortMap), ...Object.keys(exportPortMap)])
    ).filter(p => p !== activeTerminalKey && p !== 'Dato no disponible' && p !== 'DESCONOCIDO');

    // Special Cargo Stats
    const countSpecial = (list: Container[]) => {
      let reefer = 0, imo = 0, empty = 0, oog = 0;
      list.forEach(c => {
        const eff = getEffectiveCargoType(c);
        if (eff === 'RF') reefer++;
        if (eff === 'DG') imo++;
        if (eff === 'MT') empty++;
        if (eff === 'OS') oog++;
      });
      return { reefer, imo, empty, oog };
    };

    const importSpecial = countSpecial(importList);
    const exportSpecial = countSpecial(exportList);

    // Breakdown by Shipping Line / Operator
    const operatorMap: Record<string, { importTeu: number; exportTeu: number; totalTeu: number }> = {};
    [...importList, ...exportList].forEach(c => {
      const op = c.operator || 'OTRO';
      if (!operatorMap[op]) operatorMap[op] = { importTeu: 0, exportTeu: 0, totalTeu: 0 };
      const teus = c.size === 20 ? 1 : 2;
      if (checkIsDischargeContainer(c, activeTerminalKey) || c.pod === activeTerminalKey) {
        operatorMap[op].importTeu += teus;
      } else {
        operatorMap[op].exportTeu += teus;
      }
      operatorMap[op].totalTeu += teus;
    });

    const topOperators = Object.entries(operatorMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalTeu - a.totalTeu)
      .slice(0, 6);

    return {
      importList,
      exportList,
      transitList,
      importTeu,
      exportTeu,
      transitTeu,
      totalTeu,
      importTons,
      exportTons,
      importPortMap,
      exportPortMap,
      allConnectedPorts,
      importSpecial,
      exportSpecial,
      topOperators
    };
  }, [parsedDischargeContainers, parsedLoadContainers, activeTerminalKey]);

  // Filtered Route Activity Table
  const filteredActivityList = useMemo(() => {
    let combined: {
      id: string;
      vessel: string;
      origin: string;
      destination: string;
      teu: number;
      weightTons: number;
      type: 'IMPORT' | 'EXPORT';
      operator: string;
      cargoCategory: string;
      containerId: string;
    }[] = [];

    if (activeTab === 'ALL' || activeTab === 'IMPORT') {
      tradeAnalysis.importList.forEach(c => {
        combined.push({
          id: c.id,
          vessel: baplieHeader?.vesselName || 'MN BUQUE',
          origin: c.pol || 'POL',
          destination: activeTerminalKey,
          teu: c.size === 20 ? 1 : 2,
          weightTons: Math.round((c.weightKg || 14000) / 1000),
          type: 'IMPORT',
          operator: c.operator || 'LINEA',
          cargoCategory: getEffectiveCargoType(c),
          containerId: c.id
        });
      });
    }

    if (activeTab === 'ALL' || activeTab === 'EXPORT') {
      tradeAnalysis.exportList.forEach(c => {
        combined.push({
          id: c.id,
          vessel: baplieHeader?.vesselName || 'MN BUQUE',
          origin: activeTerminalKey,
          destination: c.pod || 'POD',
          teu: c.size === 20 ? 1 : 2,
          weightTons: Math.round((c.weightKg || 14000) / 1000),
          type: 'EXPORT',
          operator: c.operator || 'LINEA',
          cargoCategory: getEffectiveCargoType(c),
          containerId: c.id
        });
      });
    }

    if (selectedPortFilter !== 'ALL') {
      combined = combined.filter(item => item.origin === selectedPortFilter || item.destination === selectedPortFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      combined = combined.filter(
        item =>
          item.containerId.toLowerCase().includes(q) ||
          item.origin.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          item.operator.toLowerCase().includes(q)
      );
    }

    return combined.slice(0, 100); // Display top 100 rows
  }, [tradeAnalysis, activeTab, selectedPortFilter, searchTerm, activeTerminalKey, baplieHeader]);

  // Calculate percentages for donut
  const totalImpExpTeu = tradeAnalysis.importTeu + tradeAnalysis.exportTeu;
  const importPercent = totalImpExpTeu > 0 ? Math.round((tradeAnalysis.importTeu / totalImpExpTeu) * 100) : 50;
  const exportPercent = totalImpExpTeu > 0 ? 100 - importPercent : 50;

  return (
    <div className="flex flex-col h-full bg-[#020813] text-slate-100 font-sans select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-14 bg-[#051329]/90 border-b border-cyan-900/40 px-4 flex items-center justify-between z-20 shrink-0 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
                TOS RADAR <span className="text-cyan-400 text-xs font-mono font-normal">GLOBAL TRADE NETWORK</span>
              </h1>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                IMPORT / EXPORT LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              FLUIDO MARÍTIMO REAL • ALIMENTADO POR BAPLIE Y MOVINS EDI
            </p>
          </div>
        </div>

        {/* Working Terminal Switcher & EDI Info */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-md text-xs font-mono">
            <Ship className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">EDI:</span>
            <span className="text-white font-bold max-w-[120px] truncate" title={fileName}>
              {fileName}
            </span>
            {movinsFileName !== 'Sin MOVINS' && (
              <span className="text-emerald-400 font-bold max-w-[120px] truncate ml-1" title={movinsFileName}>
                + MOVINS
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-md">
            <Anchor className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-300 uppercase">PUERTO HUB:</span>
            <select
              value={activeTerminalKey}
              onChange={(e) => setTerminal(e.target.value)}
              className="bg-transparent text-xs font-bold font-mono text-white outline-none cursor-pointer"
            >
              {Object.values(TERMINAL_PROFILES).map((t) => (
                <option key={t.key} value={t.key} className="bg-slate-900 text-white">
                  {t.key} - {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden xl:block text-right font-mono text-[11px]">
            <div className="text-cyan-400 font-bold">{currentTime || 'UTC CLOCK'}</div>
            <div className="text-slate-500 text-[9px]">SISTEMA SINCRONIZADO</div>
          </div>

          {tradeAnalysis.totalTeu === 0 && (
            <button
              onClick={() => loadFullRealisticDemo()}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-md shadow-lg shadow-cyan-950 flex items-center gap-2 cursor-pointer animate-bounce"
            >
              <Zap className="w-4 h-4" />
              <span>CARGAR DEMO EDI</span>
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN WORKSPACE split ── */}
      <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden">
        {/* ── LEFT SIDEBAR: SUMMARY & METRICS ── */}
        <aside className="w-full xl:w-80 bg-[#040E1E] border-r border-slate-800/80 p-3 flex flex-col gap-3 overflow-y-auto shrink-0">
          {/* RESUMEN GLOBAL PANEL */}
          <div className="bg-[#06172D] border border-cyan-900/40 rounded-xl p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-cyan-950 pb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> RESUMEN GLOBAL
              </span>
              <span className="text-[10px] font-mono text-slate-400">EDI ACTIVO</span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="bg-[#020A14] border border-slate-800/80 p-2 rounded-lg">
                <div className="text-[9px] text-slate-400 uppercase">PUERTOS CONECTADOS</div>
                <div className="text-lg font-bold text-white">{tradeAnalysis.allConnectedPorts.length}</div>
              </div>
              <div className="bg-[#020A14] border border-slate-800/80 p-2 rounded-lg">
                <div className="text-[9px] text-slate-400 uppercase">TOTAL CARGA (TEU)</div>
                <div className="text-lg font-bold text-cyan-400">{tradeAnalysis.totalTeu.toLocaleString()}</div>
              </div>
            </div>

            {/* IMPORT VS EXPORT CARDS */}
            <div className="space-y-2">
              <div className="bg-cyan-950/40 border border-cyan-800/50 p-2.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-cyan-900/60 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-cyan-300 uppercase">IMPORTACIÓN (DESCARGA)</div>
                    <div className="text-[10px] text-slate-400 font-mono">{tradeAnalysis.importList.length} CONTENEDORES</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-extrabold text-cyan-400">{tradeAnalysis.importTeu.toLocaleString()} <span className="text-[10px]">TEU</span></div>
                  <div className="text-[9px] text-cyan-300/80">{tradeAnalysis.importTons.toLocaleString()} TON</div>
                </div>
              </div>

              <div className="bg-orange-950/30 border border-orange-800/50 p-2.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-orange-900/60 border border-orange-500/60 flex items-center justify-center text-orange-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-orange-300 uppercase">EXPORTACIÓN (CARGA)</div>
                    <div className="text-[10px] text-slate-400 font-mono">{tradeAnalysis.exportList.length} CONTENEDORES</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-extrabold text-orange-400">{tradeAnalysis.exportTeu.toLocaleString()} <span className="text-[10px]">TEU</span></div>
                  <div className="text-[9px] text-orange-300/80">{tradeAnalysis.exportTons.toLocaleString()} TON</div>
                </div>
              </div>

              {tradeAnalysis.transitTeu > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">EN TRÁNSITO / PERMANECE:</span>
                  <span className="text-slate-200 font-bold">{tradeAnalysis.transitTeu.toLocaleString()} TEU</span>
                </div>
              )}
            </div>
          </div>

          {/* LEYENDA RADAR */}
          <div className="bg-[#06172D] border border-cyan-900/40 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-cyan-400" /> LEYENDA Y SIMBOLOGÍA
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-cyan-500/30 animate-ping"></span>
                <span className="font-bold text-white">Puerto Hub Trabajos ({activeTerminalKey})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-cyan-300">Puerto de Origen (Importación)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                <span className="text-orange-300">Puerto de Destino (Exportación)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-cyan-400 border-t border-dashed border-cyan-300"></span>
                <span className="text-slate-400">Ruta de Importación (POL &rarr; HUB)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-orange-400 border-t border-dashed border-orange-300"></span>
                <span className="text-slate-400">Ruta de Exportación (HUB &rarr; POD)</span>
              </div>
            </div>
          </div>

          {/* CARGO TYPES BREAKDOWN */}
          <div className="bg-[#06172D] border border-cyan-900/40 rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
              DESGLOSE TIPO CARGA EDI
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-[#020A14] p-2 rounded border border-cyan-900/30">
                <span className="text-cyan-400 block font-bold">REEFER (RF)</span>
                <span className="text-white font-extrabold text-sm">
                  {tradeAnalysis.importSpecial.reefer + tradeAnalysis.exportSpecial.reefer}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Imp: {tradeAnalysis.importSpecial.reefer} | Exp: {tradeAnalysis.exportSpecial.reefer}
                </span>
              </div>

              <div className="bg-[#020A14] p-2 rounded border border-red-900/30">
                <span className="text-red-400 block font-bold">HAZMAT (DG/IMO)</span>
                <span className="text-white font-extrabold text-sm">
                  {tradeAnalysis.importSpecial.imo + tradeAnalysis.exportSpecial.imo}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Imp: {tradeAnalysis.importSpecial.imo} | Exp: {tradeAnalysis.exportSpecial.imo}
                </span>
              </div>

              <div className="bg-[#020A14] p-2 rounded border border-amber-900/30">
                <span className="text-amber-400 block font-bold">VACÍOS (MT)</span>
                <span className="text-white font-extrabold text-sm">
                  {tradeAnalysis.importSpecial.empty + tradeAnalysis.exportSpecial.empty}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Imp: {tradeAnalysis.importSpecial.empty} | Exp: {tradeAnalysis.exportSpecial.empty}
                </span>
              </div>

              <div className="bg-[#020A14] p-2 rounded border border-purple-900/30">
                <span className="text-purple-400 block font-bold">OOG / EXTRA</span>
                <span className="text-white font-extrabold text-sm">
                  {tradeAnalysis.importSpecial.oog + tradeAnalysis.exportSpecial.oog}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Imp: {tradeAnalysis.importSpecial.oog} | Exp: {tradeAnalysis.exportSpecial.oog}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── CENTER AREA: MAP CANVAS & BOTTOM TABLES ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#020813] relative overflow-hidden">
          {/* RADAR MAP CANVAS CONTAINER */}
          <div className="relative flex-1 min-h-[380px] bg-[#030D1B] border-b border-slate-800/80 overflow-hidden">
            {/* Dark Grid Background Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#1E3A5F_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none"></div>

            {/* Radar Compass Crosshairs */}
            <div className="absolute inset-0 pointer-events-none border border-cyan-900/20">
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500/10 border-r border-dashed border-cyan-500/20"></div>
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/10 border-b border-dashed border-cyan-500/20"></div>
            </div>

            {/* Top Filter Buttons over Map */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#051329]/90 border border-slate-800 p-1 rounded-lg backdrop-blur">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  activeTab === 'ALL'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TODAS LAS RUTAS ({tradeAnalysis.importList.length + tradeAnalysis.exportList.length})
              </button>
              <button
                onClick={() => setActiveTab('IMPORT')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  activeTab === 'IMPORT'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                IMPORTACIÓN ({tradeAnalysis.importList.length})
              </button>
              <button
                onClick={() => setActiveTab('EXPORT')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  activeTab === 'EXPORT'
                    ? 'bg-orange-500 text-slate-950 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EXPORTACIÓN ({tradeAnalysis.exportList.length})
              </button>
            </div>

            {/* SVG WORLD MAP & TRADE ROUTES */}
            <svg
              viewBox="0 0 1000 500"
              className="w-full h-full object-contain relative z-0"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Realistic World Coastline Geometry */}
              <RealisticWorldMap fill="#0B2138" stroke="#1E4976" strokeWidth={0.8} opacity={0.85} />

              {/* ROUTE ARCS DRAWING */}
              {/* 1. Import Routes (Cyan: POL -> HUB) */}
              {(activeTab === 'ALL' || activeTab === 'IMPORT') &&
                Object.values(tradeAnalysis.importPortMap).map((pm: { portCode: string; count: number; teu: number; tons: number }) => {
                  if (pm.portCode === activeTerminalKey) return null;
                  const originGeo = getPortCoords(pm.portCode);

                  // Quadratic Bezier Arc Curve Calculation
                  const midX = (originGeo.x + hubPortGeo.x) / 2;
                  const midY = (originGeo.y + hubPortGeo.y) / 2 - Math.min(60, Math.abs(originGeo.x - hubPortGeo.x) * 0.25);
                  const pathD = `M ${originGeo.x} ${originGeo.y} Q ${midX} ${midY} ${hubPortGeo.x} ${hubPortGeo.y}`;

                  return (
                    <g key={`imp-${pm.portCode}`}>
                      {/* Curved Arc */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#00E5FF"
                        strokeWidth={Math.max(1, Math.min(3, pm.teu / 20))}
                        strokeDasharray="4 3"
                        opacity={0.8}
                        className="animate-pulse"
                      />
                      {/* POL Origin Node */}
                      <circle
                        cx={originGeo.x}
                        cy={originGeo.y}
                        r={4}
                        fill="#00E5FF"
                        stroke="#ffffff"
                        strokeWidth={1}
                        className="cursor-pointer hover:scale-150 transition-transform"
                        onMouseEnter={() => setHoveredPort(originGeo)}
                        onMouseLeave={() => setHoveredPort(null)}
                      />
                      <text
                        x={originGeo.x}
                        y={originGeo.y - 7}
                        fill="#00E5FF"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                        className="pointer-events-none drop-shadow-md"
                      >
                        {pm.portCode}
                      </text>
                    </g>
                  );
                })}

              {/* 2. Export Routes (Orange: HUB -> POD) */}
              {(activeTab === 'ALL' || activeTab === 'EXPORT') &&
                Object.values(tradeAnalysis.exportPortMap).map((pm: { portCode: string; count: number; teu: number; tons: number }) => {
                  if (pm.portCode === activeTerminalKey) return null;
                  const destGeo = getPortCoords(pm.portCode);

                  const midX = (hubPortGeo.x + destGeo.x) / 2;
                  const midY = (hubPortGeo.y + destGeo.y) / 2 - Math.min(60, Math.abs(hubPortGeo.x - destGeo.x) * 0.25);
                  const pathD = `M ${hubPortGeo.x} ${hubPortGeo.y} Q ${midX} ${midY} ${destGeo.x} ${destGeo.y}`;

                  return (
                    <g key={`exp-${pm.portCode}`}>
                      {/* Curved Arc */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#F97316"
                        strokeWidth={Math.max(1, Math.min(3, pm.teu / 20))}
                        strokeDasharray="4 3"
                        opacity={0.8}
                      />
                      {/* POD Destination Node */}
                      <circle
                        cx={destGeo.x}
                        cy={destGeo.y}
                        r={4}
                        fill="#F97316"
                        stroke="#ffffff"
                        strokeWidth={1}
                        className="cursor-pointer hover:scale-150 transition-transform"
                        onMouseEnter={() => setHoveredPort(destGeo)}
                        onMouseLeave={() => setHoveredPort(null)}
                      />
                      <text
                        x={destGeo.x}
                        y={destGeo.y + 13}
                        fill="#F97316"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                        className="pointer-events-none drop-shadow-md"
                      >
                        {pm.portCode}
                      </text>
                    </g>
                  );
                })}

              {/* HUB WORKING PORT MARKER (Central Pulsing Radar Node) */}
              <g filter="url(#glow-cyan)">
                <circle cx={hubPortGeo.x} cy={hubPortGeo.y} r={18} fill="none" stroke="#00E5FF" strokeWidth={1} opacity={0.4} className="animate-ping" />
                <circle cx={hubPortGeo.x} cy={hubPortGeo.y} r={12} fill="none" stroke="#00E5FF" strokeWidth={1.5} opacity={0.7} />
                <circle cx={hubPortGeo.x} cy={hubPortGeo.y} r={6} fill="#00E5FF" stroke="#ffffff" strokeWidth={2} />
                <text
                  x={hubPortGeo.x}
                  y={hubPortGeo.y + 24}
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                  fontFamily="monospace"
                  className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                >
                  HUB: {activeTerminalKey} ({activeTerminal.name})
                </text>
              </g>
            </svg>

            {/* Hovered Port Tooltip overlay */}
            {hoveredPort && (
              <div
                className="absolute z-20 bg-slate-900/95 border border-cyan-500 p-2 rounded shadow-xl text-xs font-mono pointer-events-none"
                style={{
                  left: `${(hoveredPort.x / 1000) * 100}%`,
                  top: `${(hoveredPort.y / 500) * 100}%`,
                  transform: 'translate(-50%, -120%)'
                }}
              >
                <div className="font-bold text-cyan-400">{hoveredPort.code} - {hoveredPort.name}</div>
                <div className="text-slate-300">{hoveredPort.country}</div>
              </div>
            )}
          </div>

          {/* ── BOTTOM PANELS: ACTIVITY TABLE & DISTRIBUTION ── */}
          <div className="h-64 p-3 bg-[#040E1E] border-t border-slate-800 flex flex-col md:flex-row gap-3 overflow-hidden shrink-0">
            {/* RECENT EDI ACTIVITY TABLE */}
            <div className="flex-1 bg-[#06172D] border border-cyan-900/30 rounded-xl p-3 flex flex-col min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" /> ACTIVIDAD RECIENTE EDI (BAPLIE / MOVINS)
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1.5" />
                    <input
                      type="text"
                      placeholder="Buscar contenedor, puerto, linea..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-[10px] text-slate-200 pl-7 pr-2 py-1 rounded outline-none focus:border-cyan-500 w-44 font-mono"
                    />
                  </div>
                  <select
                    value={selectedPortFilter}
                    onChange={(e) => setSelectedPortFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-[10px] text-cyan-300 font-mono px-2 py-1 rounded outline-none"
                  >
                    <option value="ALL">TODOS LOS PUERTOS</option>
                    {tradeAnalysis.allConnectedPorts.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table list */}
              <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-1 font-mono text-[11px]">
                {filteredActivityList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    Sin registros de importación / exportación coincidentes en el manifiesto.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-800 pb-1">
                        <th className="py-1 px-2">CONTENEDOR</th>
                        <th className="py-1 px-2">OPERACIÓN</th>
                        <th className="py-1 px-2">RUTA (POL &rarr; POD)</th>
                        <th className="py-1 px-2">NAVIERA</th>
                        <th className="py-1 px-2">TEU</th>
                        <th className="py-1 px-2">PESO TON</th>
                        <th className="py-1 px-2">TIPO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredActivityList.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-1 px-2 font-bold text-white">{row.containerId}</td>
                          <td className="py-1 px-2">
                            {row.type === 'IMPORT' ? (
                              <span className="text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-800 px-1.5 py-0.5 rounded text-[9px]">
                                DESCARGA (IMP)
                              </span>
                            ) : (
                              <span className="text-orange-400 font-bold bg-orange-950/80 border border-orange-800 px-1.5 py-0.5 rounded text-[9px]">
                                CARGA (EXP)
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-slate-300">
                            {row.origin} &rarr; {row.destination}
                          </td>
                          <td className="py-1 px-2 text-slate-400">{row.operator}</td>
                          <td className="py-1 px-2 font-bold text-white">{row.teu}</td>
                          <td className="py-1 px-2 text-slate-300">{row.weightTons} T</td>
                          <td className="py-1 px-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {row.cargoCategory}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* DONUT & DISTRIBUTION CHART */}
            <div className="w-full md:w-72 bg-[#06172D] border border-cyan-900/30 rounded-xl p-3 flex flex-col shrink-0">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                DISTRIBUCIÓN DE CARGA
              </div>

              <div className="flex-1 flex flex-col justify-center items-center my-2">
                {/* DONUT VISUAL */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0F2942"
                      strokeWidth="4"
                    />
                    {/* Import segment (Cyan) */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="4"
                      strokeDasharray={`${importPercent}, 100`}
                    />
                    {/* Export segment (Orange) */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="4"
                      strokeDasharray={`${exportPercent}, 100`}
                      strokeDashoffset={`-${importPercent}`}
                    />
                  </svg>
                  <div className="absolute text-center font-mono">
                    <div className="text-xs font-extrabold text-white">{tradeAnalysis.totalTeu.toLocaleString()}</div>
                    <div className="text-[8px] text-slate-400 uppercase">TEU TOTAL</div>
                  </div>
                </div>

                <div className="w-full space-y-1.5 font-mono text-[10px] mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Descarga (Imp)
                    </span>
                    <span className="text-white font-bold">{importPercent}% ({tradeAnalysis.importTeu} TEU)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span> Carga (Exp)
                    </span>
                    <span className="text-white font-bold">{exportPercent}% ({tradeAnalysis.exportTeu} TEU)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
