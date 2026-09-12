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

import { loginViaUI } from '../helpers/auth';

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
    fs.writeFileSync(STORAGE, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf-8');
    setup.info().annotations.push({
      type: 'skip-reason',
      description: 'E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes — specs autenticados serão pulados.',
    });
    return;
  }

  try {
    await loginViaUI(page, { email, password });
    await page.context().storageState({ path: STORAGE });
  } catch (err) {
    // Login falhou (credenciais inválidas, Supabase indisponível, etc.).
    // Escreve storageState vazio para que specs com requireAuth() sejam
    // pulados em vez de travar o smoke gate com erro de setup.
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[auth.setup] Login falhou — specs autenticados serão pulados. Motivo: ${reason}`);
    fs.writeFileSync(STORAGE, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf-8');
    setup.info().annotations.push({
      type: 'auth-setup-failed',
      description: `Login falhou: ${reason}`,
    });
  }
});
