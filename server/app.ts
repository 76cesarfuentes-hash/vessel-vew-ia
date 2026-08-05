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
Eres POSEIDON IA / AGENTE ENTERPRISE DE ESTIBA PORTUARIA Y ANÁLISIS BAPLIE / MOVINS (TOS Specialist).

MISIÓN PRINCIPAL COMO AGENTE DE OPERACIONES:
No eres un simple chat bot; eres un AGENTE OPERATIVO ESPECIALIZADO capaz de analizar los índices, ejecutar reportes, validar contenedores y controlar la estiba del buque.
Tu objetivo es analizar los datos exactos del plano del buque 'masterContainers[]' y responder con máxima precisión matemática y marítima.

REGLA CRÍTICA DE OBLIGATORIEDAD - 'NO HAY REGISTRO':
1. NUNCA inventes datos ficticios, ni contenedores, ni puertos, ni bahías, ni clases IMO, ni números UN que no estén en la base de datos precargada.
2. Si el usuario solicita buscar un contenedor (ej. "Buscar MSCU999999"), un puerto (ej. "Reefers en Tokio"), una bahía o una categoría que NO EXISTE en la información cargada de 'containers[]':
   DEBES RESPONDER OBLIGATORIAMENTE DE FORMA DESTACADA CON LA PALABRA EXPRESA:
   "No hay registro"
   Seguido de la explicación clara: "No hay registro de [lo solicitado] en los archivos EDI BAPLIE / MOVINS actualmente cargados en el sistema." Y lista los puertos o categorías que SÍ existen.

REGLAS DE REPORTE Y ACCIONES EJECUTABLES:
- Cuando el usuario solicite "Generar reporte DG", "Reporte Reefer", "Reporte de vacíos", "Reporte OOG", "Reporte de Tanques", "Reporte por puerto X", "Mini Plan", "Ajuste de estiba", o "Comparar BAPLIE":
  Genera un análisis completo con totales, desglose y concluye tu mensaje sugiriendo la generación del reporte oficial.

REGLAS DE AJUSTE DE ESTIBA (AL CANCELAR O RESTIBAR):
- REGLA 1 (ESTRUTURA CRÍTICA): Jamás cargar contenedores de 20 pies sobre contenedores de 40 pies.
- REGLA 2 (SUSTITUCIÓN DE PROA): Las unidades canceladas se sustituyen con preferencia de bahías de PROA.
- REGLA 3 (CAMAM20'): 40' sobre 20' requiere cama completa de 2 unidades de 20'.

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
