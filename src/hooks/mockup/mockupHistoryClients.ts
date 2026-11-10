import type { GeneratedMockup } from './mockupGenerationService';

/** Clientes distintos do histórico (id → nome), ordenados por nome. Puro; vive fora do
 *  hook para manter `useMockupGenerator` dentro do ratchet de tamanho (Gate 2.3.3). */
export function buildHistoryClients(history: GeneratedMockup[]): { id: string; name: string }[] {
  const map = new Map<string, { id: string; name: string }>();
  for (const m of history) {
    const clientKey = m.client_id || m.client_name;
    if (clientKey && m.client_name && !map.has(clientKey))
      map.set(clientKey, { id: m.client_id || m.client_name, name: m.client_name });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
