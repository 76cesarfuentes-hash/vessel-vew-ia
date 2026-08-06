import React, { useState } from 'react';
import {
  X,
  Brain,
  ShieldAlert,
  Anchor,
  FileCode,
  Cpu,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  Info,
  Terminal,
  ChevronRight,
  Database,
  Code
} from 'lucide-react';

interface AgentMindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MindNode {
  id: string;
  title: string;
  category: 'IMDG' | 'OPERATIONS' | 'EDI' | 'ARCHITECTURE' | 'SECURITY' | 'ANALYTICS';
  roleName: string;
  badge: string;
  icon: React.ReactNode;
  summary: string;
  capabilities: string[];
  rules: string[];
  color: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
}

export const AgentMindMapModal: React.FC<AgentMindMapModalProps> = ({ isOpen, onClose }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('imdg-master');
  const [activeTab, setActiveTab] = useState<'MAP' | 'ROLES' | 'RULES'>('MAP');

  if (!isOpen) return null;

  const nodes: MindNode[] = [
    {
      id: 'imdg-master',
      title: 'IMDG CODE MASTER',
      category: 'IMDG',
      roleName: 'Dangerous Goods & Compliance Director',
      badge: 'IMDG 41-22 CERTIFIED',
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
      summary: 'Experto de nivel mundial en el Código Marítimo Internacional de Mercancías Peligrosas (IMDG Code). Maximiza seguridad humana, del buque y medioambiental.',
      capabilities: [
        'Validación de Clases IMDG 1 a 9 y Subriesgos',
        'Matriz de Segregación (Away From, Separated From, Compartment)',
        'Fichas EmS (Emergency Schedules) y Guía MFAG',
        'Carga Peligrosa Reefer y Contenedores Sobredimensionados OOG-DG',
        'Clasificación de Riesgo Operativo (LOW, MEDIUM, HIGH, CRITICAL)'
      ],
      rules: [
        'La seguridad siempre tiene prioridad sobre la productividad operativa.',
        'Jamás recomendar una operación que viole el Código IMDG vigente.',
        'Formato de Respuesta obligatorio: Cargo Summary -> Compliance -> Segregation -> Risk -> Final Decision.'
      ],
      color: {
        bg: 'bg-amber-950/60',
        border: 'border-amber-500/50',
        text: 'text-amber-300',
        glow: 'shadow-amber-500/20'
      }
    },
    {
      id: 'vessel-planner',
      title: 'VESSEL & TERMINAL PLANNER',
      category: 'OPERATIONS',
      roleName: 'Senior Vessel & Yard Planning Expert',
      badge: 'ZERO RESTOW TARGET',
      icon: <Anchor className="w-5 h-5 text-cyan-400" />,
      summary: 'Especialista en planificación de estiba de buques porta-contenedores, división de grúas STS/RTG, secuencias por POD y minización de re-movimientos.',
      capabilities: [
        'Análisis e inspección de Bahías (Deck vs Under-deck, Row, Tier)',
        'Cálculo de Estabilidad, Trimado y Límite de Peso en Tiers',
        'Secuenciación de Descarga/Carga por Puerto de Destino (POD)',
        'Evitación de "20 ft sobre 40 ft" y respeto estricto de Cama 20 ft',
        'Simulación de movimientos en patio (RTG/RMG/Yard Chess)'
      ],
      rules: [
        'Cero errores de carga o descarga por traslape de POD.',
        'Balance de pesos vertical y horizontal con centro de gravedad bajo.',
        'Explicar siempre: Problema -> Causa -> Solución -> Impacto Operativo.'
      ],
      color: {
        bg: 'bg-cyan-950/60',
        border: 'border-cyan-500/50',
        text: 'text-cyan-300',
        glow: 'shadow-cyan-500/20'
      }
    },
    {
      id: 'edi-specialist',
      title: 'MARITIME EDI SPECIALIST',
      category: 'EDI',
      roleName: 'EDI Protocol & BAPLIE/MOVINS Architect',
      badge: 'EDIFACT / ANSI X12',
      icon: <FileCode className="w-5 h-5 text-emerald-400" />,
      summary: 'Especialista en protocolos y formatos estándar de intercambio de datos marítimos e interoperabilidad de terminales.',
      capabilities: [
        'Parser y Validador de BAPLIE 2.0 / 3.0 (Bay Plan EDI)',
        'Generador y Validador de MOVINS (Move Instructions)',
        'Procesamiento de COPRAR, CODECO, COARRI e IFTMIN',
        'Detección automática de duplicados y discrepancias POD/POL',
        'Reconciliación de manifiestos físicos vs registros EDI'
      ],
      rules: [
        'Validar integridad estructural de segmentos EDIFACT.',
        'Indexar sincronizadamente masterContainers[] tras cada parsing.',
        'Generar informes detallados de anomalías por línea de código EDI.'
      ],
      color: {
        bg: 'bg-emerald-950/60',
        border: 'border-emerald-500/50',
        text: 'text-emerald-300',
        glow: 'shadow-emerald-500/20'
      }
    },
    {
      id: 'software-architect',
      title: 'SOFTWARE & FULL-STACK ARCHITECT',
      category: 'ARCHITECTURE',
      roleName: 'Chief Software & Systems Architect',
      badge: 'CLEAN ARCHITECTURE / DDD',
      icon: <Cpu className="w-5 h-5 text-purple-400" />,
      summary: 'Arquitecto de software senior responsable del diseño modular, robustez del backend, rendimiento frontend y calidad de código.',
      capabilities: [
        'Arquitectura limpia (Clean Architecture, DDD, SOLID, Repository)',
        'API RESTful servida mediante Node.js + Express + TypeScript',
        'Frontend de alta densidad con React 19, Vite y Tailwind CSS',
        'Indexación sincrónica en memoria para búsquedas instantáneas',
        'Servicios de Inteligencia Artificial resguardados en Servidor'
      ],
      rules: [
        'No ejecutar cambios sin analizar la arquitectura primero.',
        'Mantener cero fugas de memoria y componentes reutilizables.',
        'Guardar todas las credenciales de API en el servidor backend.'
      ],
      color: {
        bg: 'bg-purple-950/60',
        border: 'border-purple-500/50',
        text: 'text-purple-300',
        glow: 'shadow-purple-500/20'
      }
    },
    {
      id: 'security-architect',
      title: 'SECURITY ARCHITECT & UI DIRECTOR',
      category: 'SECURITY',
      roleName: 'Enterprise Security & Cyber UX Director',
      badge: 'AES-256 & RBAC ACTIVE',
      icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
      summary: 'Director de Seguridad de la Información e Interfaces de Usuario Industriales con estética táctica marítima de modo oscuro.',
      capabilities: [
        'Autenticación basada en Roles (RBAC) y Sesión con expiración',
        'Cifrado de grado empresarial AES-256 para auditoría de eventos',
        'Protección contra SQL Injection, XSS, CSRF y sanitización de inputs',
        'Diseño visual Cyber-Navy de alta densidad de información',
        'Garantía de diseño responsive fluido para tablets y escritorios'
      ],
      rules: [
        'Jamás permitir accesos o ejecuciones no autorizadas.',
        'Registrar cada ajuste de estiba en el libro de auditoría inmutable.',
        'Garantizar contraste WCAG AA en todas las métricas de pantalla.'
      ],
      color: {
        bg: 'bg-blue-950/60',
        border: 'border-blue-500/50',
        text: 'text-blue-300',
        glow: 'shadow-blue-500/20'
      }
    },
    {
      id: 'data-performance',
      title: 'DATA ANALYST & PERFORMANCE ENGINEER',
      category: 'ANALYTICS',
      roleName: 'Maritime KPIs & Performance Specialist',
      badge: 'REAL-TIME TELEMETRY',
      icon: <BarChart3 className="w-5 h-5 text-pink-400" />,
      summary: 'Analista de datos operativos y optimizador de rendimiento de renderizado en tiempo real.',
      capabilities: [
        'Métricas de Producción de Grúas (Moves per Hour / MPH)',
        'Análisis de Ocupación de Patio (Yard Capacity Utilization)',
        'Detección de Anomalías de Peso y Distribución de Carga',
        'Virtualización de Bahías de Gran Volumen en Canvas 2D/3D',
        'Exportación automatizada a informes PDF/Excel/BAPLIE'
      ],
      rules: [
        'Rendimiento fluido a 60 FPS incluso con más de 1,000 contenedores.',
        'Generar resúmenes ejecutivos con recomendaciones accionables.',
        'Optimización continua del tamaño del bundle y consumo de memoria.'
      ],
      color: {
        bg: 'bg-pink-950/60',
        border: 'border-pink-500/50',
        text: 'text-pink-300',
        glow: 'shadow-pink-500/20'
      }
    }
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono text-slate-100">
      <div className="bg-[#030813] border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#071120] border-b border-cyan-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950 border border-cyan-500/50 rounded-xl text-cyan-400 shadow-inner">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">
                  MAPA MENTAL Y HABILIDADES DEL AGENTE POSEIDON
                </h2>
                <span className="bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  SKILL ARCHITECTURE v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Red neuronal de toma de decisiones, roles integrados y matriz de cumplimiento IMDG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="hidden sm:flex bg-[#040A15] p-1 border border-slate-700/60 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab('MAP')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'MAP' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mapa Visual
              </button>
              <button
                onClick={() => setActiveTab('ROLES')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'ROLES' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Roles ({nodes.length})
              </button>
              <button
                onClick={() => setActiveTab('RULES')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'RULES' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Reglas IMDG
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800/80 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-3 gap-3">
          {/* LEFT: Mind Map Interactive Canvas / List */}
          <div className="flex-1 bg-[#050D1A] border border-slate-800 rounded-xl p-3 flex flex-col overflow-y-auto">
            {/* Core Node Central Header */}
            <div className="bg-gradient-to-r from-cyan-950/80 via-[#0A1A2F] to-blue-950/80 border border-cyan-500/40 rounded-xl p-3 text-center mb-4 relative overflow-hidden shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black text-cyan-300 uppercase tracking-widest">NÚCLEO CENTRAL DE INTELIGENCIA</span>
              </div>
              <h3 className="text-lg font-black text-white">POSEIDON TOS AGENT COGNITIVE CORE</h3>
              <p className="text-[11px] text-slate-300 max-w-xl mx-auto mt-1">
                Integración de motor IMDG Code Master, análisis EDI BAPLIE, planificación de estiba y arquitectura Clean
              </p>
            </div>

            {/* Nodes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${node.color.bg} ${
                      isSelected
                        ? `ring-2 ring-cyan-400 border-cyan-400 ${node.color.glow} shadow-xl scale-[1.01]`
                        : `${node.color.border} hover:border-slate-500 opacity-90 hover:opacity-100`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-black/40 rounded-lg border border-white/10">
                          {node.icon}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${node.color.text}`}>
                            {node.category}
                          </span>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{node.title}</h4>
                        </div>
                      </div>
                      <span className="text-[9px] bg-black/50 border border-white/10 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                        {node.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2">
                      {node.summary}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-1.5">
                      <span>{node.capabilities.length} Capacidades</span>
                      <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                        Ver Detalle <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mind Map Structural Schema */}
            <div className="mt-4 p-3 bg-[#02060F] border border-slate-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" /> ESTRUCTURA DE DIRECTIVAS REGISTRADAS
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">✓ AGENTS.md & GEMINI.md VINCULADOS</span>
              </div>
              <div className="bg-[#050B16] p-2 rounded-lg font-mono text-[11px] text-cyan-300 border border-slate-800/80 overflow-x-auto">
                <code>
                  [AGENT ROOT] ➔ /AGENTS.md & /skills/
                  <br />
                  ├── 🛡 IMDG Code Master (Classes 1-9, Segregation, EmS, MFAG)
                  <br />
                  ├── ⚓ Vessel & Terminal Planner (Bay Plans, BAPLIE, MOVINS, Crane Split)
                  <br />
                  ├── 📄 EDI Specialist (Parser, Reconciliación, Anomaly Audit)
                  <br />
                  ├── 🏗 Software & Security Architect (Node API, Clean DDD, RBAC AES-256)
                  <br />
                  └── 📊 Maritime Data Analyst (KPIs, Crane MPH, Yard Capacity)
                </code>
              </div>
            </div>
          </div>

          {/* RIGHT: Node Inspector Panel */}
          <div className="w-full md:w-80 bg-[#071120] border border-cyan-500/30 rounded-xl p-3 flex flex-col overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 mb-3">
              <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-lg">
                {selectedNode.icon}
              </div>
              <div>
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">NODO SELECCIONADO</span>
                <h3 className="text-sm font-black text-white">{selectedNode.title}</h3>
                <p className="text-[10px] text-slate-400">{selectedNode.roleName}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#040B17] border border-slate-800 rounded-lg p-2.5 mb-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-cyan-400" /> RESUMEN EJECUTIVO
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{selectedNode.summary}</p>
            </div>

            {/* Capabilities */}
            <div className="mb-3 space-y-1.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> CAPACIDADES CLAVE
              </div>
              <div className="space-y-1">
                {selectedNode.capabilities.map((cap, idx) => (
                  <div key={idx} className="bg-[#0A1628] border border-slate-800/80 rounded-md p-1.5 text-[11px] text-slate-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Directives / Rules */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> REGLAS Y DIRECTIVAS
              </div>
              <div className="space-y-1">
                {selectedNode.rules.map((rule, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-md p-1.5 text-[11px] text-amber-200/90 flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-auto pt-3 border-t border-slate-800/80">
              <div className="p-2 bg-cyan-950/40 border border-cyan-800/50 rounded-lg text-center">
                <span className="text-[10px] text-cyan-300 font-bold block mb-0.5">ESTADO EN TIEMPO REAL</span>
                <span className="text-[11px] text-emerald-400 font-black flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> ROL ACTIVO EN PROMPT DE SISTEMA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
