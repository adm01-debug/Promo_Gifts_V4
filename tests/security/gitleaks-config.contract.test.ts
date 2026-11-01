import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const config = readFileSync(resolve(process.cwd(), '.gitleaks.toml'), 'utf8');

describe('Gitleaks config security boundaries', () => {
  it('extends the default detector rules', () => {
    expect(config).toMatch(/\[extend\][\s\S]*?useDefault\s*=\s*true/);
  });

  it('does not exempt the entire scripts tree from secret scanning', () => {
    const allowlistPaths = config.split('paths = [')[1]?.split(']')[0] ?? '';
    expect(allowlistPaths).not.toMatch(/scripts\/\.\*/);
  });
});
