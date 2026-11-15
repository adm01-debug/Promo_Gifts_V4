// Entrada do runner Vitest para o teste co-localizado da edge
// process-scheduled-reports. `supabase/functions/**` não está no include do
// vitest.config.ts (config compartilhada), então este shim importa o arquivo
// co-localizado para que o Vitest o colete e execute de verdade.
// Espelha o padrão aceito das edges irmãs (e2e-cleanup.mockups.test.ts).
import { expect, it } from 'vitest';
import { sendFailureHandlerLoaded } from '../../supabase/functions/process-scheduled-reports/index.send-failure.test.ts';

it('carrega a suíte de envio do process-scheduled-reports', () => {
  // Só vem `true` se o import acima tiver registrado o handler real via `Deno.serve`.
  expect(sendFailureHandlerLoaded).toBe(true);
});
