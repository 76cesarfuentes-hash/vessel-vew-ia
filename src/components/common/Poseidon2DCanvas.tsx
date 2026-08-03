import React, { useEffect, useState, useRef } from 'react';
import { Eye, Play, Pause, RotateCcw, Sparkles, Layers, ShieldAlert, CheckCircle2, ArrowRightLeft, Ship, AlertTriangle, RefreshCw, Filter } from 'lucide-react';

export interface InspectionContainer {
  id: string;
  code: string;
  destination: string;
  status: 'import' | 'restow_block' | 'cancelled' | 'ai_adjusted';
  bay: number;
  row: number;
  tier: number;
  details: string;
  weight: number;
}

interface Poseidon2DCanvasProps {
  isPlaying: boolean;
  simSpeed: number;
  onLog: (msg: string) => void;
  onStatsUpdate: (stats: {
    totalImport: number;
    restowBlocks: number;
    cancellations: number;
    aiResolved: number;
  }) => void;
}

export const Poseidon2DCanvas: React.FC<Poseidon2DCanvasProps> = ({
  isPlaying,
  simSpeed,
  onLog,
  onStatsUpdate
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'import' | 'restow_block' | 'cancelled' | 'ai_adjusted'>('all');
  const [selectedBox, setSelectedBox] = useState<InspectionContainer | null>(null);
  
  // Animation state
  const [laserX, setLaserX] = useState<number>(180);
  const [laserDir, setLaserDir] = useState<number>(1);
  const [shipOffsetY, setShipOffsetY] = useState<number>(0);
  const [activeHighlightedId, setActiveHighlightedId] = useState<string | null>(null);

  const laserXRef = useRef<number>(180);
  const laserDirRef = useRef<number>(1);
  const lastLoggedMsgRef = useRef<string>('');

  // Inspection dataset
  const inspectionManifest: InspectionContainer[] = [
    { id: '1', code: 'MAEU-8810', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 1, row: 1, tier: 1, details: 'Importación Directa. Descarga en Turno 01.', weight: 24.2 },
    { id: '2', code: 'HLAG-9921', destination: 'Rotterdam (Otro Puerto)', status: 'restow_block', bay: 1, row: 1, tier: 2, details: '⚠️ RESTIBA CRÍTICA: Contenedor para Rotterdam tapona la descarga de MAEU-8810.', weight: 28.0 },
    { id: '3', code: 'CMAU-4011', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 1, row: 2, tier: 1, details: 'Importación Directa. Descarga Prioritaria.', weight: 21.5 },
    { id: '4', code: 'MSC-3310', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 2, row: 1, tier: 1, details: 'Importación Directa. Reefer Conectado a Borde.', weight: 26.8 },
    { id: '5', code: 'ONE-1102', destination: 'Cancelado en Patio', status: 'cancelled', bay: 2, row: 1, tier: 2, details: '❌ CANCELADO: Unidad no ingresó a la terminal. Agente IA lo excluyó del plan de carga.', weight: 4.1 },
    { id: '6', code: 'EVER-5590', destination: 'Hamburg (Otro Puerto)', status: 'restow_block', bay: 2, row: 2, tier: 2, details: '⚠️ OBSTRUCCIÓN DE CARGA: Obstruye zona de estiba asignada.', weight: 29.3 },
    { id: '7', code: 'ZIMU-7712', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'ai_adjusted', bay: 3, row: 1, tier: 1, details: '✨ REAJUSTADO POR AGENTE IA: Reubicado para optimizar balance y eliminar re-movimiento.', weight: 22.0 },
    { id: '8', code: 'COSC-8801', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 3, row: 2, tier: 1, details: 'Importación Directa. Carga General.', weight: 23.4 },
    { id: '9', code: 'HAMB-2200', destination: 'Discrepancia Peso (+4.2t)', status: 'cancelled', bay: 3, row: 2, tier: 2, details: '❌ DISCREPANCIA ALERTA: Declaró 12t, peso real 16.2t. Aislado por seguridad operativa.', weight: 16.2 },
    { id: '10', code: 'APLU-6630', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'ai_adjusted', bay: 1, row: 2, tier: 2, details: '✨ PLAN OPTIMIZADO IA: Secuencia libre de bloqueo lograda automáticamente.', weight: 20.1 },
  ];

  // Laser Animation Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Float ship gently
      setShipOffsetY(Math.sin(Date.now() / 400) * 3);

      let nextX = laserXRef.current + 3.5 * laserDirRef.current * simSpeed;
      let newLogMsg: string | null = null;

      if (nextX > 560) {
        nextX = 560;
        laserDirRef.current = -1;
        setLaserDir(-1);
        newLogMsg = '🔍 POSEIDON IA: Escaneo completo de Popa a Proa. Verificando bloqueos de otros puertos.';
      } else if (nextX < 180) {
        nextX = 180;
        laserDirRef.current = 1;
        setLaserDir(1);
        newLogMsg = '🤖 AGENTE IA: Re-secuenciación de estiba completada. Plan de descarga optimizado.';
      }

      laserXRef.current = nextX;
      setLaserX(nextX);

      // Detect container under laser
      const scannedBox = inspectionManifest.find(b => {
        const boxX = 200 + (b.bay - 1) * 120 + (b.row - 1) * 45;
        return Math.abs(nextX - boxX) < 25;
      });

      if (scannedBox) {
        setActiveHighlightedId(scannedBox.id);
        if (scannedBox.status === 'restow_block') {
          newLogMsg = `⚠️ ALERTA RESTIBA: ${scannedBox.code} (${scannedBox.destination}) obstruye descarga local.`;
        } else if (scannedBox.status === 'cancelled') {
          newLogMsg = `❌ DISCREPANCIA/CANCELADO: ${scannedBox.code} excluido por el Agente IA.`;
        } else if (scannedBox.status === 'ai_adjusted') {
          newLogMsg = `✨ AJUSTE IA: ${scannedBox.code} reubicado en secuencia óptima sin retraso.`;
        }
      }

      if (newLogMsg && newLogMsg !== lastLoggedMsgRef.current) {
        lastLoggedMsgRef.current = newLogMsg;
        onLog(newLogMsg);
      }
    }, 50 / simSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, onLog]);

  // Initial Stats Calculation
  useEffect(() => {
    const importCount = inspectionManifest.filter(m => m.status === 'import' || m.status === 'ai_adjusted').length;
    const restowCount = inspectionManifest.filter(m => m.status === 'restow_block').length;
    const cancelledCount = inspectionManifest.filter(m => m.status === 'cancelled').length;

    const timer = setTimeout(() => {
      onStatsUpdate({
        totalImport: importCount * 45,
        restowBlocks: restowCount,
        cancellations: cancelledCount,
        aiResolved: 100
      });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full bg-[#040D1A] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl select-none">
      
      {/* Filter Tabs for quick inspection */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 font-bold">Filtrar Vista:</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ver Todo (10)
          </button>
          <button
            onClick={() => setActiveFilter('import')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeFilter === 'import' ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-sky-300 hover:bg-slate-700'
            }`}
          >
            📥 Importación (5)
          </button>
          <button
            onClick={() => setActiveFilter('restow_block')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeFilter === 'restow_block' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            ⚠️ Restibas / Bloqueos (2)
          </button>
          <button
            onClick={() => setActiveFilter('cancelled')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeFilter === 'cancelled' ? 'bg-rose-500 text-slate-950 font-black' : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
            }`}
          >
            ❌ Cancelados (2)
          </button>
          <button
            onClick={() => setActiveFilter('ai_adjusted')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeFilter === 'ai_adjusted' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
            }`}
          >
            ✨ Ajuste Agente IA (2)
          </button>
        </div>
      </div>

      {/* SVG 2D ANIMATED CANVAS */}
      <div className="relative bg-[#030B15] p-3 md:p-5">
        <svg viewBox="0 0 720 290" className="w-full h-64 md:h-72 select-none">
          
          {/* Sky Gradient */}
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020914" />
              <stop offset="100%" stopColor="#0a1c30" />
            </linearGradient>

            <linearGradient id="laserGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </linearGradient>

            {/* Container Glows */}
            <filter id="glowRestow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width="720" height="290" fill="url(#skyGrad)" />

          {/* Animated Water Waves */}
          <g transform="translate(0, 220)">
            <path
              d="M 0,10 Q 90,-5 180,10 T 360,10 T 540,10 T 720,10 L 720,70 L 0,70 Z"
              fill="#032238"
              opacity="0.8"
            />
            <path
              d="M 0,20 Q 90,5 180,20 T 360,20 T 540,20 T 720,20 L 720,70 L 0,70 Z"
              fill="#021727"
              opacity="0.9"
            />
            <line x1="0" y1="20" x2="720" y2="20" stroke="#38bdf8" strokeWidth="1" strokeDasharray="8,6" opacity="0.4" />
          </g>

          {/* SAILING CONTAINER SHIP GROUP */}
          <g transform={`translate(0, ${shipOffsetY})`}>
            
            {/* Red Underwater Hull */}
            <path d="M 120,220 L 140,245 L 610,245 L 640,220 Z" fill="#991b1b" stroke="#7f1d1d" strokeWidth="2" />
            
            {/* Main Navy Deck Hull */}
            <path d="M 110,180 L 125,222 L 645,222 L 665,180 Z" fill="#0f172a" stroke="#0284c7" strokeWidth="2.5" />
            <line x1="120" y1="205" x2="650" y2="205" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" /> {/* Plimsoll Line */}

            {/* Navigation Bridge / Tower */}
            <rect x="570" y="115" width="60" height="65" fill="#1e293b" stroke="#0284c7" strokeWidth="2" rx="4" />
            <rect x="580" y="125" width="40" height="14" fill="#00e5ff" opacity="0.85" rx="2" />
            <text x="583" y="136" fill="#020914" fontSize="8" fontFamily="monospace" fontWeight="bold">POSEIDON</text>

            {/* Radar Beam Rotation */}
            <line x1="600" y1="115" x2="600" y2="100" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="600" cy="100" r="4" fill="#f59e0b" className="animate-ping" />

            {/* Bay Grid Structure */}
            <line x1="170" y1="180" x2="170" y2="220" stroke="#334155" strokeWidth="2" />
            <line x1="290" y1="180" x2="290" y2="220" stroke="#334155" strokeWidth="2" />
            <line x1="410" y1="180" x2="410" y2="220" stroke="#334155" strokeWidth="2" />
            <line x1="530" y1="180" x2="530" y2="220" stroke="#334155" strokeWidth="2" />

            {/* Bay Text Labels */}
            <text x="210" y="215" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold">BAHÍA 01</text>
            <text x="330" y="215" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold">BAHÍA 02</text>
            <text x="450" y="215" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold">BAHÍA 03</text>

            {/* CONTAINERS DRAWN ACCORDING TO BAPLIE MANIFEST */}
            {inspectionManifest.map((box) => {
              // Check filter
              if (activeFilter !== 'all' && box.status !== activeFilter) {
                return null;
              }

              const bx = 180 + (box.bay - 1) * 120 + (box.row - 1) * 45;
              const by = 180 - box.tier * 24;
              const isScanHovered = activeHighlightedId === box.id;
              const isSelected = selectedBox?.id === box.id;

              // Color mapping
              let fillColor = '#0284c7'; // Import = Sky Blue
              let borderColor = '#38bdf8';
              let statusLabel = '📥 Import';

              if (box.status === 'restow_block') {
                fillColor = '#f59e0b'; // Amber
                borderColor = '#fbbf24';
                statusLabel = '⚠️ Restiba';
              } else if (box.status === 'cancelled') {
                fillColor = '#ef4444'; // Red
                borderColor = '#f87171';
                statusLabel = '❌ Cancelado';
              } else if (box.status === 'ai_adjusted') {
                fillColor = '#10b981'; // Emerald
                borderColor = '#34d399';
                statusLabel = '✨ IA OK';
              }

              return (
                <g
                  key={box.id}
                  transform={`translate(${bx}, ${by})`}
                  onClick={() => setSelectedBox(box)}
                  className="cursor-pointer transition-all hover:opacity-90"
                >
                  {/* Container Box */}
                  <rect
                    x="0"
                    y="0"
                    width="42"
                    height="22"
                    fill={fillColor}
                    stroke={isScanHovered || isSelected ? '#ffffff' : borderColor}
                    strokeWidth={isScanHovered || isSelected ? 3 : 1.5}
                    rx="3"
                    filter={box.status === 'restow_block' ? 'url(#glowRestow)' : undefined}
                  />

                  {/* Corner Casting Accent */}
                  <rect x="2" y="2" width="38" height="18" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.6" />

                  {/* Text Code inside box */}
                  <text x="4" y="14" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    {box.code.split('-')[1] || box.code}
                  </text>

                  {/* Status Overlay Badge */}
                  {box.status === 'restow_block' && (
                    <g transform="translate(28, -6)">
                      <circle cx="6" cy="6" r="7" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
                      <text x="3" y="9" fill="#ffffff" fontSize="8" fontWeight="bold">!</text>
                    </g>
                  )}

                  {box.status === 'cancelled' && (
                    <g transform="translate(28, -6)">
                      <circle cx="6" cy="6" r="7" fill="#1e293b" stroke="#ef4444" strokeWidth="1.5" />
                      <text x="3" y="9" fill="#ef4444" fontSize="8" fontWeight="bold">✕</text>
                    </g>
                  )}

                  {box.status === 'ai_adjusted' && (
                    <g transform="translate(28, -6)">
                      <circle cx="6" cy="6" r="7" fill="#047857" stroke="#ffffff" strokeWidth="1" />
                      <text x="3" y="9" fill="#ffffff" fontSize="8" fontWeight="bold">✓</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ANIMATED AI HOLOGRAPHIC SCANNER BEAM */}
            {isPlaying && (
              <g transform={`translate(${laserX}, 80)`}>
                {/* Laser Vertical Plane */}
                <rect x="-12" y="0" width="24" height="110" fill="url(#laserGrad)" pointerEvents="none" />
                <line x1="0" y1="0" x2="0" y2="110" stroke="#00e5ff" strokeWidth="2.5" strokeDasharray="4,2" />
                {/* Laser Head Node */}
                <circle cx="0" cy="0" r="5" fill="#00e5ff" />
                <circle cx="0" cy="0" r="9" fill="none" stroke="#00e5ff" strokeWidth="1" className="animate-ping" />
              </g>
            )}

          </g>
        </svg>

        {/* Selected Container Detailed Inspection Card */}
        {selectedBox && (
          <div className="mt-3 p-3 bg-slate-900 border border-cyan-500/50 rounded-xl text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl text-white font-bold text-sm ${
                selectedBox.status === 'restow_block' ? 'bg-amber-600' :
                selectedBox.status === 'cancelled' ? 'bg-rose-600' :
                selectedBox.status === 'ai_adjusted' ? 'bg-emerald-600' : 'bg-sky-600'
              }`}>
                {selectedBox.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{selectedBox.destination}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                    Bahía 0{selectedBox.bay} • Fila {selectedBox.row} • Piso {selectedBox.tier}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] mt-0.5">{selectedBox.details}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBox(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-600 self-end sm:self-auto cursor-pointer"
            >
              Cerrar Detalle
            </button>
          </div>
        )}

      </div>

      {/* Watermark */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>POSEIDON IA • Insppección BAPLIE 2D en Navegación</span>
        <span className="text-cyan-400 font-bold">Haz clic en cualquier contenedor para ver detalles</span>
      </div>

    </div>
  );
};
