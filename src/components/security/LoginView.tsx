import React, { useState } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import appLogo from '../../assets/logo.jpg';
import { ShieldCheck, Lock, User as UserIcon, LogIn, AlertTriangle, KeyRound } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 bg-[#050D18] flex items-center justify-center p-4 select-none overflow-hidden font-sans">
      {/* Background Cybernetic Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card Container */}
      <div className="w-full max-w-md bg-[#0A1A2B]/90 border border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,229,255,0.15)] backdrop-blur-xl relative z-10">
        
        {/* Header with App Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <img
              src={appLogo}
              alt="Logo Corporativo TOS"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,229,255,0.4)]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-cyan-950 border border-cyan-400 text-cyan-400 p-1 rounded-full shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-xl font-black font-mono text-white tracking-widest uppercase">
            SISTEMA TOS PORTUARIO
          </h1>
          <p className="text-xs font-mono text-cyan-300/80 mt-1 uppercase tracking-wider">
            CONTROL DE ACCESO SEGURO EMPRESARIAL
          </p>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              USUARIO
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#050E1A] border border-cyan-500/40 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              CONTRASEÑA
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#050E1A] border border-cyan-500/40 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                VERIFICANDO...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                INGRESAR
              </span>
            )}
          </button>
        </form>

        {/* Secure Architecture Footer */}
        <div className="mt-8 pt-4 border-t border-cyan-500/20 text-center">
          <p className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            PROTECCIÓN EMPRESARIAL OWASP • RBAC AUTHENTICATION
          </p>
        </div>
      </div>
    </div>
  );
};
