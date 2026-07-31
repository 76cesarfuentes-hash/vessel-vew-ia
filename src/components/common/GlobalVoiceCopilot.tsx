import React, { useState, useEffect, useRef } from 'react';
import { useStowageStore } from '../../core/stores/useStowageStore';
import { askStowageCopilot } from '../../core/services/geminiCopilot';
import { AdjustmentResult } from '../../core/business/adjustmentEngine';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  X,
  Send,
  Zap,
  Sparkles,
  Maximize2,
  Minimize2,
  Radio,
  RotateCcw
} from 'lucide-react';

export const GlobalVoiceCopilot: React.FC = () => {
  const { filteredContainers, activeTerminalKey, podSequence, executeAdjustment } = useStowageStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [promptInput, setPromptInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [transcript, setTranscript] = useState('');

  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant' | 'system';
    text: string;
    actionBlock?: any;
    timestamp: string;
  }>>([
    {
      role: 'system',
      text: '🎙 AGENTE DE VOZ TOS ESPECIALIZADO LISTO.\n• Hable o escriba para consultar el buque, ejecutar reportes o realizar ajustes de estiba.\n• Cumple estrictamente las reglas marítimas (No 20\' s/ 40\', Sustitución en Proa, Cama de 20\').',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        setPromptInput(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If transcript exists, automatically submit voice command
        if (transcript.trim()) {
          const textSubmitted = transcript;
          setTranscript('');
          handleSendPrompt(textSubmitted);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [transcript, filteredContainers]);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  // Text-To-Speech function
  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop prior speech
    // Clean markdown code blocks or json for speech
    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*#_`]/g, '')
      .substring(0, 300); // Limit speech length for clarity

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('La búsqueda por voz (SpeechRecognition) no está soportada en este navegador. Puedes escribir directamente.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel();
      setTranscript('');
      setPromptInput('');
      recognitionRef.current.start();
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const q = textToSend || promptInput;
    if (!q.trim() || isAsking) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { role: 'user', text: q, timestamp: timeStr }]);
    if (!textToSend) setPromptInput('');
    setIsAsking(true);

    // VOICE/TEXT ADJUSTMENT DETECTION: e.g. "cancela el contenedor XYZ"
    const cancelMatch = q.match(/cancela(?:r)?\s+(?:el\s+contenedor\s+)?([A-Z0-9]{4,11})/i);
    if (cancelMatch && cancelMatch[1]) {
      const targetId = cancelMatch[1].toUpperCase();
      const res: AdjustmentResult = executeAdjustment({
        type: 'CANCEL_CONTAINER',
        containerId: targetId
      });

      const replyText = res.success
        ? `🤖 AJUSTE POR COMANDO DE VOZ EJECUTADO:\n${res.actionSummary}\n\nREGLAS CUMPLIDAS:\n1. 🚫 Jamás 20' s/ 40': ${res.ruleChecks.no20Over40.message}\n2. ⚓ Sustituto Proa: ${res.ruleChecks.substituteFromFore.message}\n3. ⚖ Cama de 20': ${res.ruleChecks.bed20FtRule.message}`
        : `⚠ No se pudo ejecutar la cancelación del contenedor ${targetId}: ${res.actionSummary}`;

      setChatMessages(prev => [...prev, { role: 'assistant', text: replyText, timestamp: timeStr }]);
      setIsAsking(false);
      speakText(replyText);
      return;
    }

    // GENERAL AGENT QUERY
    const answer = await askStowageCopilot(q, filteredContainers, activeTerminalKey, podSequence);

    let parsedActionBlock: any = null;
    const jsonMatch = answer.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedActionBlock = JSON.parse(jsonMatch[1]);
      } catch (e) {
        // ignore
      }
    }

    setChatMessages(prev => [...prev, {
      role: 'assistant',
      text: answer,
      actionBlock: parsedActionBlock,
      timestamp: timeStr
    }]);

    setIsAsking(false);
    speakText(answer);
  };

  const handleExecuteActionBlock = (containerId: string) => {
    if (!containerId) return;
    const res = executeAdjustment({
      type: 'CANCEL_CONTAINER',
      containerId
    });

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logText = res.success
      ? `✅ AJUSTE EJECUTADO PARA ${containerId}:\n${res.actionSummary}`
      : `❌ FALLO EN AJUSTE: ${res.actionSummary}`;

    setChatMessages(prev => [...prev, { role: 'assistant', text: logText, timestamp: timeStr }]);
    speakText(logText);
  };

  return (
    <>
      {/* ── FLOATING LAUNCHER BUTTON (Available globally on all screens) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-16 md:bottom-6 right-4 z-50 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-full p-3.5 shadow-[0_0_25px_rgba(168,85,247,0.6)] border border-purple-300/40 transition-all transform hover:scale-110 flex items-center gap-2 group cursor-pointer"
          title="Hablar con Agente Especializado (Comando de Voz & Asistente AI)"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[11px] font-extrabold uppercase tracking-wider leading-none">AGENTE DE VOZ</span>
            <span className="text-[9px] text-cyan-200 font-mono leading-none mt-0.5">Especialista TOS AI</span>
          </div>
        </button>
      )}

      {/* ── EXPANDABLE VOICE COPILOT MODAL / DRAWER ── */}
      {isOpen && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? 'bottom-16 md:bottom-4 right-4 w-72 h-14 bg-[#070D18] border border-purple-500/80 rounded-xl shadow-2xl overflow-hidden flex items-center justify-between px-3'
            : 'bottom-16 md:bottom-4 right-2 sm:right-4 w-[calc(100vw-1rem)] sm:w-[420px] h-[520px] max-h-[85vh] bg-[#070D18]/95 backdrop-blur-xl border border-purple-500/70 rounded-2xl shadow-[0_0_40px_rgba(147,51,234,0.35)] flex flex-col overflow-hidden animate-fadeIn'
        }`}>
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 px-3.5 py-2.5 border-b border-purple-800/60 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-purple-900/80 border border-purple-400/50 rounded-lg text-purple-200">
                <Bot className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <h3 className="font-mono font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 truncate">
                  AGENTE TOS DE VOZ
                  <span className="text-[8px] bg-purple-900 text-purple-200 border border-purple-500/50 px-1 rounded font-mono font-normal">
                    EXCLUSIVO
                  </span>
                </h3>
                <p className="text-[9px] text-purple-300 font-mono truncate">
                  {isListening ? '🎙 Escuchando voz...' : isSpeaking ? '🔊 Hablando...' : 'Comando por Voz & Texto'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle Audio Speech Synthesis */}
              <button
                onClick={() => {
                  setSpeechEnabled(!speechEnabled);
                  if (isSpeaking) window.speechSynthesis.cancel();
                }}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  speechEnabled ? 'text-cyan-400 hover:bg-cyan-950/60' : 'text-slate-500 hover:bg-slate-800'
                }`}
                title={speechEnabled ? 'Voz activada (Escuchar respuestas)' : 'Voz silenciada'}
              >
                {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Minimize Modal */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all cursor-pointer"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              {/* Close Drawer */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (isSpeaking) window.speechSynthesis.cancel();
                }}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-all cursor-pointer"
                title="Cerrar Copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Minimized Content */}
          {isMinimized ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-mono text-purple-200 truncate">Agente TOS de Voz</span>
              <button
                onClick={toggleMic}
                className={`p-2 rounded-full cursor-pointer ${
                  isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-purple-600 text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Chat Message Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs text-slate-200">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl transition-all shadow-md ${
                      msg.role === 'user'
                        ? 'bg-purple-950/70 border border-purple-700/60 text-purple-100 ml-6 text-right'
                        : msg.role === 'assistant'
                        ? 'bg-[#0F192C] border border-slate-700/80 text-slate-200 mr-4'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-400 text-center text-[10px]'
                    }`}
                  >
                    <div className="font-bold text-[9px] text-purple-400/90 mb-1 flex items-center justify-between">
                      <span>{msg.role === 'user' ? '👤 PLANNER (VOZ / TEXTO)' : msg.role === 'assistant' ? '🤖 AGENTE TOS ESPECIALIZADO' : 'SISTEMA'}</span>
                      <span className="text-[8px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                    {/* Action Execution Button */}
                    {msg.actionBlock && msg.actionBlock.action === 'EXECUTE_ADJUSTMENT' && msg.actionBlock.containerId && (
                      <div className="mt-2 pt-2 border-t border-purple-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-purple-300 font-bold">Ajuste recomendado:</span>
                        <button
                          onClick={() => handleExecuteActionBlock(msg.actionBlock.containerId)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded border border-emerald-400 flex items-center gap-1 cursor-pointer transition-all shadow"
                        >
                          <Zap className="w-3 h-3" /> EJECUTAR AJUSTE PARA {msg.actionBlock.containerId}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {isAsking && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800 text-purple-300 text-xs animate-pulse flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Analizando estiba y evaluando reglas marítimas...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Voice Suggestion Chips */}
              <div className="px-3 py-1.5 bg-[#050B14] border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[9px] font-mono">
                <button
                  onClick={() => handleSendPrompt("Dame un resumen operacional del buque.")}
                  className="bg-slate-900 hover:bg-purple-950 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-600 px-2 py-0.5 rounded-full flex-shrink-0 cursor-pointer"
                >
                  🎙 "Resumen operacional"
                </button>
                <button
                  onClick={() => {
                    const sampleId = filteredContainers[0]?.id || 'MSKU1234567';
                    handleSendPrompt(`Cancela el contenedor ${sampleId}`);
                  }}
                  className="bg-slate-900 hover:bg-amber-950 text-slate-300 hover:text-amber-200 border border-slate-700 hover:border-amber-600 px-2 py-0.5 rounded-full flex-shrink-0 cursor-pointer"
                >
                  🎙 "Cancela el contenedor..."
                </button>
                <button
                  onClick={() => handleSendPrompt("¿Existe alguna violación de 20 sobre 40 en la estiba?")}
                  className="bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-600 px-2 py-0.5 rounded-full flex-shrink-0 cursor-pointer"
                >
                  🎙 "Verifica 20 s/ 40"
                </button>
              </div>

              {/* Input Area with Microphone Voice Control */}
              <div className="p-2.5 bg-[#08101E] border-t border-purple-900/60 flex items-center gap-2">
                {/* Voice Record Button */}
                <button
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl border font-bold transition-all flex items-center justify-center cursor-pointer shadow-md ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                      : 'bg-purple-700 hover:bg-purple-600 border-purple-400 text-white'
                  }`}
                  title={isListening ? 'Detener escucha de voz' : 'Hablar por micrófono (Comando de Voz)'}
                >
                  {isListening ? <Radio className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Text input */}
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                  placeholder={isListening ? 'Escuchando tu voz...' : 'Hable o escriba comando de estiba...'}
                  className="flex-1 bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-purple-500 font-mono placeholder-slate-500"
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSendPrompt()}
                  disabled={isAsking || !promptInput.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2 rounded-xl transition-all cursor-pointer"
                  title="Enviar comando"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
