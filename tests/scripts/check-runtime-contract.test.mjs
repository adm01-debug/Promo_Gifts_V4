import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateRuntimeContract, parseVersion } from '../../scripts/check-runtime-contract.mjs';

function evaluateFixture({
  nodeVersion = 'v24.19.0',
  npmUserAgent = 'npm/10.9.7 node/v24.19.0 linux x64',
  nvmrc = '22.22.1',
  nodeEngine = '>=22.22.1 <25',
  npmEngine = '>=10.0.0',
  packageManager = 'npm@10.9.7',
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'runtime-contract-'));
  try {
    const packageJsonPath = join(dir, 'package.json');
    const nvmrcPath = join(dir, '.nvmrc');
    writeFileSync(
      packageJsonPath,
      JSON.stringify({
        packageManager,
        engines: { node: nodeEngine, npm: npmEngine },
        scripts: {},
      }),
    );
    writeFileSync(nvmrcPath, nvmrc);
    return evaluateRuntimeContract({ packageJsonPath, nvmrcPath, nodeVersion, npmUserAgent });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

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

  it.each([
    ['v22.0.0', false],
    ['v22.22.0', false],
    ['v22.22.1', true],
    ['v22.22.2', true],
    ['v22.23.0', true],
    ['v23.0.0', true],
    ['v24.999.999', true],
    ['v25.0.0', false],
    ['v100.0.0', false],
  ])('confere todos os limites Node: %s => %s', (nodeVersion, expected) => {
    expect(evaluateFixture({ nodeVersion }).ok).toBe(expected);
  });

  it.each([
    ['10.9.6', false],
    ['10.9.7', true],
    ['10.9.8', true],
    ['10.99.0', true],
    ['11.0.0', false],
  ])('confere patch mínimo e teto npm: %s => %s', (version, expected) => {
    expect(
      evaluateFixture({
        npmEngine: '>=10.9.7 <11',
        npmUserAgent: `npm/${version} node/v24.19.0`,
      }).ok,
    ).toBe(expected);
  });

  it('aceita .nvmrc em outra major que está dentro de engines', () => {
    expect(evaluateFixture({ nvmrc: '24.0.0' }).ok).toBe(true);
  });

  it.each(['22.22.0', '25.0.0'])('reprova versão canônica fora de engines: %s', (nvmrc) => {
    const result = evaluateFixture({ nvmrc });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('versão canônica do .nvmrc');
  });

  it('mantém o baseline completo mesmo se engines permitir versão mais antiga', () => {
    const result = evaluateFixture({ nvmrc: '24.1.1', nodeVersion: 'v24.1.0' });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('anterior ao baseline 24.1.1');
  });

  it.each([
    'garbage22',
    '^22.22.1',
    '22.x',
    '>=22.22.1 || >=25',
    '>=22.22.1 <NaN',
    '>=22.22.1 <Infinity',
    '>=22.22.1 <22',
    '>=22.22.1 <25 junk',
    '>=22.22.1 <9007199254740992',
  ])('recusa engines.node inválido ou não suportado: %s', (nodeEngine) => {
    const result = evaluateFixture({ nodeEngine });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('engines.node');
  });

  it.each(['garbage', '^10.0.0', '>=NaN', '>=10.0.0 || <1', '>=9007199254740992.0.0'])(
    'recusa engines.npm inválido ou não suportado: %s',
    (npmEngine) => {
      const result = evaluateFixture({ npmEngine });
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toContain('engines.npm');
    },
  );

  it.each(['9.9.9', '11.0.0'])(
    'reprova packageManager fora de engines mesmo com npm local válido: %s',
    (version) => {
      const result = evaluateFixture({
        packageManager: `npm@${version}`,
        npmEngine: '>=10.0.0 <11',
      });
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toContain('packageManager');
    },
  );

  it.each([
    '9007199254740992.0.0',
    '22.9007199254740992.0',
    '22.22.9007199254740992',
    'NaN.0.0',
    'Infinity.0.0',
  ])('recusa versões que não podem ser comparadas com segurança: %s', (version) => {
    expect(parseVersion(version)).toBeNull();
    expect(evaluateFixture({ nodeVersion: version }).ok).toBe(false);
    expect(evaluateFixture({ nvmrc: version }).ok).toBe(false);
    expect(evaluateFixture({ packageManager: `npm@${version}` }).ok).toBe(false);
    expect(evaluateFixture({ npmUserAgent: `npm/${version}` }).ok).toBe(false);
  });

  it.each(['', 'v10.9.7', '10.9.7garbage', '10.9.7-beta', '10.9.7.0', '10.9', 'NaN', 'Infinity'])(
    'reprova token npm observado mas inválido: %j',
    (version) => {
      const result = evaluateFixture({ npmUserAgent: `npm/${version} node/v24.19.0` });
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toContain('Versão npm inválida');
    },
  );

  it('mantém aviso quando npm não foi observado', () => {
    const result = evaluateFixture({ npmUserAgent: '' });
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.details.actualNpm).toBeNull();
  });

  it.each([
    ['>=22.22.1 <25.1', 'v25.0.99', true],
    ['>=22.22.1 <25.1', 'v25.1.0', false],
    ['>=22.22.1 <25.1.2', 'v25.1.1', true],
    ['>=22.22.1 <25.1.2', 'v25.1.2', false],
    ['  >=22.22.1   <25  ', 'v24.19.0', true],
  ])('interpreta corretamente o intervalo %s para Node %s', (nodeEngine, nodeVersion, expected) => {
    expect(evaluateFixture({ nodeEngine, nodeVersion }).ok).toBe(expected);
  });
});
