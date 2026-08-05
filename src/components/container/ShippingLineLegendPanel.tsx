import React, { useState } from 'react';
import { SHIPPING_LINES, ShippingLineLogo } from './ShippingLineLogo';
import { DGDiamondIcon, ReeferSnowflakeIcon } from '../../utils/svgIcons';
import {
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ShieldAlert,
  Thermometer,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  AlertTriangle,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface ShippingLineLegendPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}

export const ShippingLineLegendPanel: React.FC<ShippingLineLegendPanelProps> = ({
  isOpen = true,
  onClose,
  embedded = false
}) => {
  const [activeTab, setActiveTab] = useState<'LINES' | 'DG' | 'OOG' | 'ALL'>('ALL');

  if (!isOpen && !embedded) return null;

  const content = (
    <div className="bg-[#050E1A] border-2 border-cyan-500/40 rounded-2xl p-4 md:p-5 text-slate-100 font-sans shadow-[0_0_40px_rgba(0,229,255,0.15)] max-w-6xl w-full mx-auto">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/30 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black font-mono text-white tracking-wider uppercase flex items-center gap-2">
              <span>LEYENDA DE LÍNEAS NAVIERAS & SIMBOLOGÍA TÉCNICA DE ESTIBA</span>
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Guía oficial de operadoras, simbología Reefer, peligrosidad IMO y dimensiones OOG
            </p>
          </div>
        </div>

        {/* Tab Selection Filter */}
        <div className="flex items-center gap-1.5 bg-[#030811] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'ALL' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Vista Completa
          </button>
          <button
            onClick={() => setActiveTab('LINES')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'LINES' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Líneas Navieras
          </button>
          <button
            onClick={() => setActiveTab('DG')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'DG' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Reefer & IMO
          </button>
          <button
            onClick={() => setActiveTab('OOG')}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'OOG' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Símbolos OOG
          </button>

          {onClose && !embedded && (
            <button
              onClick={onClose}
              className="ml-2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* THREE COLUMN GRID PANELS MATCHING THE USER REFERENCE IMAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs font-mono">
        
        {/* PANEL 1: LEYENDA DE LÍNEAS NAVIERAS (SHIPPING LINES) (6/12 COLUMNS) */}
        {(activeTab === 'ALL' || activeTab === 'LINES') && (
          <div className={`${activeTab === 'LINES' ? 'lg:col-span-12' : 'lg:col-span-6'} bg-[#081524] border border-cyan-500/30 rounded-xl p-3 flex flex-col shadow`}>
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>LEYENDA DE LÍNEAS NAVIERAS (SHIPPING LINES)</span>
              </span>
              <span className="text-[10px] text-slate-400">{Object.keys(SHIPPING_LINES).length} OPERADORAS</span>
            </div>

            {/* Grid of Shipping Lines */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {Object.keys(SHIPPING_LINES).map((key) => {
                const line = SHIPPING_LINES[key];
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 bg-[#040B15] border border-cyan-900/40 rounded-lg hover:border-cyan-500/60 transition-all"
                  >
                    <ShippingLineLogo operator={line.code} size={22} />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px] truncate">{line.code}</div>
                      <div className="text-[9px] text-slate-400 truncate">{line.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PANEL 2: SÍMBOLOS DE CARGA ESPECIAL (REEFER & IMO DG) (3/12 COLUMNS) */}
        {(activeTab === 'ALL' || activeTab === 'DG') && (
          <div className={`${activeTab === 'DG' ? 'lg:col-span-12' : 'lg:col-span-3'} bg-[#081524] border border-cyan-500/30 rounded-xl p-3 flex flex-col shadow`}>
            <div className="border-b border-cyan-900/60 pb-2 mb-3 flex items-center justify-between">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-cyan-400" />
                <span>REEFER & MERCANCÍA PELIGROSA (IMO)</span>
              </span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              
              {/* Reefer Temperature Scale */}
              <div className="space-y-1.5 bg-[#040B15] p-2.5 rounded-lg border border-cyan-900/40">
                <div className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                  <ReeferSnowflakeIcon size={14} />
                  <span>REEFER (CONTENEDOR REFRIGERADO)</span>
                </div>
                <div className="space-y-1 text-[10px] text-slate-300 pt-1">
                  <div className="flex items-center justify-between">
                    <span>Temp. Positiva:</span>
                    <span className="font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">+30°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Temp. Positiva:</span>
                    <span className="font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">+10°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Temp. Positiva:</span>
                    <span className="font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">+2°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Congelado:</span>
                    <span className="font-bold text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-500/30">-18°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Congelado Profundo:</span>
                    <span className="font-bold text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/30">-25°C o menos</span>
                  </div>
                </div>
              </div>

              {/* IMO Hazard Classes */}
              <div className="space-y-1.5 bg-[#040B15] p-2.5 rounded-lg border border-red-900/40">
                <div className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>DG (MERCANCÍA PELIGROSA)</span>
                </div>
                <div className="space-y-1 text-[9.5px] text-slate-300 pt-1">
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="1" size={16} />
                    <span>Clase 1: EXPLOSIVOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="2" size={16} />
                    <span>Clase 2: GASES</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="3" size={16} />
                    <span>Clase 3: LÍQUIDOS INFLAMABLES</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="4" size={16} />
                    <span>Clase 4: SÓLIDOS INFLAMABLES</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="5" size={16} />
                    <span>Clase 5: OXIDANTES / ORGÁNICOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="6" size={16} />
                    <span>Clase 6: TÓXICOS / INFECCIOSOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="7" size={16} />
                    <span>Clase 7: RADIOACTIVOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="8" size={16} />
                    <span>Clase 8: CORROSIVOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DGDiamondIcon imoClass="9" size={16} />
                    <span>Clase 9: VARIOS PELIGROSOS</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PANEL 3: OOG FUERA DE MEDIDA (3/12 COLUMNS) */}
        {(activeTab === 'ALL' || activeTab === 'OOG') && (
          <div className={`${activeTab === 'OOG' ? 'lg:col-span-12' : 'lg:col-span-3'} bg-[#081524] border border-cyan-500/30 rounded-xl p-3 flex flex-col shadow`}>
            <div className="border-b border-cyan-900/60 pb-2 mb-3">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>OOG (FUERA DE MEDIDA)</span>
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 text-[10px]">
              <div className="p-2 bg-[#040B15] border border-amber-900/40 rounded-lg text-slate-300 text-[9.5px]">
                Aplica para: FLATS, PLATAFORMAS, HARDTOP, OPEN TOP
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800">
                  <ArrowUp className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Sobredimensión Superior (Arriba)</span>
                </div>

                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800">
                  <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Sobredimensión Estribor (Derecha)</span>
                </div>

                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800">
                  <ArrowLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sobredimensión Babor (Izquierda)</span>
                </div>

                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800">
                  <ArrowDown className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Sobredimensión Inferior (Abajo)</span>
                </div>

                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800">
                  <ArrowUpLeft className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Esquina Superior Babor</span>
                </div>

                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800">
                  <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Esquina Superior Estribor</span>
                </div>

                <div className="flex items-center gap-2.5 p-1.5 bg-[#040B15] rounded border border-slate-800 text-rose-300 font-bold">
                  <X className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Zona Restringida - No Estibar</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {content}
    </div>
  );
};
