// PLANO_DBA E15 — testa scripts/append-migration-receipt.mjs, o passo 5
// ("recibo") de .github/workflows/db-apply-migration.yml: grava uma linha
// nova na tabela "## Recibos — E15" de supabase/MIGRATIONS_SYNC_LOG.md.
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
  upsertReceiptRow,
} from '../../scripts/append-migration-receipt.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/append-migration-receipt.mjs');
const REAL_LOG = resolve(ROOT, 'supabase/MIGRATIONS_SYNC_LOG.md');

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
  '## Outra seção',
  '',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
  '',
  SECTION_HEADING,
  '',
  'Texto explicativo.',
  '',
  '| versão | sha256 arquivo | md5 statements | executor | método | data UTC | pós-check | status |',
  '|---|---|---|---|---|---|---|---|',
  '',
  '## Próxima seção',
  'fim',
].join('\n');

// ─── formatReceiptRow ───────────────────────────────────────────────────────

describe('formatReceiptRow', () => {
  it('formata todos os campos como células markdown', () => {
    const row = formatReceiptRow({
      version: '20260916210000',
      sha256: 'abc123',
      md5: 'def456',
      executor: 'GitHub Actions',
      metodo: 'E15',
      dataUtc: '2026-09-16 21:00:00 UTC',
      posCheck: 'ok',
      status: 'aplicada',
    });
    expect(row).toBe(
      '| `20260916210000` | `abc123` | `def456` | GitHub Actions | E15 | 2026-09-16 21:00:00 UTC | ok | aplicada |',
    );
  });

  it('usa em-dash para campos ausentes', () => {
    const row = formatReceiptRow({ version: '20260916210000', executor: 'x', metodo: 'E15', dataUtc: 'd', posCheck: 'p', status: 's' });
    expect(row).toContain('| — | — |');
  });
});

// ─── appendReceiptRow ───────────────────────────────────────────────────────

describe('appendReceiptRow', () => {
  it('insere a linha nova como última linha da tabela da seção E15', () => {
    const row = '| `20260916210000` | `h` | `m` | CI | E15 | 2026-09-16 | ok | aplicada |';
    const updated = appendReceiptRow({ logContent: SAMPLE_LOG, row });
    const lines = updated.split('\n');
    const idx = lines.indexOf(row);
    expect(idx).toBeGreaterThan(-1);
    // A linha anterior deve ser o separador da tabela E15, não a de "Outra seção".
    expect(lines[idx - 1]).toBe('|---|---|---|---|---|---|---|---|');
    // A tabela de "Outra seção" continua intacta e sem a linha nova.
    expect(updated).toContain('| 1 | 2 |');
  });

  it('preserva múltiplas inserções em ordem (a segunda vai depois da primeira)', () => {
    const row1 = '| `v1` | h | m | e | E15 | d | p | s |';
    const row2 = '| `v2` | h | m | e | E15 | d | p | s |';
    const afterFirst = appendReceiptRow({ logContent: SAMPLE_LOG, row: row1 });
    const afterSecond = appendReceiptRow({ logContent: afterFirst, row: row2 });
    const lines = afterSecond.split('\n');
    expect(lines.indexOf(row1)).toBeLessThan(lines.indexOf(row2));
  });

  it('lança erro se a seção não existir', () => {
    expect(() => appendReceiptRow({ logContent: '# log sem a seção E15', row: '| x |' })).toThrow(/não encontrada/);
  });

  it('funciona contra o MIGRATIONS_SYNC_LOG.md real do repo (seção E15 já existe, vazia)', () => {
    const real = readFileSync(REAL_LOG, 'utf8');
    const row = '| `20990101000000` | `h` | `m` | teste | E15 | d | p | s |';
    const updated = appendReceiptRow({ logContent: real, row });
    expect(updated).toContain(row);
  });
});

// ─── upsertReceiptRow ───────────────────────────────────────────────────────

