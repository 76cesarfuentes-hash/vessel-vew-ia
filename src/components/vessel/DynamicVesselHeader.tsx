import React, { useState } from 'react';
import { BaplieHeaderInfo } from '../../core/parser/baplieParser';
import { Container } from '../../core/models/container';
import { Ship, Anchor, Calendar, Clock, MapPin, Navigation, Tag, Layers, Scale, Globe, Tv, Share2, Cast } from 'lucide-react';
import { ShareTransmitModal } from '../common/ShareTransmitModal';
import appLogo from '../../assets/logo.jpg';

interface DynamicVesselHeaderProps {
  baplieHeader?: BaplieHeaderInfo;
  containers: Container[];
  activeTerminalKey: string;
  fileName: string;
}

export const DynamicVesselHeader: React.FC<DynamicVesselHeaderProps> = ({
  baplieHeader,
  containers,
  activeTerminalKey,
  fileName
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  // Determine vessel name from BAPLIE header or containers or default
  const rawVesselName = baplieHeader?.vesselName ||
    containers.find(c => c.operator && c.operator !== 'Dato no disponible')?.operator ||
    'MAERSK HOUSTON';

  const vesselName = rawVesselName.trim().toUpperCase();

  // Determine shipping line branding & color theme
  let lineName = 'GLOBAL CARRIER';
  let hullColor = '#0284C7'; // Cyan/Sky
  let accentColor = '#38BDF8';
  let badgeBg = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  let brandLogo = '🚢';

  if (vesselName.includes('MAERSK')) {
    lineName = 'MAERSK LINE';
    hullColor = '#00A3E0';
    accentColor = '#7DD3FC';
    badgeBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    brandLogo = '★ MAERSK';
  } else if (vesselName.includes('MSC')) {
    lineName = 'MEDITERRANEAN SHIPPING CO.';
    hullColor = '#27272A'; // Charcoal
    accentColor = '#FACC15'; // Yellow
    badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    brandLogo = 'MSC';
  } else if (vesselName.includes('ONE') || vesselName.includes('OCEAN NETWORK')) {
    lineName = 'OCEAN NETWORK EXPRESS';
    hullColor = '#E4007F'; // Pink/Magenta
    accentColor = '#F472B6';
    badgeBg = 'bg-pink-500/20 text-pink-300 border-pink-500/40';
    brandLogo = 'ONE';
  } else if (vesselName.includes('CMA') || vesselName.includes('CGM')) {
    lineName = 'CMA CGM GROUP';
    hullColor = '#002B49'; // Navy
    accentColor = '#EF4444'; // Red
    badgeBg = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    brandLogo = 'CMA CGM';
  } else if (vesselName.includes('COSCO')) {
    lineName = 'COSCO SHIPPING';
    hullColor = '#0284C7';
    accentColor = '#60A5FA';
    badgeBg = 'bg-blue-600/20 text-blue-300 border-blue-500/40';
    brandLogo = 'COSCO';
  } else if (vesselName.includes('EVERGREEN') || vesselName.includes('EVER')) {
    lineName = 'EVERGREEN LINE';
    hullColor = '#10B981'; // Green
    accentColor = '#34D399';
    badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    brandLogo = 'EVERGREEN';
  } else if (vesselName.includes('HAPAG') || vesselName.includes('HLAG')) {
    lineName = 'HAPAG-LLOYD';
    hullColor = '#F97316'; // Orange
    accentColor = '#FB923C';
    badgeBg = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    brandLogo = 'HAPAG';
  }

  // Metadata fallbacks
  const imoNumber = baplieHeader?.imoNumber || '9632103';
  const voyage = baplieHeader?.voyage || '2507W';
  const eta = baplieHeader?.eta || '25 JUL 2026 06:45';
  const etb = baplieHeader?.etb || '25 JUL 2026 07:15';
  const etd = baplieHeader?.etd || '26 JUL 2026 18:00';
  const service = 'AL4 / TP2';
  const portName = activeTerminalKey === 'VER' ? 'VERACRUZ (VER)' :
                   activeTerminalKey === 'LZC' ? 'LÁZARO CÁRDENAS (LZC)' :
                   activeTerminalKey === 'ZLO' ? 'MANZANILLO (ZLO)' : 'ENSENADA (ETI)';

  // Calculate statistics
  const totalUnits = containers.length;
  const count20 = containers.filter(c => c.size === 20).length;
  const count40 = containers.filter(c => c.size === 40 || c.size === 45).length;
  const totalWeightTn = Math.round(containers.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0) / 1000);
  const uniqueBaysCount = new Set(containers.map(c => c.bay).filter(b => b && b !== 'Dato no disponible')).size;
  const uniquePodsCount = new Set(containers.map(c => c.pod).filter(p => p && p !== 'Dato no disponible')).size;

  return (
    <div className="bg-[#091522] border border-cyan-500/30 rounded-xl p-3.5 shadow-2xl relative overflow-hidden text-slate-100 mb-3">
      {/* Background Subtle Tech Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0, 229, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Banner Row */}
      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4 relative z-10">
        
        {/* Left Section: Vessel Identity & SVG Ship Graphic */}
        <div className="flex-1 flex flex-col md:flex-row items-center gap-4 bg-[#050D18]/80 border border-slate-800 rounded-lg p-3">
          
          {/* Dynamic SVG Container Ship Graphic */}
          <div className="w-full md:w-56 h-28 flex-shrink-0 relative bg-[#020710] rounded-md border border-slate-800 p-2 flex items-center justify-center overflow-hidden group">
            <svg viewBox="0 0 320 120" className="w-full h-full drop-shadow-md">
              {/* Sky Background & Horizon */}
              <rect x="0" y="0" width="320" height="85" fill="#030A14" />
              <line x1="0" y1="85" x2="320" y2="85" stroke="#0284C7" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <rect x="0" y="85" width="320" height="35" fill="#020B1A" />

              {/* Water Ripples */}
              <path d="M 10 95 Q 30 92, 50 95 T 90 95 T 130 95 T 170 95 T 210 95 T 250 95 T 290 95" fill="none" stroke="#0284C7" strokeWidth="1" opacity="0.4" />
              <path d="M 20 105 Q 40 102, 60 105 T 100 105 T 140 105 T 180 105 T 220 105 T 260 105" fill="none" stroke="#00E5FF" strokeWidth="0.8" opacity="0.3" />

              {/* Hull */}
              <path
                d="M 25 55 L 45 88 C 80 91, 240 91, 280 88 L 305 55 Z"
                fill={hullColor}
                stroke="#0F172A"
                strokeWidth="2"
              />
              <path
                d="M 25 55 L 45 88 C 80 89, 240 89, 280 88 L 285 70 L 25 70 Z"
                fill="rgba(0,0,0,0.25)"
              />

              {/* Bow Bulb */}
              <ellipse cx="22" cy="85" rx="8" ry="4" fill={hullColor} stroke="#0F172A" strokeWidth="1" />

              {/* Hull Text / Brand */}
              <text x="160" y="78" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1.5">
                {vesselName}
              </text>

              {/* Stacked Containers on Deck */}
              {/* Row 1 (Bottom Deck) */}
              {Array.from({ length: 14 }).map((_, i) => {
                const colors = ['#F97316', '#0284C7', '#10B981', '#E4007F', '#8B5CF6', '#F59E0B'];
                const cColor = colors[i % colors.length];
                return (
                  <rect
                    key={`c1-${i}`}
                    x={45 + i * 16}
                    y="42"
                    width="15"
                    height="12"
                    fill={cColor}
                    stroke="#000000"
                    strokeWidth="0.8"
                    rx="1"
                  />
                );
              })}
              {/* Row 2 (Middle Deck) */}
              {Array.from({ length: 12 }).map((_, i) => {
                const colors = ['#0284C7', '#F97316', '#E4007F', '#10B981', '#3B82F6'];
                const cColor = colors[(i + 2) % colors.length];
                return (
                  <rect
                    key={`c2-${i}`}
                    x={61 + i * 16}
                    y="30"
                    width="15"
                    height="11"
                    fill={cColor}
                    stroke="#000000"
                    strokeWidth="0.8"
                    rx="1"
                  />
                );
              })}
              {/* Row 3 (Top Deck) */}
              {Array.from({ length: 9 }).map((_, i) => {
                const colors = ['#10B981', '#3B82F6', '#F97316', '#8B5CF6'];
                const cColor = colors[(i + 1) % colors.length];
                return (
                  <rect
                    key={`c3-${i}`}
                    x={85 + i * 16}
                    y="19"
                    width="15"
                    height="10"
                    fill={cColor}
                    stroke="#000000"
                    strokeWidth="0.8"
                    rx="1"
                  />
                );
              })}

              {/* Bridge Superstructure (Aft) */}
              <rect x="250" y="22" width="28" height="33" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1.5" rx="1" />
              {/* Bridge Windows */}
              <rect x="253" y="26" width="22" height="5" fill="#0EA5E9" stroke="#0F172A" strokeWidth="0.8" />
              {/* Radar Mast */}
              <line x1="264" y1="22" x2="264" y2="10" stroke="#0F172A" strokeWidth="1.5" />
              <line x1="258" y1="14" x2="270" y2="14" stroke="#0F172A" strokeWidth="1.5" />
              <circle cx="264" cy="8" r="2" fill="#EF4444" className="animate-ping" />
            </svg>

            {/* Live Status Chip on Ship */}
            <div className="absolute top-1.5 left-1.5 bg-emerald-950/90 border border-emerald-500/60 text-emerald-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EN OPERACIÓN
            </div>
          </div>

          {/* Vessel Name & Shipping Line Specs */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border ${badgeBg}`}>
                {brandLogo}
              </span>
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                LÍNEA: <strong className="text-slate-200">{lineName}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-black text-white font-mono tracking-wider truncate flex items-center gap-2">
                <img
                  src={appLogo}
                  alt="TOS Logo"
                  className="w-7 h-7 rounded-lg object-cover border border-cyan-400/60 shadow-[0_0_10px_rgba(0,229,255,0.4)] flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <Ship className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                {vesselName}
              </h2>

              {/* Share & Transmit to Screen Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-black bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 border border-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Transmitir esta pantalla a un TV / Monitor de Control Room o Compartir Enlace"
              >
                <Cast className="w-4 h-4" />
                <span>TRANSMITIR / SHARE</span>
              </button>
            </div>

            {/* EDI Specifications Line */}
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10.5px] font-mono">
              <div className="bg-[#0B1726] p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">IMO NUMBER</span>
                <strong className="text-cyan-300 font-bold">{imoNumber}</strong>
              </div>
              <div className="bg-[#0B1726] p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">VIAJE / VOYAGE</span>
                <strong className="text-amber-300 font-bold">{voyage}</strong>
              </div>
              <div className="bg-[#0B1726] p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">SERVICIO</span>
                <strong className="text-purple-300 font-bold">{service}</strong>
              </div>
              <div className="bg-[#0B1726] p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">PUERTO ACTIVO</span>
                <strong className="text-emerald-300 font-bold truncate block">{portName}</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Center/Right Section: ETA/ETB/ETD Timestamps */}
        <div className="bg-[#050D18]/80 border border-slate-800 rounded-lg p-3 flex flex-col justify-between gap-2 lg:w-72">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> TIMELINE DE ARRIBO (EDI)
            </span>
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
              PROGRAMADO
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center bg-[#091522] px-2 py-1 rounded">
              <span className="text-slate-400 text-[10px]">ETA (Arribo):</span>
              <strong className="text-cyan-300 font-mono text-[11px]">{eta}</strong>
            </div>
            <div className="flex justify-between items-center bg-[#091522] px-2 py-1 rounded">
              <span className="text-slate-400 text-[10px]">ETB (Atranque):</span>
              <strong className="text-amber-300 font-mono text-[11px]">{etb}</strong>
            </div>
            <div className="flex justify-between items-center bg-[#091522] px-2 py-1 rounded">
              <span className="text-slate-400 text-[10px]">ETD (Despacho):</span>
              <strong className="text-emerald-300 font-mono text-[11px]">{etd}</strong>
            </div>
          </div>
        </div>

        {/* Far Right: Total Vessel Capacity Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:w-80">
          <div className="bg-[#050D18] border border-cyan-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> TOTAL
            </span>
            <span className="text-lg font-black text-cyan-300 font-mono leading-none my-1">
              {totalUnits.toLocaleString()}
            </span>
            <span className="text-[8.5px] font-mono text-cyan-400/80">100% Carga</span>
          </div>

          <div className="bg-[#050D18] border border-emerald-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-400" /> 20' PIES
            </span>
            <span className="text-lg font-black text-emerald-300 font-mono leading-none my-1">
              {count20.toLocaleString()}
            </span>
            <span className="text-[8.5px] font-mono text-emerald-400/80">
              {totalUnits > 0 ? Math.round((count20 / totalUnits) * 100) : 0}% del total
            </span>
          </div>

          <div className="bg-[#050D18] border border-purple-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-purple-400" /> 40' PIES
            </span>
            <span className="text-lg font-black text-purple-300 font-mono leading-none my-1">
              {count40.toLocaleString()}
            </span>
            <span className="text-[8.5px] font-mono text-purple-400/80">
              {totalUnits > 0 ? Math.round((count40 / totalUnits) * 100) : 0}% del total
            </span>
          </div>

          <div className="bg-[#050D18] border border-amber-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Scale className="w-3 h-3 text-amber-400" /> PESO TOTAL
            </span>
            <span className="text-lg font-black text-amber-300 font-mono leading-none my-1">
              {totalWeightTn.toLocaleString()}
            </span>
            <span className="text-[8.5px] font-mono text-amber-400/80">Toneladas</span>
          </div>

          <div className="bg-[#050D18] border border-sky-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-400" /> BAHÍAS
            </span>
            <span className="text-lg font-black text-sky-300 font-mono leading-none my-1">
              {uniqueBaysCount}
            </span>
            <span className="text-[8.5px] font-mono text-sky-400/80">Secciones activas</span>
          </div>

          <div className="bg-[#050D18] border border-pink-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-pink-400" /> PUERTOS
            </span>
            <span className="text-lg font-black text-pink-300 font-mono leading-none my-1">
              {uniquePodsCount}
            </span>
            <span className="text-[8.5px] font-mono text-pink-400/80">Destinos (POD)</span>
          </div>
        </div>

      </div>

      {/* Share & Screen Transmission Modal */}
      <ShareTransmitModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        vesselName={vesselName}
        totalContainers={totalUnits}
      />
    </div>
  );
};
