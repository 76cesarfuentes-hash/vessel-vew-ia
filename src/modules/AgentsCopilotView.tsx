import React, { useState, useMemo } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { runStowageAudit } from '../core/engines/stowageAuditor';
import { solveAuditError, SolutionProposal } from '../core/engines/correctionSolver';
import { askStowageCopilot } from '../core/services/geminiCopilot';
import { AuditError } from '../core/models/validation';
import { AdjustmentResult } from '../core/business/adjustmentEngine';
import { buildMasterIndexes, findContainerInIndexes, MasterIndexes } from '../core/business/indexEngine';
import { exportToExcel, exportToPDF, exportToBaplieEDI, exportRestowsToExcel } from '../core/services/exportService';
import { Container, getEffectiveCargoType } from '../core/models/container';
import {
  ShieldCheck, Bot, Play, Send, Check, X, AlertCircle, Sparkles, FileText,
  Download, Search, AlertTriangle, Zap, RefreshCw, FileSpreadsheet, Layers,
  CheckCircle2, Anchor, Box, Thermometer, ShieldAlert, ArrowRight, Eye
} from 'lucide-react';

export interface AgentActionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  text: string;
  noRecordNotice?: {
    searchedTerm: string;
    type: 'CONTAINER' | 'PORT' | 'BAY' | 'IMO' | 'OTHER';
    availableSummary: string;
  };
  containerCard?: Container;
  reportCard?: {
    type: 'DG' | 'REEFER' | 'OOG' | 'EMPTY' | 'TANK' | 'PORT' | 'GENERAL' | 'COMPARISON';
    title: string;
    subtitle: string;
    totalUnits: number;
    items: Container[];
    stats: { [key: string]: number | string };
  };
  actionBlock?: {
    action: string;
    adjustmentType?: string;
    containerId?: string;
  };
}

