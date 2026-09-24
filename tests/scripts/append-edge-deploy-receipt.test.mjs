// E66 (plano de 100 etapas, 2026-09-24) — testa
// scripts/append-edge-deploy-receipt.mjs, chamado pelo job `ledger` de
// .github/workflows/deploy-edge-functions.yml: grava uma linha nova na
// tabela "## Recibos" de supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md. Mesmo
// padrão de tests/scripts/append-migration-receipt.test.mjs (PLANO_DBA E15).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendReceiptRow,
  formatReceiptRow,
  parseCliOptions,
  SECTION_HEADING,
} from '../../scripts/append-edge-deploy-receipt.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/append-edge-deploy-receipt.mjs');
const REAL_LOG = resolve(ROOT, 'supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

const SAMPLE_LOG = [
  '# log',
  '',
  '## Retro-registro',
  '',
  '| data | slug |',
  '|---|---|',
  '| 2026-09-23 | `kit-ai-builder` |',
  '',
  SECTION_HEADING,
  '',
  'Texto explicativo.',
  '',
  '| Data (UTC) | Slug | Versão | SHA (git) | Run | Executor | Método |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  '',
  '## Próxima seção',
  'fim',
].join('\n');

// ─── formatReceiptRow ───────────────────────────────────────────────────────

describe('formatReceiptRow', () => {
  it('formata todos os campos como células markdown', () => {
    const row = formatReceiptRow({
      dataUtc: '2026-09-24T18:00:00.000Z',
      slug: 'kit-ai-builder',
      version: '286',
      sha: '8ebc5fa7f',
      run: '36034047881',
      executor: 'GitHub Actions (disparado por joaquim)',
      metodo: 'workflow_dispatch',
    });
    expect(row).toBe(
      '| 2026-09-24T18:00:00.000Z | `kit-ai-builder` | 286 | `8ebc5fa7f` | 36034047881 | GitHub Actions (disparado por joaquim) | workflow_dispatch |',
    );
  });

  it('usa em-dash para campos ausentes', () => {
    const row = formatReceiptRow({ slug: 'x', dataUtc: 'd', executor: 'e', metodo: 'm' });
    expect(row).toContain('| — | — |');
  });
});

// ─── appendReceiptRow ───────────────────────────────────────────────────────

describe('appendReceiptRow', () => {
  it('insere a linha nova como última linha da tabela de Recibos', () => {
    const row = '| d | `kit-ai-builder` | 286 | `sha` | 1 | CI | push |';
    const updated = appendReceiptRow({ logContent: SAMPLE_LOG, row });
    const lines = updated.split('\n');
    const idx = lines.indexOf(row);
    expect(idx).toBeGreaterThan(-1);
    // A linha anterior deve ser o separador da tabela de Recibos, não a do Retro-registro.
    expect(lines[idx - 1]).toBe('| --- | --- | --- | --- | --- | --- | --- |');
    // A tabela de Retro-registro continua intacta e sem a linha nova.
    expect(updated).toContain('| 2026-09-23 | `kit-ai-builder` |');
  });

  it('preserva múltiplas inserções em ordem (a segunda vai depois da primeira)', () => {
    const row1 = '| d | `f1` | 1 | sha | 1 | e | m |';
    const row2 = '| d | `f2` | 1 | sha | 2 | e | m |';
    const afterFirst = appendReceiptRow({ logContent: SAMPLE_LOG, row: row1 });
    const afterSecond = appendReceiptRow({ logContent: afterFirst, row: row2 });
    const lines = afterSecond.split('\n');
    expect(lines.indexOf(row1)).toBeLessThan(lines.indexOf(row2));
  });

  it('lança erro se a seção "## Recibos" não existir', () => {
    expect(() =>
      appendReceiptRow({ logContent: '# log sem a seção de recibos', row: '| x |' }),
    ).toThrow(/não encontrada/);
  });

  it('funciona contra o EDGE_FUNCTIONS_DEPLOY_LOG.md real do repo (seção Recibos já existe, vazia)', () => {
    const real = readFileSync(REAL_LOG, 'utf8');
    const row = '| 2099-01-01T00:00:00.000Z | `slug-teste` | 1 | `sha` | 1 | teste | teste |';
    const updated = appendReceiptRow({ logContent: real, row });
    expect(updated).toContain(row);
  });
});

// ─── parseCliOptions ────────────────────────────────────────────────────────

describe('parseCliOptions', () => {
  it('exige --slug', () => {
    expect(() => parseCliOptions(['--sha=abc'])).toThrow(/--slug/);
  });

  it('converte --log-path para logPath (camelCase)', () => {
    const opts = parseCliOptions(['--slug=x', '--log-path=/tmp/x.md']);
    expect(opts.logPath).toBe('/tmp/x.md');
  });
});

// ─── Integração: CLI real contra um log temporário ──────────────────────────

describe('CLI', () => {
  it('escreve o recibo no arquivo apontado por --log-path', () => {
    const dir = tempDir('append-edge-receipt-cli-');
    const logPath = join(dir, 'log.md');
    writeFileSync(logPath, SAMPLE_LOG);

    const result = spawnSync(
      'node',
      [
        SCRIPT,
        '--slug=kit-ai-builder',
        '--version=286',
        '--sha=8ebc5fa7f',
        '--run=36034047881',
        '--executor=CI',
        '--metodo=push',
        `--log-path=${logPath}`,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    const written = readFileSync(logPath, 'utf8');
    expect(written).toContain('`kit-ai-builder`');
    expect(written).toContain('286');
  });

  it('sai com erro (exit 1) se a seção de Recibos não existir no log alvo', () => {
    const dir = tempDir('append-edge-receipt-cli-missing-section-');
    const logPath = join(dir, 'log.md');
    writeFileSync(logPath, '# log sem seção de recibos\n');

    const result = spawnSync(
      'node',
      [SCRIPT, '--slug=x', '--executor=CI', '--metodo=push', `--log-path=${logPath}`],
      { cwd: ROOT, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não encontrada');
  });

  it('sai com erro (exit 1) se --slug faltar', () => {
    const dir = tempDir('append-edge-receipt-cli-missing-slug-');
    const logPath = join(dir, 'log.md');
    writeFileSync(logPath, SAMPLE_LOG);

    const result = spawnSync('node', [SCRIPT, '--executor=CI', `--log-path=${logPath}`], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--slug');
  });
});
