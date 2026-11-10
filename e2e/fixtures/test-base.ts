/**
 * Test base estendendo o Playwright com:
 *  - Captura automática de console/pageerror em toda página
 *  - afterEach que dispara coleta de evidências em qualquer falha
 *  - Helper `requireAuth()` que pula o teste se as credenciais não foram dadas
 *  - Fixture `e2eResources` com sub-prefixo POR SPEC e cleanup escopado
 *    em caso de falha — evita que um spec apague recursos vivos de outro
 *    spec rodando em paralelo no mesmo worker/CI.
 *
 * Uso:
 *   import { test, expect } from "../fixtures/test-base";
 *
 *   test("...", async ({ page, resources }) => {
 *     const { name } = await resources.createQuote({ label: "approval", submit: true });
 *     // ...
 *   });
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
const STORAGE_STATE = path.resolve(_dirname, '../.auth/storageState.json');

// E51 — Quarentena de flaky: carrega e2e/quarantine.json uma vez no processo.
// Entradas com `issue` vinculada marcam o teste como test.fixme().
// NUNCA adicionar entradas sem issue — veja e2e/scripts/detect-flaky.mjs.
interface QuarantineEntry {
  title: string;
  file: string;
  issue: string;
  since: string;
}
interface QuarantineFile {
  entries: QuarantineEntry[];
}
function loadQuarantine(): QuarantineEntry[] {
  try {
    const p = path.resolve(_dirname, '../quarantine.json');
    const raw = fs.readFileSync(p, 'utf-8');
    return (JSON.parse(raw) as QuarantineFile).entries ?? [];
  } catch {
    return [];
  }
}
const QUARANTINE: QuarantineEntry[] = loadQuarantine();

/** Marca o teste atual como fixme se ele estiver na quarentena versionada.
 *  Chame no início do test body ou no beforeEach do spec.
 *  O issue link aparece na mensagem do fixme para rastreabilidade. */
export function skipIfQuarantined(testTitle: string, specFile: string): void {
  const match = QUARANTINE.find((e) => e.title === testTitle && specFile.endsWith(e.file));
  if (match) {
    test.fixme(true, `Quarantinado (flaky) — ${match.issue} — desde ${match.since}`);
  }
}

import { attachConsoleCapture, type EvidenceCollector } from '../helpers/evidence';
import { loadCleanupConfig, purgeAll } from '../helpers/cleanup-client';
import { e2eScope } from './test-user';
import {
  createE2eQuote,
  createE2eCollection,
  createE2eFavoriteList,
  createE2eCartTemplate,
  createE2eCustomKit,
  createE2eSupplier,
  createE2eTechnique,
} from '../helpers/e2e-resources';
import { installMockAuth, isMockAuthEnabled } from '../helpers/mock-auth';

interface CreateOpts {
  label?: string;
  submit?: boolean;
}

export interface E2eResources {
  /** Sub-prefixo derivado do basename, ex.: `[E2E] quote-create`. */
  prefix: string;
  createQuote: (opts?: CreateOpts) => Promise<{ name: string }>;
  createCollection: (opts?: CreateOpts) => Promise<{ name: string }>;
  createFavoriteList: (opts?: CreateOpts) => Promise<{ name: string }>;
  createCartTemplate: (opts?: CreateOpts) => Promise<{ name: string }>;
  createCustomKit: (opts?: CreateOpts) => Promise<{ name: string }>;
  createSupplier: (opts?: CreateOpts) => Promise<{ name: string }>;
  createTechnique: (opts?: CreateOpts) => Promise<{ name: string }>;
}

type Fixtures = {
  evidence: EvidenceCollector;
  resources: E2eResources;
  /**
   * Auto-fixture: em falha, dispara purge ESCOPADO ao prefixo do spec
   * (não toca em recursos de outros specs paralelos). Pode ser desligada
   * via `E2E_CLEANUP_ON_FAILURE=0`.
   */
  cleanupOnFailure: void;
  /**
   * Em E2E_MOCK_AUTH, impede qualquer HTTP/WebSocket de alcançar Supabase.
   * Rotas específicas registradas pelo spec depois desta fixture têm
   * precedência; o restante recebe apenas respostas locais seguras.
   */
  mockNetworkIsolation: void;
};

function deriveSpecSlug(filePath: string): string {
  return path.basename(filePath).replace(/\.spec\.tsx?$/, '');
}

