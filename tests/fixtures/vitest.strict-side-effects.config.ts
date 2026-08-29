import { defineConfig } from 'vitest/config';

// Configuração mínima isolada para a fixture negativa do contrato. A fixture
// fica fora do padrão `*.test.*` para nunca contaminar a suíte normal.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts', './tests/setup-strict-side-effects.ts'],
    include: ['tests/fixtures/**/*.fixture.ts'],
    pool: 'threads',
    maxWorkers: 1,
    dangerouslyIgnoreUnhandledErrors: false,
  },
});
