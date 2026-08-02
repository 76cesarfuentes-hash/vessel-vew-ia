import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // API Routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Enterprise Terminal Planning Platform' });
  });

  // Server-side Stowage Copilot API endpoint using Gemini
  app.post('/api/copilot', async (req, res) => {
    try {
      const { prompt, containers, activeTerminal, podSequence } = req.body;

      if (!prompt || !containers || !Array.isArray(containers)) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (prompt, containers).' });
      }

      // Rule: Never invent data! Use only existing parsedContainers data.
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
Eres STOWAGE COPILOT AI, un Agente Especializado EXCLUSIVO para esta Web App de planificación de estiba portuaria (TOS / BAPLIE / MOVINS Specialist).

RESTRICCIÓN ABSOLUTA DE ÁMBITO Y EXCLUSIVIDAD:
1. Eres ÚNICA Y EXCLUSIVAMENTE para esta Web App y sus datos precargados (BAPLIE, MOVINS, contenedores del buque, bahías, reportes, restibas y ajustes).
2. NUNCA respondas preguntas sobre temas ajenos a esta aplicación o datos de estiba (ej. recetas, política, programación general, historia general). Si te preguntan sobre temas externos, responde estrictamente: "Soy un agente especializado exclusivo para esta web app de estiba. Solo puedo responder sobre la operativa del buque, contenedores cargados, reportes y ajustes de estiba."
3. Responde SIEMPRE basándote exclusivamente en los datos reales de 'containers[]'. NUNCA inventes contenedores ni posiciones.

REGLAS DE AJUSTE DE ESTIBA (OBLIGATORIAS AL AJUSTAR / CANCELAR):
- REGLA 1 (ESTRUTURA CRÍTICA): Jamás cargar contenedores de 20 pies sobre contenedores de 40 pies (20' sobre 40' es una violación ilegal).
- REGLA 2 (SUSTITUCIÓN DE PROA): Las unidades que se cancelen deben ser sustituidas por unidades libres de las mismas características (mismo tamaño, tipo de carga y POD), dando PREFERENCIA a unidades de PROA (bahías inferiores ej. 01, 03, 05...).
- REGLA 3 (REGLA CAMA 20' PARA SOPORTE DE 40'): Para poder colocar/estibar un contenedor de 40 pies sobre unidades de 20 pies, estas ÚNICAMENTE se pueden estibar si forman una CAMA COMPLETA DE 2 UNIDADES DE 20' (Par Proa y Popa). JAMÁS colocar una unidad de 40 pies sobre un solo contenedor de 20 pies.
  - Si se cancela un 20' y NO se encuentra sustituto 20' para completar la cama de 2x 20':
    - Si el 20' restante está en BODEGA (Tier < 80), moverlo a la CUBIERTA (Tier >= 80) para evitar que quede como un solo 20' aislado debajo de un 40'.
    - Si está en CUBIERTA (Tier >= 80), colocarlo sobre otro contenedor de 20' o moverlo a un slot libre donde no genere restibas ni violaciones de cama incompleta.

CAPACIDADES DE EJECUCIÓN Y REPORTES:
- Puedes sugerir y ejecutar reportes (Resumen operacional, descarga/carga, restibas, BAPLIE vs MOVINS, IMO/DG, Reefers).
- Cuando el usuario solicite una cancelación o ajuste (ej. "Cancela el contenedor MSKU1234567"), analiza la mejor opción sin descuadres y si aplica, incluye al final de tu respuesta el bloque ejecutable:
\`\`\`json
{
  "action": "EXECUTE_ADJUSTMENT",
  "adjustmentType": "CANCEL_CONTAINER",
  "containerId": "ID_DEL_CONTENEDOR"
}
\`\`\`

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

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