export const test = base.extend<Fixtures>({
  evidence: async ({ page }, use, testInfo) => {
    const collector = attachConsoleCapture(page);
    await use(collector);

    // Fail test if console errors or critical warnings were captured
    const errors = collector.pageErrors.map((e) => e.message);
    const consoleErrors = collector.consoleLogs
      .filter((l) => l.type === 'error' && !l.text.includes('chrome-extension'))
      .map((l) => l.text);

    const allErrors = [...errors, ...consoleErrors];
    if (allErrors.length > 0) {
      throw new Error(`Test failed due to console errors:\n${allErrors.join('\n')}`);
    }

    // Fail on critical warnings
    const criticalWarnings = collector.consoleLogs
      .filter(
        (l) =>
          l.type === 'warning' &&
          (l.text.includes('React') ||
            l.text.includes('Supabase') ||
            l.text.includes('Invalid') ||
            l.text.includes('Failed')),
      )
      .map((l) => l.text);

    if (criticalWarnings.length > 0) {
      throw new Error(
        `Test failed due to critical console warnings:\n${criticalWarnings.join('\n')}`,
      );
    }

    if (testInfo.status !== testInfo.expectedStatus) {
      await collector.attachAll(page, testInfo);
    }
  },

  resources: async ({ page }, use, testInfo) => {
    const slug = deriveSpecSlug(testInfo.file);
    const prefix = e2eScope(slug);
    const api: E2eResources = {
      prefix,
      createQuote: (o = {}) => createE2eQuote(page, { ...o, prefix }),
      createCollection: (o = {}) => createE2eCollection(page, { ...o, prefix }),
      createFavoriteList: (o = {}) => createE2eFavoriteList(page, { ...o, prefix }),
      createCartTemplate: (o = {}) => createE2eCartTemplate(page, { ...o, prefix }),
      createCustomKit: (o = {}) => createE2eCustomKit(page, { ...o, prefix }),
      createSupplier: (o = {}) => createE2eSupplier(page, { ...o, prefix }),
      createTechnique: (o = {}) => createE2eTechnique(page, { ...o, prefix }),
    };
    await use(api);
  },

  mockNetworkIsolation: [
    async ({ page }, use) => {
      if (!isMockAuthEnabled()) {
        await use();
        return;
      }

      await installMockAuth(page);
      await page.route(
        (url) =>
          url.hostname.endsWith('.supabase.co') &&
          !(
            url.hostname === 'doufsxqlfjyuvxuezpln.supabase.co' &&
            url.pathname.startsWith('/auth/v1/')
          ),
        async (route, request) => {
          const url = new URL(request.url());
          const method = request.method();
          const headers = {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS',
            'access-control-allow-headers': '*',
            'access-control-expose-headers': 'content-range, x-total-count',
          };
          if (method === 'OPTIONS') {
            await route.fulfill({ status: 204, headers, body: '' });
            return;
          }
          if (method === 'GET' || method === 'HEAD') {
            await route.fulfill({
              status: 200,
              headers: { ...headers, 'content-range': '*/0' },
              contentType: 'application/json',
              body: method === 'HEAD' ? '' : '[]',
            });
            return;
          }
          if (
            method === 'POST' &&
            (url.pathname.startsWith('/rest/v1/rpc/') || url.pathname.startsWith('/functions/v1/'))
          ) {
            await route.fulfill({
              status: 200,
              headers,
              contentType: 'application/json',
              body: url.pathname.startsWith('/rest/v1/rpc/') ? '[]' : '{}',
            });
            return;
          }
          if (
            method === 'POST' &&
            (url.pathname === '/rest/v1/frontend_telemetry' ||
              url.pathname === '/rest/v1/user_onboarding')
          ) {
            await route.fulfill({ status: 204, headers, body: '' });
            return;
          }

          // Um write não mockado é recusado localmente. Nunca há fallback para
          // a rede, portanto um JWT sintético não pode tocar o banco canônico.
          await route.fulfill({
            status: 405,
            headers,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'write Supabase não mockado em E2E_MOCK_AUTH' }),
          });
        },
      );
      await page.routeWebSocket(
        (url) => url.hostname.endsWith('.supabase.co'),
        (socket) => {
          socket.onMessage(() => {});
        },
      );

      await use();
    },
    { auto: true },
  ],

  cleanupOnFailure: [
    async ({ resources }, use, testInfo) => {
      // Setup: Limpa recursos ANTES do teste para garantir isolamento
      const cfg = isMockAuthEnabled() ? null : loadCleanupConfig();
      if (cfg && process.env.E2E_CLEANUP_ON_START !== '0') {
        await purgeAll(cfg, {
          quiet: true,
          reason: `setup:${testInfo.title}`,
          nameFilterPrefix: resources.prefix,
        }).catch(() => {});
      }

      await use();

      // Teardown: Limpa recursos APÓS o teste se passar
      if (
        cfg &&
        (testInfo.status === testInfo.expectedStatus || process.env.E2E_CLEANUP_ALWAYS === '1')
      ) {
        await purgeAll(cfg, {
          quiet: true,
          reason: `teardown:${testInfo.title}`,
          nameFilterPrefix: resources.prefix,
        }).catch(() => {});
      }
    },
    { auto: true },
  ],
});

export { expect };

/** Valida o storageState exato do projeto canônico.
 *
 * Cookies arbitrários não provam autenticação Supabase. Em modo real exigimos
 * o storage key canônico e um JWT vigente, com subject/audience/issuer
 * coerentes. Em mock aceitamos somente a sentinela gerada pelo script oficial.
 */
