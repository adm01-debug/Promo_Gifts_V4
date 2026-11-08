import { describe, expect, it } from 'vitest';
import {
  SQL,
  countReceiptLines,
  evaluateLiveReceiptCoverage,
  filterEligibleReceiptVersions,
  getReceiptLines,
  getReceiptCutoff,
  hasReceiptForVersion,
  validateSyncLogIntegrity,
} from '../../scripts/check-migration-receipts.mjs';

describe('check-migration-receipts (E055)', () => {
  it('consulta todas as versões do ledger sem truncar em 200 linhas', () => {
    expect(SQL).toMatch(/ORDER BY version DESC/i);
    expect(SQL).not.toMatch(/\bLIMIT\b/i);
  });

  it('conta linhas de recibo estruturadas, não títulos de seção', () => {
    const log = [
      '## Recibos — aplicações confirmadas por hash (600 linhas, `version` canônica > `20260623111612`)',
      '| versão | status |',
      '|---|---|',
      '| `20261022194000` | aplicada |',
      '| `20261022194100` | pendente |',
      '| `2026062311292414001` | aplicada (id histórico E09) |',
      'A versão `20261022194200` foi mencionada em prosa, não é uma linha de recibo.',
    ].join('\n');

    expect(getReceiptLines(log)).toHaveLength(3);
    expect(countReceiptLines(log)).toBe(3);
    expect(validateSyncLogIntegrity(log)).toEqual([]);
    expect(hasReceiptForVersion(log, '2026062311292414001')).toBe(true);
    expect(filterEligibleReceiptVersions(log, ['2026062311292414001'])).toEqual([
      '2026062311292414001',
    ]);
  });

  it('não trata menção em prosa nem em outra coluna como recibo da versão', () => {
    const log = [
      '## Recibos — aplicações confirmadas por hash (`version` canônica > `20260623111612`)',
      '| versão | nome | status |',
      '|---|---|---|',
      '| `20261022194000` | migration | pendente |',
      '| `20261022194100` | menciona `20261022194000` em texto | aplicada |',
    ].join('\n');

    expect(hasReceiptForVersion(log, '20261022194000')).toBe(false);
    expect(hasReceiptForVersion(log, '20261022194100')).toBe(true);
  });

  it('rejeita log sem linha tabular de recibo mesmo que a versão apareça em título', () => {
    const log = '## Recibos — aplicações confirmadas por hash (`version` canônica > `20260623111612`)';
    expect(validateSyncLogIntegrity(log)).toContain(
      'MIGRATIONS_SYNC_LOG.md não contém nenhuma linha de recibo em tabela',
    );
  });

  it('usa o resultado live para aceitar ou falhar a cobertura do ledger', () => {
    const log = '## Recibos — aplicações confirmadas por hash (`version` canônica > `20260623111612`)\n| `20261022194000` | aplicada |';
    const live = {
      kind: 'live',
      source: 'management-api',
      maskedUrl: 'project:abc***xyz',
      versions: ['20261022194000', '20261022194100'],
    };

    const missing = evaluateLiveReceiptCoverage({ logContent: log, live });
    expect(missing.status).toBe('failed');
    expect(missing.details.missing).toEqual(['20261022194100']);

    const complete = evaluateLiveReceiptCoverage({
      logContent: `${log}\n| \`20261022194100\` | aplicada |`,
      live,
    });
    expect(complete.status).toBe('passed');
    expect(complete.details.checked).toBe(2);
  });

  it('mantém static-pass sem credenciais e inconclusive quando live é obrigatório', () => {
    const log = '## Recibos — aplicações confirmadas por hash (`version` canônica > `20260623111612`)\n| `20261022194000` | aplicada |';
    const missingConfig = { kind: 'missing-config' };

    expect(
      evaluateLiveReceiptCoverage({ logContent: log, live: missingConfig }).status,
    ).toBe('static-pass');
    expect(
      evaluateLiveReceiptCoverage({
        logContent: log,
        live: missingConfig,
        requireLive: true,
      }).status,
    ).toBe('inconclusive');
  });

  it('returns inconclusive on a live API failure instead of silently passing', () => {
    const result = evaluateLiveReceiptCoverage({
      logContent: '| `20261022194000` | aplicada |',
      live: { kind: 'http-error', target: 'project:ref' },
    });
    expect(result.status).toBe('inconclusive');
  });

  it('ignora versões anteriores ao cutoff e IDs legados de oito dígitos', () => {
    const log = [
      '## Recibos — aplicações confirmadas por hash (`version` canônica > `20260623111612`)',
      '| `20260623111856` | aplicada |',
      '## Legado — não verificado',
      '| `20260712` | narrativa histórica, sem recibo verificável |',
    ].join('\n');
    const ledger = ['20260618000001', '20260623111612', '20260623111856', '20260712'];

    expect(getReceiptCutoff(log)).toBe('20260623111612');
    expect(filterEligibleReceiptVersions(log, ledger)).toEqual(['20260623111856']);
    expect(evaluateLiveReceiptCoverage({
      logContent: log,
      live: { kind: 'live', source: 'fixture', maskedUrl: null, versions: ledger },
    }).details.checked).toBe(1);
  });

  it('verifica mais de 200 versões recentes sem truncar o resultado', () => {
    const cutoff = '20260623111612';
    const log = `## Recibos — aplicações confirmadas por hash (600 linhas, \`version\` canônica > \`${cutoff}\`)\n`;
    const versions = Array.from({ length: 250 }, (_, index) => `20261031${String(index).padStart(6, '0')}`);
    const result = evaluateLiveReceiptCoverage({
      logContent: log,
      live: { kind: 'live', source: 'fixture', maskedUrl: null, versions },
    });

    expect(result.status).toBe('failed');
    expect(result.details.checked).toBe(250);
    expect(result.details.missing).toEqual(versions.slice(0, 20));
    expect(result.details.additionalMissing).toBe(230);
  });
});
