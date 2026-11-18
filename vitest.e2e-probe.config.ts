import base from './vitest.config';

const cfg = base as unknown as { test: Record<string, unknown> };
const exclude = (cfg.test.exclude as string[]).filter((e) => e !== 'tests/e2e/**');

export default {
  ...cfg,
  test: {
    ...cfg.test,
    exclude: [...exclude, 'tests/e2e/**/*.spec.ts'],
    include: ['tests/e2e/**/*.{test,spec}.{ts,tsx}'],
  },
};
