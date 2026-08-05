import React, { useState } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { SimultaneousCrossSectionMatrix } from '../components/bay/SimultaneousCrossSectionMatrix';
import { ShippingLineLegendPanel } from '../components/container/ShippingLineLegendPanel';
import {
  Ship,
  Grid,
  Search,
  Filter,
  CheckCircle2,
  FileCode,
  Send,
  Sparkles,
  Bot,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Snowflake,
  AlertTriangle,
  RotateCcw,
  Sliders,
  HelpCircle,
  FileText,
  Download,
  Flame,
  Maximize2,
  Upload
} from 'lucide-react';

export const EstibaMatrixView: React.FC = () => {
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'user', text: '¿Cuántos contenedores DG hay en la bahía 24?' },
    {
      sender: 'ai',
      text: 'En la bahía 24 hay 9 contenedores DG. Clases: 2 (3), 3 (2), 6 (1), 8 (1), 9 (2). ¿Deseas generar el reporte DG por bahía?'
    }
  ]);

  const [activeSizeFilter, setActiveSizeFilter] = useState<'ALL' | '20' | '40' | '45'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  const {
    filteredContainers,
    parsedContainers,
    parsedDischargeContainers,
    parsedLoadContainers,
    activeOperationView,
    uniqueBays,
    activeTerminalKey,
    activeTerminal,
    activeSelectedBay,
    baplieHeader,
    fileName,
    movinsFileName,
    setSelectedBay,
    setSelectedContainer,
    setFilterPod,
    setFilterLine,
    resetFilters,
    loadBaplieContent,
    loadMovinsContent,
    loadFullRealisticDemo
  } = useStowageStore();

  const handleBaplieUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      loadBaplieContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleMovinsUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      loadMovinsContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const isBaplieLoaded = Boolean(
    fileName &&
    fileName !== 'Sin archivo EDI' &&
    parsedDischargeContainers.length > 0
  );

  // Section bays for dropdown
  const sectionBayStrings = ['02', '06', '10', '14', '18', '22', '24', '26', '30', '32'];
  const currentSectionBay = activeSelectedBay || '24';

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatMessage('');

    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Analizando datos de la Bahía ${currentSectionBay} para "${userMsg}". Se registran 12 contenedores reefer y 4 contenedores de alta prioridad. ¿Deseas exportar el reporte?`
        }
      ]);
    }, 600);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#030811] text-slate-100 overflow-hidden font-sans p-2 gap-2 select-none">
      
      {/* ── 3-COLUMN DASHBOARD LAYOUT ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-0 overflow-hidden">
        
        {/* ════════ COLUMN 1: LEFT SIDEBAR (BUQUE, RESUMEN, FILTROS) ════════ */}
        <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-2 overflow-y-auto pr-0.5 min-h-0">
          
          {/* 1. INFORMACIÓN DEL BUQUE */}
          <div className="bg-[#07111E] border border-blue-900/60 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-mono text-xs font-black text-cyan-400 tracking-wider flex items-center gap-1.5 uppercase">
                <Ship className="w-4 h-4 text-cyan-400" />
                INFORMACIÓN DEL BUQUE
              </span>
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> BAPLIE OK
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="text-slate-400">BUQUE:</span>
                <strong className="text-white font-black truncate max-w-[160px]">
                  {baplieHeader?.vesselName || 'CMA CGM LISA MARIE'}
                </strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="text-slate-400">VIAJE:</span>
                <strong className="text-cyan-300 font-bold">{baplieHeader?.voyageNumber || '0FLJ6E1MA'}</strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="text-slate-400">SERVICIO:</span>
                <strong className="text-slate-200">AL4 - US GULF EXPRESS</strong>
              </div>
              <div className="flex justify-between items-start py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">TERMINAL:</span>
                <div className="text-right">
                  <strong className="text-cyan-400 font-bold block">{activeTerminal.name} ({activeTerminalKey})</strong>
                  {activeOperationView === 'DESCARGA' ? (
                    <span className="text-[10px] text-orange-300 font-mono bg-orange-950/80 border border-orange-700/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 shadow-sm">
                      <span className="text-slate-400 text-[9px]">LOC+11+ (DESCARGA):</span>
                      <strong className="text-orange-300 font-extrabold">{baplieHeader?.pod || (parsedDischargeContainers[0]?.pod) || activeTerminalKey}</strong>
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 shadow-sm">
                      <span className="text-slate-400 text-[9px]">LOC+11+ (CARGA):</span>
                      <strong className="text-emerald-300 font-extrabold">{baplieHeader?.pod || (parsedLoadContainers[0]?.pod) || (parsedLoadContainers[0]?.pol) || activeTerminalKey}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="text-slate-400">ARCHIVO:</span>
                <strong className="text-amber-300 font-mono text-[10px] truncate max-w-[150px]">
                  {fileName || 'CMA_CGM_LISA_MARIE_2505.EDI'}
                </strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">FECHA CARGA:</span>
                <span className="text-slate-300 text-[10px]">30/05/2025 10:21</span>
              </div>
            </div>
          </div>

          {/* 1.5. CARGA DE ARCHIVOS EDI (BAPLIE & MOVINS) */}
          <div className="bg-[#07111E] border border-cyan-500/40 rounded-xl p-3 shadow-lg bg-gradient-to-b from-[#09182B] to-[#07111E]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-mono text-xs font-black text-cyan-300 tracking-wider flex items-center gap-1.5 uppercase">
                <Upload className="w-4 h-4 text-cyan-400 animate-pulse" />
                CARGAR ARCHIVOS EDI
              </span>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold">
                IMPORT / EXPORT
              </span>
            </div>

            <div className="space-y-2 font-mono">
              {/* BAPLIE Import Button */}
              <div>
                <label className="w-full cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs py-2 px-3 rounded-lg border border-cyan-300 shadow-[0_0_12px_rgba(0,180,255,0.4)] transition-all flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-100" />
                  <span>📥 CARGAR BAPLIE (IMPORTACIÓN)</span>
                  <input type="file" accept=".edi,.txt,.un" onChange={handleBaplieUploadLocal} className="hidden" />
                </label>
                <p className="text-[9px] text-slate-400 text-center mt-1">
                  Formatos aceptados: .edi, .txt, .un (BAPLIE 2.0 / 2.2 / 3.0)
                </p>
              </div>

              {/* MOVINS Export Button */}
              <div>
                <label className="w-full cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2 px-3 rounded-lg border border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-100" />
                  <span>📤 CARGAR MOVINS (EXPORTACIÓN)</span>
                  <input type="file" accept=".edi,.txt" onChange={handleMovinsUploadLocal} className="hidden" />
                </label>
                <p className="text-[9px] text-slate-400 text-center mt-1">
                  Formatos aceptados: .edi, .txt (Instrucciones de Carga)
                </p>
              </div>

              {/* Load Demo */}
              <button
                onClick={loadFullRealisticDemo}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ CARGAR DATOS DE DEMOSTRACIÓN</span>
              </button>
            </div>
          </div>

          {/* 2. RESUMEN GENERAL */}
          <div className="bg-[#07111E] border border-blue-900/60 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-mono text-xs font-black text-cyan-400 tracking-wider flex items-center gap-1.5 uppercase">
                <Grid className="w-4 h-4 text-cyan-400" />
                RESUMEN GENERAL
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                TOTAL: <strong className="text-white text-xs font-black">4,256</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">IMPORTACIÓN</span>
                <span className="bg-orange-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  1,248
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">EXPORTACIÓN</span>
                <span className="bg-sky-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  854
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">TRÁNSITO</span>
                <span className="bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  2,154
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">DG (IMO)</span>
                <span className="bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  162
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">REEFERS</span>
                <span className="bg-cyan-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  842
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">OOG</span>
                <span className="bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  186
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">VACÍOS</span>
                <span className="bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  1,132
                </span>
              </div>
              <div className="bg-[#0A1828] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">TANQUES</span>
                <span className="bg-purple-600 text-white font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                  48
                </span>
              </div>
            </div>
          </div>

          {/* 3. FILTROS RÁPIDOS */}
          <div className="bg-[#07111E] border border-blue-900/60 rounded-xl p-3 shadow-lg flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-mono text-xs font-black text-cyan-400 tracking-wider flex items-center gap-1.5 uppercase">
                <Filter className="w-4 h-4 text-cyan-400" />
                FILTROS RÁPIDOS
              </span>
              <button
                onClick={resetFilters}
                className="text-[9.5px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Limpiar
              </button>
            </div>

            {/* 8 Quick Icon Filter Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-3 font-mono text-[10px]">
              <button
                onClick={() => setSelectedTypeFilter('ALL')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'ALL'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Grid className="w-4 h-4 text-cyan-300" />
                <span className="font-bold text-[9px]">TODOS</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('IMP')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'IMP'
                    ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_10px_rgba(234,88,12,0.5)]'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <ArrowDown className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-[9px]">IMPORT.</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('EXP')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'EXP'
                    ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_10px_rgba(2,132,199,0.5)]'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <ArrowUp className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-[9px]">EXPORT.</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('TRANSIT')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'TRANSIT'
                    ? 'bg-blue-600 border-blue-400 text-white shadow'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Ship className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-[9px]">TRÁNSITO</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('DG')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'DG'
                    ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Flame className="w-4 h-4 text-red-400" />
                <span className="font-bold text-[9px]">DG</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('RF')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'RF'
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Snowflake className="w-4 h-4 text-cyan-300" />
                <span className="font-bold text-[9px]">REEFER</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('OOG')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'OOG'
                    ? 'bg-amber-600 border-amber-400 text-white shadow'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-[9px]">OOG</span>
              </button>

              <button
                onClick={() => setSelectedTypeFilter('MT')}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedTypeFilter === 'MT'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-[#0A1828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Grid className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-[9px]">VACÍOS</span>
              </button>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">POR POD</label>
                <select
                  onChange={e => setFilterPod(e.target.value)}
                  className="w-full bg-[#0A1828] border border-slate-800 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500"
                >
                  <option value="">Todos los PODs</option>
                  <option value="VER">VER - Veracruz</option>
                  <option value="HOU">HOU - Houston</option>
                  <option value="SHA">SHA - Shanghai</option>
                  <option value="CTG">CTG - Cartagena</option>
                  <option value="LZC">LZC - Lázaro Cárdenas</option>
                  <option value="SIN">SIN - Singapore</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">POR LÍNEA</label>
                <select
                  onChange={e => setFilterLine(e.target.value)}
                  className="w-full bg-[#0A1828] border border-slate-800 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500"
                >
                  <option value="">Todas las Líneas</option>
                  <option value="MAERSK">MAERSK</option>
                  <option value="MSC">MSC</option>
                  <option value="CMA CGM">CMA CGM</option>
                  <option value="EVERGREEN">EVERGREEN</option>
                  <option value="ONE">ONE</option>
                  <option value="HAPAG-LLOYD">HAPAG-LLOYD</option>
                </select>
              </div>

              <button
                onClick={resetFilters}
                className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-bold transition-all cursor-pointer"
              >
                LIMPIAR FILTROS
              </button>
            </div>
          </div>

        </div>

        {/* ════════ COLUMN 2: CENTER WORKSPACE (VISTA TRANSVERSAL DE BAHÍA) ════════ */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col bg-[#07111E] border border-blue-900/60 rounded-xl p-3 shadow-xl min-h-0 overflow-hidden">
          
          {/* Sub-Header Bar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-xs md:text-sm tracking-wider uppercase">
                VISTA TRANSVERSAL DE BAHÍA
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Select Bay */}
              <div className="flex items-center gap-1 bg-[#0A1828] border border-slate-800 rounded px-2 py-1">
                <span className="text-[10px] text-slate-400">BAHÍA</span>
                <select
                  value={currentSectionBay}
                  onChange={e => setSelectedBay(e.target.value)}
                  className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
                >
                  {sectionBayStrings.map(b => (
                    <option key={b} value={b} className="bg-slate-900 text-white">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select View */}
              <select className="bg-[#0A1828] border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs outline-none">
                <option>Transversal</option>
                <option>Longitudinal</option>
              </select>

              {/* Select Type */}
              <select className="bg-[#0A1828] border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs outline-none">
                <option>Todos</option>
                <option>Descarga</option>
                <option>Carga</option>
              </select>

              {/* Auto Fit */}
              <button className="px-2 py-1 bg-blue-950 text-cyan-300 border border-blue-800 hover:bg-blue-900 rounded font-bold text-[10px] cursor-pointer">
                AUTO FIT
              </button>
            </div>
          </div>

          {/* Search Bar & Size Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-xs">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Buscar contenedor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-[#0A1828] border border-slate-800 rounded text-slate-200 text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#0A1828] border border-slate-800 rounded p-0.5 text-[10px]">
              <button
                onClick={() => setActiveSizeFilter('20')}
                className={`px-2 py-0.5 rounded font-bold ${activeSizeFilter === '20' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                20'
              </button>
              <button
                onClick={() => setActiveSizeFilter('40')}
                className={`px-2 py-0.5 rounded font-bold ${activeSizeFilter === '40' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                40'
              </button>
              <button
                onClick={() => setActiveSizeFilter('45')}
                className={`px-2 py-0.5 rounded font-bold ${activeSizeFilter === '45' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                45'
              </button>
              <button
                onClick={() => setActiveSizeFilter('ALL')}
                className={`px-2 py-0.5 rounded font-bold ${activeSizeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                TODOS
              </button>
            </div>

            <button
              onClick={() => setIsLegendOpen(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-500/50 rounded font-bold text-[10px] cursor-pointer flex items-center gap-1"
            >
              <Layers className="w-3 h-3 text-cyan-400" /> LEYENDA POD
            </button>
          </div>

          {/* Main Bay Visualization Frame */}
          <div className="flex-1 bg-[#040A14] border border-slate-800/90 rounded-lg p-2.5 flex flex-col min-h-0 overflow-hidden relative">
            <div className="flex items-center justify-between font-mono text-xs mb-1">
              <span className="font-black text-cyan-400 text-base">BAY {currentSectionBay}</span>
              <span className="text-slate-400 text-[10px]">FR. 71 - FR. 75</span>
            </div>

            {/* Matrix Render Canvas */}
            <div className="flex-1 min-h-0 overflow-auto">
              <SimultaneousCrossSectionMatrix
                sectionBayId={currentSectionBay}
                allContainers={filteredContainers}
                activeTerminalKey={activeTerminalKey}
                onSelectContainer={setSelectedContainer}
                levelFilter="ALL"
              />
            </div>

            {/* Bottom Row Labels */}
            <div className="flex justify-between items-center font-mono text-[9.5px] text-slate-400 pt-1.5 border-t border-slate-800/80">
              <span>&lt;- AFT</span>
              <span className="font-bold text-slate-300">ROWS (71, 73, 75)</span>
              <span>FWD -&gt;</span>
            </div>
          </div>

          {/* Bottom Legend Bar (LEYENDA) */}
          <div className="mt-2 bg-[#0A1828] border border-slate-800 rounded-lg p-2 font-mono text-[9.5px] text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-cyan-400 mr-1 uppercase">LEYENDA:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-orange-600 inline-block"></span> VER (Imp)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block"></span> HOU
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 inline-block"></span> SHA
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span> CTG
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block"></span> LZC
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-600 inline-block"></span> SIN
            </span>
            <span className="flex items-center gap-1">
              <Snowflake className="w-3 h-3 text-cyan-300 inline" /> Reefer
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400 inline" /> DG
            </span>
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-amber-400 inline" /> OOG
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              🟢 (E) VACÍO
            </span>
          </div>

        </div>

        {/* ════════ COLUMN 3: RIGHT SIDEBAR (AGENTE IA POSEIDON & RESUMEN) ════════ */}
        <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-2 overflow-y-auto pl-0.5 min-h-0">
          
          {/* 1. AGENTE IA - POSEIDON */}
          <div className="bg-[#07111E] border border-blue-900/60 rounded-xl p-3 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-mono text-xs font-black text-cyan-400 tracking-wider flex items-center gap-1.5 uppercase">
                <Bot className="w-4 h-4 text-cyan-400" />
                AGENTE IA – POSEIDON
              </span>
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ONLINE
              </span>
            </div>

            {/* Poseidon Avatar & Info */}
            <div className="flex items-center gap-2.5 bg-[#0A1828] border border-slate-800 rounded-lg p-2 mb-2.5">
              <div className="relative shrink-0">
                <img
                  src="/src/assets/images/poseidon_ai_avatar_1785918559663.jpg"
                  alt="Poseidon IA Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.5)]"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
              </div>
              <div className="text-[10px] font-mono leading-tight">
                <p className="text-slate-300">
                  Tu agente especializado en planificación portuaria y análisis de carga. Solo responde sobre los datos cargados en la aplicación.
                </p>
              </div>
            </div>

            {/* Chat History Box */}
            <div className="bg-[#040A14] border border-slate-800/90 rounded-lg p-2 mb-2 space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
              {chatHistory.map((item, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg leading-relaxed ${
                    item.sender === 'user'
                      ? 'bg-blue-950/70 border border-blue-800/60 text-cyan-200 ml-3'
                      : 'bg-[#0B1E32] border border-cyan-500/30 text-slate-100 mr-2'
                  }`}
                >
                  <span className="font-bold text-[9.5px] block mb-0.5 text-cyan-400 uppercase">
                    {item.sender === 'user' ? 'TÚ:' : 'POSEIDON IA:'}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Quick Action Pill Buttons */}
            <div className="flex flex-wrap gap-1 mb-2 font-mono text-[9.5px]">
              <button
                onClick={() => setChatMessage('Generar Reporte DG por Bahía')}
                className="px-2 py-1 rounded-full border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 cursor-pointer transition-all"
              >
                Generar Reporte DG
              </button>
              <button
                onClick={() => setChatMessage(`Generar Mini Plan Bahía ${currentSectionBay}`)}
                className="px-2 py-1 rounded-full border border-blue-500/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 cursor-pointer transition-all"
              >
                Generar Mini Plan Bahía {currentSectionBay}
              </button>
              <button
                onClick={() => setChatMessage('Exportar Excel de Estiba')}
                className="px-2 py-1 rounded-full border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 cursor-pointer transition-all"
              >
                Generar Excel Bahía {currentSectionBay}
              </button>
              <button
                onClick={() => setChatMessage('Sugerir Ajustes de Estiba')}
                className="px-2 py-1 rounded-full border border-amber-500/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 cursor-pointer transition-all"
              >
                Ajuste de Estiba
              </button>
              <button
                onClick={() => setChatMessage('Comparar Versiones BAPLIE')}
                className="px-2 py-1 rounded-full border border-purple-500/50 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 cursor-pointer transition-all"
              >
                Comparar BAPLIE
              </button>
              <button
                onClick={() => setChatMessage('Generar MOVINS Corregido')}
                className="px-2 py-1 rounded-full border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 cursor-pointer transition-all"
              >
                Generar MOVINS Corregido
              </button>
            </div>

            {/* Chat Input Field */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <input
                type="text"
                placeholder="Escribe tu consulta..."
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#0A1828] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. RESUMEN OPERACIONAL */}
          <div className="bg-[#07111E] border border-blue-900/60 rounded-xl p-3 shadow-lg flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-mono text-xs font-black text-cyan-400 tracking-wider flex items-center gap-1.5 uppercase">
                <FileText className="w-4 h-4 text-cyan-400" />
                RESUMEN OPERACIONAL
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-[10.5px]">
              
              {/* IMPORTACIÓN */}
              <div className="bg-[#0A1828] border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-orange-400 font-extrabold mb-1">
                  <span>IMPORTACIÓN (BAPLIE)</span>
                  <span className="text-white text-xs">1,248 U</span>
                </div>
                <p className="text-slate-400 text-[9.5px] leading-tight mb-1">
                  Bahías: 02, 10, 22, 24, 26
                </p>
                <div className="flex gap-2 text-[9px] text-slate-300">
                  <span className="bg-red-950 text-red-300 px-1 py-0.5 rounded border border-red-800">DG: 37</span>
                  <span className="bg-cyan-950 text-cyan-300 px-1 py-0.5 rounded border border-cyan-800">Reefer: 162</span>
                  <span className="bg-amber-950 text-amber-300 px-1 py-0.5 rounded border border-amber-800">OOG: 28</span>
                </div>
              </div>

              {/* CARGA PROGRAMADA */}
              <div className="bg-[#0A1828] border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-sky-400 font-extrabold mb-1">
                  <span>CARGA PROGRAMADA (MOVINS)</span>
                  <span className="text-white text-xs">854 U</span>
                </div>
                <p className="text-slate-400 text-[9.5px] leading-tight mb-1">
                  Bahías: 08, 12, 18, 32, 34
                </p>
                <div className="flex gap-2 text-[9px] text-slate-300">
                  <span className="bg-red-950 text-red-300 px-1 py-0.5 rounded border border-red-800">DG: 19</span>
                  <span className="bg-cyan-950 text-cyan-300 px-1 py-0.5 rounded border border-cyan-800">Reefer: 91</span>
                  <span className="bg-amber-950 text-amber-300 px-1 py-0.5 rounded border border-amber-800">OOG: 14</span>
                </div>
              </div>

              {/* OPERACIÓN MIXTA */}
              <div className="bg-[#0A1828] border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-purple-400 font-extrabold mb-1">
                  <span>OPERACIÓN MIXTA</span>
                  <span className="text-white text-xs">Bahía 22</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-300 mt-1">
                  <span>Descarga: <strong className="text-orange-400">312 U</strong></span>
                  <span>Carga: <strong className="text-sky-400">186 U</strong></span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Shipping Line Legend Modal */}
      <ShippingLineLegendPanel
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </div>
  );
};
