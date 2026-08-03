import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, RotateCcw, Sparkles, Layers, ShieldAlert, CheckCircle2, ArrowRightLeft, Ship } from 'lucide-react';

export interface InspectionContainer {
  id: string;
  code: string;
  destination: string;
  status: 'import' | 'restow_block' | 'cancelled' | 'ai_adjusted';
  bay: number;
  row: number;
  tier: number;
  details: string;
}

interface Poseidon3DCanvasProps {
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

export const Poseidon3DCanvas: React.FC<Poseidon3DCanvasProps> = ({
  isPlaying,
  simSpeed,
  onLog,
  onStatsUpdate
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraPreset, setCameraPreset] = useState<'sailing' | 'bay_scan' | 'restow_focus' | 'ai_plan'>('sailing');
  const [selectedBox, setSelectedBox] = useState<InspectionContainer | null>(null);

  // Sample real-world inspection manifest dataset
  const inspectionManifest: InspectionContainer[] = [
    { id: '1', code: 'MAEU-8810', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 1, row: 1, tier: 1, details: 'Importación Directa. Descarga en Turno 01.' },
    { id: '2', code: 'HLAG-9921', destination: 'Rotterdam (Otro Puerto)', status: 'restow_block', bay: 1, row: 1, tier: 2, details: '⚠️ RESTIBA CRÍTICA: Contenedor para Rotterdam tapona la descarga de MAEU-8810.' },
    { id: '3', code: 'CMAU-4011', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 1, row: 2, tier: 1, details: 'Importación Directa. Descarga Prioritaria.' },
    { id: '4', code: 'MSC-3310', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 2, row: 1, tier: 1, details: 'Importación Directa. Reefer Conectado.' },
    { id: '5', code: 'ONE-1102', destination: 'Cancelado en Patio', status: 'cancelled', bay: 2, row: 1, tier: 2, details: '❌ CANCELADO: Unidad no ingresó a terminal. Agente IA lo excluyó del plan.' },
    { id: '6', code: 'EVER-5590', destination: 'Hamburg (Otro Puerto)', status: 'restow_block', bay: 2, row: 2, tier: 2, details: '⚠️ OBSTRUCCIÓN DE CARGA: Obstruye zona de estiba asignada.' },
    { id: '7', code: 'ZIMU-7712', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'ai_adjusted', bay: 3, row: 1, tier: 1, details: '✨ REAJUSTADO POR AGENTE IA: Reubicado para optimizar balance y eliminar re-movimiento.' },
    { id: '8', code: 'COSC-8801', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'import', bay: 3, row: 2, tier: 1, details: 'Importación Directa. Carga General.' },
    { id: '9', code: 'HAMB-2200', destination: 'Discrepancia Peso (+4.2t)', status: 'cancelled', bay: 3, row: 2, tier: 2, details: '❌ DISCREPANCIA ALERTA: Declaró 12t, peso real 16.2t. Aislado por seguridad.' },
    { id: '10', code: 'APLU-6630', destination: 'Puerto Actual (Lázaro Cárdenas)', status: 'ai_adjusted', bay: 1, row: 2, tier: 2, details: '✨ PLAN OPTIMIZADO IA: Secuencia libre de bloqueo lograda automáticamente.' },
  ];

  // Camera Orbit state ref
  const orbitRef = useRef({
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    rotX: 0.35,
    rotY: -0.65,
    distance: 44
  });

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Dynamic animation object refs
  const shipGroupRef = useRef<THREE.Group | null>(null);
  const scanLaserRef = useRef<THREE.Mesh | null>(null);
  const oceanMeshRef = useRef<THREE.Mesh | null>(null);
  const containerMeshesRef = useRef<THREE.Mesh[]>([]);

  // Animation state
  const animRef = useRef({
    scanZ: -25,
    scanDir: 1,
    time: 0,
    shipZ: 0
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 380;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040d1a);
    scene.fog = new THREE.FogExp2(0x040d1a, 0.01);
    sceneRef.current = scene;

    // 2. CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    
    const updateCamPos = () => {
      const { rotX, rotY, distance } = orbitRef.current;
      camera.position.x = distance * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = distance * Math.sin(rotX) + 8;
      camera.position.z = distance * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 5, 0);
    };
    updateCamPos();

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    sunLight.position.set(30, 45, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const cyanBeam = new THREE.PointLight(0x00e5ff, 2.5, 40);
    cyanBeam.position.set(0, 15, 0);
    scene.add(cyanBeam);

    // 5. OCEAN WATER
    const waterGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x022038,
      emissive: 0x01111e,
      specular: 0x38bdf8,
      shininess: 80,
      transparent: true,
      opacity: 0.9,
      flatShading: true
    });
    const ocean = new THREE.Mesh(waterGeo, waterMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.2;
    ocean.receiveShadow = true;
    scene.add(ocean);
    oceanMeshRef.current = ocean;

    // 6. SAILING CONTAINER SHIP HULL
    const shipGroup = new THREE.Group();
    shipGroup.position.set(0, 0, 0);
    shipGroupRef.current = shipGroup;

    // Underwater Red Hull
    const redHullGeo = new THREE.BoxGeometry(22, 4, 66);
    const redHullMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const redHull = new THREE.Mesh(redHullGeo, redHullMat);
    redHull.position.set(0, 2, 0);
    redHull.castShadow = true;
    shipGroup.add(redHull);

    // Upper Dark Navy Deck Hull
    const deckHullGeo = new THREE.BoxGeometry(22.6, 5, 64);
    const deckHullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 });
    const deckHull = new THREE.Mesh(deckHullGeo, deckHullMat);
    deckHull.position.set(0, 6.5, 0);
    deckHull.castShadow = true;
    deckHull.receiveShadow = true;
    shipGroup.add(deckHull);

    // Pointed Bow (Front Tip)
    const bowGeo = new THREE.ConeGeometry(11.3, 16, 4);
    const bowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.z = Math.PI / 4;
    bow.position.set(0, 6.5, -40);
    bow.castShadow = true;
    shipGroup.add(bow);

    // Navigation Bridge Superstructure
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 13, 22);
    const bridgeGeo = new THREE.BoxGeometry(18, 10, 8);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.castShadow = true;
    bridgeGroup.add(bridge);

    // Glowing Radar / Windows
    const winGeo = new THREE.BoxGeometry(16.2, 2, 8.2);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, 3, 0);
    bridgeGroup.add(win);

    // Radar tower
    const towerGeo = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
    const towerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 7, 0);
    bridgeGroup.add(tower);

    shipGroup.add(bridgeGroup);

    // 7. RENDER 3D CONTAINERS & STATUSES IN BAYS
    const containerMeshes: THREE.Mesh[] = [];

    inspectionManifest.forEach((item) => {
      const boxGeo = new THREE.BoxGeometry(6, 2.6, 2.6);
      
      let mainColor = 0x0284c7; // Import = Blue
      let emissiveColor = 0x000000;

      if (item.status === 'restow_block') {
        mainColor = 0xf59e0b; // Amber / Orange
        emissiveColor = 0x78350f;
      } else if (item.status === 'cancelled') {
        mainColor = 0xef4444; // Red
        emissiveColor = 0x7f1d1d;
      } else if (item.status === 'ai_adjusted') {
        mainColor = 0x10b981; // Emerald / Green
        emissiveColor = 0x064e3b;
      }

      const boxMat = new THREE.MeshStandardMaterial({
        color: mainColor,
        emissive: emissiveColor,
        roughness: 0.3,
        metalness: 0.2
      });

      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position in ship bay grid
      const posX = -5 + (item.row - 1) * 6.5;
      const posY = 10 + (item.tier - 1) * 2.8;
      const posZ = -18 + (item.bay - 1) * 14;

      mesh.position.set(posX, posY, posZ);

      // Wireframe frame highlight
      const wireGeo = new THREE.BoxGeometry(6.1, 2.7, 2.7);
      const wireMat = new THREE.MeshBasicMaterial({
        color: item.status === 'restow_block' ? 0xfba120 : (item.status === 'cancelled' ? 0xff4d4d : 0x00e5ff),
        wireframe: true
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      mesh.add(wire);

      shipGroup.add(mesh);
      containerMeshes.push(mesh);
    });

    containerMeshesRef.current = containerMeshes;

    // 8. HOLOGRAPHIC AI SCANNING LASER PLANE
    const laserGeo = new THREE.PlaneGeometry(24, 18);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const scanLaser = new THREE.Mesh(laserGeo, laserMat);
    scanLaser.rotation.x = Math.PI / 2;
    scanLaser.position.set(0, 12, -20);
    shipGroup.add(scanLaser);
    scanLaserRef.current = scanLaser;

    scene.add(shipGroup);

    // Initial stats report
    const stats = {
      totalImport: inspectionManifest.filter(m => m.status === 'import').length * 45,
      restowBlocks: inspectionManifest.filter(m => m.status === 'restow_block').length,
      cancellations: inspectionManifest.filter(m => m.status === 'cancelled').length,
      aiResolved: inspectionManifest.filter(m => m.status === 'ai_adjusted').length * 10 + 100
    };
    onStatsUpdate(stats);

    // 9. ANIMATION LOOP
    let requestID: number;
    let clock = new THREE.Clock();

    const animate = () => {
      requestID = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle vessel sailing motion on sea
      if (shipGroupRef.current) {
        shipGroupRef.current.position.y = Math.sin(elapsed * 1.5) * 0.3;
        shipGroupRef.current.rotation.z = Math.sin(elapsed * 1.2) * 0.015; // Pitching
        shipGroupRef.current.rotation.x = Math.cos(elapsed * 1.0) * 0.01;  // Rolling
      }

      // Laser Scanner Movement
      if (scanLaserRef.current && isPlaying) {
        animRef.current.scanZ += delta * 12 * animRef.current.scanDir * simSpeed;
        if (animRef.current.scanZ > 15) {
          animRef.current.scanZ = 15;
          animRef.current.scanDir = -1;
          onLog('🔍 POSEIDON IA: Escaneo BAPLIE completado en Bahía 03. Verificando bloqueos de otros puertos.');
        } else if (animRef.current.scanZ < -25) {
          animRef.current.scanZ = -25;
          animRef.current.scanDir = 1;
          onLog('🤖 AGENTE IA: Ajuste dinámico de estiba finalizado. 100% de discrepancias resueltas.');
        }
        scanLaserRef.current.position.z = animRef.current.scanZ;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. MOUSE INTERACTION & ORBIT CONTROLS
    const handleMouseDown = (e: MouseEvent) => {
      orbitRef.current.isDragging = true;
      orbitRef.current.prevMouseX = e.clientX;
      orbitRef.current.prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!orbitRef.current.isDragging) return;
      const dx = e.clientX - orbitRef.current.prevMouseX;
      const dy = e.clientY - orbitRef.current.prevMouseY;

      orbitRef.current.rotY -= dx * 0.008;
      orbitRef.current.rotX = Math.max(0.05, Math.min(Math.PI / 2.2, orbitRef.current.rotX + dy * 0.008));

      orbitRef.current.prevMouseX = e.clientX;
      orbitRef.current.prevMouseY = e.clientY;

      updateCamPos();
    };

    const handleMouseUp = () => {
      orbitRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.distance = Math.max(15, Math.min(80, orbitRef.current.distance + e.deltaY * 0.03));
      updateCamPos();
    };

    const el = mountRef.current;
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('wheel', handleWheel, { passive: false });

    // Resize listener
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 380;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(requestID);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [isPlaying, simSpeed]);

  // Set camera preset angles
  const applyPreset = (preset: 'sailing' | 'bay_scan' | 'restow_focus' | 'ai_plan') => {
    setCameraPreset(preset);
    if (preset === 'sailing') {
      orbitRef.current.rotX = 0.35;
      orbitRef.current.rotY = -0.65;
      orbitRef.current.distance = 46;
      onLog('🌊 VISTA NAVEGACIÓN: Buque aproximándose a puerto con manifiesto BAPLIE cargado.');
    } else if (preset === 'bay_scan') {
      orbitRef.current.rotX = 0.2;
      orbitRef.current.rotY = -Math.PI / 2;
      orbitRef.current.distance = 32;
      onLog('🔍 VISTA INSPECCIÓN BAPLIE: Verificando asignación por bahía y tipo de contenedor.');
    } else if (preset === 'restow_focus') {
      orbitRef.current.rotX = 0.5;
      orbitRef.current.rotY = -0.2;
      orbitRef.current.distance = 26;
      onLog('⚠️ DETECCIÓN DE RESTIBAS: Identificando contenedores de Rotterdam que bloquean la descarga.');
    } else if (preset === 'ai_plan') {
      orbitRef.current.rotX = 0.6;
      orbitRef.current.rotY = -1.8;
      orbitRef.current.distance = 28;
      onLog('✨ AGENTE IA POSEIDON: Re-secuenciación automática activa. Plan de estiba reajustado sin demoras.');
    }

    if (cameraRef.current) {
      const { rotX, rotY, distance } = orbitRef.current;
      cameraRef.current.position.x = distance * Math.sin(rotY) * Math.cos(rotX);
      cameraRef.current.position.y = distance * Math.sin(rotX) + 8;
      cameraRef.current.position.z = distance * Math.cos(rotY) * Math.cos(rotX);
      cameraRef.current.lookAt(0, 5, 0);
    }
  };

  return (
    <div className="relative w-full h-[320px] md:h-[390px] bg-[#040D1A] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl group select-none">
      
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Drag instruction overlay badge */}
      <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur border border-cyan-500/30 px-3 py-1.5 rounded-xl text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow pointer-events-none">
        <Eye className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>Arrastra para rotar 3D • Rueda para Zoom • Buque en Navegación</span>
      </div>

      {/* Camera Presets Selector */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur p-1 border border-slate-700 rounded-xl shadow">
        <button
          onClick={() => applyPreset('sailing')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            cameraPreset === 'sailing' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
          title="Vista General de Navegación"
        >
          🚢 Navegación
        </button>
        <button
          onClick={() => applyPreset('bay_scan')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            cameraPreset === 'bay_scan' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
          title="Verificación BAPLIE por Bahía"
        >
          📥 Importación
        </button>
        <button
          onClick={() => applyPreset('restow_focus')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            cameraPreset === 'restow_focus' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
          title="Detección de Restibas/Obstrucciones"
        >
          ⚠️ Restibas
        </button>
        <button
          onClick={() => applyPreset('ai_plan')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            cameraPreset === 'ai_plan' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
          title="Plan Reajustado por Agente IA"
        >
          🤖 Agente IA
        </button>
      </div>

      {/* 3D Color Legend Overlay */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 bg-slate-950/85 backdrop-blur p-2 border border-slate-800 rounded-xl text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
          <span>Importación Total</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-300">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block animate-pulse" />
          <span>Restiba (Bloqueo)</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-300">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
          <span>Cancelado / Discrepancia</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-300">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
          <span>Ajuste Agente IA</span>
        </div>
      </div>

      {/* Watermark Logo */}
      <div className="absolute bottom-3 right-3 text-[10px] font-mono font-black text-cyan-400/40 tracking-widest pointer-events-none">
        POSEIDON IA • VERIFICACIÓN BAPLIE
      </div>

    </div>
  );
};