export const AgentsCopilotView: React.FC = () => {
  const {
    filteredContainers,
    parsedContainers,
    activeTerminalKey,
    podSequence,
    executeAdjustment,
    setFilters,
    setSelectedBay,
    restowReport
  } = useStowageStore();

  const [auditErrors, setAuditErrors] = useState<AuditError[]>([]);
  const [selectedError, setSelectedError] = useState<AuditError | null>(null);
  const [solutionProposal, setSolutionProposal] = useState<SolutionProposal | null>(null);
  const [, setLastAdjustmentResult] = useState<AdjustmentResult | null>(null);

  const [chatMessages, setChatMessages] = useState<AgentActionMessage[]>([
    {
      id: 'sys-0',
      role: 'system',
      timestamp: new Date().toLocaleTimeString(),
      text: '🤖 AGENTE BAPLIE / MOVINS OPERATIVO INICIADO\n• Acceso directo a masterContainers[] e índices del sistema.\n• Genera reportes interactivos (DG, Reefer, OOG, Vacíos, Tanques, Puertos) descargables en Excel y PDF.\n• Si un contenedor o puerto no existe en el manifiesto, indicará explícitamente "No hay registro".'
    }
  ]);

  const [promptInput, setPromptInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Build Master Indexes dynamically
  const indexes: MasterIndexes = useMemo(() => {
    return buildMasterIndexes(parsedContainers.length > 0 ? parsedContainers : filteredContainers);
  }, [parsedContainers, filteredContainers]);

  const activeDataset = parsedContainers.length > 0 ? parsedContainers : filteredContainers;

  const handleRunAudit = () => {
    if (activeDataset.length === 0) return;
    const { errors } = runStowageAudit(activeDataset, podSequence);
    setAuditErrors(errors);
    if (errors.length > 0) {
      setSelectedError(errors[0]);
      const proposal = solveAuditError(errors[0], activeDataset, podSequence);
      setSolutionProposal(proposal);
    } else {
      setSelectedError(null);
      setSolutionProposal(null);
    }
  };

  const handleSelectError = (err: AuditError) => {
    setSelectedError(err);
    const proposal = solveAuditError(err, activeDataset, podSequence);
    setSolutionProposal(proposal);
  };

  const handleDirectCancelAdjustment = (containerId: string) => {
    if (!containerId) return;
    const res = executeAdjustment({
      type: 'CANCEL_CONTAINER',
      containerId
    });

    setLastAdjustmentResult(res);

    const logText = res.success
      ? `✅ AJUSTE EJECUTADO CON ÉXITO:\n${res.actionSummary}\n\nREGLAS DE ESTIBA CUMPLIDAS:\n• No 20' s/ 40': ${res.ruleChecks.no20Over40.message}\n• Sustituto Proa: ${res.ruleChecks.substituteFromFore.message}\n• Cama 20': ${res.ruleChecks.bed20FtRule.message}`
      : `❌ NO SE PUDO EJECUTAR EL AJUSTE:\n${res.actionSummary}`;

    setChatMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        text: logText
      }
    ]);
  };

  // Agent Smart Command Dispatcher
  const handleSendPrompt = async (textToSend?: string) => {
    const q = (textToSend || promptInput).trim();
    if (!q || isAsking) return;

    const userMsgId = `usr-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString();

    setChatMessages(prev => [...prev, { id: userMsgId, role: 'user', timestamp: timeStr, text: q }]);
    if (!textToSend) setPromptInput('');
    setIsAsking(true);

    const lower = q.toLowerCase();

    // 1. CHECK FOR CANCEL COMMAND
    const cancelMatch = q.match(/cancela(?:r)?\s+(?:el\s+contenedor\s+)?([A-Z0-9]{4,11})/i);
    if (cancelMatch && cancelMatch[1]) {
      const targetId = cancelMatch[1].toUpperCase();
      const targetCont = findContainerInIndexes(targetId, indexes);

      if (!targetCont) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `⚠️ No hay registro del contenedor "${targetId}" en los datos precargados.`,
            noRecordNotice: {
              searchedTerm: targetId,
              type: 'CONTAINER',
              availableSummary: `Existen ${indexes.containerIndex.size} contenedores cargados en el manifiesto activo.`
            }
          }
        ]);
        setIsAsking(false);
        return;
      }

      const res = executeAdjustment({
        type: 'CANCEL_CONTAINER',
        containerId: targetCont.id
      });
      setLastAdjustmentResult(res);

      const replyText = res.success
        ? `🤖 AGENTE DE AJUSTES EN ACCIÓN:\n${res.actionSummary}\n\nREGLAS DE ESTIBA APLICADAS:\n1. 🚫 Jamás 20' s/ 40': ${res.ruleChecks.no20Over40.message}\n2. ⚓ Sustituto Proa: ${res.ruleChecks.substituteFromFore.message}\n3. ⚖ Cama de 20': ${res.ruleChecks.bed20FtRule.message}`
        : `⚠️ Error al procesar cancelación del contenedor ${targetId}: ${res.actionSummary}`;

      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString(),
          text: replyText,
          containerCard: targetCont
        }
      ]);
      setIsAsking(false);
      return;
    }

    // 2. CHECK FOR DIRECT CONTAINER SEARCH
    const searchMatch = q.match(/(?:buscar|locate|find|donde\s+esta|contenedor)\s+([A-Z0-9]{4,11})/i);
    const directCode = (!searchMatch && /^[A-Z]{3,4}[0-9]{6,7}$/i.test(q.trim())) ? q.trim().toUpperCase() : null;
    const targetCode = searchMatch ? searchMatch[1].toUpperCase() : directCode;

    if (targetCode) {
      const found = findContainerInIndexes(targetCode, indexes);
      if (found) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `🔍 REGISTRO ENCONTRADO EN BAPLIE / MOVINS:\nEl contenedor ${found.id} está registrado en la posición ${found.position || 'N/A'}.`,
            containerCard: found
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `⚠️ No hay registro del contenedor "${targetCode}".`,
            noRecordNotice: {
              searchedTerm: targetCode,
              type: 'CONTAINER',
              availableSummary: `Se revisó la base de datos de ${indexes.containerIndex.size} contenedores cargados y no existe ningún registro coincidente.`
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    // 3. CHECK FOR REPORT REQUESTS
    if (lower.includes('reporte dg') || lower.includes('reporte imo') || lower.includes('peligros') || lower.includes('dangerous')) {
      const dgs = indexes.cargoTypeIndex.get('DG') || Array.from(indexes.containerIndex.values()).filter(c => c.cargoType === 'DG' || (c.imoClass && c.imoClass !== 'Dato no disponible' && c.imoClass !== '-'));

      if (dgs.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: '⚠️ No hay registro de mercancías peligrosas (DG / IMO) en el manifiesto activo.',
            noRecordNotice: {
              searchedTerm: 'Mercancía Peligrosa (DG/IMO)',
              type: 'IMO',
              availableSummary: `Total de contenedores procesados en BAPLIE: ${activeDataset.length} unidades.`
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `📋 REPORTE GENERADO: Se identificaron ${dgs.length} contenedores con clasificación de Carga Peligrosa (IMO / DG) en el manifiesto.`,
            reportCard: {
              type: 'DG',
              title: 'REPORTE OFICIAL DE CARGA PELIGROSA (DG / IMDG)',
              subtitle: 'Contenedores reglamentados bajo código IMDG con número UN y clase de riesgo',
              totalUnits: dgs.length,
              items: dgs,
              stats: {
                'Total DG': dgs.length,
                'Clases Únicas': new Set(dgs.map(d => d.imoClass)).size,
                'Con UN ID': dgs.filter(d => d.unNumber && d.unNumber !== '-').length
              }
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    if (lower.includes('reefer') || lower.includes('frio') || lower.includes('rf') || lower.includes('reporte rf')) {
      const rfs = indexes.reeferIndex;
      if (rfs.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: '⚠️ No hay registro de contenedores refrigerados (Reefer / RF) en el archivo EDI activo.',
            noRecordNotice: {
              searchedTerm: 'Contenedores Refrigerados (RF)',
              type: 'OTHER',
              availableSummary: 'Ninguna unidad requiere conexión o monitoreo de temperatura en la estiba actual.'
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `📋 REPORTE GENERADO: Se registran ${rfs.length} unidades Refrigeradas (Reefer / RF) con setpoint de temperatura.`,
            reportCard: {
              type: 'REEFER',
              title: 'REPORTE OFICIAL DE UNIDADES REFRIGERADAS (REEFER)',
              subtitle: 'Listado completo de contenedores bajo temperatura controlada y ventilación',
              totalUnits: rfs.length,
              items: rfs,
              stats: {
                'Total Reefers': rfs.length,
                'Bajo Cero (<0°C)': rfs.filter(r => parseFloat(r.temp || '0') < 0).length,
                'Refrigerados (>=0°C)': rfs.filter(r => parseFloat(r.temp || '0') >= 0).length
              }
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    if (lower.includes('vacios') || lower.includes('vacíos') || lower.includes('empty') || lower.includes('reporte mt')) {
      const empties = indexes.emptyIndex;
      if (empties.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: '⚠️ No hay registro de contenedores vacíos (MT / EMPTY) en los archivos cargados.',
            noRecordNotice: {
              searchedTerm: 'Contenedores Vacíos (MT/EMPTY)',
              type: 'OTHER',
              availableSummary: 'Todas las unidades registradas en el buque contienen carga llena (FULL).'
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `📋 REPORTE GENERADO: Se registran ${empties.length} unidades en estado Vacío (EMPTY / MT).`,
            reportCard: {
              type: 'EMPTY',
              title: 'REPORTE DE CONTENEDORES VACÍOS (EMPTY / MT)',
              subtitle: 'Resumen de unidades sin carga distribuidas en el buque',
              totalUnits: empties.length,
              items: empties,
              stats: {
                'Total Vacíos': empties.length,
                '20 Pies': empties.filter(e => e.size === 20).length,
                '40/45 Pies': empties.filter(e => e.size >= 40).length
              }
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    if (lower.includes('oog') || lower.includes('sobredimension') || lower.includes('sobredimensión') || lower.includes('flat rack')) {
      const oogs = indexes.oogIndex;
      if (oogs.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: '⚠️ No hay registro de carga fuera de dimensión (OOG / Over Dimension) en el manifiesto.',
            noRecordNotice: {
              searchedTerm: 'Sobredimensión (OOG)',
              type: 'OTHER',
              availableSummary: 'Todas las unidades cumplen las dimensiones estándar de celda.'
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `📋 REPORTE GENERADO: Se registran ${oogs.length} contenedores con dimensiones especiales (OOG).`,
            reportCard: {
              type: 'OOG',
              title: 'REPORTE DE SOBREDIMENSIÓN (OOG / SPECIAL CARGO)',
              subtitle: 'Unidades con exceso de altura o ancho que bloquean celdas colindantes',
              totalUnits: oogs.length,
              items: oogs,
              stats: {
                'Total OOG': oogs.length,
                'Flat Rack / Platform': oogs.filter(o => o.iso.includes('P') || o.iso.includes('F')).length
              }
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    if (lower.includes('tanque') || lower.includes('tank') || lower.includes('isotanque')) {
      const tanks = indexes.tankIndex;
      if (tanks.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: '⚠️ No hay registro de contenedores Tanque / Isotanques (ISO 22T1/42T1) en este buque.',
            noRecordNotice: {
              searchedTerm: 'Contenedores Tanque (Tank)',
              type: 'OTHER',
              availableSummary: 'No figuran códigos ISO de tanque en el archivo EDI cargado.'
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `📋 REPORTE GENERADO: Se encontraron ${tanks.length} unidades tipo Tanque (ISO Tank).`,
            reportCard: {
              type: 'TANK',
              title: 'REPORTE DE CONTENEDORES TANQUE (ISO TANKS)',
              subtitle: 'Unidades de transporte de líquidos/químicos a granel',
              totalUnits: tanks.length,
              items: tanks,
              stats: { 'Total Tanques': tanks.length }
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    // 4. CHECK FOR PORT SEARCH (e.g. "Houston", "Veracruz", "Valparaiso", "Callao", "San Antonio")
    const portQuery = q.toUpperCase().replace(/[^A-Z]/g, '');
    const matchedPod = indexes.allPods.find(p => p.includes(portQuery) || portQuery.includes(p));

    if (lower.includes('puerto') || lower.includes('pod') || (portQuery.length >= 3 && matchedPod)) {
      const podCode = matchedPod || portQuery;
      const podUnits = indexes.podIndex.get(podCode) || [];

      if (podUnits.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `⚠️ No hay registro de unidades destinadas o procedentes del puerto "${q}".`,
            noRecordNotice: {
              searchedTerm: q,
              type: 'PORT',
              availableSummary: `Puertos registrados en el EDI actual: ${indexes.allPods.join(', ') || 'Sin PODs'}`
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: `📋 REPORTE DE PUERTO: Se identificaron ${podUnits.length} contenedores asignados al puerto ${podCode}.`,
            reportCard: {
              type: 'PORT',
              title: `REPORTE CONSOLIDADO PUERTO: ${podCode}`,
              subtitle: `Detalle de unidades asignadas al puerto de descarga ${podCode}`,
              totalUnits: podUnits.length,
              items: podUnits,
              stats: {
                'Total Unidades': podUnits.length,
                'Unidades DG': podUnits.filter(u => u.cargoType === 'DG').length,
                'Unidades RF': podUnits.filter(u => u.cargoType === 'RF').length,
                'Vacíos': podUnits.filter(u => u.cargoType === 'MT' || u.status === 'EMPTY').length
              }
            }
          }
        ]);
      }
      setIsAsking(false);
      return;
    }

    // 5. CALL SERVER GEMINI COPILOT FOR GENERAL OPERATIONAL ANALYSIS
    const answer = await askStowageCopilot(q, activeDataset, activeTerminalKey, podSequence);

    let parsedActionBlock: any = null;
    const jsonMatch = answer.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedActionBlock = JSON.parse(jsonMatch[1]);
      } catch (e) {
        // ignore
      }
    }

    // Check if the AI output contains the explicit phrase "No hay registro"
    const hasNoRecordMention = answer.toLowerCase().includes('no hay registro');

    setChatMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        text: answer,
        actionBlock: parsedActionBlock,
        noRecordNotice: hasNoRecordMention ? {
          searchedTerm: q,
          type: 'OTHER',
          availableSummary: 'El sistema verificó el índice de masterContainers[] y no existe coincidencias cargadas.'
        } : undefined
      }
    ]);

    setIsAsking(false);
  };

  return (
    <div className="bg-[#03060E] border border-slate-800 rounded-lg p-3 sm:p-4 shadow-2xl flex flex-col h-full overflow-hidden text-slate-200 font-mono">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-950/80 border border-purple-600/50 rounded-lg shadow-inner">
            <Bot className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AGENTE OPERATIVO ENTERPRISE DE ESTIBA & REPORTES
              </h2>
              <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[9px] font-bold px-2 py-0.5 rounded">
                MASTER INDEXING ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Índices sincrónicos sobre <strong className="text-cyan-400">{indexes.containerIndex.size}</strong> contenedores en masterContainers[] • Terminal: <span className="text-amber-400 font-bold">{activeTerminalKey}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAudit}
            disabled={activeDataset.length === 0}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1.5 px-3.5 rounded border border-amber-300 flex items-center gap-1.5 cursor-pointer shadow transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> AUDITAR ESTIBA Y ERRORES ({auditErrors.length})
          </button>
        </div>
      </div>

      {/* Main 3 Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL: AUDITOR & SOLVER (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* PANEL 1: AUDITOR ERRORS */}
          <div className="bg-[#070D18] border border-amber-500/30 rounded-lg flex flex-col overflow-hidden flex-1">
            <div className="p-2.5 bg-[#0D1826] border-b border-amber-500/20 flex items-center justify-between">
              <span className="bg-amber-950 text-amber-400 border border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> AGENTE AUDITOR
              </span>
              <span className="text-xs font-bold text-slate-200">REGLAS MARÍTIMAS</span>
            </div>

            <div className="p-2.5 overflow-y-auto flex-1 space-y-2">
              {auditErrors.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                  No hay errores de estiba o presione <strong className="text-amber-400">AUDITAR ESTIBA</strong> para verificar reglas de peso y celdas.
                </div>
              ) : (
                auditErrors.map(err => {
                  const isSelected = selectedError?.id === err.id;
                  return (
                    <div
                      key={err.id}
                      onClick={() => handleSelectError(err)}
                      className={`p-2 rounded border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-[#0B1726] border-slate-800 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-amber-400">{err.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          err.prioridad === 'CRÍTICO' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {err.prioridad}
                        </span>
                      </div>
                      <div className="font-bold text-slate-200 text-[11px] mb-0.5">{err.tipo.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-slate-400">{err.ubicacion} — <span className="text-cyan-400 font-bold">{err.contenedor}</span></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL 2: SOLVER PROPOSAL */}
          <div className="bg-[#070D18] border border-cyan-500/30 rounded-lg flex flex-col overflow-hidden flex-1">
            <div className="p-2.5 bg-[#0D1826] border-b border-cyan-500/20 flex items-center justify-between">
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Zap className="w-3 h-3" /> AGENTE RESOLVEDOR
              </span>
              <span className="text-xs font-bold text-slate-200">PROPUESTAS DE REUBICACIÓN</span>
            </div>

            <div className="p-2.5 overflow-y-auto flex-1 text-xs">
              {solutionProposal ? (
                <div>
                  <div className="bg-[#0B1726] p-2 rounded border border-slate-800 mb-2">
                    <div className="text-[10px] text-slate-400 uppercase">Error: {solutionProposal.error.id}</div>
                    <div className="font-bold text-amber-400">{solutionProposal.error.descripcion}</div>
                  </div>

                  {solutionProposal.solution ? (
                    <div className="bg-[#091C2D] border border-cyan-500/40 rounded p-2.5 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
                        <span className="font-bold text-cyan-300 text-[11px] uppercase">
                          {solutionProposal.solution.type === 'FREE_SLOT' ? '🟢 SLOT LIBRE' : '🔄 INTERCAMBIO'}
                        </span>
                        <span className="text-emerald-400 font-bold">{solutionProposal.solution.confidence}% Confianza</span>
                      </div>

                      <div className="text-slate-200 text-[11px]">
                        Reubicar <strong className="text-cyan-300">{solutionProposal.solution.containerId}</strong> desde <span className="text-red-400 font-bold">{solutionProposal.solution.fromPosition}</span> hasta <span className="text-emerald-400 font-bold">{solutionProposal.solution.toPosition}</span>.
                      </div>

                      <button
                        onClick={() => handleDirectCancelAdjustment(solutionProposal.solution!.containerId)}
                        className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow"
                      >
                        <Check className="w-3.5 h-3.5" /> EJECUTAR SOLUCIÓN
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-950/40 border border-amber-800 p-2.5 rounded text-amber-300 text-[11px]">
                      ⚠️ {solutionProposal.message}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  Seleccione un error en el panel superior para generar una solución de estiba.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: CHAT & AGENT ACTION STREAM (8 cols) */}
        <div className="lg:col-span-8 bg-[#070D18] border border-purple-500/30 rounded-lg flex flex-col overflow-hidden min-h-0">
          <div className="p-2.5 bg-[#0D1826] border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-purple-950 text-purple-300 border border-purple-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> AGENTE PRINCIPAL DE OPERACIONES
              </span>
              <span className="text-xs font-bold text-slate-200">INTERFAZ DE ACCIONES DIRECTAS</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              EN LÍNEA (NO HALLUCINATION GUARD)
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="p-3 overflow-y-auto flex-1 space-y-3 text-xs">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`p-3 rounded text-xs transition-all ${
                  msg.role === 'user'
                    ? 'bg-cyan-950/60 border border-cyan-800 text-cyan-100 ml-6 shadow-md'
                    : msg.role === 'assistant'
                    ? 'bg-[#0A1322] border border-purple-800/60 text-slate-200 mr-6 shadow-lg'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 text-center text-[11px]'
                }`}
              >
                <div className="font-bold text-[10px] text-slate-400 mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="flex items-center gap-1.5">
                    {msg.role === 'user' ? (
                      <span className="text-cyan-400 font-bold">👤 SUPERINTENDENTE PLANNER</span>
                    ) : msg.role === 'assistant' ? (
                      <span className="text-purple-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> AGENTE BAPLIE / MOVINS
                      </span>
                    ) : (
                      <span>SISTEMA</span>
                    )}
                  </span>
                  <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                {/* 1. NO RECORD NOTICE CARD (WHEN DATA NOT FOUND) */}
                {msg.noRecordNotice && (
                  <div className="mt-3 bg-red-950/80 border-2 border-red-500/80 rounded-lg p-3 text-slate-200">
                    <div className="flex items-center gap-2 mb-1 text-red-300 font-bold text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                      NO HAY REGISTRO DE: "{msg.noRecordNotice.searchedTerm}"
                    </div>
                    <p className="text-[11px] text-slate-300 mb-2">
                      El término solicitado no figura en la base de datos de los archivos BAPLIE / MOVINS procesados.
                    </p>
                    <div className="bg-black/40 p-2 rounded text-[10px] text-amber-300 border border-amber-500/30">
                      ℹ️ {msg.noRecordNotice.availableSummary}
                    </div>
                  </div>
                )}

                {/* 2. CONTAINER CARD */}
                {msg.containerCard && (
                  <div className="mt-3 bg-[#0D1B2A] border border-cyan-500/60 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-cyan-800/60 pb-1.5">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-sm text-cyan-300">{msg.containerCard.id}</span>
                        <span className="bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] px-2 py-0.2 rounded font-bold">
                          {msg.containerCard.iso}
                        </span>
                      </div>
                      <span className="text-amber-400 font-bold text-xs">
                        POS: {msg.containerCard.position || 'N/A'} (BAY {msg.containerCard.bay})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1">
                      <div><span className="text-slate-400">Peso:</span> <strong className="text-white">{msg.containerCard.weight} KG</strong></div>
                      <div><span className="text-slate-400">POD:</span> <strong className="text-amber-400">{msg.containerCard.pod}</strong></div>
                      <div><span className="text-slate-400">POL:</span> <strong className="text-slate-200">{msg.containerCard.pol}</strong></div>
                      <div><span className="text-slate-400">Operador:</span> <strong className="text-emerald-400">{msg.containerCard.operator}</strong></div>
                      <div><span className="text-slate-400">Categoría:</span> <strong className="text-purple-300">{getEffectiveCargoType(msg.containerCard)}</strong></div>
                      <div><span className="text-slate-400">Temp:</span> <strong className="text-cyan-300">{msg.containerCard.temp || 'N/A'}</strong></div>
                      <div><span className="text-slate-400">Clase IMO:</span> <strong className="text-red-400">{msg.containerCard.imoClass || '-'}</strong></div>
                      <div><span className="text-slate-400">Estado:</span> <strong className="text-slate-200">{msg.containerCard.status}</strong></div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => {
                          if (msg.containerCard?.bay) {
                            setSelectedBay(msg.containerCard.bay);
                            setFilters({ search: msg.containerCard.id });
                          }
                        }}
                        className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-[10px] px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> VER EN PLANO DE BAHÍA {msg.containerCard.bay}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. GENERATED REPORT CARD WITH DIRECT DOWNLOAD BUTTONS */}
                {msg.reportCard && (
                  <div className="mt-3 bg-[#0B1B2B] border-2 border-emerald-500/60 rounded-lg p-3 space-y-2.5 shadow-xl">
                    <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h4 className="font-bold text-xs text-emerald-300 uppercase">{msg.reportCard.title}</h4>
                          <p className="text-[10px] text-slate-400">{msg.reportCard.subtitle}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full">
                        {msg.reportCard.totalUnits} Unidades
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/40 p-2 rounded border border-slate-800 text-[10px]">
                      {Object.entries(msg.reportCard.stats).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-slate-800/60 pb-0.5">
                          <span className="text-slate-400">{k}:</span>
                          <span className="font-bold text-cyan-300">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Table Preview */}
                    <div className="max-h-36 overflow-y-auto border border-slate-800 rounded">
                      <table className="w-full text-left text-[9px]">
                        <thead className="bg-[#122438] text-slate-300 sticky top-0">
                          <tr>
                            <th className="p-1">CONTENEDOR</th>
                            <th className="p-1">POS</th>
                            <th className="p-1">ISO</th>
                            <th className="p-1">POD</th>
                            <th className="p-1">PESO</th>
                            <th className="p-1">TIPO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {msg.reportCard.items.slice(0, 10).map((item, i) => (
                            <tr key={i} className="hover:bg-cyan-950/30">
                              <td className="p-1 font-bold text-cyan-300">{item.id}</td>
                              <td className="p-1 text-slate-300">{item.position}</td>
                              <td className="p-1 text-slate-400">{item.iso}</td>
                              <td className="p-1 text-amber-400 font-bold">{item.pod}</td>
                              <td className="p-1 text-slate-300">{item.weight} KG</td>
                              <td className="p-1 text-purple-300">{getEffectiveCargoType(item)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* EXPORT ACTION BUTTONS */}
                    <div className="pt-1 flex flex-wrap gap-2">
                      <button
                        onClick={() => exportToExcel(msg.reportCard!.items, `Reporte_${msg.reportCard!.type}`)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> DESCARGAR EXCEL (.XLSX)
                      </button>

                      <button
                        onClick={() => exportToPDF(msg.reportCard!.items, activeTerminalKey, msg.reportCard!.title)}
                        className="bg-red-700 hover:bg-red-600 text-white font-bold text-[10px] px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" /> DESCARGAR REPORTES PDF
                      </button>

                      <button
                        onClick={() => {
                          setFilters({
                            cargoType: msg.reportCard!.type === 'DG' ? 'DG' : msg.reportCard!.type === 'REEFER' ? 'RF' : msg.reportCard!.type === 'EMPTY' ? 'MT' : 'ALL'
                          });
                        }}
                        className="bg-cyan-800 hover:bg-cyan-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> APLICAR FILTRO AL PLANO
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. EXECUTE ADJUSTMENT ACTION BUTTON */}
                {msg.actionBlock && msg.actionBlock.action === 'EXECUTE_ADJUSTMENT' && msg.actionBlock.containerId && (
                  <div className="mt-2.5 pt-2 border-t border-purple-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-bold">Ajuste de reubicación listo:</span>
                    <button
                      onClick={() => handleDirectCancelAdjustment(msg.actionBlock!.containerId!)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1 rounded border border-emerald-400 flex items-center gap-1 cursor-pointer shadow"
                    >
                      <Zap className="w-3.5 h-3.5" /> EJECUTAR AJUSTE DE REUBICACIÓN
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isAsking && (
              <div className="p-3 rounded bg-purple-950/40 border border-purple-800 text-purple-300 text-xs animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                <span>Analizando índices de masterContainers[] y ejecutando consulta...</span>
              </div>
            )}
          </div>

          {/* QUICK COMMAND TRIGGER CHIPS */}
          <div className="px-3 py-2 bg-[#050A14] border-t border-slate-800 flex flex-wrap gap-1.5 text-[10px]">
            <span className="text-slate-400 font-bold self-center mr-1 text-[9px] uppercase">Generar Reporte:</span>
            <button
              onClick={() => handleSendPrompt("Generar reporte DG")}
              className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3 text-red-400" /> Reporte DG (IMO)
            </button>
            <button
              onClick={() => handleSendPrompt("Generar reporte Reefer")}
              className="bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/80 px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <Thermometer className="w-3 h-3 text-sky-400" /> Reporte Reefer (RF)
            </button>
            <button
              onClick={() => handleSendPrompt("Generar reporte de vacios")}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <Box className="w-3 h-3 text-slate-400" /> Reporte Vacíos
            </button>
            <button
              onClick={() => handleSendPrompt("Generar reporte OOG")}
              className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700/80 px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <Layers className="w-3 h-3 text-purple-400" /> Reporte OOG
            </button>
            <button
              onClick={() => handleSendPrompt("Generar reporte de tanques")}
              className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/80 px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <Anchor className="w-3 h-3 text-amber-400" /> Reporte Tanques
            </button>
            <button
              onClick={() => {
                const samplePod = indexes.allPods[0] || 'MXVER';
                handleSendPrompt(`Reporte puerto ${samplePod}`);
              }}
              className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 px-2.5 py-1 rounded font-bold cursor-pointer transition-all"
            >
              📊 Reporte Puerto ({indexes.allPods[0] || 'VER'})
            </button>
            <button
              onClick={() => handleSendPrompt("Buscar contenedor ZZZZ9999999")}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-1 rounded cursor-pointer transition-all"
            >
              🔍 Probar "No Hay Registro"
            </button>
          </div>

          {/* CHAT INPUT FORM */}
          <div className="p-2.5 bg-[#0A121E] border-t border-slate-800 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                placeholder="Escribe 'Generar reporte DG', 'Buscar MSCU1234567' o 'Reporte Houston'..."
                className="w-full bg-[#030712] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-purple-500 placeholder-slate-500"
              />
            </div>
            <button
              onClick={() => handleSendPrompt()}
              disabled={isAsking}
              className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> ENVIAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
