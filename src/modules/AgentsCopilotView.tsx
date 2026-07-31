import React, { useState, useEffect } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { runStowageAudit } from '../core/engines/stowageAuditor';
import { solveAuditError, SolutionProposal } from '../core/engines/correctionSolver';
import { askStowageCopilot } from '../core/services/geminiCopilot';
import { AuditError } from '../core/models/validation';
import { AdjustmentResult } from '../core/business/adjustmentEngine';
import { ShieldCheck, Cpu, Bot, Play, Send, Check, X, AlertCircle, Sparkles, FileText, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

export const AgentsCopilotView: React.FC = () => {
  const { filteredContainers, parsedContainers, activeTerminalKey, podSequence, executeAdjustment } = useStowageStore();

  const [auditErrors, setAuditErrors] = useState<AuditError[]>([]);
  const [selectedError, setSelectedError] = useState<AuditError | null>(null);
  const [solutionProposal, setSolutionProposal] = useState<SolutionProposal | null>(null);
  const [lastAdjustmentResult, setLastAdjustmentResult] = useState<AdjustmentResult | null>(null);

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system'; text: string; actionBlock?: any }>>([
    {
      role: 'system',
      text: 'STOWAGE COPILOT AI listo.\n• Agente especializado 100% exclusivo para esta Web App de Estiba.\n• Ejecuta reportes y ajustes bajo reglas marítimas (Jamás 20\' sobre 40\', sustitución desde Proa, estabilización de cama de 20\').'
    }
  ]);
  const [promptInput, setPromptInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleRunAudit = () => {
    if (filteredContainers.length === 0) return;
    const { errors } = runStowageAudit(filteredContainers, podSequence);
    setAuditErrors(errors);
    if (errors.length > 0) {
      setSelectedError(errors[0]);
      const proposal = solveAuditError(errors[0], filteredContainers, podSequence);
      setSolutionProposal(proposal);
    } else {
      setSelectedError(null);
      setSolutionProposal(null);
    }
  };

  const handleSelectError = (err: AuditError) => {
    setSelectedError(err);
    const proposal = solveAuditError(err, filteredContainers, podSequence);
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
      ? `✅ AJUSTE EJECUTADO:\n${res.actionSummary}\n\nDETALLES DE REGLAS:\n• No 20' s/ 40': ${res.ruleChecks.no20Over40.message}\n• Sustituto Proa: ${res.ruleChecks.substituteFromFore.message}\n• Cama 20': ${res.ruleChecks.bed20FtRule.message}`
      : `❌ FALLO DE AJUSTE:\n${res.actionSummary}`;

    setChatMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        text: logText
      }
    ]);
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const q = textToSend || promptInput;
    if (!q.trim() || isAsking) return;

    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    if (!textToSend) setPromptInput('');
    setIsAsking(true);

    // If user explicitly asks to cancel a container (e.g. "Cancela el contenedor XYZ")
    const cancelMatch = q.match(/cancela(?:r)?\s+(?:el\s+contenedor\s+)?([A-Z0-9]{4,11})/i);
    if (cancelMatch && cancelMatch[1]) {
      const targetId = cancelMatch[1].toUpperCase();
      const res = executeAdjustment({
        type: 'CANCEL_CONTAINER',
        containerId: targetId
      });
      setLastAdjustmentResult(res);

      const replyText = res.success
        ? `🤖 AGENTE DE AJUSTES EN ACCIÓN:\n${res.actionSummary}\n\nREGLAS CUMPLIDAS EN EL AJUSTE:\n1. 🚫 Jamás 20' s/ 40': ${res.ruleChecks.no20Over40.message}\n2. ⚓ Sustituto Proa: ${res.ruleChecks.substituteFromFore.message}\n3. ⚖ Cama de 20': ${res.ruleChecks.bed20FtRule.message}`
        : `⚠ No se pudo ejecutar la cancelación del contenedor ${targetId}: ${res.actionSummary}`;

      setChatMessages(prev => [...prev, { role: 'assistant', text: replyText }]);
      setIsAsking(false);
      return;
    }

    const answer = await askStowageCopilot(q, filteredContainers, activeTerminalKey, podSequence);
    
    // Try parsing action JSON block if embedded
    let parsedActionBlock: any = null;
    const jsonMatch = answer.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedActionBlock = JSON.parse(jsonMatch[1]);
      } catch (e) {
        // ignore parse error
      }
    }

    setChatMessages(prev => [...prev, { role: 'assistant', text: answer, actionBlock: parsedActionBlock }]);
    setIsAsking(false);
  };

  return (
    <div className="bg-[#03060E] border border-slate-800 rounded-lg p-4 shadow-2xl flex flex-col h-full overflow-hidden text-slate-200 font-mono">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              SISTEMA TRIPLE AGENTE AI (AUDITOR + CORRECCIÓN + COPILOT)
            </h2>
            <p className="text-[10px] text-slate-400">
              Operando sobre <strong className="text-cyan-400">{filteredContainers.length}</strong> de {parsedContainers.length} unidades filtradas.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={filteredContainers.length === 0}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1.5 px-4 rounded border border-amber-300 flex items-center gap-1.5 cursor-pointer shadow transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" /> EJECUTAR AUDITORÍA SOBRE FILTRADOS ({filteredContainers.length})
        </button>
      </div>

      {/* 3 Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* PANEL 1: STOWAGE AUDITOR */}
        <div className="bg-[#070D18] border border-amber-500/30 rounded-lg flex flex-col overflow-hidden">
          <div className="p-2.5 bg-[#0D1826] border-b border-amber-500/20 flex items-center justify-between">
            <span className="bg-amber-950 text-amber-400 border border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">
              AGENTE 1
            </span>
            <span className="text-xs font-bold text-slate-200">STOWAGE AUDITOR</span>
          </div>

          <div className="p-3 overflow-y-auto flex-1 space-y-2">
            {auditErrors.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-xs">
                Presione <strong className="text-amber-400">EJECUTAR AUDITORÍA</strong> para auditar la estiba filtrada.
              </div>
            ) : (
              auditErrors.map(err => {
                const isSelected = selectedError?.id === err.id;
                return (
                  <div
                    key={err.id}
                    onClick={() => handleSelectError(err)}
                    className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0B1726] border-slate-800 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-amber-400">{err.id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        err.prioridad === 'CRÍTICO' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {err.prioridad}
                      </span>
                    </div>
                    <div className="font-bold text-slate-200 text-[11px] mb-1">{err.tipo.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-slate-400">{err.ubicacion} — <span className="text-cyan-400">{err.contenedor}</span></div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: STOWAGE CORRECTION SOLVER */}
        <div className="bg-[#070D18] border border-cyan-500/30 rounded-lg flex flex-col overflow-hidden">
          <div className="p-2.5 bg-[#0D1826] border-b border-cyan-500/20 flex items-center justify-between">
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded">
              AGENTE 2
            </span>
            <span className="text-xs font-bold text-slate-200">CORRECTION SOLVER (R1..R14)</span>
          </div>

          <div className="p-3 overflow-y-auto flex-1 text-xs space-y-3">
            {solutionProposal ? (
              <div>
                <div className="bg-[#0B1726] p-2.5 rounded border border-slate-800 mb-3">
                  <div className="text-[10px] text-slate-400 uppercase">Error de Referencia: {solutionProposal.error.id}</div>
                  <div className="font-bold text-amber-400 mt-0.5">{solutionProposal.error.descripcion}</div>
                </div>

                {solutionProposal.solution ? (
                  <div className="bg-[#091C2D] border border-cyan-500/40 rounded p-3 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                      <span className="font-bold text-cyan-300 uppercase">{solutionProposal.solution.type === 'FREE_SLOT' ? '🟢 SLOT LIBRE' : '🔄 INTERCAMBIO'}</span>
                      <span className="text-emerald-400 font-bold">{solutionProposal.solution.confidence}% Confianza</span>
                    </div>

                    <div className="text-slate-200">
                      <strong>Propuesta:</strong> Reubicar {solutionProposal.solution.containerId} desde <span className="text-red-400 font-bold">{solutionProposal.solution.fromPosition}</span> hasta <span className="text-emerald-400 font-bold">{solutionProposal.solution.toPosition}</span>.
                    </div>

                    {/* Rules Validation Grid */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 text-[10px]">
                      {Object.entries(solutionProposal.solution.ruleChecks).map(([key, check]: [string, any]) => (
                        <div key={key} className={`p-1 rounded flex items-center gap-1 ${check.ok ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                          {check.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span className="truncate">{check.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-950/40 border border-amber-800 p-3 rounded text-amber-300">
                    ⚠ {solutionProposal.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500">
                Seleccione un error en el panel AUDITOR para ver la solución propuesta.
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: STOWAGE COPILOT AI */}
        <div className="bg-[#070D18] border border-purple-500/30 rounded-lg flex flex-col overflow-hidden">
          <div className="p-2.5 bg-[#0D1826] border-b border-purple-500/20 flex items-center justify-between">
            <span className="bg-purple-950 text-purple-400 border border-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">
              AGENTE 3
            </span>
            <span className="text-xs font-bold text-slate-200">STOWAGE COPILOT AI</span>
          </div>

          {/* Chat Messages Log */}
          <div className="p-3 overflow-y-auto flex-1 space-y-2.5 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded text-xs ${
                  msg.role === 'user'
                    ? 'bg-cyan-950/60 border border-cyan-800 text-cyan-200 ml-4'
                    : msg.role === 'assistant'
                    ? 'bg-[#0B1726] border border-purple-800/60 text-slate-200 mr-4'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 text-center text-[10px]'
                }`}
              >
                <div className="font-bold text-[9px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>{msg.role === 'user' ? 'PLANNER' : msg.role === 'assistant' ? '🤖 COPILOT AI' : 'SISTEMA'}</span>
                  {msg.role === 'assistant' && (
                    <span className="text-[8px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded">
                      EXCLUSIVO TOS AI
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Interactive Action Button if message contains execution suggestion */}
                {msg.actionBlock && msg.actionBlock.action === 'EXECUTE_ADJUSTMENT' && msg.actionBlock.containerId && (
                  <div className="mt-2.5 pt-2 border-t border-purple-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-bold">Ajuste recomendado detectado:</span>
                    <button
                      onClick={() => handleDirectCancelAdjustment(msg.actionBlock.containerId)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded border border-emerald-400 flex items-center gap-1 cursor-pointer transition-all shadow"
                    >
                      <Zap className="w-3 h-3" /> EJECUTAR AJUSTE PARA {msg.actionBlock.containerId}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isAsking && (
              <div className="p-2 rounded bg-purple-950/40 border border-purple-800 text-purple-300 text-xs animate-pulse flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Analizando datos precargados del buque y reglas de estiba...</span>
              </div>
            )}
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="px-2 py-1.5 bg-[#070D18] border-t border-slate-800/80 flex flex-wrap gap-1 text-[9px]">
            <button
              onClick={() => handleSendPrompt("Dame un resumen de la estiba activa y totales por tipo de carga.")}
              className="bg-slate-900 hover:bg-purple-950 text-slate-300 hover:text-purple-300 border border-slate-700 hover:border-purple-600 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              📊 Resumen Operacional
            </button>
            <button
              onClick={() => {
                const sampleId = filteredContainers[0]?.id || 'ABCU1234567';
                handleSendPrompt(`Cancela el contenedor ${sampleId} e indica cómo aplica la regla de proa y cama de 20'.`);
              }}
              className="bg-slate-900 hover:bg-amber-950 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-600 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              ❌ Probar Ajuste Cancelación
            </button>
            <button
              onClick={() => handleSendPrompt("Verifica si existe alguna violación de 20' sobre 40' o cama incompleta de 20' en el buque.")}
              className="bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-600 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              ⚖ Verificar Reglas 20'/40'
            </button>
          </div>

          {/* Chat Input */}
          <div className="p-2 bg-[#0A121E] border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
              placeholder="Pregunta sobre datos precargados, o escribe 'Cancela XXX'..."
              className="flex-1 bg-[#030712] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
            />
            <button
              onClick={() => handleSendPrompt()}
              disabled={isAsking}
              className="bg-purple-700 hover:bg-purple-600 text-white p-1.5 rounded cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