function authStorageHasSession(mockMode: boolean): boolean {
  try {
    const raw = fs.readFileSync(STORAGE_STATE, 'utf-8');
    const state = JSON.parse(raw) as {
      cookies?: { name?: string; value?: string }[];
      origins?: { localStorage?: { name?: string; value?: string }[] }[];
    };
    if (mockMode) {
      return (state.cookies ?? []).some(
        (cookie) => cookie.name === 'e2e-mock-auth' && cookie.value === '1',
      );
    }

    const canonicalUrl = 'https://doufsxqlfjyuvxuezpln.supabase.co';
    const storageKey = 'sb-doufsxqlfjyuvxuezpln-auth-token';
    const item = (state.origins ?? [])
      .flatMap((origin) => origin.localStorage ?? [])
      .find((entry) => entry.name === storageKey);
    if (!item?.value) return false;

    const session = JSON.parse(item.value) as {
      access_token?: string;
      user?: { id?: string; user_metadata?: { e2e_mock?: boolean } };
    };
    const jwt = session.access_token ?? '';
    const parts = jwt.split('.');
    if (
      parts.length !== 3 ||
      parts[2] === 'mock-signature-not-verified' ||
      session.user?.user_metadata?.e2e_mock === true
    ) {
      return false;
    }
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
      aud?: string | string[];
      exp?: number;
      iss?: string;
      sub?: string;
    };
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    return (
      !!payload.exp &&
      payload.exp > Math.floor(Date.now() / 1000) &&
      !!payload.sub &&
      payload.sub === session.user?.id &&
      audiences.includes('authenticated') &&
      payload.iss === `${canonicalUrl}/auth/v1`
    );
  } catch {
    return false;
  }
}

/** Marca o teste como skip se as credenciais E2E_USER_* não foram fornecidas
 *  OU se o auth.setup falhou (login inválido, Supabase indisponível, etc.).
 *
 *  BYPASS: quando `E2E_MOCK_AUTH=1`, aceitamos o storageState sintético
 *  gerado por `scripts/e2e-mock-auth-setup.mjs` — que grava um cookie
 *  sentinela `e2e-mock-auth`. Nesse modo, os specs precisam chamar
 *  `installMockAuth(page)` (em `e2e/helpers/mock-auth.ts`) para interceptar
 *  as chamadas a `/auth/v1/**`. */
export function requireAuth(reason = 'E2E_USER_EMAIL/PASSWORD não configurados') {
  const mockMode = process.env.E2E_MOCK_AUTH === '1' || process.env.E2E_MOCK_AUTH === 'true';
  if (mockMode) {
    // Em modo mock só exigimos que o storageState exista com cookies (o
    // script mock-auth-setup grava a sentinela).
    test.skip(
      !authStorageHasSession(true),
      'E2E_MOCK_AUTH=1 mas storageState mock não foi gerado. Rode `node scripts/e2e-mock-auth-setup.mjs` antes.',
    );
    return;
  }
  const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
  if (!hasCredentials) {
    // E21 — modo estrito: em CI, credentials ausentes = falha imediata.
    if (process.env.CI) {
      throw new Error(`[requireAuth] E21 — modo estrito: ${reason} em CI.`);
    }
    test.skip(true, reason);
    return;
  }
  const hasSession = authStorageHasSession(false);
  if (process.env.CI && !hasSession) {
    throw new Error(
      '[requireAuth] sessão canônica ausente, inválida ou expirada após auth.setup em CI.',
    );
  }
  test.skip(!hasSession, 'Auth setup falhou — credenciais inválidas ou Supabase indisponível');
}

/**
 * Variante fail-closed para specs que acessam o PostgREST real.
 *
 * Em PR com E2E_MOCK_AUTH o skip é intencional: o JWT sintético nunca deve
 * alcançar o banco. Em CI com auth real, porém, credenciais ausentes ou
 * storageState vazio são erro — nunca um skip que poderia deixar o workflow
 * verde sem executar a cobertura de banco.
 */
export function requireLiveDatabaseAuth(
  reason = 'sessão real obrigatória para validar o PostgREST',
): void {
  const mockMode = process.env.E2E_MOCK_AUTH === '1' || process.env.E2E_MOCK_AUTH === 'true';
  if (mockMode) {
    test.skip(true, `${reason}; coberto pelo workflow_dispatch autenticado`);
    return;
  }

  const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
  const hasSession = authStorageHasSession(false);
  if (process.env.CI && (!hasCredentials || !hasSession)) {
    throw new Error(
      `[requireLiveDatabaseAuth] ${reason}: ` +
        `credentials=${hasCredentials ? 'presentes' : 'ausentes'}, ` +
        `storageState=${hasSession ? 'presente' : 'vazio'}`,
    );
  }

  test.skip(!hasCredentials || !hasSession, reason);
}

/** Marca o teste como skip se as credenciais admin não foram fornecidas. */
export function requireAdmin(reason = 'E2E_ADMIN_EMAIL/PASSWORD não configurados') {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, reason);
}
