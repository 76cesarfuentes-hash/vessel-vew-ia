import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { applySecurityHeaders, requireAuth } from './security/middleware.js';
import { securityRouter } from './security/routes.js';

const app = express();

app.use(express.json({ limit: '20mb' }));

// Apply OWASP Security Headers
app.use(applySecurityHeaders);

// Mount Security & Authentication API Routes
app.use('/api', securityRouter);

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Enterprise Terminal Planning Platform' });
});

// Server-side Stowage Copilot API endpoint using Gemini (Protected)
app.post('/api/copilot', requireAuth, async (req, res) => {
  try {
    const { prompt, containers, activeTerminal, podSequence } = req.body;

    if (!prompt || !containers || !Array.isArray(containers)) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (prompt, containers).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const summaryStats = {
      totalContainers: containers.length,
      dgCount: containers.filter((c: any) => c.cargoType === 'DG' || c.imoClass !== 'Dato no disponible').length,
      reeferCount: containers.filter((c: any) => c.cargoType === 'RF').length,
      emptyCount: containers.filter((c: any) => c.status === 'EMPTY' || c.cargoType === 'MT').length,
      oogCount: containers.filter((c: any) => c.cargoType === 'OS' || c.hasDim).length,
      pods: Array.from(new Set(containers.map((c: any) => c.pod))).filter(p => p !== 'Dato no disponible'),
      pols: Array.from(new Set(containers.map((c: any) => c.pol))).filter(p => p !== 'Dato no disponible'),
      operators: Array.from(new Set(containers.map((c: any) => c.operator))).filter(o => o !== 'Dato no disponible')
    };

    const systemContext = `
Eres Next Port IA, el motor de inteligencia artificial especializado en logística marítima, operaciones de terminal portuaria y planificación de estiba (TOS) integrado en la plataforma.

### ROL Y PERSONALIDAD
- Actúas como un Planner de Terminal Senior de nivel experto.
- Tu comunicación es concisa, directa, profesional y orientada a la toma de decisiones operativas en tiempo real.
- Te expresas en español latino.

### REGLAS DE NEGOCIO Y VALIDACIÓN MARÍTIMA
Aplica rigurosamente las siguientes reglas al analizar o manipular el plano de estiba (archivos BAPLIE/MOVINS):
1. Estructura Físico-Mecánica:
   - PROHIBIDO estrictamente ubicar contenedores de 20 pies sobre contenedores de 40 pies ("No 20' s/ 40'").
   - Verificar la integridad estructural de la cama de 20' (20' Fore / 20' Aft) bajo unidades de 40'.
   - Validar los límites de peso por celda y por nivel (Tiers) para evitar sobrecargas o desequilibrios de estabilidad en la bahía.

2. Unidades Especiales y Peligrosas:
   - Validar puntos de conexión eléctrica activa para unidades Refrigeradas (Reefers).
   - Aplicar reglas de segregación IMDG / IMO para cargas peligrosas (DG).

3. Eficiencia Operativa:
   - Optimizar las secuencias de descarga según el Puerto de Destino (POD) para minimizar movimientos en falso (restibas/overstowage).

### LLAMADA A FUNCIONES (FUNCTION CALLING)
Cuando el usuario te solicite realizar una acción gráfica, un reporte o un ajuste en la interfaz, NO te limites a responder con texto explicativo. Debes emitir una llamada a la función correspondiente en formato JSON dentro de tu respuesta para que la aplicación la ejecute de inmediato:
- \`{"functionCall": "generarMiniPlano", "arguments": {"bahiaId": "02"}}\` : Para renderizar la vista transversal de la bahía especificada.
- \`{"functionCall": "filtrarContenedores", "arguments": {"tipo": "DG" | "RF" | "MT" | "OOG" | "POD_CODE"}}\` : Para resaltar unidades Reefers, IMO/DG, Vacíos o por POD.
- \`{"functionCall": "ejecutarAuditoriaEstiba", "arguments": {}}\` : Para verificar violaciones de peso, unidades flotantes o errores de estiba en tiempo real.

### REGLA CRÍTICA - "NO HAY REGISTRO":
1. NUNCA inventes datos ficticios, ni contenedores, ni puertos, ni bahías, ni clases IMO, ni números UN que no estén en la base de datos precargada.
2. Si el usuario solicita buscar un contenedor (ej. "Buscar MSCU999999"), un puerto (ej. "Reefers en Tokio"), una bahía o una categoría que NO EXISTE en la información cargada de 'containers[]':
   DEBES RESPONDER OBLIGATORIAMENTE DE FORMA DESTACADA CON LA PALABRA EXPRESA:
   "No hay registro"
   Seguido de la explicación clara: "No hay registro de [lo solicitado] en los archivos EDI BAPLIE / MOVINS actualmente cargados en el sistema." Y lista los puertos o categorías que SÍ existen.

ESTADÍSTICAS DEL BUQUE ACTUAL EN TERMINAL ${activeTerminal || 'VER'}:
- Total Contenedores: ${summaryStats.totalContainers}
- Unidades DG (IMO): ${summaryStats.dgCount}
- Unidades Reefer (RF): ${summaryStats.reeferCount}
- Unidades Vacías (MT): ${summaryStats.emptyCount}
- Unidades Sobredimensión (OOG): ${summaryStats.oogCount}
- Puertos Descarga (PODs): ${summaryStats.pods.join(', ')}
- Puertos Carga (POLs): ${summaryStats.pols.join(', ')}
- Líneas Operadoras: ${summaryStats.operators.join(', ')}

Muestra de contenedores activos:
${JSON.stringify(containers.slice(0, 35), null, 2)}
    `.trim();

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            { role: 'user', parts: [{ text: `${systemContext}\n\nPREGUNTA DEL PLANNER:\n${prompt}` }] }
          ]
        });

        const replyText = response.text || 'No se pudo obtener respuesta del modelo AI.';
        return res.json({ response: replyText });
      } catch (geminiError: any) {
        console.warn('Gemini API call warning, falling back to rule-based analysis:', geminiError?.message);
      }
    }

    // Rule-based fallback if API key is not present or calls fail
    const lower = prompt.toLowerCase();
    let fallbackText = `Análisis de Estiba para Terminal ${activeTerminal || 'VER'}:\n`;

    if (lower.includes('dg') || lower.includes('imo') || lower.includes('peligros')) {
      const dgs = containers.filter((c: any) => c.cargoType === 'DG' || (c.imoClass && c.imoClass !== 'Dato no disponible'));
      fallbackText += `Se detectaron ${dgs.length} unidades DG. Muestra:\n` +
        dgs.slice(0, 10).map((c: any) => `• ${c.id} (IMO ${c.imoClass}) en pos. ${c.position} -> POD: ${c.pod}`).join('\n');
    } else if (lower.includes('reefer') || lower.includes('rf') || lower.includes('frio')) {
      const rfs = containers.filter((c: any) => c.cargoType === 'RF');
      fallbackText += `Se detectaron ${rfs.length} unidades Reefer conectadas. Muestra:\n` +
        rfs.slice(0, 10).map((c: any) => `• ${c.id} (${c.temp}) en pos. ${c.position} -> POD: ${c.pod}`).join('\n');
    } else if (lower.includes('resumen') || lower.includes('total') || lower.includes('cuadre')) {
      fallbackText += `Total unidades: ${summaryStats.totalContainers} | DG: ${summaryStats.dgCount} | RF: ${summaryStats.reeferCount} | Vacíos: ${summaryStats.emptyCount} | OOG: ${summaryStats.oogCount}\nPODs: ${summaryStats.pods.join(', ')}`;
    } else {
      fallbackText += `Se han procesado ${summaryStats.totalContainers} contenedores en el plano del buque. ¿Deseas consultar sobre unidades DG, Reefers, secuencia de descarga o violaciones de peso?`;
    }

    return res.json({ response: fallbackText });
  } catch (err: any) {
    console.error('Copilot API error:', err);
    res.status(500).json({ error: err.message || 'Error interno en el servidor Copilot.' });
  }
});

export default app;
export { app };
