import React, { useState, useMemo } from 'react';
import { Container } from '../../core/models/container';
import { getContainerColor, getContrastTextColor } from '../../core/business/colorEngine';
import { DGDiamondIcon, ReeferSnowflakeIcon } from '../../utils/svgIcons';
import { NO_DATA } from '../../core/parser/portNormalizer';
import { X, Package, ShieldAlert, Thermometer, Anchor, Scale, AlertTriangle, MapPin, Layers, FileCode, CheckCircle, AlertOctagon, Wrench, Sparkles, ArrowRight, Check } from 'lucide-react';
import { useStowageStore } from '../../core/stores/useStowageStore';
import { findStackingFixProposals, RelocationCandidateOption } from '../../core/business/stackingFixEngine';

interface ContainerDetailModalProps {
  container: Container | null;
  activeTerminalKey: string;
  onClose: () => void;
}

export const ContainerDetailModal: React.FC<ContainerDetailModalProps> = ({
  container,
  activeTerminalKey,
  onClose
}) => {
  if (!container) return null;

  const [showFixPanel, setShowFixPanel] = useState<boolean>(false);
  const [selectedBayFilter, setSelectedBayFilter] = useState<string>('ALL');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const bgColor = getContainerColor(container.pod, activeTerminalKey);
  const textColor = getContrastTextColor(bgColor);

  const isDG = container.cargoType === 'DG' || (container.imoClass && container.imoClass !== NO_DATA && container.imoClass !== '-');
  const isReefer = container.cargoType === 'RF' || (container.temp && container.temp !== NO_DATA && container.temp !== 'DRY' && container.temp !== '-');
  const isEmpty = container.status === 'EMPTY' || container.cargoType === 'MT';

  // Weight conversion
  const weightKgNum = parseFloat(container.weight || '0');
  const weightTons = !isNaN(weightKgNum) && weightKgNum > 0 ? (weightKgNum / 1000).toFixed(2) : null;

  // Format position
  const bayStr = (container.bay || '').padStart(2, '0');
  const rowStr = (container.row || '').padStart(2, '0');
  const tierStr = (container.tier || '').padStart(2, '0');
  const fullPositionStr = container.position || `${bayStr}${rowStr}${tierStr}`;

  const { parsedContainers, validateStackingRules, podSequence, executeAdjustment } = useStowageStore();
  const stackingViolations = validateStackingRules ? validateStackingRules(parsedContainers) : [];
  const containerViolation = stackingViolations.find(
    v => v.container40?.id === container.id || v.container20?.id === container.id
  );

  // Compute intelligent relocation candidates satisfying BOTH stacking and POD sequence rules
  const searchResults = useMemo(() => {
    return findStackingFixProposals(container, parsedContainers, podSequence || []);
  }, [container, parsedContainers, podSequence]);

  const handleApplyFix = (opt: RelocationCandidateOption) => {
    if (!executeAdjustment) return;
    const res = executeAdjustment(opt.adjustmentRequest);
    if (res.success) {
      setActionMessage(`✓ ${res.actionSummary}`);
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-[#0B1726] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.2)] max-w-xl w-full overflow-hidden text-slate-200">
        
        {/* Header with container color */}
        <div
          className="p-4 flex items-center justify-between relative shadow-md"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/20 rounded-xl backdrop-blur-xs">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-2xl font-black tracking-wider">{container.id}</h3>
                <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono font-bold tracking-widest border border-white/20">
                  {container.size} FT
                </span>
              </div>
              <p className="text-xs font-mono opacity-90 flex items-center gap-2 mt-0.5">
                <span>ISO: <strong className="underline">{container.iso}</strong></span>
                <span>•</span>
                <span>POSICIÓN: <strong className="underline">{fullPositionStr}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/20 transition-colors cursor-pointer text-current font-bold"
            title="Cerrar Ficha"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Action Success Toast */}
          {actionMessage && (
            <div className="bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-3 text-emerald-200 font-mono text-xs flex items-center gap-2 shadow-md animate-fadeIn">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">{actionMessage}</span>
            </div>
          )}

          {/* Stacking Violation Alert Banner & Fix Stacking Button */}
          {containerViolation && (
            <div className="bg-red-950/90 border border-red-500/80 rounded-xl p-3.5 text-red-200 font-mono text-xs flex flex-col gap-2.5 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <span className="font-bold text-red-300 block uppercase tracking-wider">
                      ¡VIOLACIÓN DE REGLA DE ESTIBA DE CAMA!
                    </span>
                    <span className="text-[11px] text-red-200/90 leading-tight block mt-0.5">
                      {containerViolation.message}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowFixPanel(!showFixPanel)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border border-amber-300 shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Wrench className="w-4 h-4" />
                  {showFixPanel ? 'OCULTAR SOLUCIONES' : 'SOLUCIONAR ESTIBA'}
                </button>
              </div>

              {/* FIX STACKING INTERACTIVE PANEL */}
              {showFixPanel && (
                <div className="mt-2 pt-3 border-t border-red-800/80 space-y-3 bg-black/40 p-3 rounded-xl border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-extrabold flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-400" /> ALTERNATIVAS DE REUBICACIÓN VALIDADAS
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {searchResults.options.length} OPCIÓN(ES)
                    </span>
                  </div>

                  {/* CANDIDATE BAYS FILTER PILLS */}
                  {searchResults.candidateBays.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold">Bahías Candidatas Filtradas:</span>
                      <button
                        onClick={() => setSelectedBayFilter('ALL')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${selectedBayFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        Todas ({searchResults.candidateBays.length})
                      </button>
                      {searchResults.candidateBays.map(bay => (
                        <button
                          key={bay}
                          onClick={() => setSelectedBayFilter(bay)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${selectedBayFilter === bay ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                          Bahía {bay}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-200/80 bg-amber-950/40 p-2 rounded border border-amber-500/20">
                      No se hallaron bahías que satisfagan simultáneamente la regla de cama y la secuencia del puerto de descarga.
                    </div>
                  )}

                  {/* CANDIDATE OPTIONS LIST */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {searchResults.options
                      .filter(o => selectedBayFilter === 'ALL' || o.bay === selectedBayFilter)
                      .map(opt => (
                        <div
                          key={opt.id}
                          className="bg-[#081524] border border-cyan-500/40 hover:border-cyan-400 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm transition-all"
                        >
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center gap-2 font-bold text-cyan-300">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{opt.title}</span>
                              <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/30">
                                {opt.toPosition}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-tight text-[10.5px]">
                              {opt.description}
                            </p>
                            <div className="flex items-center gap-2 text-[9.5px] text-emerald-400 font-mono">
                              <span className="bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                ✓ Regla Cama OK
                              </span>
                              <span className="bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                ✓ Secuencia POD OK ({opt.pod})
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleApplyFix(opt)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            APLICAR SOLUCIÓN
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Status & Type Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span className={`px-2.5 py-1 rounded-md text-xs font-black flex items-center gap-1 ${isEmpty ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'}`}>
              <CheckCircle className="w-3.5 h-3.5" /> ESTADO: {container.status || 'FULL'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-black bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
              CARGA: {container.cargoType || 'DC'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-black bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
              TAMAÑO: {container.size} FT ({container.size === 20 ? 'Standard 20' : container.size === 40 ? 'High Cube 40' : 'High Cube 45'})
            </span>
            {container.operation && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black bg-amber-950/80 text-amber-300 border border-amber-500/40">
                OPERACIÓN: {container.operation}
              </span>
            )}
          </div>

          {/* Core Characteristics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            
            {/* Ubicación Estiba */}
            <div className="bg-[#071320] p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" /> POSICIÓN ESTIBA
              </span>
              <span className="text-cyan-300 font-extrabold text-sm block">
                B{bayStr} - R{rowStr} - T{tierStr}
              </span>
              <span className="text-[9px] text-slate-400 block">
                {parseInt(tierStr, 10) >= 80 ? 'Cubierta (Deck)' : 'Bodega (Hold)'}
              </span>
            </div>

            {/* Peso Bruto */}
            <div className="bg-[#071320] p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Scale className="w-3 h-3 text-emerald-400" /> PESO BRUTO
              </span>
              <span className="text-emerald-400 font-extrabold text-sm block">
                {container.weight && container.weight !== NO_DATA ? `${container.weight} KG` : NO_DATA}
              </span>
              {weightTons && (
                <span className="text-[9px] text-emerald-300/80 font-bold block">
                  ≈ {weightTons} TONELADAS
                </span>
              )}
            </div>

            {/* Línea Operadora */}
            <div className="bg-[#071320] p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Anchor className="w-3 h-3 text-indigo-400" /> OPERADOR / LÍNEA
              </span>
              <span className="text-slate-100 font-extrabold text-sm block">
                {container.operator || 'N/A'}
              </span>
              <span className="text-[9px] text-slate-400 block">Línea Naviera</span>
            </div>

            {/* Puerto de Carga (POL) */}
            <div className="bg-[#071320] p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold">PUERTO CARGA (POL)</span>
              <span className="text-cyan-400 font-black text-sm block">
                {container.pol || 'N/A'}
              </span>
              <span className="text-[9px] text-slate-400 block">Origen</span>
            </div>

            {/* Puerto Descarga (POD) */}
            <div className="bg-[#071320] p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold">PUERTO DESCARGA (POD)</span>
              <span className="text-amber-400 font-black text-sm block">
                {container.pod || 'N/A'}
              </span>
              <span className="text-[9px] text-slate-400 block">Destino Final</span>
            </div>

            {/* Código ISO & Fuente */}
            <div className="bg-[#071320] p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <FileCode className="w-3 h-3 text-purple-400" /> TIPO ISO & ORIGEN
              </span>
              <span className="text-purple-300 font-bold text-sm block">
                {container.iso || 'STD'}
              </span>
              <span className="text-[9px] text-slate-400 block">
                Fuente: {container.source || 'BAPLIE EDI'}
              </span>
            </div>

          </div>

          {/* Technical Specifications: Refrigeration & Hazardous Goods */}
          {(isDG || isReefer || container.hasDim) && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" /> ESPECIFICACIONES TÉCNICAS & CARGA ESPECIAL
              </h4>

              {isDG && (
                <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DGDiamondIcon imoClass={container.imoClass} size={28} />
                    <div>
                      <div className="text-xs font-extrabold text-red-400 uppercase tracking-wide">
                        MERCANCÍA PELIGROSA (HAZMAT)
                      </div>
                      <div className="text-xs font-mono text-slate-200 mt-0.5">
                        Clase IMO: <strong className="text-red-300">{container.imoClass}</strong> | UN Number: <strong className="text-red-300">{container.unNumber || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isReefer && (
                <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ReeferSnowflakeIcon size={24} />
                    <div>
                      <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Thermometer className="w-4 h-4 text-cyan-400" /> REFRIGERADO (REEFER)
                      </div>
                      <div className="text-xs font-mono text-slate-200 mt-0.5">
                        Temperatura de Consigna: <strong className="text-cyan-300">{container.temp}</strong> | Ventilación: <strong className="text-cyan-300">{container.ventilation || 'S/R'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {container.hasDim && (
                <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold text-purple-300 uppercase tracking-wide">
                      CARGA SOBREDIMENSIONADA (OOG)
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-0.5">
                      {container.oogDim || 'Dimensiones excedentes registradas en estiba'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#08111D] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            CERRAR FICHA DE CONTENEDOR
          </button>
        </div>
      </div>
    </div>
  );
};

