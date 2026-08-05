import React from 'react';
import { Lock, Sparkles, CheckCircle2, Shield, X, ArrowRight, Zap, Crown } from 'lucide-react';
import { useAuth } from '../../core/security/AuthContext';

interface UpgradeToPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabName?: string;
}

export const UpgradeToPlannerModal: React.FC<UpgradeToPlannerModalProps> = ({
  isOpen,
  onClose,
  tabName = 'Módulo'
}) => {
  const { logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0A1A2B] border-2 border-amber-500/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative text-slate-100 font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-950 border border-amber-400/80 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-500/40 rounded-full text-[11px] font-mono text-amber-300 mb-2 font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>FUNCIÓN EXCLUSIVA MODO DE PAGA</span>
          </div>

          <h2 className="text-xl font-black font-mono text-white tracking-wide uppercase">
            DESBLOQUEA EL MÓDULO {tabName.toUpperCase()}
          </h2>
          <p className="text-xs text-slate-300 font-mono mt-1.5 leading-relaxed max-w-md">
            En el <strong className="text-amber-300">Modo Gratuito de Prueba</strong> solo tienes acceso a la primera ventana (<strong className="text-cyan-300">Plano de Estiba Principal</strong>).
          </p>
        </div>

        {/* Feature List included in Paid Mode */}
        <div className="bg-[#050E1A] border border-cyan-500/30 rounded-xl p-4 mb-5 space-y-2.5 font-mono text-xs">
          <div className="text-cyan-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>LO QUE OBTIENES EN MODO DE PAGA (PLANNER):</span>
          </div>

          <div className="flex items-start gap-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Acceso ilimitado a las 11 herramientas y matrices de estiba.</span>
          </div>

          <div className="flex items-start gap-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Simulación de Tonga de Patio (Ajedrez RTG por carril, tira y altura).</span>
          </div>

          <div className="flex items-start gap-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>MiniPlan Pro, Validador MOVINS EDI, Agentes Copilot IA y Reconciliación Excel.</span>
          </div>

          <div className="flex items-start gap-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Sin límite de 5 sesiones ni restricciones de IP.</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>INGRESAR CON USUARIO DE PAGA (PLANNER)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl transition-colors cursor-pointer"
          >
            Continuar en Modo Gratuito (Solo 1ª Ventana)
          </button>
        </div>
      </div>
    </div>
  );
};
