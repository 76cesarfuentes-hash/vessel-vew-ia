import { Container } from '../models/container';

export async function askStowageCopilot(
  prompt: string,
  containers: Container[],
  activeTerminalKey: string,
  podSequence?: string[]
): Promise<string> {
  try {
    const response = await fetch('/api/copilot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        containers,
        activeTerminal: activeTerminalKey,
        podSequence
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || 'Sin respuesta del servidor.';
  } catch (error: any) {
    console.error('Client Copilot error:', error);
    return `Error al consultar Stowage Copilot: ${error.message || 'Fallo de conexión'}`;
  }
}
