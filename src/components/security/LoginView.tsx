import React, { useState } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import { useLanguage } from '../../core/i18n/LanguageContext';
import { ContactModal } from '../common/ContactModal';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import appLogoGenerated from '../../assets/images/stowage_app_logo_1785618008257.jpg';
import appLogoPng from '../../assets/logo.png';
import appLogoJpg from '../../assets/logo.jpg';
import { ShieldCheck, Lock, User as UserIcon, LogIn, AlertTriangle, Ship, Headphones, Sparkles, UserPlus, CheckCircle2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, registerGuest } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login State
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Register Guest State
  const [guestName, setGuestName] = useState<string>('');
  const [guestUser, setGuestUser] = useState<string>('');
  const [guestPass, setGuestPass] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>(appLogoGenerated || appLogoPng || appLogoJpg);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const handleImgError = () => {
    if (imgSrc === appLogoGenerated) {
      setImgSrc(appLogoPng);
    } else if (imgSrc === appLogoPng) {
      setImgSrc(appLogoJpg);
    } else {
      setImgFailed(true);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Credenciales inválidas o cuenta bloqueada.');
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await registerGuest(
      guestName.trim() || undefined,
      undefined,
      guestUser.trim() || undefined,
      guestPass.trim() || undefined
    );

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Error al registrar la cuenta de invitado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050D18] flex items-center justify-center p-4 select-none overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Actions */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setIsContactOpen(true)}
          className="py-1.5 px-3 bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 text-cyan-300 hover:text-white rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
        >
          <Headphones className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('contactUs', 'Contacto')}</span>
        </button>
        <LanguageSwitcher />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#0A1A2B]/95 border border-cyan-500/40 rounded-2xl p-7 shadow-[0_0_50px_rgba(0,229,255,0.15)] backdrop-blur-xl relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-3">
            {!imgFailed ? (
              <img
                src={imgSrc}
                onError={handleImgError}
                alt="Logo Portuario TOS"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-950 via-[#0A1A2B] to-blue-950 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(0,229,255,0.3)] flex flex-col items-center justify-center text-cyan-400">
                <Ship className="w-8 h-8 text-cyan-300" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-cyan-950 border border-cyan-400 text-cyan-400 p-0.5 rounded-full shadow">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-base font-black font-mono text-white tracking-widest uppercase">
            SISTEMA TOS PORTUARIO
          </h1>
          <p className="text-[11px] font-mono text-cyan-300/80 mt-0.5 uppercase tracking-wider">
            SISTEMA INTEGRADO DE ESTIBA Y NAVEGACIÓN
          </p>
        </div>

        {/* Tab Switcher: Login (Planner/Admin) vs Registrar Invitado */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#050E1A] rounded-xl border border-cyan-500/30 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>INGRESAR</span>
          </button>
          
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>MODO GRATUITO</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/90 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: INICIO DE SESIÓN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
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
                  placeholder="planner / admin / invitado"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-[#050E1A] border border-cyan-500/40 rounded-xl text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                CONTRASEÑA
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-[#050E1A] border border-cyan-500/40 rounded-xl text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  VERIFICANDO...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  INGRESAR AL SISTEMA
                </span>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTRO INVITADO (MODO GRATUITO) */}
        {activeTab === 'register' && (
          <form onSubmit={handleGuestSubmit} className="space-y-3">
            <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl text-[11px] font-mono text-teal-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-teal-300">
                <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>BENEFICIOS DEL MODO GRATUITO:</span>
              </div>
              <ul className="list-disc list-inside text-teal-200/90 text-[10px] space-y-0.5 pl-1">
                <li>Acceso inmediato al Plano de Estiba Principal</li>
                <li>Incluye 5 sesiones de evaluación sin costo</li>
                <li>Habilitación instantánea al registrarse</li>
              </ul>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                NOMBRE DE INVITADO (OPCIONAL)
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ej. Operador Demostración"
                className="w-full px-3 py-1.5 bg-[#050E1A] border border-teal-500/40 rounded-xl text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                USUARIO PERSONALIZADO (OPCIONAL)
              </label>
              <input
                type="text"
                value={guestUser}
                onChange={(e) => setGuestUser(e.target.value)}
                placeholder="Ej. invitado_demo"
                className="w-full px-3 py-1.5 bg-[#050E1A] border border-teal-500/40 rounded-xl text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-teal-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ACTIVANDO MODO GRATUITO...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  CREAR CUENTA GRATUITA (5 SESIONES)
                </span>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-cyan-500/20 text-center">
          <p className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            PROTECCIÓN EMPRESARIAL OWASP • RBAC AUTHENTICATION
          </p>
        </div>
      </div>

      {/* Support Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};
