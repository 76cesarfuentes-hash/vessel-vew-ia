import React, { useState, useEffect } from 'react';
import { useStowageStore } from './core/stores/useStowageStore';
import { useAuth } from './core/security/AuthContext';
import { useLanguage } from './core/i18n/LanguageContext';
import { LoginView } from './components/security/LoginView';
import { ForcePasswordChangeModal } from './components/security/ForcePasswordChangeModal';
import { UserSecurityBar } from './components/security/UserSecurityBar';

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
import { TongaPatioChessSimView } from './modules/TongaPatioChessSimView';
import { ImportExportTradeView } from './modules/ImportExportTradeView';

import { generateSampleBaplieContainers } from './core/parser/demoData';

import appLogoGenerated from './assets/images/stowage_app_logo_1785618008257.jpg';
import appLogoPng from './assets/logo.png';
import appLogoJpg from './assets/logo.jpg';

import { ShareTransmitModal } from './components/common/ShareTransmitModal';
import { PoseidonSimulationModal } from './components/common/PoseidonSimulationModal';
import { UpgradeToPlannerModal } from './components/common/UpgradeToPlannerModal';

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
  Tv,
  ShieldCheck,
  Crown,
  Truck,
  Lock,
  Globe
} from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading, user, testModeWarning, logClientAudit } = useAuth();
  const { t } = useLanguage();

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

  const [activeTab, setActiveTab] = useState<'estiba' | 'planos' | 'cuadre' | 'movins' | 'agents' | 'comparador' | 'miniplanpro' | 'movimientos' | 'manual-engine' | 'auto-excel' | 'tonga-patio' | 'import-export'>('estiba');

  const [isManoMasLargaModalOpen, setIsManoMasLargaModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [attemptedTabName, setAttemptedTabName] = useState<string>('');

  const [sidebarLogoSrc, setSidebarLogoSrc] = useState<string>(appLogoGenerated || appLogoPng || appLogoJpg);
  const [sidebarLogoFailed, setSidebarLogoFailed] = useState<boolean>(false);

  // Paid Mode Check
  const isPaidUser = user?.isPaidPlan === true || user?.role === 'Administrador' || user?.role === 'Planner' || user?.role === 'Supervisor' || user?.role === 'Operador';

  // Secure Navigation Handler
  const handleTabChange = (tab: typeof activeTab, tabLabel: string) => {
    if (tab === 'estiba' || isPaidUser) {
      setActiveTab(tab);
    } else {
      setAttemptedTabName(tabLabel);
      setIsUpgradeModalOpen(true);
    }
  };

  const handleSidebarLogoError = () => {
    if (sidebarLogoSrc === appLogoGenerated) {
      setSidebarLogoSrc(appLogoPng);
    } else if (sidebarLogoSrc === appLogoPng) {
      setSidebarLogoSrc(appLogoJpg);
    } else {
      setSidebarLogoFailed(true);
    }
  };

  // Load realistic demo BAPLIE + MOVINS if empty initially so user can test right away
  useEffect(() => {
    if (parsedContainers.length === 0) {
      loadFullRealisticDemo();
    }
  }, []);

  // 1. Loading Screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#050D18] flex flex-col items-center justify-center p-4 font-mono text-cyan-400">
        <ShieldCheck className="w-12 h-12 animate-pulse mb-3 text-cyan-400" />
        <p className="text-sm tracking-widest font-bold uppercase">VERIFICANDO AUTENTICACIÓN Y SEGURIDAD EMPRESARIAL...</p>
      </div>
    );
  }

  // 2. Unauthenticated -> Render ONLY Login Screen (Layer 1 & Layer 6)
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(targetTab) => {
          if (targetTab) setActiveTab(targetTab);
        }}
      />
    );
  }

  const handleBaplieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      loadBaplieContent(text, file.name);
      logClientAudit('LOAD_BAPLIE', `Archivo BAPLIE cargado: ${file.name}`);
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
      logClientAudit('LOAD_MOVINS', `Archivo MOVINS cargado: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = () => {
    loadFullRealisticDemo();
    logClientAudit('LOAD_DEMO', 'Muestra BAPLIE realista cargada.');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#030811] text-slate-100 font-sans select-none">
      
      {/* Forced Password Change Overlay if user must change password */}
      {user?.mustChangePassword && (
        <ForcePasswordChangeModal onSuccess={() => window.location.reload()} />
      )}

      {/* ── TOP HEADER BAR (EXACT SCREENSHOT LAYOUT) ── */}
      <header className="flex-shrink-0 bg-[#050D18] border-b border-slate-800/90 px-3 md:px-5 py-2 flex items-center justify-between gap-3 z-40 select-none">
        
        {/* Left: Logo Poseidon Stowage Planner Pro */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('estiba')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-600 to-slate-900 border border-cyan-400/80 shadow-[0_0_12px_rgba(0,180,255,0.4)] flex items-center justify-center shrink-0">
            <Anchor className="w-5 h-5 text-cyan-200" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm md:text-base font-black text-white tracking-wider uppercase">
                POSEIDON
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-wider -mt-0.5">
              STOWAGE PLANNER PRO
            </span>
            <span className="text-[7.5px] font-mono text-slate-400">
              by <strong className="text-cyan-300">ONS IA</strong>
            </span>
          </div>
        </div>

        {/* Center: Main Navigation Tabs (Image Style Pills) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#091522] border border-slate-800/90 rounded-xl p-1 shadow-inner font-mono text-xs">
          <button
            onClick={() => handleTabChange('miniplanpro', 'Dashboard')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'miniplanpro'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>DASHBOARD</span>
          </button>

          <button
            onClick={() => handleTabChange('estiba', 'Estiba')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'estiba'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>ESTIBA</span>
          </button>

          <button
            onClick={() => handleTabChange('import-export', 'Importación')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import-export'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>IMPORTACIÓN</span>
          </button>

          <button
            onClick={() => handleTabChange('movins', 'Exportación')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'movins'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORTACIÓN</span>
          </button>

          <button
            onClick={() => handleTabChange('manual-engine', 'Ajuste de Estiba')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'manual-engine'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>AJUSTE DE ESTIBA</span>
          </button>

          <button
            onClick={() => handleTabChange('comparador', 'Comparador')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comparador'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-purple-400" />
            <span>COMPARADOR</span>
          </button>

          <button
            onClick={() => handleTabChange('planos', 'Reportes')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'planos'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span>REPORTES</span>
          </button>

          <button
            onClick={() => handleTabChange('agents', 'IA Agente')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>IA AGENTE</span>
          </button>
        </nav>

        {/* Right Section: Brand Info + User Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex flex-col text-right font-mono">
            <span className="text-xs font-black text-white tracking-widest">ONS IA</span>
            <span className="text-[8px] text-slate-400 leading-tight">Oceanic Network Solutions</span>
            <span className="text-[7.5px] text-cyan-400 leading-tight">Intelligence & Automation</span>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800/90 pl-3">
            {/* Notification Bell */}
            <button className="relative p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer">
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
              <span className="text-xs font-mono font-bold">🔔</span>
            </button>

            {/* Help Icon */}
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer font-bold text-xs"
              title="Ayuda / Demostración"
            >
              ?
            </button>

            {/* Settings Gear */}
            <button
              onClick={openTerminalGate}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer font-bold text-xs"
              title="Configuración de Terminal"
            >
              ⚙️
            </button>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-2 bg-[#0A1624] border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-mono">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
                👤
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-white leading-tight">Planner HLC</span>
                <span className="text-[8.5px] text-cyan-400 leading-tight">Terminal {activeTerminalKey}</span>
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* ── ACTION CONTROL BAR (CARGAR BAPLIE, MOVINS, DEMO & VISTA OPERATIVA) ── */}
      <div className="flex-shrink-0 bg-[#07111E] border-b border-slate-800/80 px-3 md:px-5 py-1.5 flex flex-wrap items-center justify-between gap-2 z-30 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold text-[10.5px] uppercase tracking-wider flex items-center gap-1">
            <Upload className="w-3.5 h-3.5 text-cyan-400" /> CARGAR EDI:
          </span>

          {/* Cargar BAPLIE Button */}
          <label className="cursor-pointer bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-[10.5px] py-1 px-3 rounded-lg border border-cyan-400 shadow-[0_0_10px_rgba(0,180,255,0.3)] transition-all flex items-center gap-1.5 shrink-0">
            <Upload className="w-3.5 h-3.5 text-cyan-200" />
            <span>📥 CARGAR BAPLIE (IMPORTACIÓN)</span>
            <input type="file" accept=".edi,.txt,.un" onChange={handleBaplieUpload} className="hidden" />
          </label>

          {/* Cargar MOVINS Button */}
          <label className="cursor-pointer bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10.5px] py-1 px-3 rounded-lg border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5 shrink-0">
            <FileCode className="w-3.5 h-3.5 text-emerald-200" />
            <span>📤 CARGAR MOVINS (EXPORTACIÓN)</span>
            <input type="file" accept=".edi,.txt" onChange={handleMovinsUpload} className="hidden" />
          </label>

          {/* Cargar Demo Button */}
          <button
            onClick={handleLoadDemo}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10.5px] py-1 px-2.5 rounded-lg border border-amber-500/50 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            title="Cargar BAPLIE y MOVINS de muestra para pruebas de estiba"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ CARGAR DEMO</span>
          </button>
        </div>

        {/* Operation View Toggle (DESCARGA vs CARGA) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">VISTA:</span>
          <div className="bg-[#040A14] border border-slate-700/80 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setOperationView('DESCARGA')}
              className={`px-3 py-1 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeOperationView === 'DESCARGA'
                  ? 'bg-orange-600 text-white shadow-[0_0_10px_rgba(234,88,12,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>DESCARGA ({parsedDischargeContainers.length})</span>
            </button>
            <button
              onClick={() => setOperationView('CARGA')}
              className={`px-3 py-1 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeOperationView === 'CARGA'
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-200" />
              <span>CARGA ({parsedLoadContainers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE NAVBAR ── */}
      <nav className="flex lg:hidden bg-[#070D18] border-b border-slate-800 px-2 py-1.5 overflow-x-auto gap-1 text-[11px] font-mono shrink-0">
        <button
          onClick={() => handleTabChange('estiba', 'Estiba')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'estiba' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          ESTIBA
        </button>
        <button
          onClick={() => handleTabChange('import-export', 'Importación')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'import-export' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          IMPORTACIÓN
        </button>
        <button
          onClick={() => handleTabChange('movins', 'Exportación')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'movins' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          EXPORTACIÓN
        </button>
        <button
          onClick={() => handleTabChange('manual-engine', 'Ajuste')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'manual-engine' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          AJUSTE
        </button>
        <button
          onClick={() => handleTabChange('comparador', 'Comparador')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'comparador' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          COMPARADOR
        </button>
        <button
          onClick={() => handleTabChange('planos', 'Reportes')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'planos' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          REPORTES
        </button>
        <button
          onClick={() => handleTabChange('agents', 'IA Agente')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${activeTab === 'agents' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'}`}
        >
          IA AGENTE
        </button>
      </nav>

      {/* ── MAIN OPERATIONAL WORKSPACE CANVAS ── */}
      <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col bg-[#030811]">
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
        {activeTab === 'tonga-patio' && <TongaPatioChessSimView />}
        {activeTab === 'import-export' && <ImportExportTradeView />}
      </main>

      {/* ── FOOTER STATUS BAR (EXACT SCREENSHOT FOOTER) ── */}
      <footer className="flex-shrink-0 bg-[#040A14] border-t border-slate-800/90 px-4 py-1.5 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2 z-40 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <span>USUARIO: <strong className="text-white">Planner HLC</strong></span>
          <span>ROL: <strong className="text-white">Planner</strong></span>
          <span>TERMINAL: <strong className="text-cyan-400">{activeTerminal.name} ({activeTerminalKey})</strong></span>
          <span>VERSIÓN: <strong className="text-white">2.0.0</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span>Última actualización: <strong className="text-slate-200">30/05/2025 10:22:18</strong></span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 rounded px-2 py-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SINCRONIZADO</span>
          </div>
        </div>
      </footer>

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

      {/* POSEIDON IA 2D Simulation & Simple Onboarding Modal */}
      <PoseidonSimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
      />
      {/* Upgrade to Planner Modal for Guest Users */}
      <UpgradeToPlannerModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        tabName={attemptedTabName}
      />
    </div>
  );
}
