import React, { useState, useMemo } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { useLanguage } from '../core/i18n/LanguageContext';
import { Container } from '../core/models/container';
import {
  Globe,
  ArrowDownLeft,
  ArrowUpRight,
  Ship,
  Filter,
  Search,
  Layers,
  BarChart3,
  TrendingUp,
  MapPin,
  Box,
  Scale,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  Compass,
  Radio,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

// Country & Port Metadata Lookup Dictionary
interface CountryMetadata {
  code: string; // ISO 2 letter country code
  name: string;
  flag: string;
  lat: number;
  lng: number;
  ports: string[];
  continent: 'Asia' | 'Norteamérica' | 'Sudamérica' | 'Europa' | 'Centroamérica' | 'Oceanía';
}

const COUNTRY_LOOKUP: Record<string, CountryMetadata> = {
  CL: { code: 'CL', name: 'Chile', flag: '🇨🇱', lat: -33.58, lng: -71.61, ports: ['CLSAI', 'CLVAP', 'LIR', 'CLIQU'], continent: 'Sudamérica' },
  CN: { code: 'CN', name: 'China', flag: '🇨🇳', lat: 31.23, lng: 121.47, ports: ['CNSHA', 'SHA', 'CNNGB', 'CNYTN'], continent: 'Asia' },
  JP: { code: 'JP', name: 'Japón', flag: '🇯🇵', lat: 35.44, lng: 139.63, ports: ['JPYOK', 'YOK', 'JPTYO'], continent: 'Asia' },
  KR: { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷', lat: 35.10, lng: 129.04, ports: ['KRPUS', 'BUS'], continent: 'Asia' },
  SG: { code: 'SG', name: 'Singapur', flag: '🇸🇬', lat: 1.35, lng: 103.82, ports: ['SGSIN', 'SIN'], continent: 'Asia' },
  US: { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', lat: 29.76, lng: -95.36, ports: ['USHOU', 'HOU', 'USLAX', 'LAX', 'USMIA'], continent: 'Norteamérica' },
  MX: { code: 'MX', name: 'México', flag: '🇲🇽', lat: 19.17, lng: -96.13, ports: ['MXVER', 'VER', 'MXALT', 'ALT', 'MXLZC', 'MXMZN'], continent: 'Norteamérica' },
  NL: { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', lat: 51.92, lng: 4.47, ports: ['NLRTM', 'RTM'], continent: 'Europa' },
  DE: { code: 'DE', name: 'Alemania', flag: '🇩🇪', lat: 53.55, lng: 9.99, ports: ['DEHAM', 'HAM'], continent: 'Europa' },
  ES: { code: 'ES', name: 'España', flag: '🇪🇸', lat: 41.38, lng: 2.17, ports: ['ESBCN', 'BCN', 'ESVLC'], continent: 'Europa' },
  BR: { code: 'BR', name: 'Brasil', flag: '🇧🇷', lat: -23.96, lng: -46.33, ports: ['BSSAN', 'BRSTS', 'SSZ'], continent: 'Sudamérica' },
  PE: { code: 'PE', name: 'Perú', flag: '🇵🇪', lat: -12.05, lng: -77.15, ports: ['PECLL', 'CALLAO'], continent: 'Sudamérica' },
  EC: { code: 'EC', name: 'Ecuador', flag: '🇪🇨', lat: -2.20, lng: -79.89, ports: ['ECMEC', 'GYE'], continent: 'Sudamérica' },
  PA: { code: 'PA', name: 'Panamá', flag: '🇵🇦', lat: 8.95, lng: -79.56, ports: ['PABLB', 'PAONX'], continent: 'Centroamérica' },
  CO: { code: 'CO', name: 'Colombia', flag: '🇨🇴', lat: 10.40, lng: -75.50, ports: ['COCTG', 'COBUN'], continent: 'Sudamérica' },
  DE_DEF: { code: 'OTHER', name: 'Internacional', flag: '🌐', lat: 20.0, lng: 0.0, ports: [], continent: 'Asia' }
};

// Map Port Code to Country Metadata
function resolveCountryFromPort(portCode: string): CountryMetadata {
  if (!portCode) return { code: 'DES', name: 'Desconocido', flag: '🌐', lat: 0, lng: 0, ports: [], continent: 'Asia' };
  const clean = portCode.trim().toUpperCase();

  // Match 2-letter country prefix if UN/LOCODE (e.g., CLSAI -> CL, CNSHA -> CN, USHOU -> US)
  const prefix2 = clean.substring(0, 2);
  if (COUNTRY_LOOKUP[prefix2]) {
    return COUNTRY_LOOKUP[prefix2];
  }

  // Check port code in lookup lists
  for (const key of Object.keys(COUNTRY_LOOKUP)) {
    if (COUNTRY_LOOKUP[key].ports.some(p => p === clean || clean.includes(p))) {
      return COUNTRY_LOOKUP[key];
    }
  }

  // Direct matches or fallback heuristics
  if (clean.includes('VER') || clean.includes('ALT') || clean.includes('MZN') || clean.includes('LZC')) return COUNTRY_LOOKUP['MX'];
  if (clean.includes('SAI') || clean.includes('VAP') || clean.includes('LIR') || clean.includes('IQU')) return COUNTRY_LOOKUP['CL'];
  if (clean.includes('SHA') || clean.includes('NGB') || clean.includes('YTN')) return COUNTRY_LOOKUP['CN'];
  if (clean.includes('HOU') || clean.includes('LAX') || clean.includes('MIA')) return COUNTRY_LOOKUP['US'];
  if (clean.includes('CLL')) return COUNTRY_LOOKUP['PE'];
  if (clean.includes('MEC') || clean.includes('GYE')) return COUNTRY_LOOKUP['EC'];
  if (clean.includes('RTM')) return COUNTRY_LOOKUP['NL'];
  if (clean.includes('HAM')) return COUNTRY_LOOKUP['DE'];
  if (clean.includes('BCN') || clean.includes('VLC')) return COUNTRY_LOOKUP['ES'];

  return {
    code: clean.substring(0, 3),
    name: `Puerto ${clean}`,
    flag: '⚓',
    lat: 10,
    lng: (Math.abs(clean.charCodeAt(0) * 17) % 280) - 140,
    ports: [clean],
    continent: 'Asia'
  };
}

// Convert Lat/Lng to SVG Map Coordinates (Equirectangular Projection)
function latLngToSvg(lat: number, lng: number, width = 1000, height = 500) {
  const x = ((lng + 180) * width) / 360;
  const y = ((90 - lat) * height) / 180;
  return { x, y };
}

export const GlobalTradeMapView: React.FC = () => {
  const { t } = useLanguage();
  const {
    parsedContainers,
    parsedDischargeContainers,
    parsedLoadContainers,
    activeTerminal
  } = useStowageStore();

  // Mode: 'IMPORT' (Descarga) vs 'EXPORT' (Carga)
  const [tradeMode, setTradeMode] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Terminal Hub Coordinates (e.g. San Antonio CLSAI or Veracruz MXVER)
  const hubPortCode = activeTerminal?.code || 'CLSAI';
  const hubCountry = resolveCountryFromPort(hubPortCode);
  const hubPos = latLngToSvg(hubCountry.lat, hubCountry.lng);

  // Select list based on import (descarga) vs export (carga)
  const sourceContainers = useMemo(() => {
    if (tradeMode === 'IMPORT') {
      // Containers meant for discharge at current port or with DISCHARGE operation
      const dis = parsedDischargeContainers.length > 0 ? parsedDischargeContainers : parsedContainers.filter(c => c.operation === 'DISCHARGE' || c.pod === hubPortCode);
      return dis.length > 0 ? dis : parsedContainers.filter(c => c.operation !== 'LOAD');
    } else {
      // Containers meant for loading onto the vessel
      const lod = parsedLoadContainers.length > 0 ? parsedLoadContainers : parsedContainers.filter(c => c.operation === 'LOAD' || c.pol === hubPortCode);
      return lod.length > 0 ? lod : parsedContainers.filter(c => c.operation === 'LOAD');
    }
  }, [tradeMode, parsedContainers, parsedDischargeContainers, parsedLoadContainers, hubPortCode]);

  // Group containers by Country (POL for Import, POD for Export)
  const countryBreakdown = useMemo(() => {
    const map = new Map<string, {
      country: CountryMetadata;
      portCodes: Set<string>;
      containerCount: number;
      teus: number;
      totalWeightKg: number;
      dcCount: number;
      rfCount: number;
      dgCount: number;
      mtCount: number;
      containers: Container[];
    }>();

    sourceContainers.forEach(c => {
      const targetPort = tradeMode === 'IMPORT' ? (c.pol || 'DESCONOCIDO') : (c.pod || 'DESCONOCIDO');
      const countryMeta = resolveCountryFromPort(targetPort);
      const key = countryMeta.code;

      if (!map.has(key)) {
        map.set(key, {
          country: countryMeta,
          portCodes: new Set([targetPort]),
          containerCount: 0,
          teus: 0,
          totalWeightKg: 0,
          dcCount: 0,
          rfCount: 0,
          dgCount: 0,
          mtCount: 0,
          containers: []
        });
      }

      const item = map.get(key)!;
      item.portCodes.add(targetPort);
      item.containerCount += 1;
      item.teus += c.size === 20 ? 1 : 2;

      const wKg = c.weightKg || (parseFloat(c.weight) || 15000);
      item.totalWeightKg += wKg;

      if (c.cargoType === 'RF' || (c.temp && c.temp !== 'DRY' && c.temp !== 'Dato no disponible')) item.rfCount++;
      else if (c.cargoType === 'DG' || (c.imoClass && c.imoClass !== 'Dato no disponible')) item.dgCount++;
      else if (c.status === 'EMPTY' || c.cargoType === 'MT') item.mtCount++;
      else item.dcCount++;

      item.containers.push(c);
    });

    return Array.from(map.values()).sort((a, b) => b.containerCount - a.containerCount);
  }, [sourceContainers, tradeMode]);

  // Overall KPIs
  const totalContainers = sourceContainers.length;
  const totalTEUs = countryBreakdown.reduce((acc, c) => acc + c.teus, 0);
  const totalWeightTonnes = (countryBreakdown.reduce((acc, c) => acc + c.totalWeightKg, 0) / 1000).toFixed(1);
  const totalCountries = countryBreakdown.length;

  // Selected Country Data
  const activeCountryData = useMemo(() => {
    if (!selectedCountryCode) return null;
    return countryBreakdown.find(cb => cb.country.code === selectedCountryCode) || null;
  }, [selectedCountryCode, countryBreakdown]);

  // Filtered Country Cards by search
  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) return countryBreakdown;
    const q = searchTerm.toLowerCase();
    return countryBreakdown.filter(
      cb => cb.country.name.toLowerCase().includes(q) ||
            Array.from(cb.portCodes).some(p => String(p || '').toLowerCase().includes(q))
    );
  }, [countryBreakdown, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#040B15] text-slate-100 overflow-y-auto font-sans select-none">
      
      {/* ── TOP HUD HEADER CONTROL BAR ── */}
      <div className="bg-[#09182A]/90 border-b border-cyan-500/30 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        
        {/* Title & Hub info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            <Globe className="w-7 h-7 text-cyan-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black font-mono text-white uppercase tracking-wider">
                MAPA MUNDIAL DE COMERCIO MARÍTIMO
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                LIVE TOS RADAR
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>PUERTO HUB: <strong className="text-cyan-300">{activeTerminal?.name || 'San Antonio (CLSAI)'}</strong></span>
              <span className="text-slate-600">•</span>
              <span>ORIGEN/DESTINO INTERNACIONAL Y VOLÚMENES POR PAÍS</span>
            </p>
          </div>
        </div>

        {/* MODE TOGGLE SWITCHER (IMPORTACIÓN vs EXPORTACIÓN) */}
        <div className="flex items-center gap-3">
          <div className="bg-[#050D18] p-1.5 rounded-2xl border border-slate-700/80 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => { setTradeMode('IMPORT'); setSelectedCountryCode(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black transition-all flex items-center gap-2 cursor-pointer ${
                tradeMode === 'IMPORT'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,229,255,0.4)] border border-cyan-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-cyan-300" />
              <span>IMPORTACIÓN (DESCARGA)</span>
            </button>

            <button
              onClick={() => { setTradeMode('EXPORT'); setSelectedCountryCode(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black transition-all flex items-center gap-2 cursor-pointer ${
                tradeMode === 'EXPORT'
                  ? 'bg-gradient-to-r from-amber-600 to-purple-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-amber-300" />
              <span>EXPORTACIÓN (CARGA)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS BANNER ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#061220] border-b border-cyan-900/40">
        <div className="bg-[#0A1A2B]/80 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {tradeMode === 'IMPORT' ? 'CONTENEDORES A DESCARGAR' : 'CONTENEDORES A CARGAR'}
            </div>
            <div className="text-xl font-mono font-black text-cyan-300">{totalContainers} <span className="text-xs text-slate-400 font-normal">UNIDADES</span></div>
          </div>
        </div>

        <div className="bg-[#0A1A2B]/80 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">TEUS TOTALES EN {tradeMode === 'IMPORT' ? 'IMPORT' : 'EXPORT'}</div>
            <div className="text-xl font-mono font-black text-blue-300">{totalTEUs} <span className="text-xs text-slate-400 font-normal">TEU</span></div>
          </div>
        </div>

        <div className="bg-[#0A1A2B]/80 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">PESO BRUTO ESTIMADO</div>
            <div className="text-xl font-mono font-black text-emerald-300">{totalWeightTonnes} <span className="text-xs text-slate-400 font-normal">TONS</span></div>
          </div>
        </div>

        <div className="bg-[#0A1A2B]/80 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {tradeMode === 'IMPORT' ? 'PAÍSES DE ORIGEN' : 'PAÍSES DE DESTINO'}
            </div>
            <div className="text-xl font-mono font-black text-amber-300">{totalCountries} <span className="text-xs text-slate-400 font-normal">NACIONES</span></div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (MAP + COUNTRY BREAKDOWN) ── */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* WORLD MAP VISUALIZATION CANVAS (8/12 COLUMNS) */}
        <div className="lg:col-span-8 bg-[#050E1A] border border-cyan-500/40 rounded-2xl p-4 flex flex-col shadow-[0_0_30px_rgba(0,229,255,0.08)] relative min-h-[500px]">
          
          {/* Map Header Overlay */}
          <div className="flex items-center justify-between mb-2 z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>RUTAS GLOBALES & VECTOR DE TRÁFICO DE MAR ({tradeMode === 'IMPORT' ? 'ORIGEN POL ➔ DESCARGA' : 'CARGA ➔ DESTINO POD'})</span>
            </div>
            
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" /> Hub Terminal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" /> Puerto {tradeMode === 'IMPORT' ? 'Origen' : 'Destino'}</span>
            </div>
          </div>

          {/* SVG WORLD MAP */}
          <div className="relative flex-1 rounded-xl bg-[#030811] border border-cyan-900/60 overflow-hidden flex items-center justify-center p-2 shadow-inner">
            
            {/* Background Grid Lines & Latitude/Longitude Markers */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridPattern)" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4,4" />
            </svg>

            {/* Main Interactive World Map SVG */}
            <svg
              viewBox="0 0 1000 500"
              className="w-full h-full object-contain relative z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Simplified Stylized Continent Outlines (High-Tech Tech Overlay) */}
              <g fill="#0B2035" stroke="#1E3A5F" strokeWidth="1" opacity="0.85">
                {/* North America */}
                <path d="M 120 100 Q 180 80 260 90 Q 300 130 280 180 Q 220 220 180 230 Q 140 200 120 100 Z" />
                <path d="M 220 200 Q 280 190 320 240 Q 280 290 240 280 Q 200 240 220 200 Z" />
                {/* South America */}
                <path d="M 280 290 Q 340 300 370 360 Q 320 440 290 470 Q 260 410 270 350 Z" />
                {/* Europe */}
                <path d="M 460 100 Q 530 90 560 140 Q 520 180 470 170 Q 450 140 460 100 Z" />
                {/* Africa */}
                <path d="M 450 190 Q 540 180 570 260 Q 540 370 490 380 Q 440 310 450 190 Z" />
                {/* Asia */}
                <path d="M 570 80 Q 800 70 880 140 Q 820 250 720 240 Q 600 200 570 80 Z" />
                {/* Australia & Oceania */}
                <path d="M 780 320 Q 880 310 900 370 Q 840 430 780 390 Z" />
                {/* Greenland */}
                <path d="M 330 40 Q 410 30 400 70 Q 350 90 330 40 Z" />
              </g>

              {/* Trade Route Arcs & Particles */}
              {countryBreakdown.map((cb, idx) => {
                const nodePos = latLngToSvg(cb.country.lat, cb.country.lng);
                const isSelected = selectedCountryCode === cb.country.code;
                const isHovered = hoveredNode === cb.country.code;

                // Bezier curve control point for curved maritime trade routes
                const dx = hubPos.x - nodePos.x;
                const dy = hubPos.y - nodePos.y;
                const midX = (nodePos.x + hubPos.x) / 2;
                const midY = (nodePos.y + hubPos.y) / 2 - Math.abs(dx) * 0.25; // curvature

                const pathD = `M ${nodePos.x} ${nodePos.y} Q ${midX} ${midY} ${hubPos.x} ${hubPos.y}`;

                const lineColor = tradeMode === 'IMPORT' ? '#00e5ff' : '#f59e0b';
                const strokeWidth = isSelected || isHovered ? 3 : Math.min(Math.max(cb.containerCount * 0.8, 1.2), 3.5);

                return (
                  <g key={cb.country.code}>
                    {/* Glowing Curved Trade Route Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isSelected || isHovered ? "none" : "5,5"}
                      opacity={isSelected || isHovered ? 1 : 0.65}
                      className="transition-all duration-300"
                    />

                    {/* Animated Moving Flow Pulse Along Curve */}
                    <circle r="3" fill={lineColor} className="shadow-[0_0_10px_currentColor]">
                      <animateMotion
                        path={pathD}
                        dur={`${Math.max(3, 8 - idx)}s`}
                        repeatCount="indefinite"
                        keyPoints={tradeMode === 'IMPORT' ? "0;1" : "1;0"}
                        keyTimes="0;1"
                      />
                    </circle>

                    {/* Country Origin / Destination Node Marker */}
                    <g
                      transform={`translate(${nodePos.x}, ${nodePos.y})`}
                      className="cursor-pointer group"
                      onClick={() => setSelectedCountryCode(cb.country.code)}
                      onMouseEnter={() => setHoveredNode(cb.country.code)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Pulse Circle */}
                      <circle
                        r={Math.min(Math.max(cb.containerCount * 1.5 + 6, 8), 22)}
                        fill={tradeMode === 'IMPORT' ? "rgba(0, 229, 255, 0.25)" : "rgba(245, 158, 11, 0.25)"}
                        stroke={lineColor}
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                      
                      {/* Core Node Center */}
                      <circle
                        r={Math.min(Math.max(cb.containerCount * 0.8 + 4, 5), 14)}
                        fill={lineColor}
                        className="shadow-[0_0_12px_currentColor]"
                      />

                      {/* Container Count Label inside Node */}
                      <text
                        y="4"
                        textAnchor="middle"
                        fill="#040B15"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {cb.containerCount}
                      </text>

                      {/* Country Flag & Code Label below node */}
                      <text
                        y="22"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                      >
                        {cb.country.flag} {cb.country.code}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Central Terminal HUB Node (e.g. San Antonio CLSAI or Veracruz MXVER) */}
              <g transform={`translate(${hubPos.x}, ${hubPos.y})`} className="z-30">
                <circle r="28" fill="rgba(0, 229, 255, 0.15)" stroke="#00e5ff" strokeWidth="1" className="animate-ping" />
                <circle r="18" fill="rgba(0, 229, 255, 0.3)" stroke="#00e5ff" strokeWidth="2" />
                <circle r="9" fill="#00e5ff" className="shadow-[0_0_20px_#00e5ff]" />
                <text y="-25" textAnchor="middle" fill="#00e5ff" fontSize="11" fontWeight="black" fontFamily="monospace">
                  HUB: {hubCountry.flag} {hubPortCode}
                </text>
              </g>
            </svg>

            {/* Floating Information Tooltip overlay when node hovered or selected */}
            {(hoveredNode || selectedCountryCode) && (
              <div className="absolute bottom-3 left-3 z-20 bg-[#09182A]/95 border border-cyan-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-xs font-mono text-xs">
                {(() => {
                  const code = hoveredNode || selectedCountryCode;
                  const item = countryBreakdown.find(cb => cb.country.code === code);
                  if (!item) return null;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1">
                        <span className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{item.country.flag}</span>
                          <span>{item.country.name}</span>
                        </span>
                        <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/40">
                          {item.country.code}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px]">CONTENEDORES:</span>
                          <span className="font-bold text-cyan-300">{item.containerCount} UNIDADES</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">VOLUMEN TEU:</span>
                          <span className="font-bold text-blue-300">{item.teus} TEU</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">PESO TOTAL:</span>
                          <span className="font-bold text-emerald-300">{(item.totalWeightKg / 1000).toFixed(1)} TON</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">PUERTOS:</span>
                          <span className="font-bold text-amber-300">{Array.from(item.portCodes).join(', ')}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-300 border-t border-slate-800">
                        <span>DC: {item.dcCount}</span>
                        <span>•</span>
                        <span className="text-cyan-400">RF: {item.rfCount}</span>
                        <span>•</span>
                        <span className="text-rose-400">DG: {item.dgCount}</span>
                        <span>•</span>
                        <span>MT: {item.mtCount}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: COUNTRY BREAKDOWN TABLE & DETAILS (4/12 COLUMNS) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          
          {/* Search & Filter Header */}
          <div className="bg-[#050E1A] border border-cyan-500/40 rounded-2xl p-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por país o puerto..."
              className="bg-transparent w-full text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-white font-mono px-1"
              >
                ×
              </button>
            )}
          </div>

          {/* Country Cards Scrollable List */}
          <div className="bg-[#050E1A] border border-cyan-500/40 rounded-2xl p-3 flex-1 flex flex-col min-h-[350px] shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60 mb-2">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>VOLUMEN POR PAÍS ({filteredCountries.length})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {tradeMode === 'IMPORT' ? 'POL ➔ HUB' : 'HUB ➔ POD'}
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
              {filteredCountries.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500">
                  No se encontraron países o puertos para el filtro actual.
                </div>
              ) : (
                filteredCountries.map((cb) => {
                  const isSelected = selectedCountryCode === cb.country.code;
                  const pct = totalContainers > 0 ? Math.round((cb.containerCount / totalContainers) * 100) : 0;

                  return (
                    <div
                      key={cb.country.code}
                      onClick={() => setSelectedCountryCode(isSelected ? null : cb.country.code)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer font-mono text-xs ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                          : 'bg-[#081524] border-cyan-900/40 hover:border-cyan-500/60 hover:bg-[#0A1A2B]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cb.country.flag}</span>
                          <span className="font-bold text-white">{cb.country.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                            {cb.country.code}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-cyan-300 text-sm">{cb.containerCount}</span>
                          <span className="text-[10px] text-slate-400 ml-1">CONT ({pct}%)</span>
                        </div>
                      </div>

                      {/* Progress Bar for Country Volume */}
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2 border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 ${
                            tradeMode === 'IMPORT' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-amber-500 to-purple-500'
                          }`}
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>TEUs: <strong className="text-blue-300">{cb.teus}</strong></span>
                        <span>Peso: <strong className="text-emerald-300">{(cb.totalWeightKg / 1000).toFixed(1)}t</strong></span>
                        <span>Puertos: <strong className="text-amber-300">{Array.from(cb.portCodes).join(', ')}</strong></span>
                      </div>

                      {/* Expanded Container List Preview when selected */}
                      {isSelected && (
                        <div className="mt-3 pt-2 border-t border-cyan-800/60 space-y-1 animate-fadeIn">
                          <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>LISTA DE CONTENEDORES ({cb.containers.length}):</span>
                            <span className="text-slate-400">ISO • OPERADOR • PESO</span>
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {cb.containers.map((c) => (
                              <div
                                key={c.id}
                                className="p-1.5 bg-[#040B15] border border-cyan-900/60 rounded text-[10px] flex items-center justify-between"
                              >
                                <span className="font-bold text-cyan-200">{c.id}</span>
                                <span className="text-slate-400">{c.iso}</span>
                                <span className="text-amber-300 font-bold">{c.operator}</span>
                                <span className="text-slate-300">{c.weightKg || c.weight} kg</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
