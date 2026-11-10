// Entrada do runner Vitest para o teste co-localizado da edge e2e-cleanup.
// `supabase/functions/**` nao esta no include do vitest.config.ts (config
// compartilhada — nao e deste cartao), entao este shim importa o arquivo
// co-localizado para que o Vitest o colete e execute de verdade.
import { expect, it } from 'vitest';
import { mockupSuiteHandlerLoaded } from '../../supabase/functions/e2e-cleanup/index.mockups.test.ts';

it('carrega a suite de limpeza de mockups do e2e-cleanup', () => {
  // Asserção real: só vem `true` se o import acima tiver registrado o handler
  // do e2e-cleanup via `Deno.serve` no módulo de produção.
  expect(mockupSuiteHandlerLoaded).toBe(true);
});
