// Entrada do runner Vitest para o teste co-localizado da edge mockup-assistant
// (`supabase/functions/**` não está no include do vitest.config.ts, que é
// caminho bloqueado pelo portão do projeto).
import { expect, it } from 'vitest';
import '../../supabase/functions/mockup-assistant/index.test.ts';

it('expõe o handler da edge mockup-assistant para o runner', async () => {
  const mod = await import('../../supabase/functions/mockup-assistant/index.ts');
  expect(typeof mod.serveMockupAssistant).toBe('function');
});
