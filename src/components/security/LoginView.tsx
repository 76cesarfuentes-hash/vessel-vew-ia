import React, { useState, useEffect } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import { useLanguage } from '../../core/i18n/LanguageContext';
import { ContactModal } from '../common/ContactModal';
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
  Cpu,
  Database,
  Server,
  Clock
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
  const [currentTime, setCurrentTime] = useState<string>('');

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
        if (onLoginSuccess && targetTab) onLoginSuccess(targetTab);
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
      if (onLoginSuccess && targetTab) onLoginSuccess(targetTab);
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
    <div className="min-h-screen w-full bg-[#020611] text-slate-100 font-sans select-none overflow-x-hidden flex flex-col justify-between relative">
      
      {/* Background Port Image Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none mix-blend-luminosity"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=2000&q=80')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030914]/90 via-[#040C1A]/85 to-[#020611]/95 pointer-events-none" />

      {/* ── TOP HEADER BAR (EXACT MATCH TO SCREENSHOT) ── */}
      <header className="relative z-20 bg-[#050D18]/95 border-b border-cyan-500/30 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md shadow-2xl">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-slate-900 border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center shrink-0">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg md:text-xl font-black text-white tracking-widest uppercase">
                POSEIDON
              </h1>
              <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">
                TOS PORTUARIO
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              by <strong className="text-cyan-300">ONS IA</strong>
            </p>
          </div>
        </div>

        {/* Center: System Header Tagline */}
        <div className="hidden lg:flex flex-col items-center text-center">
          <h2 className="text-xs font-mono font-black text-cyan-300 tracking-widest uppercase">
            SISTEMA INTEGRADO DE ESTIBA Y NAVEGACIÓN PORTUARIA
          </h2>
          <p className="text-[10px] font-mono text-slate-400 tracking-wider">
            Planificación • Análisis • Control • Precisión
          </p>
        </div>

        {/* Center-Right: Feature Navigation Header Badges */}
        <div className="hidden xl:flex items-center gap-2 font-mono text-[10px]">
          <div className="bg-[#081524] border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">ESTIBA 2D/3D</div>
              <div className="text-[8px] text-slate-400">Visualización en tiempo real</div>
            </div>
          </div>

          <div className="bg-[#081524] border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">BAPLIE</div>
              <div className="text-[8px] text-slate-400">Importación y Análisis</div>
            </div>
          </div>

          <div className="bg-[#081524] border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">MOVINS</div>
              <div className="text-[8px] text-slate-400">Generación y Validación</div>
            </div>
          </div>

          <div className="bg-[#081524] border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">REPORTES</div>
              <div className="text-[8px] text-slate-400">Excel / PDF Automáticos</div>
            </div>
          </div>

          <div className="bg-[#081524] border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="font-bold text-white text-[9px]">IA AGENTE</div>
              <div className="text-[8px] text-slate-400">Asistente Especializado</div>
            </div>
          </div>
        </div>

        {/* Right: Active Terminal & Status */}
        <div className="flex items-center gap-3 font-mono">
          <div className="bg-[#081628] border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <div>
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">TERMINAL ACTIVO</div>
              <div className="text-xs font-black text-cyan-300 flex items-center gap-1">
                VERACRUZ (VER)
                <ChevronDown className="w-3 h-3 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>SISTEMA EN LÍNEA</span>
            </div>
            <div className="text-slate-400 text-[9px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{currentTime || '02:23 a. m. · 05/05/2025'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN MIDDLE SECTION (3 COLUMNS LIKE ATTACHED SCREENSHOT) ── */}
      <main className="relative z-10 flex-1 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full flex flex-col justify-center">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT COLUMN: VISIÓN OPERATIVA */}
          <div className="lg:col-span-3 bg-[#050E1A]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-xs font-black text-cyan-300 tracking-widest uppercase mb-4 pb-2 border-b border-cyan-500/30 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                VISIÓN OPERATIVA
              </h3>

              <div className="space-y-3.5 font-mono text-xs text-slate-200">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#08172A] border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Grid className="w-3.5 h-3.5" />
                  </div>
                  <span>Control total de la estiba</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#08172A] border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <span>Decisiones basadas en datos</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#08172A] border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span>Optimización de operaciones</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#08172A] border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span>Precisión y seguridad</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#08172A] border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span>Trazabilidad completa</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[9.5px] font-mono text-slate-400 text-center">
              Módulo Kernel v2.5.0 • TOS Certificado
            </div>
          </div>

          {/* CENTER COLUMN: BIENVENIDO A POSEIDON (LOGIN CARD) */}
          <div className="lg:col-span-5 bg-[#071322]/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,229,255,0.2)] backdrop-blur-xl flex flex-col justify-between relative">
            
            {/* Top Anchor Emblem */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-slate-900 border-2 border-cyan-300 shadow-[0_0_30px_rgba(0,229,255,0.5)] flex items-center justify-center mb-3">
                <Anchor className="w-9 h-9 text-white" />
              </div>

              <h2 className="text-xl md:text-2xl font-black font-mono text-white tracking-wider uppercase">
                BIENVENIDO A <span className="text-cyan-400">POSEIDON</span>
              </h2>
              <p className="text-xs font-mono text-slate-300 mt-1 max-w-sm">
                Acceda al sistema para gestionar y optimizar sus operaciones portuarias
              </p>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 gap-2 my-5 p-1 bg-[#030A14] rounded-xl border border-cyan-500/30">
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
              <div className="mb-4 p-3 bg-rose-950/90 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 font-mono">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  USUARIO
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                    <UserIcon className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#030914] border border-cyan-500/40 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  CONTRASEÑA
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#030914] border border-cyan-500/40 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
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
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(0,180,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 border border-cyan-300/40"
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
            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Conexión segura
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                Protección empresarial
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Lock className="w-3.5 h-3.5" />
                RBAC Authentication
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: ESTADÍSTICAS GLOBALES */}
          <div className="lg:col-span-4 bg-[#050E1A]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-xs font-black text-cyan-300 tracking-widest uppercase mb-4 pb-2 border-b border-cyan-500/30 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                ESTADÍSTICAS GLOBALES
              </h3>

              <div className="grid grid-cols-2 gap-3 font-mono">
                
                {/* Stat 1 */}
                <div className="bg-[#08172A] border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                    <Grid className="w-3.5 h-3.5 text-cyan-400" />
                    <span>CONTENEDORES TOTALES</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">1,248,952</div>
                  <div className="text-[9px] text-emerald-400 font-bold mt-0.5">+12.5% vs ayer</div>
                </div>

                {/* Stat 2 */}
                <div className="bg-[#08172A] border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                    <Ship className="w-3.5 h-3.5 text-cyan-400" />
                    <span>BUQUES PROCESADOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">358</div>
                  <div className="text-[9px] text-emerald-400 font-bold mt-0.5">+8.2% vs ayer</div>
                </div>

                {/* Stat 3 */}
                <div className="bg-[#08172A] border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>BAPLIES PROCESADOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">1,102</div>
                  <div className="text-[9px] text-emerald-400 font-bold mt-0.5">+15.1% vs ayer</div>
                </div>

                {/* Stat 4 */}
                <div className="bg-[#08172A] border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                    <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MOVINS GENERADOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">854</div>
                  <div className="text-[9px] text-emerald-400 font-bold mt-0.5">+9.3% vs ayer</div>
                </div>

                {/* Stat 5 */}
                <div className="bg-[#08172A] border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                    <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>USUARIOS ACTIVOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">24</div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">En línea ahora</div>
                </div>

                {/* Stat 6 */}
                <div className="bg-[#08172A] border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PRECISIÓN DE DATOS</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">99.87%</div>
                  <div className="text-[9px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                    Integridad <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[9.5px] font-mono text-slate-400 text-center">
              Sincronización en Tiempo Real • Algoritmo TOS Pro
            </div>
          </div>

        </div>

        {/* ── FUNCIONALIDADES PRINCIPALES (GRID CARDS) ── */}
        <div className="mt-8">
          <h3 className="font-mono text-xs font-black text-cyan-300 tracking-widest uppercase mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            FUNCIONALIDADES PRINCIPALES
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
            
            {/* Card 1 */}
            <div
              onClick={() => handleFeatureClick('estiba')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Grid className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">VISUALIZACIÓN DE ESTIBA</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Vistas 2D Transversal, Bahía, Cubierta y 3D</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 2 */}
            <div
              onClick={() => handleFeatureClick('import-export')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">IMPORTACIÓN BAPLIE</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Carga y análisis de archivos BAPLIE EDI</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 3 */}
            <div
              onClick={() => handleFeatureClick('movins')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">MOVINS GENERATOR</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Generación automática y validación MOVINS</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 4 */}
            <div
              onClick={() => handleFeatureClick('manual-engine')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">AJUSTE DE ESTIBA</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Ajuste manual y redistribución de carga</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 5 */}
            <div
              onClick={() => handleFeatureClick('comparador')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">COMPARADOR</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Compare BAPLIES y MOVINS</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 6 */}
            <div
              onClick={() => handleFeatureClick('planos')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">REPORTES</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Reportes Excel / PDF personalizados</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 7 */}
            <div
              onClick={() => handleFeatureClick('agents')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">IA AGENTE</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Asistente especializado en operaciones</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

            {/* Card 8 */}
            <div
              onClick={() => handleFeatureClick('cuadre')}
              className="bg-[#061220]/90 hover:bg-[#0A1B2E] border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">CONFIGURACIÓN</div>
                <div className="text-[9px] text-slate-400 mt-1 leading-tight">Preferencias del sistema y administración</div>
              </div>
              <button className="mt-3 py-1 px-2 bg-blue-950 hover:bg-blue-600 text-cyan-300 hover:text-white rounded text-[10px] font-bold border border-blue-800 flex items-center justify-center gap-1 transition-all">
                → Abrir
              </button>
            </div>

          </div>
        </div>

      </main>

      {/* ── BOTTOM FOOTER STRIP ── */}
      <footer className="relative z-20 bg-[#030914] border-t border-slate-800/90 px-4 py-3 font-mono text-[10px] text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Box 1: Seguridad Empresarial */}
          <div className="flex items-center gap-3 bg-[#050D18] border border-slate-800 px-3 py-1.5 rounded-lg">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>SEGURIDAD EMPRESARIAL</span>
            </div>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Cifrado:</strong> AES-256</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Sesión:</strong> Segura</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Auditoría:</strong> Activa</span>
          </div>

          {/* Box 2: Módulos de Análisis */}
          <div className="flex items-center gap-3 bg-[#050D18] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="font-bold text-cyan-400">MÓDULOS DE ANÁLISIS:</span>
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-xs" /> DG
            </span>
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <span className="w-2 h-2 bg-cyan-400 rounded-xs" /> REEFER
            </span>
            <span className="flex items-center gap-1 text-purple-300 font-bold">
              <span className="w-2 h-2 bg-purple-500 rounded-xs" /> OOG
            </span>
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <span className="w-2 h-2 bg-emerald-500 rounded-xs" /> VACÍOS
            </span>
            <span className="flex items-center gap-1 text-blue-300 font-bold">
              <span className="w-2 h-2 bg-blue-500 rounded-xs" /> TANK
            </span>
          </div>

          {/* Box 3: Información del Sistema */}
          <div className="flex items-center gap-3 bg-[#050D18] border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
            <span><strong className="text-white">Versión:</strong> 2.5.0 PRO</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Base de datos:</strong> Sincronizada</span>
            <span className="text-slate-600">|</span>
            <span><strong className="text-white">Servidor:</strong> ONLINESRV-01</span>
          </div>

        </div>

        {/* Footer line */}
        <div className="text-center text-slate-500 text-[9px] mt-2 pt-2 border-t border-slate-900">
          POSEIDON TOS PORTUARIO by ONS IA | Soluciones Inteligentes para Operaciones Marítimas
        </div>
      </footer>

      {/* Support Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};