describe('upsertReceiptRow', () => {
  const VERSION = '20261130120000';
  const tag = `\`${VERSION}\``;
  const finalRow = formatReceiptRow({
    version: VERSION,
    executor: 'CI',
    metodo: 'E15',
    dataUtc: '2026-11-30',
    posCheck: 'ok',
    status: 'aplicada',
  });
  const countRows = (content) => content.split('\n').filter((l) => l.includes(tag)).length;

  // O E75 reprova versão duplicada na seção (conta a primeira célula), então a
  // linha pré-existente tem de ser substituída — qualquer que seja o status.
  // `aguardando_merge` é o caso real que gerou o duplicado da 20261125131000.
  for (const status of ['pendente', 'aguardando_merge', 'registrada-sem-aplicar', 'aplicada']) {
    it(`substitui a linha existente com status "${status}" em vez de duplicar`, () => {
      const preExisting = formatReceiptRow({
        version: VERSION,
        executor: 'CI',
        metodo: 'E15',
        dataUtc: '2026-11-29',
        posCheck: 'aguardando',
        status,
      });
      const withRow = appendReceiptRow({ logContent: SAMPLE_LOG, row: preExisting });

      const { content, replaced } = upsertReceiptRow({
        logContent: withRow,
        version: VERSION,
        row: finalRow,
      });

      expect(replaced).toBe(true);
      expect(countRows(content)).toBe(1);
      expect(content).toContain(finalRow);
      expect(content).not.toContain(preExisting);
      // A seção vizinha continua intacta.
      expect(content).toContain('| 1 | 2 |');
    });
  }

  it('append quando ainda não existe linha da versão (replaced: false)', () => {
    const { content, replaced } = upsertReceiptRow({
      logContent: SAMPLE_LOG,
      version: VERSION,
      row: finalRow,
    });

    expect(replaced).toBe(false);
    expect(countRows(content)).toBe(1);
    expect(content).toContain(finalRow);
  });

  it('é idempotente: reaplicar o mesmo recibo não cria segunda linha', () => {
    const once = upsertReceiptRow({ logContent: SAMPLE_LOG, version: VERSION, row: finalRow });
    const twice = upsertReceiptRow({ logContent: once.content, version: VERSION, row: finalRow });

    expect(countRows(twice.content)).toBe(1);
  });

  it('não mexe em linha de outra versão', () => {
    const otherRow = formatReceiptRow({
      version: '20261130130000',
      executor: 'CI',
      metodo: 'E15',
      dataUtc: '2026-11-30',
      posCheck: 'ok',
      status: 'aplicada',
    });
    const withOther = appendReceiptRow({ logContent: SAMPLE_LOG, row: otherRow });

    const { content, replaced } = upsertReceiptRow({
      logContent: withOther,
      version: VERSION,
      row: finalRow,
    });

    expect(replaced).toBe(false);
    expect(content).toContain(otherRow);
    expect(content).toContain(finalRow);
    // A contagem acompanha tags da versão-alvo: a linha da outra versão não é tocada.
    expect(countRows(content)).toBe(1);
  });

  it('lança erro se a seção não existir', () => {
    expect(() =>
      upsertReceiptRow({ logContent: '# log sem a seção E15', version: VERSION, row: finalRow }),
    ).toThrow(/não encontrada/);
  });
});

// ─── parseCliOptions ────────────────────────────────────────────────────────

describe('parseCliOptions', () => {
  it('exige --version', () => {
    expect(() => parseCliOptions(['--sha256=abc'])).toThrow(/--version/);
  });

  it('converte --log-path para logPath (camelCase)', () => {
    const opts = parseCliOptions(['--version=v1', '--log-path=/tmp/x.md']);
    expect(opts.logPath).toBe('/tmp/x.md');
  });
});

// ─── Integração: CLI real contra um log temporário ──────────────────────────

describe('CLI', () => {
  it('escreve o recibo no arquivo apontado por --log-path', () => {
    const dir = tempDir('append-receipt-cli-');
    const logPath = join(dir, 'log.md');
    writeFileSync(logPath, SAMPLE_LOG);

    const result = spawnSync(
      'node',
      [
        SCRIPT,
        '--version=20260916210000',
        '--sha256=abc123',
        '--executor=CI',
        '--metodo=E15',
        '--data-utc=2026-09-16',
        '--pos-check=ok',
        '--status=aplicada',
        `--log-path=${logPath}`,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    const written = readFileSync(logPath, 'utf8');
    expect(written).toContain('`20260916210000`');
    expect(written).toContain('aplicada');
  });

  it('sai com erro (exit 1) se a seção E15 não existir no log alvo', () => {
    const dir = tempDir('append-receipt-cli-missing-section-');
    const logPath = join(dir, 'log.md');
    writeFileSync(logPath, '# log sem seção E15\n');

    const result = spawnSync(
      'node',
      [SCRIPT, '--version=20260916210000', '--executor=CI', '--metodo=E15', '--data-utc=d', '--pos-check=p', '--status=s', `--log-path=${logPath}`],
      { cwd: ROOT, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não encontrada');
  });
});
