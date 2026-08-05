import React, { useState, useEffect } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import { useLanguage } from '../../core/i18n/LanguageContext';
import { ContactModal } from '../common/ContactModal';
import bgImage from '../../assets/images/poseidon_port_bg_1785922847366.jpg';
import {
  Anchor,
  ShieldCheck,
  Lock,
  User as UserIcon,
  LogIn,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
  Grid,
  FileText,
  Zap,
  BarChart3,
  Bot,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  GitCompare,
  Scale,
  Sliders,
  Shield,
  Activity,
  Check,
  Ship,
  Upload,
  Clock,
  Box,
  Flame,
  Snowflake,
  Maximize2,
  Package,
  Container
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: (targetTab?: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, registerGuest } = useAuth();
  const { t } = useLanguage();

  // Mode: 'login' | 'demo'
  const [activeTab, setActiveTab] = useState<'login' | 'demo'>('login');

  // Form State
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('02:23 a. m. · 05/05/2025');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' · ' +
        now.toLocaleDateString('es-MX')
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Submit Login Handler
  const handleLoginSubmit = async (e: React.FormEvent, targetTab?: string) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (activeTab === 'demo') {
      const guestRes = await registerGuest('Demostración Portuaria', undefined, 'invitado_demo', 'demo123');
      setIsSubmitting(false);
      if (guestRes.success) {
        if (onLoginSuccess) onLoginSuccess(targetTab || 'estiba');
      } else {
        setError(guestRes.error || 'Error al iniciar sesión en modo Demo.');
      }
      return;
    }

    const cleanUser = username.trim() || 'admin';
    const cleanPass = password === '••••••••••' ? 'admin' : password.trim();

    const result = await login(cleanUser, cleanPass);
    setIsSubmitting(false);

    if (result.success) {
      if (onLoginSuccess) onLoginSuccess(targetTab || 'estiba');
    } else {
      setError(result.error || 'Credenciales inválidas. Intente nuevamente.');
    }
  };

  // Quick feature launch
  const handleFeatureClick = async (targetTab: string) => {
    setError(null);
    setIsSubmitting(true);
    const result = await login(username.trim() || 'admin', password === '••••••••••' ? 'admin' : password.trim());
    setIsSubmitting(false);
    if (result.success && onLoginSuccess) {
      onLoginSuccess(targetTab);
    } else {
      // Fallback guest login if needed
      const guestRes = await registerGuest('Demostración', undefined, 'demo_user', 'demo123');
      if (guestRes.success && onLoginSuccess) {
        onLoginSuccess(targetTab);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#02050D] text-slate-100 font-sans select-none overflow-x-hidden flex flex-col justify-between relative">
      
      {/* Background Port Image Overlay (EXACT MATCH TO ATTACHED IMAGE) */}
      <div
        className="absolute inset-0 bg-cover bg-left md:bg-center bg-no-repeat opacity-40 pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url('${bgImage}')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#02050D]/90 via-[#030914]/80 to-[#02050D]/95 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02050D]/70 via-transparent to-[#02050D]/90 pointer-events-none" />

      {/* ── TOP HEADER BAR (EXACT MATCH TO ATTACHED SCREENSHOT) ── */}
      <header className="relative z-20 bg-[#040A14]/95 border-b border-cyan-500/30 px-3 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-2xl">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-slate-900 border border-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center justify-center shrink-0">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base md:text-lg font-black text-white tracking-widest uppercase">
                POSEIDON
              </h1>
              <span className="text-[10px] font-mono font-black text-cyan-300 bg-cyan-950/90 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                TOS PORTUARIO
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              by <strong className="text-cyan-400 font-bold">ONS IA</strong>
            </p>
          </div>
        </div>

        {/* Center Tagline */}
        <div className="hidden lg:flex flex-col items-start font-mono">
          <h2 className="text-xs font-black text-white tracking-wider uppercase">
            SISTEMA INTEGRADO DE ESTIBA Y NAVEGACIÓN PORTUARIA
          </h2>
          <div className="text-[10px] text-cyan-400 font-bold space-x-2 mt-0.5">
            <span>Planificación</span>
            <span className="text-slate-500">•</span>
            <span>Análisis</span>
            <span className="text-slate-500">•</span>
            <span>Control</span>
            <span className="text-slate-500">•</span>
            <span>Precisión</span>
          </div>
        </div>

        {/* Quick Nav Header Icons */}
        <div className="hidden xl:flex items-center gap-2 font-mono text-[10px]">
          <div className="bg-[#06111E] border border-cyan-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">ESTIBA 2D/3D</div>
              <div className="text-[8px] text-slate-400">Visualización en tiempo real</div>
            </div>
          </div>

          <div className="bg-[#06111E] border border-cyan-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">BAPLIE</div>
              <div className="text-[8px] text-slate-400">Importación y Análisis</div>
            </div>
          </div>

          <div className="bg-[#06111E] border border-cyan-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">MOVINS</div>
              <div className="text-[8px] text-slate-400">Generación y Validación</div>
            </div>
          </div>

          <div className="bg-[#06111E] border border-cyan-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">REPORTES</div>
              <div className="text-[8px] text-slate-400">Excel / PDF Automáticos</div>
            </div>
          </div>

          <div className="bg-[#06111E] border border-cyan-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">IA AGENTE</div>
              <div className="text-[8px] text-slate-400">Asistente Inteligente Especializado</div>
            </div>
          </div>
        </div>

        {/* Right: Active Terminal & Status */}
        <div className="flex items-center gap-3 font-mono">
          <div className="bg-[#061322] border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-2">
            <div>
              <div className="text-[8px] text-slate-400 font-bold uppercase">TERMINAL ACTIVO</div>
              <div className="text-xs font-black text-cyan-300 flex items-center gap-1">
                VERACRUZ (VER)
                <ChevronDown className="w-3 h-3 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SISTEMA EN LÍNEA</span>
            </div>
            <div className="text-slate-400 text-[9px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN MIDDLE SECTION ── */}
      <main className="relative z-10 flex-1 px-3 md:px-6 py-4 max-w-7xl mx-auto w-full flex flex-col justify-center">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT COLUMN: VISIÓN OPERATIVA (FLOATING OVERLAY CARD) */}
          <div className="lg:col-span-3 bg-[#030B17]/85 border border-cyan-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-xs font-black text-cyan-300 tracking-widest uppercase mb-3.5 pb-1.5 border-b border-cyan-500/30 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                VISIÓN OPERATIVA
              </h3>

              <div className="space-y-3 font-mono text-xs text-slate-200">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#061324]/80 border border-slate-800">
                  <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Grid className="w-3 h-3" />
                  </div>
                  <span>Control total de la estiba</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#061324]/80 border border-slate-800">
                  <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-3 h-3" />
                  </div>
                  <span>Decisiones basadas en datos</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#061324]/80 border border-slate-800">
                  <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span>Optimización de operaciones</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#061324]/80 border border-slate-800">
                  <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Shield className="w-3 h-3" />
                  </div>
                  <span>Precisión y seguridad</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#061324]/80 border border-slate-800">
                  <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Activity className="w-3 h-3" />
                  </div>
                  <span>Trazabilidad completa</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 text-[9px] font-mono text-slate-500 text-center">
              Kernel POS-TOS v2.5.0
            </div>
          </div>

          {/* CENTER COLUMN: BIENVENIDO A POSEIDON (LOGIN CARD) */}
          <div className="lg:col-span-5 bg-[#050F1E]/95 border-2 border-cyan-500/50 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,229,255,0.25)] backdrop-blur-xl flex flex-col justify-between relative">
            
            {/* Top Anchor Emblem */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-slate-950 border-2 border-cyan-300 shadow-[0_0_25px_rgba(0,229,255,0.6)] flex items-center justify-center mb-2">
                <Anchor className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-xl font-black font-mono text-white tracking-wider uppercase">
                BIENVENIDO A <span className="text-cyan-400">POSEIDON</span>
              </h2>
              <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                Acceda al sistema para gestionar y optimizar sus operaciones portuarias
              </p>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 gap-2 my-4 p-1 bg-[#020712] rounded-xl border border-cyan-500/30">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>INICIAR SESIÓN</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('demo')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'demo'
                    ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>MODO DEMO</span>
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-3 p-2.5 bg-rose-950/90 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3 font-mono">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  USUARIO
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    className="w-full pl-9 pr-4 py-2 bg-[#020712] border border-cyan-500/40 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  CONTRASEÑA
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2 bg-[#020712] border border-cyan-500/40 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(0,180,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 border border-cyan-300/40"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    INGRESANDO...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    ACCEDER AL SISTEMA
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            {/* Badges footer */}
            <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 text-[9.5px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Conexión segura
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                Protección empresarial
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Lock className="w-3.5 h-3.5" />
                RBAC Authentication
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: ESTADÍSTICAS GLOBALES */}
          <div className="lg:col-span-4 bg-[#030B17]/85 border border-cyan-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-xs font-black text-cyan-300 tracking-widest uppercase mb-3.5 pb-1.5 border-b border-cyan-500/30 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                ESTADÍSTICAS GLOBALES
              </h3>

              <div className="grid grid-cols-2 gap-2.5 font-mono">
                
                {/* Stat 1 */}
                <div className="bg-[#061324]/80 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8.5px] font-bold uppercase">
                    <Box className="w-3.5 h-3.5 text-cyan-400" />
                    <span>CONTENEDORES TOTALES</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">1,248,952</div>
                  <div className="text-[8.5px] text-emerald-400 font-bold mt-0.5">+12.5% vs ayer</div>
                </div>

                {/* Stat 2 */}
                <div className="bg-[#061324]/80 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8.5px] font-bold uppercase">
                    <Ship className="w-3.5 h-3.5 text-cyan-400" />
                    <span>BUQUES PROCESADOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">358</div>
                  <div className="text-[8.5px] text-emerald-400 font-bold mt-0.5">+8.2% vs ayer</div>
                </div>

                {/* Stat 3 */}
                <div className="bg-[#061324]/80 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8.5px] font-bold uppercase">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>BAPLIES PROCESADOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">1,102</div>
                  <div className="text-[8.5px] text-emerald-400 font-bold mt-0.5">+15.1% vs ayer</div>
                </div>

                {/* Stat 4 */}
                <div className="bg-[#061324]/80 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8.5px] font-bold uppercase">
                    <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MOVINS GENERADOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">854</div>
                  <div className="text-[8.5px] text-emerald-400 font-bold mt-0.5">+9.3% vs ayer</div>
                </div>

                {/* Stat 5 */}
                <div className="bg-[#061324]/80 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8.5px] font-bold uppercase">
                    <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>USUARIOS ACTIVOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">24</div>
                  <div className="text-[8.5px] text-slate-400 font-bold mt-0.5">En línea ahora</div>
                </div>

                {/* Stat 6 */}
                <div className="bg-[#061324]/80 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8.5px] font-bold uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PRECISIÓN DE DATOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">99.87%</div>
                  <div className="text-[8.5px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                    Integridad <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 text-[9px] font-mono text-slate-500 text-center">
              Servicio de Sincronización TOS Activo
            </div>
          </div>

        </div>

        {/* ── FUNCIONALIDADES PRINCIPALES (GRID CARDS) ── */}
        <div className="mt-6">
          <h3 className="font-mono text-xs font-black text-cyan-300 tracking-widest uppercase mb-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            FUNCIONALIDADES PRINCIPALES
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono">
            
            {/* Card 1 */}
            <div
              onClick={() => handleFeatureClick('estiba')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Grid className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">VISUALIZACIÓN DE ESTIBA</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Vistas 2D Transversal, Bahía, Cubierta y 3D</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 2 */}
            <div
              onClick={() => handleFeatureClick('import-export')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">IMPORTACIÓN BAPLIE</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Carga y análisis de archivos BAPLIE EDI</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 3 */}
            <div
              onClick={() => handleFeatureClick('movins')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <GitCompare className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">MOVINS GENERATOR</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Generación automática y validación MOVINS</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 4 */}
            <div
              onClick={() => handleFeatureClick('manual-engine')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">AJUSTE DE ESTIBA</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Ajuste manual y redistribución de carga</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 5 */}
            <div
              onClick={() => handleFeatureClick('comparador')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">COMPARADOR</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Compare BAPLIES y MOVINS</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 6 */}
            <div
              onClick={() => handleFeatureClick('planos')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">REPORTES</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Reportes Excel / PDF personalizados</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 7 */}
            <div
              onClick={() => handleFeatureClick('agents')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">IA AGENTE</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Asistente especializado en operaciones</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 8 */}
            <div
              onClick={() => handleFeatureClick('cuadre')}
              className="bg-[#040C18]/90 hover:bg-[#071526] border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">CONFIGURACIÓN</div>
                <div className="text-[8.5px] text-slate-400 mt-1 leading-tight">Preferencias del sistema y administración</div>
              </div>
              <button className="mt-2.5 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[9.5px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

          </div>
        </div>

      </main>

      {/* ── BOTTOM FOOTER STRIP (EXACT MATCH TO ATTACHED SCREENSHOT) ── */}
      <footer className="relative z-20 bg-[#020712] border-t border-slate-800/90 px-3 md:px-6 py-2.5 font-mono text-[9.5px] text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Box 1: SEGURIDAD EMPRESARIAL */}
          <div className="flex items-center gap-2.5 bg-[#040C18] border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="font-bold text-slate-300 uppercase">SEGURIDAD EMPRESARIAL</span>
            <span className="text-emerald-400 text-[8px] bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/50 font-bold">● ACTIVOS</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-cyan-400">Cifrado:</strong> AES-256</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-cyan-400">Sesión:</strong> Sesión segura</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-cyan-400">Auditoría:</strong> Auditoría activa</span>
          </div>

          {/* Box 2: MÓDULOS DE ANÁLISIS */}
          <div className="flex items-center gap-2 bg-[#040C18] border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="font-bold text-cyan-400 uppercase">MÓDULOS DE ANÁLISIS</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-red-400 font-bold bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
                <Flame className="w-3 h-3 text-red-500" /> DG <span className="text-[8px] font-normal text-slate-400">Mercancía Peligrosa</span>
              </span>
              <span className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                <Snowflake className="w-3 h-3 text-cyan-400" /> REEFER <span className="text-[8px] font-normal text-slate-400">Refrigerados</span>
              </span>
              <span className="flex items-center gap-1 text-purple-300 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                <Maximize2 className="w-3 h-3 text-purple-400" /> OOG <span className="text-[8px] font-normal text-slate-400">Sobredimensión</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-300 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                <span className="w-3 h-3 rounded-full border border-emerald-400 text-emerald-400 text-[8px] font-extrabold flex items-center justify-center">E</span> VACÍOS <span className="text-[8px] font-normal text-slate-400">Contenedores Vacíos</span>
              </span>
              <span className="flex items-center gap-1 text-blue-300 font-bold bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">
                <Container className="w-3 h-3 text-blue-400" /> TANK <span className="text-[8px] font-normal text-slate-400">Tanques</span>
              </span>
            </div>
          </div>

          {/* Box 3: INFORMACIÓN DEL SISTEMA */}
          <div className="flex items-center gap-2 bg-[#040C18] border border-slate-800 px-2.5 py-1 rounded-lg text-slate-400">
            <span className="font-bold text-slate-300 uppercase">INFORMACIÓN DEL SISTEMA</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Versión:</strong> 2.5.0 PRO</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Base de datos:</strong> Sincronizada</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Servidor:</strong> ONLINESRV-01</span>
          </div>

        </div>

        {/* Footer line */}
        <div className="text-center text-slate-500 text-[8.5px] mt-2 pt-1.5 border-t border-slate-900/80">
          POSEIDON TOS PORTUARIO by ONS IA | Soluciones Inteligentes para Operaciones Marítimas
        </div>
      </footer>

      {/* Support Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

