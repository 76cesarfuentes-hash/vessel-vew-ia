import React, { useState, useEffect } from 'react';
import { useStowageStore } from './core/stores/useStowageStore';
import { TerminalGateModal } from './components/common/TerminalGateModal';
import { ContainerDetailModal } from './components/container/ContainerDetailModal';
import { GlobalVoiceCopilot } from './components/common/GlobalVoiceCopilot';

// Modules
import { EstibaMatrixView } from './modules/EstibaMatrixView';
import { ReportesPlanosView } from './modules/ReportesPlanosView';
import { CuadreReconciliacionView } from './modules/CuadreReconciliacionView';
import { MovinsValidatorView } from './modules/MovinsValidatorView';
import { AgentsCopilotView } from './modules/AgentsCopilotView';
import { ComparadorBaplieView } from './modules/ComparadorBaplieView';
import { MiniPlanProView } from './modules/MiniPlanProView';
import { ManoMasLargaView } from './modules/ManoMasLargaView';
import { MovimientosModuleView } from './modules/MovimientosModuleView';
import { ManualAdjustmentEngineView } from './modules/ManualAdjustmentEngineView';
import { AutoStowagePlannerView } from './modules/AutoStowagePlannerView';

import { generateSampleBaplieContainers } from './core/parser/demoData';

import appLogo from './assets/logo.jpg';

import { ShareTransmitModal } from './components/common/ShareTransmitModal';

import {
  Grid,
  FileSpreadsheet,
  ArrowRightLeft,
  FileCode,
  Bot,
  GitCompare,
  Anchor,
  Upload,
  Sparkles,
  Layers,
  Ship,
  ChevronDown,
  BarChart3,
  Trophy,
  Sliders,
  Zap,
  Cast,
  Tv
} from 'lucide-react';

