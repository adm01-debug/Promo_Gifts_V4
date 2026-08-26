import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const configPath = resolve(process.cwd(), 'vitest.config.ts');

describe('vitest config contract', () => {
  it('mantém o config ativo em threads limitadas, sem poolOptions legado', async () => {
    const source = await readFile(configPath, 'utf8');

    expect(source).toContain("pool: 'threads'");
    expect(source).toContain('maxWorkers: 2');
    expect(source).not.toMatch(/\bpoolOptions\s*:/);
  });

  it('declara os guards globais e não ignora rejeições não tratadas', async () => {
    const source = await readFile(configPath, 'utf8');

    expect(source).toContain("'./tests/setup-strict-side-effects.ts'");
    expect(source).toMatch(/dangerouslyIgnoreUnhandledErrors:\s*false/);
  });
});
