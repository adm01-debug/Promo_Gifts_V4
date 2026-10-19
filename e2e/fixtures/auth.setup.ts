/**
 * Auth setup — roda UMA vez antes dos projects autenticados.
 * Usa o helper SSOT `loginViaUI` (e2e/helpers/auth.ts) — sem seletores duplicados.
 */
import { test as setup } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { loginViaUI, dismissOnboardingTour } from '../helpers/auth';

const STORAGE = path.resolve(__dirname, '../.auth/storageState.json');

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(STORAGE), { recursive: true });

  // Mock mode must be self-contained. Previously the setup project always
  // overwrote the synthetic storageState with an empty file when credentials
  // were absent, so a command that correctly enabled E2E_MOCK_AUTH still
  // redirected to login. Reuse the canonical generator instead of duplicating
  // token/session construction here.
  if (process.env.E2E_MOCK_AUTH === '1' || process.env.E2E_MOCK_AUTH === 'true') {
    execFileSync(
      process.execPath,
      [path.resolve(__dirname, '../../scripts/e2e-mock-auth-setup.mjs')],
      {
        env: process.env,
        stdio: 'inherit',
      },
    );
    return;
  }

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // E21 — modo estrito: em CI sem mock, credentials ausentes = falha imediata.
    if (process.env.CI) {
      throw new Error(
        '[auth.setup] E21 — modo estrito: E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes em CI.\n' +
        'Configure os secrets em Settings → Secrets and variables → Actions.\n' +
        'Para testes sem autenticação real, use E2E_MOCK_AUTH=1.',
      );
    }
    // Fora do CI, graceful degradation mantida.
    fs.writeFileSync(STORAGE, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf-8');
    setup.info().annotations.push({
      type: 'skip-reason',
      description: 'E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes — specs autenticados serão pulados.',
    });
    return;
  }

  try {
    await loginViaUI(page, { email, password });
    // Persiste has_completed_tour=true pra conta E2E — sem isso o overlay do
    // tour intercepta cliques em TODOS os specs autenticados (inclusive os
    // que só usam storageState e nunca chamam loginAs).
    await dismissOnboardingTour(page);
    await page.context().storageState({ path: STORAGE });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // E21 — modo estrito: em CI, falha de credencial = erro imediato.
    // Timeout de rede (auth/v1/token pendurado — rate-limit do Supabase em IPs
    // do GitHub Actions) degrada graciosamente para evitar falso-negativo.
    if (process.env.CI) {
      const isNetworkTimeout =
        reason.includes('Timeout aguardando redirect') && reason.includes('PENDENTE');
      if (!isNetworkTimeout) {
        throw new Error(`[auth.setup] E21 — login falhou em CI: ${reason}`);
      }
      console.warn(
        `[auth.setup] E21-timeout — auth/v1/token não respondeu em CI (possível rate-limit). Specs autenticados serão pulados.`,
      );
    }
    console.warn(`[auth.setup] Login falhou — specs autenticados serão pulados. Motivo: ${reason}`);
    fs.writeFileSync(STORAGE, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf-8');
    setup.info().annotations.push({
      type: 'auth-setup-failed',
      description: `Login falhou: ${reason}`,
    });
  }
});