export default function App() {
  const {
    parsedContainers,
    parsedDischargeContainers,
    parsedLoadContainers,
    activeOperationView,
    activeTerminalKey,
    activeTerminal,
    selectedContainer,
    isTerminalGateOpen,
    fileName,
    movinsFileName,
    setTerminal,
    openTerminalGate,
    closeTerminalGate,
    setOperationView,
    loadBaplieContent,
    loadMovinsContent,
    loadFullRealisticDemo,
    setSelectedContainer,
    setContainers
  } = useStowageStore();

  const [activeTab, setActiveTab] = useState<'estiba' | 'planos' | 'cuadre' | 'movins' | 'agents' | 'comparador' | 'miniplanpro' | 'movimientos' | 'manual-engine' | 'auto-excel'>('estiba');

  const [isManoMasLargaModalOpen, setIsManoMasLargaModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Load realistic demo BAPLIE + MOVINS if empty initially so user can test right away
  useEffect(() => {
    if (parsedContainers.length === 0) {
      loadFullRealisticDemo();
    }
  }, []);

  const handleBaplieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      loadBaplieContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleMovinsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      loadMovinsContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = () => {
    loadFullRealisticDemo();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#0A1A29] text-slate-100 font-sans select-none">
      {/* ── DESKTOP LEFT NAVIGATION SIDEBAR (MD+) ── */}
      <aside className="hidden md:flex w-16 flex-shrink-0 bg-[#0D1E30] border-r border-slate-800/80 flex-col items-center py-4 gap-3 z-40">
        {/* Brand Logo */}
        <div
          className="mb-2 cursor-pointer hover:scale-105 transition-transform group"
          title="Terminal Planning Platform TOS"
          onClick={() => setActiveTab('estiba')}
        >
          <img
            src={appLogo}
            alt="Terminal Planning Platform Logo"
            className="w-10 h-10 rounded-xl object-cover border border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.4)] group-hover:border-cyan-400"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Navigation Items */}
        <button
          onClick={() => setActiveTab('estiba')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'estiba'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Matriz Estiba (Transversal)"
        >
          <Grid className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('planos')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'planos'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Reportes & Mini-Planos"
        >
          <Layers className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('cuadre')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'cuadre'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Cuadre Inteligente / Reconciliación Excel"
        >
          <ArrowRightLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('movins')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'movins'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Validador MOVINS (EDI)"
        >
          <FileCode className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'agents'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Agentes AI (Auditor, Solucionador, Copilot)"
        >
          <Bot className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('miniplanpro')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'miniplanpro'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Mini Plan de Estiba Modo Pro (Executive Replica)"
        >
          <Ship className="w-5 h-5 text-amber-400" />
        </button>

        <button
          onClick={() => setActiveTab('movimientos')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'movimientos'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Módulo Movimientos por Bahía (Mano Más Larga)"
        >
          <BarChart3 className="w-5 h-5 text-amber-400" />
        </button>

        <button
          onClick={() => setActiveTab('manual-engine')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'manual-engine'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Módulo Ajuste (Mini Planos & Recap)"
        >
          <Sliders className="w-5 h-5 text-cyan-400" />
        </button>

        <button
          onClick={() => setActiveTab('auto-excel')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'auto-excel'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Estiba Automática desde Excel de Patio"
        >
          <Zap className="w-5 h-5 text-emerald-400" />
        </button>

        <button
          onClick={() => setActiveTab('comparador')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'comparador'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Comparador de Versiones BAPLIE"
        >
          <GitCompare className="w-5 h-5" />
        </button>

        <div className="w-6 h-[1px] bg-slate-800 my-1" />

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="w-10 h-10 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.3)] animate-pulse"
          title="Transmitir Pantalla / Control Room TV & Share"
        >
          <Cast className="w-5 h-5 text-cyan-300" />
        </button>
      </aside>

      {/* ── MOBILE / TABLET BOTTOM NAVIGATION BAR (SMALL SCREENS) ── */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D1E30]/95 backdrop-blur-md border-t border-slate-800/90 px-1 py-1.5 justify-around items-center h-14 shadow-2xl">
        <button
          onClick={() => setActiveTab('estiba')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'estiba' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Grid className="w-4 h-4 mb-0.5" />
          <span>Estiba</span>
        </button>

        <button
          onClick={() => setActiveTab('planos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'planos' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Planos</span>
        </button>

        <button
          onClick={() => setActiveTab('cuadre')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'cuadre' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 mb-0.5" />
          <span>Cuadre</span>
        </button>

        <button
          onClick={() => setActiveTab('movins')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'movins' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <FileCode className="w-4 h-4 mb-0.5" />
          <span>MOVINS</span>
        </button>

        <button
          onClick={() => setActiveTab('movimientos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'movimientos' ? 'text-amber-400 font-bold bg-amber-950/60' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Bahías</span>
        </button>

        <button
          onClick={() => setActiveTab('miniplanpro')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'miniplanpro' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Ship className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Pro</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'agents' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Bot className="w-4 h-4 mb-0.5" />
          <span>AI</span>
        </button>
      </nav>

      {/* ── MAIN LAYOUT SHELL ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-14 md:pb-0">
        {/* Top Breadcrumb & Action Header */}
        <header className="flex-shrink-0 bg-[#0A1A29] border-b border-slate-800 px-3 md:px-5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 z-30">
          <div className="min-w-0 flex items-center gap-2.5">
            <img
              src={appLogo}
              alt="Logo TOS"
              className="w-9 h-9 rounded-xl object-cover border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)] shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setActiveTab('estiba')}
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h1 className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-white tracking-wider sm:tracking-widest uppercase flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">TERMINAL PLANNING PLATFORM</span>
                <span className="text-[9px] sm:text-[10px] bg-red-600 text-white font-mono px-1.5 sm:px-2 py-0.5 rounded font-bold flex-shrink-0">
                  TOS V1.0
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-mono text-cyan-400 truncate">
                EDI / BAPLIE / MOVINS · Reconciliación Inteligente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap w-full sm:w-auto justify-start sm:justify-end overflow-x-auto pb-1 sm:pb-0">
            {/* Operation View Selector (DESCARGA vs CARGA) */}
            <div className="bg-[#070D18] border border-slate-700 rounded-lg p-0.5 flex items-center font-mono flex-shrink-0">
              <button
                onClick={() => setOperationView('DESCARGA')}
                className={`px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeOperationView === 'DESCARGA'
                    ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista de Descarga (Estado del Buque al Arribo - BAPLIE Completo)"
              >
                <Ship className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>DESCARGA ({parsedDischargeContainers.length})</span>
              </button>
              <button
                onClick={() => setOperationView('CARGA')}
                className={`px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeOperationView === 'CARGA'
                    ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista de Carga (Estado del Buque al Zarpe - Tránsito + MOVINS)"
              >
                <FileCode className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                <span>CARGA ({parsedLoadContainers.length})</span>
              </button>
            </div>

            {/* Permanent Active Terminal Selector */}
            <button
              onClick={openTerminalGate}
              className="bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/50 hover:border-cyan-400 rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-mono text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shadow flex-shrink-0"
              title="Terminal Activa en uso. Haz clic para cambiar de terminal."
            >
              <Anchor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
              <span className="text-white font-bold text-[10px] sm:text-xs flex items-center gap-0.5">
                {activeTerminalKey}
                <ChevronDown className="w-3 h-3 text-cyan-400" />
              </span>
            </button>

            {/* Load BAPLIE Button */}
            <label className="cursor-pointer bg-cyan-700 hover:bg-cyan-600 text-white font-mono font-bold text-[10px] sm:text-xs py-1 sm:py-1.5 px-2 sm:px-2.5 rounded border border-cyan-400 shadow transition-all flex items-center gap-1 flex-shrink-0">
              <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> BAPLIE
              <input type="file" accept=".edi,.txt,.un" onChange={handleBaplieUpload} className="hidden" />
            </label>

            {/* Load MOVINS Button */}
            <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-[10px] sm:text-xs py-1 sm:py-1.5 px-2 sm:px-2.5 rounded border border-emerald-400 shadow transition-all flex items-center gap-1 flex-shrink-0">
              <FileCode className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" /> MOVINS
              <input type="file" accept=".edi,.txt" onChange={handleMovinsUpload} className="hidden" />
            </label>

            {/* Load Demo Data Button */}
            <button
              onClick={handleLoadDemo}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-[10px] sm:text-xs py-1 sm:py-1.5 px-2 sm:px-2.5 rounded border border-slate-600 transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
              title="Cargar muestra BAPLIE de prueba"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /> DEMO
            </button>

            {/* Mano Más Larga Modal Button */}
            <button
              onClick={() => setIsManoMasLargaModalOpen(true)}
              className="bg-gradient-to-r from-amber-950 to-slate-900 hover:from-amber-900 hover:to-slate-800 text-amber-300 font-mono font-bold text-[10px] sm:text-xs py-1 sm:py-1.5 px-2 sm:px-2.5 rounded border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
              title="Abrir ventana aparte: Resumen por Bahía y Mano Más Larga"
            >
              <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span>MANO MÁS LARGA</span>
            </button>
          </div>
        </header>

        {/* Main Operational Canvas */}
        <main className="flex-1 overflow-hidden p-4 relative">
          {activeTab === 'estiba' && <EstibaMatrixView />}
          {activeTab === 'planos' && <ReportesPlanosView />}
          {activeTab === 'cuadre' && <CuadreReconciliacionView />}
          {activeTab === 'movins' && <MovinsValidatorView />}
          {activeTab === 'agents' && <AgentsCopilotView />}
          {activeTab === 'comparador' && <ComparadorBaplieView />}
          {activeTab === 'miniplanpro' && <MiniPlanProView />}
          {activeTab === 'movimientos' && <MovimientosModuleView />}
          {activeTab === 'manual-engine' && <ManualAdjustmentEngineView />}
          {activeTab === 'auto-excel' && <AutoStowagePlannerView />}
        </main>
      </div>

      {/* Terminal Selection Gate Modal */}
      <TerminalGateModal
        isOpen={isTerminalGateOpen}
        activeTerminalKey={activeTerminalKey}
        onSelectTerminal={(key) => setTerminal(key)}
        onClose={closeTerminalGate}
      />

      {/* Container Detail Inspector Modal */}
      <ContainerDetailModal
        container={selectedContainer}
        activeTerminalKey={activeTerminalKey}
        onClose={() => setSelectedContainer(null)}
      />

      {/* Mano Más Larga Window Modal */}
      {isManoMasLargaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-hidden animate-fadeIn">
          <div className="w-full h-full max-w-7xl max-h-[94vh] bg-[#050D18] border border-amber-500/60 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden relative">
            <ManoMasLargaView onClose={() => setIsManoMasLargaModalOpen(false)} />
          </div>
        </div>
      )}
      {/* Global Floating Voice Copilot (Available on all screens) */}
      <GlobalVoiceCopilot />

      {/* Share & Screen Transmit Modal */}
      <ShareTransmitModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        vesselName="MAERSK HOUSTON"
      />
    </div>
  );
}
