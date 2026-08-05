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
import { GlobalTradeMapView } from './modules/GlobalTradeMapView';

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

  const [activeTab, setActiveTab] = useState<'estiba' | 'planos' | 'cuadre' | 'movins' | 'agents' | 'comparador' | 'miniplanpro' | 'movimientos' | 'manual-engine' | 'auto-excel' | 'tonga-patio' | 'mapa-mundial'>('estiba');

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
    return <LoginView />;
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
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#0A1A29] text-slate-100 font-sans select-none">
      
      {/* Forced Password Change Overlay if user must change password */}
      {user?.mustChangePassword && (
        <ForcePasswordChangeModal onSuccess={() => window.location.reload()} />
      )}

      {/* ── DESKTOP LEFT NAVIGATION SIDEBAR (MD+) ── */}

      <aside className="hidden md:flex w-16 flex-shrink-0 bg-[#0D1E30] border-r border-slate-800/80 flex-col items-center py-4 gap-3 z-40">
        {/* Brand Logo */}
        <div
          className="mb-2 cursor-pointer hover:scale-105 transition-transform group"
          title="Terminal Planning Platform TOS"
          onClick={() => setActiveTab('estiba')}
        >
          {!sidebarLogoFailed ? (
            <img
              src={sidebarLogoSrc}
              onError={handleSidebarLogoError}
              alt="Terminal Planning Platform Logo"
              className="w-10 h-10 rounded-xl object-cover border border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.4)] group-hover:border-cyan-400"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-400/80 shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center justify-center text-cyan-300 font-black text-xs font-mono">
              TOS
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <button
          onClick={() => handleTabChange('estiba', 'Matriz de Estiba Principal')}
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
          onClick={() => handleTabChange('planos', 'Reportes y Mini-Planos')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'planos'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Reportes & Mini-Planos" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Layers className="w-5 h-5" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('cuadre', 'Cuadre Inteligente Excel')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'cuadre'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Cuadre Inteligente / Reconciliación Excel" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <ArrowRightLeft className="w-5 h-5" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('movins', 'Validador MOVINS EDI')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'movins'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Validador MOVINS (EDI)" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <FileCode className="w-5 h-5" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('agents', 'Agentes IA y Copilot')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'agents'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Agentes AI (Auditor, Solucionador, Copilot)" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Bot className="w-5 h-5" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('miniplanpro', 'Mini Plan de Estiba Modo Pro')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'miniplanpro'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Mini Plan de Estiba Modo Pro" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Ship className="w-5 h-5 text-amber-400" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('movimientos', 'Módulo Movimientos por Bahía')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'movimientos'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Módulo Movimientos por Bahía" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <BarChart3 className="w-5 h-5 text-amber-400" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('manual-engine', 'Módulo Ajuste Mini Planos')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'manual-engine'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Módulo Ajuste (Mini Planos & Recap)" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Sliders className="w-5 h-5 text-cyan-400" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('tonga-patio', 'Tonga de Patio y Ajedrez RTG')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'tonga-patio'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Tonga de Patio: Simulación por Carril, Tira, Altura y Reglas de Ajedrez" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Crown className="w-5 h-5 text-amber-400" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('auto-excel', 'Estiba Automática desde Excel')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'auto-excel'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Estiba Automática desde Excel de Patio" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Zap className="w-5 h-5 text-emerald-400" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('comparador', 'Comparador de BAPLIEs')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'comparador'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Comparador de Versiones BAPLIE" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <GitCompare className="w-5 h-5" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('mapa-mundial', 'Mapa Mundial de Comercio Marítimo')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'mapa-mundial'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title={isPaidUser ? "Mapa Mundial de Comercio Marítimo (Importación/Exportación)" : "🔒 Función del Modo de Paga (Planner)"}
        >
          <Globe className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          {!isPaidUser && <Lock className="w-3 h-3 text-amber-400 absolute top-1 right-1" />}
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
          onClick={() => handleTabChange('estiba', 'Estiba')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all ${
            activeTab === 'estiba' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Grid className="w-4 h-4 mb-0.5" />
          <span>Estiba</span>
        </button>

        <button
          onClick={() => handleTabChange('planos', 'Planos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'planos' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Planos</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('cuadre', 'Cuadre')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'cuadre' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 mb-0.5" />
          <span>Cuadre</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('movins', 'MOVINS')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'movins' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <FileCode className="w-4 h-4 mb-0.5" />
          <span>MOVINS</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('movimientos', 'Bahías')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'movimientos' ? 'text-amber-400 font-bold bg-amber-950/60' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Bahías</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('miniplanpro', 'MiniPlan Pro')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'miniplanpro' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Ship className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Pro</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('tonga-patio', 'Tonga Patio')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'tonga-patio' ? 'text-amber-400 font-bold bg-amber-950/60' : 'text-slate-400'
          }`}
        >
          <Crown className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Tonga</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('agents', 'Copilot AI')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'agents' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Bot className="w-4 h-4 mb-0.5" />
          <span>AI</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>

        <button
          onClick={() => handleTabChange('mapa-mundial', 'Mapa Mundial')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded text-[10px] font-mono transition-all relative ${
            activeTab === 'mapa-mundial' ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Globe className="w-4 h-4 mb-0.5 text-cyan-400" />
          <span>Mapa</span>
          {!isPaidUser && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-0.5 right-1" />}
        </button>
      </nav>

      {/* ── MAIN LAYOUT SHELL ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-14 md:pb-0">
        {/* Tier Access Status Bar */}
        <div className={`px-4 py-1.5 text-xs font-mono flex items-center justify-between gap-2 z-40 animate-fadeIn border-b ${
          isPaidUser
            ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-900/90 border-amber-500/50 text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {isPaidUser ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>MODO DE PAGA ACTIVO: ACCESO TOTAL A TODAS LAS HERRAMIENTAS Y MATRICES</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>MODO GRATUITO: Solo 1ª Ventana disponible (Plano de Estiba) • Sesión {user?.sessionCount || 1} de 5</span>
              </span>
            )}
          </div>

          {!isPaidUser && (
            <button
              onClick={() => { setAttemptedTabName('Herramientas Avanzadas'); setIsUpgradeModalOpen(true); }}
              className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 shadow shrink-0"
            >
              <Crown className="w-3 h-3" />
              <span>DESBLOQUEAR PLANNER</span>
            </button>
          )}
        </div>

        {/* Top Breadcrumb & Action Header */}
        <header className="flex-shrink-0 bg-[#0A1A29] border-b border-slate-800 px-3 md:px-5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 z-30">
          <div className="min-w-0 flex items-center gap-2.5">
            {!sidebarLogoFailed ? (
              <img
                src={sidebarLogoSrc}
                onError={handleSidebarLogoError}
                alt="Logo TOS"
                className="w-9 h-9 rounded-xl object-cover border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setActiveTab('estiba')}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                onClick={() => setActiveTab('estiba')}
                className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-400/80 shadow-[0_0_12px_rgba(0,229,255,0.4)] flex items-center justify-center text-cyan-300 font-black text-xs font-mono shrink-0 cursor-pointer"
              >
                TOS
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-white tracking-wider sm:tracking-widest uppercase flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">POSEIDON IA</span>
                <span className="text-[9px] sm:text-[10px] bg-cyan-600 text-white font-mono px-1.5 sm:px-2 py-0.5 rounded font-bold flex-shrink-0">
                  PORT AI V3.8
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-mono text-cyan-400 truncate">
                Plataforma Inteligente de Importación, Restibas & Agente IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap w-full sm:w-auto justify-start sm:justify-end overflow-x-auto pb-1 sm:pb-0">
            {/* 2D Presentation & AI Inspection Button */}
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-[10px] sm:text-xs py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-lg border border-cyan-300 shadow-lg shadow-cyan-950 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer animate-pulse"
              title="Ver análisis 2D de importación, restibas y reajustes del Agente IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Demostración IA 2D</span>
            </button>
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

            {/* Enterprise Security User Bar */}
            <UserSecurityBar />
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
          {activeTab === 'tonga-patio' && <TongaPatioChessSimView />}
          {activeTab === 'mapa-mundial' && <GlobalTradeMapView />}
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
