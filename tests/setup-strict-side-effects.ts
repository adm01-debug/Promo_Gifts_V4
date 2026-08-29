/**
 * Guard opcional para a suíte de regressão de núcleo.
 *
 * O projeto contém suites de integração e de caracterização que deliberadamente
 * substituem `fetch` ou registram erros. Por isso o guard só entra em modo
 * estrito quando `STRICT_TEST_SIDE_EFFECTS=1` — hoje, no `test:ci-core`.
 * Nessa modalidade, uma chamada de `fetch` não mockada ou um `console.error`
 * que não foi interceptado pelo próprio teste deixa de produzir falso verde.
 */
import { afterAll, afterEach, beforeEach } from 'vitest';

const STRICT = process.env.STRICT_TEST_SIDE_EFFECTS === '1';
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error.bind(console);

let unexpectedFetches = 0;
let unexpectedConsoleErrors = 0;

function guardedFetch(): Promise<never> {
  unexpectedFetches += 1;
  return Promise.reject(
    new Error(
      '[strict-test-side-effects] unexpected network request blocked; mock globalThis.fetch explicitly in the test.',
    ),
  );
}

function installGuards() {
  globalThis.fetch = guardedFetch as typeof globalThis.fetch;
  console.error = ((...args: Parameters<typeof console.error>) => {
    unexpectedConsoleErrors += 1;
    originalConsoleError(...args);
  }) as typeof console.error;
}

function consumeFailure(): Error | null {
  const issues: string[] = [];
  if (unexpectedFetches > 0) {
    issues.push(`${unexpectedFetches} unexpected network request(s)`);
  }
  if (unexpectedConsoleErrors > 0) {
    issues.push(`${unexpectedConsoleErrors} unexpected console.error call(s)`);
  }
  unexpectedFetches = 0;
  unexpectedConsoleErrors = 0;
  return issues.length > 0 ? new Error(`[strict-test-side-effects] ${issues.join('; ')}.`) : null;
}

if (STRICT) {
  // setupFiles executam antes da importação dos specs: também protegemos
  // side-effects disparados no carregamento de módulos, não só dentro de `it`.
  installGuards();

  beforeEach(() => {
    // Um mock explícito pode substituir os globals durante o teste anterior;
    // reinstalar o guard impede vazamento de estado entre casos.
    installGuards();
  });

  afterEach(() => {
    installGuards();
    const failure = consumeFailure();
    if (failure) throw failure;
  });

  afterAll(() => {
    const failure = consumeFailure();
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    if (failure) throw failure;
  });
}
