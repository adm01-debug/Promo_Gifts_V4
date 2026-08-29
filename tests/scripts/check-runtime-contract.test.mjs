import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateRuntimeContract, parseVersion } from '../../scripts/check-runtime-contract.mjs';

describe('check-runtime-contract', () => {
  it('parseia versões sem aceitar intervalos como versão pinada', () => {
    expect(parseVersion('v20.20.2')).toEqual({ major: 20, minor: 20, patch: 2 });
    expect(parseVersion('20')).toBeNull();
    expect(parseVersion('>=20.0.0')).toBeNull();
  });

  it('aprova o contrato real mesmo quando o Node local é mais novo que o baseline de CI', () => {
    const result = evaluateRuntimeContract({
      nodeVersion: 'v24.19.0',
      npmUserAgent: 'npm/10.9.7 node/v24.19.0 linux x64 workspaces/false',
    });

    expect(result.ok).toBe(true);
    expect(result.details.expectedNode).toBe(readFileSync('.nvmrc', 'utf8').trim());
    expect(result.details.packageManager).toBe('npm@10.9.7');
  });

  it('reprova Node abaixo do baseline', () => {
    const result = evaluateRuntimeContract({
      nodeVersion: 'v18.20.0',
      npmUserAgent: 'npm/10.9.7 node/v18.20.0 linux x64 workspaces/false',
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('anterior ao baseline');
  });
});
