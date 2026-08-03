import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Ship, Zap, HelpCircle, X, ArrowRight, Sparkles, CheckCircle2, Layers, Info, ShieldAlert, ArrowRightLeft, FileSearch, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../core/i18n/LanguageContext';
import { Poseidon2DCanvas } from './Poseidon2DCanvas';

interface PoseidonSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PoseidonSimulationModal: React.FC<PoseidonSimulationModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'sim' | 'guide'>('sim');
  
  const [stats, setStats] = useState({
    totalImport: 450,
    restowBlocks: 14,
    cancellations: 6,
    aiResolved: 100
  });

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] POSEIDON IA: Buque en navegación detectado via EDI. Procesando manifiesto BAPLIE...`
  ]);

  const handleLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)]);
  };

  const handleStatsUpdate = (newStats: typeof stats) => {
    setStats(newStats);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0B1726] border border-cyan-500/40 rounded-3xl max-w-5xl w-full p-5 md:p-7 shadow-[0_0_60px_rgba(0,229,255,0.25)] text-slate-100 relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors z-20 cursor-pointer"
          title="Cerrar presentación"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/50 rounded-2xl text-cyan-300 shadow-lg shadow-cyan-950">
              <Ship className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black font-mono text-white tracking-wider uppercase">
                  POSEIDON IA
                </h2>
                <span className="px-2.5 py-0.5 bg-cyan-950 border border-cyan-400/50 text-cyan-300 text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  ANALIZADOR DE NAVEGACIÓN & BAPLIE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {language === 'es'
                  ? 'Plataforma Inteligente de Verificación de Importación, Detección de Restibas (Bloqueos) y Re-planificación por Agente IA.'
                  : 'Intelligent Import Inspection, Restow Blockage Detection & AI Agent Automatic Plan Adjustment.'}
              </p>
            </div>
          </div>

          {/* Toggle View Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-700/80 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('sim')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'sim'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5 text-cyan-200" />
              <span>{language === 'es' ? 'Buque en Navegación' : 'Sailing Vessel 3D'}</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Explicación Operativa' : 'Operational Guide'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SAILING VESSEL & AI BAPLIE INSPECTION */}
        {activeTab === 'sim' && (
          <div className="space-y-4">
            {/* Explanatory banner centered on User's business focus */}
            <div className="p-3 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-500/40 rounded-2xl flex items-center gap-3 text-xs text-cyan-200 shadow-inner">
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
              <p>
                <strong>Propósito de POSEIDON IA:</strong> La plataforma <strong>no controla grúas</strong>. Analiza buques en navegación para verificar la <strong>Importación Total</strong>, detectar <strong>Restibas/Bloqueos</strong> (contenedores de otros puertos sobrepuestos) y realizar <strong>Ajustes Automáticos al Plan</strong> ante cancelaciones o discrepancias.
              </p>
            </div>

            {/* SVG 2D CANVAS FOR NAVIGATION & INSPECTION */}
            <Poseidon2DCanvas
              isPlaying={isPlaying}
              simSpeed={simSpeed}
              onLog={handleLog}
              onStatsUpdate={handleStatsUpdate}
            />

            {/* Real-time Business Telemetry Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="bg-slate-900/90 border border-sky-500/40 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <Ship className="w-3.5 h-3.5 text-sky-400" /> Importación Total:
                </span>
                <span className="text-sky-300 font-bold text-base mt-1">{stats.totalImport} TEUs</span>
                <span className="text-[10px] text-sky-400/80">Programados a descarga local</span>
              </div>

              <div className="bg-slate-900/90 border border-amber-500/40 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Restibas / Bloqueos:
                </span>
                <span className="text-amber-400 font-bold text-base mt-1">{stats.restowBlocks} Unidades</span>
                <span className="text-[10px] text-amber-300/80">Bloqueos de otros puertos</span>
              </div>

              <div className="bg-slate-900/90 border border-rose-500/40 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-rose-400" /> Cancelados / Discrepancias:
                </span>
                <span className="text-rose-400 font-bold text-base mt-1">{stats.cancellations} Unidades</span>
                <span className="text-[10px] text-rose-300/80">Sin ingreso a patio / Sobrepeso</span>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/40 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> Ajuste Agente IA:
                </span>
                <span className="text-emerald-400 font-bold text-base mt-1">{stats.aiResolved}% Resuelto</span>
                <span className="text-[10px] text-emerald-300/80">Plan óptimo sin retrasos</span>
              </div>
            </div>

            {/* Controls & Logs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Animation Speed / Controls */}
              <div className="bg-slate-900/80 border border-slate-700/80 p-4 rounded-2xl flex flex-col justify-between">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Escaneo BAPLIE en Tiempo Real
                </h4>

                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pausar Escaneo</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Reanudar Escaneo</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setTimeout(() => setIsPlaying(true), 100);
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Reiniciar Análisis BAPLIE"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed selector */}
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-mono">Velocidad IA:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 4].map(spd => (
                      <button
                        key={spd}
                        onClick={() => setSimSpeed(spd)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          simSpeed === spd
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Intelligence Log Terminal */}
              <div className="md:col-span-2 bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Bitácora Agente IA POSEIDON (Verificación EDI/BAPLIE)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>

                <div className="space-y-1.5 font-mono text-[11px] text-slate-300 min-h-[90px] flex flex-col justify-end">
                  {logs.map((log, i) => (
                    <div key={i} className="leading-tight text-cyan-200/90 truncate">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: OPERATIONAL GUIDE & BUSINESS VALUE */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1 */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-sky-950/40 border border-sky-500/30 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center font-bold text-lg mb-3">
                    1
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    1. Chequeo de Importación Total
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Antes de que el buque atracando toque el muelle, <strong>POSEIDON IA</strong> audita el archivo BAPLIE para verificar la ubicación exacta de cada contenedor destinado a la terminal local.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-sky-500/20 text-[11px] text-sky-300 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Precisión total de descarga por bahía</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-lg mb-3 flex items-center justify-center">
                    2
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    2. Detección de Restibas (Bloqueos)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Si un contenedor para Rotterdam o Hamburgo está ubicado encima de una carga que debe bajarse aquí, el sistema lo <strong>marca como Restiba</strong> y planea el movimiento mínimo de liberación.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-500/20 text-[11px] text-amber-300 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Elimina movimientos inútiles y costos extra</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-lg mb-3 flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    3. Ajuste por Agente IA en Vivo
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Si un contenedor de exportación es cancelado a última hora o no ingresa al patio por falta de pago, el <strong>Agente IA reajusta instantáneamente</strong> la secuencia de carga sin detener la operación.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-300 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resolución en segundos sin demoras</span>
                </div>
              </div>

            </div>

            {/* Simbology Legend */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wide font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Simbología de Verificación BAPLIE en POSEIDON IA:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-sky-500/30">
                  <span className="w-4 h-4 rounded bg-sky-500 block shrink-0" />
                  <span className="text-slate-200">📥 Importación Total (Carga Local)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-amber-500/30">
                  <span className="w-4 h-4 rounded bg-amber-500 block shrink-0" />
                  <span className="text-slate-200">⚠️ Restiba / Bloqueo (Otro Puerto)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-rose-500/30">
                  <span className="w-4 h-4 rounded bg-rose-500 block shrink-0" />
                  <span className="text-slate-200">❌ Cancelado / Discrepancia</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-emerald-500/30">
                  <span className="w-4 h-4 rounded bg-emerald-400 block shrink-0" />
                  <span className="text-slate-200">✨ Plan Ajustado por Agente IA</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Action */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 font-mono text-center sm:text-left">
            POSEIDON IA v3.8 • Plataforma de Control de Importación, Restibas y Agente IA
          </p>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-950 cursor-pointer"
          >
            <span>INGRESAR A LA PLATAFORMA OPERATIVA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
