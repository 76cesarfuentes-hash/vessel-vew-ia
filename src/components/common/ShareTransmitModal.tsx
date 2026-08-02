import React, { useState, useEffect } from 'react';
import appLogo from '../../assets/logo.jpg';
import {
  X,
  Tv,
  Share2,
  Copy,
  Check,
  Cast,
  Maximize2,
  QrCode,
  Radio,
  Monitor,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Play,
  Square
} from 'lucide-react';

interface ShareTransmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselName?: string;
  totalContainers?: number;
}

// Global module instance to persist active screen stream across modal toggles, view changes, and re-renders
let globalActiveScreenStream: MediaStream | null = null;

export const ShareTransmitModal: React.FC<ShareTransmitModalProps> = ({
  isOpen,
  onClose,
  vesselName = 'MAERSK HOUSTON',
  totalContainers = 0
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(
    !!(globalActiveScreenStream && globalActiveScreenStream.getVideoTracks().some(t => t.readyState === 'live'))
  );
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(globalActiveScreenStream);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Synchronize stream state with global stream instance on mount or open
  useEffect(() => {
    if (globalActiveScreenStream && globalActiveScreenStream.getVideoTracks().some(t => t.readyState === 'live')) {
      setIsScreenSharing(true);
      setMediaStream(globalActiveScreenStream);
    } else {
      setIsScreenSharing(false);
      setMediaStream(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setShareStatus('✓ Enlace copiado al portapapeles');
      setTimeout(() => {
        setCopied(false);
        setShareStatus(null);
      }, 3000);
    } catch {
      setShareStatus('✖ Error al copiar enlace');
    }
  };

  // Handle Native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Plan de Estiba - ${vesselName}`,
          text: `Plan de Estiba en Tiempo Real (${vesselName} - ${totalContainers} contenedores)`,
          url: currentUrl
        });
        setShareStatus('✓ Compartido exitosamente');
      } catch (err) {
        console.log('User cancelled share or share failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Handle Web Screen Transmit / Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing || globalActiveScreenStream) {
      // Explicitly stop current transmission on user request
      if (globalActiveScreenStream) {
        globalActiveScreenStream.getTracks().forEach(track => track.stop());
        globalActiveScreenStream = null;
      }
      if (mediaStream && mediaStream !== globalActiveScreenStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setMediaStream(null);
      setIsScreenSharing(false);
      setShareStatus('Transmisión finalizada.');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setShareStatus('⚠️ La API de transmisión no está disponible en este navegador.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      globalActiveScreenStream = stream;
      setMediaStream(stream);
      setIsScreenSharing(true);
      setShareStatus('🔴 TRANSMITIENDO EN VIVO A PANTALLA / MONITOR EXTERNO');

      // Detect when user explicitly stops sharing via browser's native stop bar
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          if (globalActiveScreenStream === stream) {
            globalActiveScreenStream = null;
            setIsScreenSharing(false);
            setMediaStream(null);
            setShareStatus('Transmisión detenida desde el navegador.');
          }
        };
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.message?.includes('disallowed by permissions policy')) {
        setShareStatus('ℹ️ Captura de pantalla restringida en iframe. Abre la app en una nueva pestaña o usa "TV FULLSCREEN".');
      } else {
        setShareStatus('Transmisión cancelada o no autorizada.');
      }
    }
  };

  // Handle Fullscreen Control Room TV Mode
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setShareStatus('Modo Pantalla Completa / TV Control Room Activo');
      }).catch(_err => {
        setShareStatus('ℹ️ Para pantalla completa en iframe, abre la app en una nueva pestaña.');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setShareStatus('Saliste de Pantalla Completa');
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-[#0B1726] border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(0,229,255,0.25)] max-w-lg w-full overflow-hidden text-slate-100 font-mono">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D2238] to-[#0A1A2B] border-b border-cyan-500/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={appLogo}
              alt="Logo TOS"
              className="w-10 h-10 rounded-xl object-cover border border-cyan-400/60 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-wider flex items-center gap-2 uppercase">
                TRANSMITIR A PANTALLA & COMPARTIR
              </h3>
              <p className="text-[10px] text-cyan-400">
                {vesselName} · Control Room TV & Wireless Display
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {shareStatus && (
          <div className="bg-cyan-950/90 border-b border-cyan-500/80 px-4 py-2 text-cyan-200 text-xs flex items-center justify-between">
            <span className="font-bold">{shareStatus}</span>
            <button onClick={() => setShareStatus(null)} className="text-cyan-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* 1. TRANSMIT TO EXTERNAL DISPLAY / TV */}
          <div className="bg-[#050D18] border border-cyan-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2 uppercase">
                <Cast className="w-4 h-4 text-cyan-400" />
                TRANSMISIÓN EN VIVO A MONITOR / TV DE CONTROL
              </span>
              {isScreenSharing && (
                <span className="bg-red-950 text-red-400 border border-red-500/80 text-[10px] px-2 py-0.5 rounded font-black flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3 h-3" /> EN VIVO
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Transmite directamente el plano de estiba en tiempo real a monitores de la Torre de Control, pantallas HDMI o proyectores de grúa de puerto.
            </p>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={handleToggleScreenShare}
                className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                  isScreenSharing
                    ? 'bg-red-600 hover:bg-red-500 text-white border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 border border-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.3)]'
                }`}
              >
                {isScreenSharing ? (
                  <span className="flex items-center gap-2">
                    <Square className="w-4 h-4 fill-white" />
                    DETENER TRANSMISIÓN
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Cast className="w-4 h-4" />
                    INICIAR TRANSMISIÓN PANTALLA
                  </span>
                )}
              </button>

              <button
                onClick={handleToggleFullscreen}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Modo Pantalla Completa para TV / Proyector"
              >
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span>TV FULLSCREEN</span>
              </button>
            </div>
          </div>

          {/* 2. SHARE ACCESS LINK & MOBILE QR */}
          <div className="bg-[#050D18] border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-2 uppercase">
              <Share2 className="w-4 h-4 text-amber-400" />
              COMPARTIR ENLACE DE ACCESO EN TIEMPO REAL
            </span>

            {/* Direct Link Input Box */}
            <div className="flex items-center gap-2 bg-[#081524] border border-slate-700 rounded-lg p-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="bg-transparent text-xs text-slate-300 flex-1 outline-none font-mono truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'COPIADO' : 'COPIAR'}
              </button>
            </div>

            {/* Native Share Trigger */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleNativeShare}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                COMPARTIR VÍA DISPOSITIVO / WHATSAPP / TEAMS
              </button>
            </div>
          </div>

          {/* 3. QR CODE FOR MOBILE / TABLET DISPLAY */}
          <div className="bg-[#050D18] border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-lg p-1.5 shrink-0 flex items-center justify-center border border-slate-300 shadow">
              {/* SVG Micro QR Code visual mockup */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950 fill-current">
                <rect x="0" y="0" width="30" height="30" />
                <rect x="5" y="5" width="20" height="20" fill="white" />
                <rect x="10" y="10" width="10" height="10" />

                <rect x="70" y="0" width="30" height="30" />
                <rect x="75" y="5" width="20" height="20" fill="white" />
                <rect x="80" y="10" width="10" height="10" />

                <rect x="0" y="70" width="30" height="30" />
                <rect x="5" y="75" width="20" height="20" fill="white" />
                <rect x="10" y="80" width="10" height="10" />

                <rect x="40" y="10" width="10" height="10" />
                <rect x="50" y="25" width="10" height="15" />
                <rect x="35" y="45" width="15" height="10" />
                <rect x="60" y="45" width="10" height="20" />
                <rect x="40" y="70" width="15" height="15" />
                <rect x="70" y="70" width="20" height="10" />
                <rect x="80" y="85" width="10" height="10" />
              </svg>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase">
                <Smartphone className="w-4 h-4 text-emerald-400" /> CÓDIGO QR PARA ESCANEAR
              </span>
              <p className="text-[11px] text-slate-300 leading-tight">
                Escanea este código con la cámara de tu tableta o smartphone para visualizar la estiba en el muelle de descarga.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#050D18] border-t border-slate-800 p-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            CONEXIÓN SEGURA REAL-TIME TOS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer transition-all"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
};
