// PLANO_DBA E11 — testa scripts/check-ledger-statements-gate.mjs, o gate que
// exige `statements` não vazio em `supabase_migrations.schema_migrations`
// para toda linha NOVA (version > cutoff medido ao vivo, ou não-canônica fora
// da allowlist), e oferece comparação por hash (md5) advisory contra o
// arquivo local `supabase/migrations/<version>_*.sql`.
//
// Medição ao vivo em 2026-09-16 (docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json):
// 483/2504 linhas do ledger sem `statements`, todas <= cutoffVersion
// "20260623111612" ou não-canônicas — 598/598 linhas canônicas depois do
// cutoff já têm `statements`. O teste "reproduz achado real" abaixo usa os
// bytes reais de `20260623111856` (lidos do arquivo local e da coluna
// `statements` ao vivo via MCP nesta sessão) para provar que a normalização
// do hash resolve a divergência concreta encontrada, sem mascarar um
// `statements` genuinamente ausente.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  asStatementsArray,
  buildLocalFilesIndex,
  compareStatementsToFile,
  evaluateLedger,
  findLocalMigrationFile,
  findMissingStatements,
  hasStatements,
  isCanonicalVersion,
  isHistoricallyExempt,
  joinStatements,
  loadAllowlist,
  md5,
  normalizeSqlForHash,
  runCheck,
} from '../../scripts/check-ledger-statements-gate.mjs';

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

// ─── isCanonicalVersion ─────────────────────────────────────────────────────

describe('isCanonicalVersion', () => {
  it('aceita exatamente 14 dígitos', () => {
    expect(isCanonicalVersion('20260623111612')).toBe(true);
  });

  it('rejeita versões não-canônicas (curtas, com sufixo, ou não numéricas)', () => {
    expect(isCanonicalVersion('001')).toBe(false);
    expect(isCanonicalVersion('20260623_bugalert1')).toBe(false);
    expect(isCanonicalVersion('2026062311292414001')).toBe(false);
    expect(isCanonicalVersion(undefined)).toBe(false);
  });
});

// ─── asStatementsArray / hasStatements ──────────────────────────────────────

describe('asStatementsArray', () => {
  it('devolve o array como veio quando já é array (caminho normal via Management API)', () => {
    expect(asStatementsArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('devolve [] para null/undefined', () => {
    expect(asStatementsArray(null)).toEqual([]);
    expect(asStatementsArray(undefined)).toEqual([]);
  });

  it('faz parse defensivo de um literal Postgres text[] em string ("{a,b}")', () => {
    expect(asStatementsArray('{a,b}')).toEqual(['a', 'b']);
    expect(asStatementsArray('{}')).toEqual([]);
  });
});

describe('hasStatements', () => {
  it('false para statements NULL ou {} — o caso dos 483 achados ao vivo', () => {
    expect(hasStatements({ statements: null })).toBe(false);
    expect(hasStatements({ statements: [] })).toBe(false);
  });

  it('true quando há ao menos um statement', () => {
    expect(hasStatements({ statements: ['SELECT 1;'] })).toBe(true);
  });
});

// ─── loadAllowlist / isHistoricallyExempt ───────────────────────────────────

describe('loadAllowlist', () => {
  it('carrega a allowlist real da E11 e valida o formato do cutoffVersion', () => {
    const allowlist = loadAllowlist();
    expect(isCanonicalVersion(allowlist.cutoffVersion)).toBe(true);
    expect(allowlist.nonCanonicalExemptVersions.has('001')).toBe(true);
  });

  it('lança erro quando cutoffVersion não é canônico (falha aberta, não silenciosa)', () => {
    const root = tempDir('promo-gifts-ledger-allowlist-');
    const path = join(root, 'allowlist.json');
    writeFileSync(path, JSON.stringify({ cutoffVersion: 'not-a-version', nonCanonicalExemptVersions: [] }), 'utf8');
    expect(() => loadAllowlist(path)).toThrow(/cutoffVersion inválido/);
  });
});

describe('isHistoricallyExempt', () => {
  const allowlist = {
    cutoffVersion: '20260623111612',
    nonCanonicalExemptVersions: new Set(['001', '002']),
  };

  it('versão canônica <= cutoff é isenta (histórico)', () => {
    expect(isHistoricallyExempt('20260101000000', allowlist)).toBe(true);
    expect(isHistoricallyExempt('20260623111612', allowlist)).toBe(true);
  });

  it('versão canônica > cutoff entra em escopo (não isenta)', () => {
    expect(isHistoricallyExempt('20260623111613', allowlist)).toBe(false);
  });

  it('não-canônica isenta só se estiver na allowlist', () => {
    expect(isHistoricallyExempt('001', allowlist)).toBe(true);
    expect(isHistoricallyExempt('20260712', allowlist)).toBe(false);
  });
});

// ─── findMissingStatements ───────────────────────────────────────────────────

describe('findMissingStatements', () => {
  const allowlist = {
    cutoffVersion: '20260623111612',
    nonCanonicalExemptVersions: new Set(['001']),
  };

  it('ignora linhas históricas sem statements (isentas por construção)', () => {
    const rows = [{ version: '20260101000000', statements: null }, { version: '001', statements: null }];
    expect(findMissingStatements(rows, allowlist)).toEqual([]);
  });

  it('sinaliza linha em escopo (version > cutoff) sem statements', () => {
    const rows = [{ version: '20260623111613', name: 'nova_migration', statements: null }];
    expect(findMissingStatements(rows, allowlist)).toEqual([
      { version: '20260623111613', name: 'nova_migration' },
    ]);
  });

  it('não sinaliza linha em escopo com statements preenchido', () => {
    const rows = [{ version: '20260623111613', statements: ['SELECT 1;'] }];
    expect(findMissingStatements(rows, allowlist)).toEqual([]);
  });
});

// ─── md5 / joinStatements ────────────────────────────────────────────────────

describe('md5 + joinStatements', () => {
  it('md5 é determinístico', () => {
    expect(md5('SELECT 1;')).toBe(md5('SELECT 1;'));
    expect(md5('SELECT 1;')).not.toBe(md5('SELECT 2;'));
  });

  it('joinStatements junta múltiplos statements com \\n', () => {
    expect(joinStatements(['a;', 'b;'])).toBe('a;\nb;');
  });
});

// ─── normalizeSqlForHash / compareStatementsToFile ──────────────────────────

describe('normalizeSqlForHash + compareStatementsToFile', () => {
  it('match exato quando statements reconstrói o arquivo byte a byte', () => {
    const content = '-- comentário\nSELECT 1;\n';
    const cmp = compareStatementsToFile([content], content);
    expect(cmp.rawMatch).toBe(true);
    expect(cmp.normalizedMatch).toBe(true);
  });

  it('reproduz o achado real da E11: 20260623111856 tem uma linha ";" solta extra no arquivo local que o ledger não capturou como statement — raw diverge, normalizado converge', () => {
    // Bytes reais confirmados nesta sessão: coluna `statements[0]` ao vivo
    // (via mcp__supabase__execute_sql) e o conteúdo de
    // supabase/migrations/20260623111856_products_indexes_8_drop_dead_indexes_registered_20260623.sql
    const liveStatement =
      "\n-- Registrar o drop dos 12 índices no histórico de migrations\n" +
      '-- (os DROPs já foram executados via execute_sql acima)\n' +
      "SELECT 'migration_registered' AS status,\n" +
      "  'Dropped 12 dead indexes from products: ~5.4MB recovered' AS info;\n";
    const fileContent = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260623111856_products_indexes_8_drop_dead_indexes_registered_20260623.sql',
      ),
      'utf8',
    );

    // Prova que o arquivo real realmente diverge em bytes crus (senão este
    // teste não estaria testando o achado real, e sim uma coincidência).
    expect(fileContent).not.toBe(liveStatement);

    const cmp = compareStatementsToFile([liveStatement], fileContent);
    expect(cmp.rawMatch).toBe(false);
    expect(cmp.normalizedMatch).toBe(true);
  });

  it('NÃO mascara uma divergência de conteúdo real (não é só cosmética)', () => {
    const cmp = compareStatementsToFile(['SELECT 1;'], 'SELECT 2;');
    expect(cmp.rawMatch).toBe(false);
    expect(cmp.normalizedMatch).toBe(false);
  });

  it('normalizeSqlForHash colapsa CRLF, espaços à direita e run de ";"/whitespace final', () => {
    expect(normalizeSqlForHash('SELECT 1;\r\n  \n;\n')).toBe(normalizeSqlForHash('SELECT 1;'));
  });
});

// ─── findLocalMigrationFile / buildLocalFilesIndex ──────────────────────────

describe('findLocalMigrationFile', () => {
  const filenames = [
    '20260623111612_foo.sql',
    '20260623111613_bar.sql',
    '20260623111614_dup_a.sql',
    '20260623111614_dup_b.sql',
  ];

  it('encontra o arquivo único com o prefixo de versão', () => {
    expect(findLocalMigrationFile('20260623111613', filenames)).toEqual({
      found: true,
      filename: '20260623111613_bar.sql',
    });
  });

  it('devolve found:false quando não há arquivo local', () => {
    expect(findLocalMigrationFile('20260101000000', filenames)).toEqual({ found: false });
  });

  it('sinaliza ambiguidade quando há colisão de versão (não escolhe um arbitrariamente)', () => {
    const result = findLocalMigrationFile('20260623111614', filenames);
    expect(result.found).toBe(false);
    expect(result.ambiguous).toBe(true);
    expect(result.candidates).toEqual(['20260623111614_dup_a.sql', '20260623111614_dup_b.sql']);
  });
});

describe('buildLocalFilesIndex', () => {
  it('lê o conteúdo do arquivo local quando existe, e devolve mapa vazio para diretório ausente', () => {
    const root = tempDir('promo-gifts-ledger-localfiles-');
    writeFileSync(join(root, '20260701000000_teste.sql'), 'SELECT 1;', 'utf8');

    const index = buildLocalFilesIndex([{ version: '20260701000000' }], root);
    expect(index.get('20260701000000')).toEqual({ filename: '20260701000000_teste.sql', content: 'SELECT 1;' });

    const emptyIndex = buildLocalFilesIndex([{ version: '20260701000000' }], join(root, 'nao-existe'));
    expect(emptyIndex.size).toBe(0);
  });
});

// ─── evaluateLedger (núcleo puro) ────────────────────────────────────────────

describe('evaluateLedger', () => {
  const allowlist = {
    cutoffVersion: '20260623111612',
    nonCanonicalExemptVersions: new Set(),
  };

  it('reporta missingStatements para linha em escopo sem statements e ignora histórico', () => {
    const rows = [
      { version: '20260101000000', name: 'historico', statements: null },
      { version: '20260623111613', name: 'nova', statements: null },
    ];
    const result = evaluateLedger({ rows, allowlist, localFiles: new Map() });
    expect(result.missingStatements).toEqual([{ version: '20260623111613', name: 'nova' }]);
  });

  it('compara por hash quando há arquivo local e statements presente, sem falsos positivos em match', () => {
    const rows = [{ version: '20260623111613', statements: ['SELECT 1;'] }];
    const localFiles = new Map([['20260623111613', { filename: 'x.sql', content: 'SELECT 1;' }]]);
    const result = evaluateLedger({ rows, allowlist, localFiles });
    expect(result.hashComparisons).toHaveLength(1);
    expect(result.hashComparisons[0].normalizedMatch).toBe(true);
    expect(result.hashMismatches).toEqual([]);
  });

  it('reporta hashMismatches (advisory) quando o conteúdo diverge de fato', () => {
    const rows = [{ version: '20260623111613', statements: ['SELECT 1;'] }];
    const localFiles = new Map([['20260623111613', { filename: 'x.sql', content: 'SELECT 2;' }]]);
    const result = evaluateLedger({ rows, allowlist, localFiles });
    expect(result.hashMismatches).toHaveLength(1);
  });
});

// ─── runCheck end-to-end (injectedRows — sem rede) ──────────────────────────

describe('runCheck', () => {
  it('FALHA quando uma linha em escopo não tem statements', async () => {
    const root = tempDir('promo-gifts-ledger-runcheck-missing-');
    const allowlistPath = join(root, 'allowlist.json');
    writeFileSync(
      allowlistPath,
      JSON.stringify({ cutoffVersion: '20260623111612', nonCanonicalExemptVersions: [] }),
      'utf8',
    );

    const report = await runCheck({
      allowlistPath,
      migrationsDir: join(root, 'migrations-inexistente'),
      rows: [
        { version: '20260101000000', name: 'historico_isento', statements: null },
        { version: '20260701000000', name: 'nova_sem_statements', statements: null },
      ],
    });

    expect(report.degraded).toBe(false);
    expect(report.ok).toBe(false);
    expect(report.missingStatements).toEqual([{ version: '20260701000000', name: 'nova_sem_statements' }]);
  });

  it('PASSA quando a linha em escopo tem statements e (se houver arquivo local) o hash normalizado bate', async () => {
    const root = tempDir('promo-gifts-ledger-runcheck-pass-');
    const allowlistPath = join(root, 'allowlist.json');
    writeFileSync(
      allowlistPath,
      JSON.stringify({ cutoffVersion: '20260623111612', nonCanonicalExemptVersions: [] }),
      'utf8',
    );
    const migrationsDir = join(root, 'migrations');
    writeFileSync(join(root, 'allowlist.json'), readFileSync(allowlistPath, 'utf8'), 'utf8');
    const fs = await import('node:fs');
    fs.mkdirSync(migrationsDir);
    fs.writeFileSync(join(migrationsDir, '20260701000000_nova.sql'), 'SELECT 1;', 'utf8');

    const report = await runCheck({
      allowlistPath,
      migrationsDir,
      rows: [{ version: '20260701000000', name: 'nova', statements: ['SELECT 1;'] }],
    });

    expect(report.degraded).toBe(false);
    expect(report.ok).toBe(true);
    expect(report.missingStatements).toEqual([]);
    expect(report.hashComparisons).toHaveLength(1);
    expect(report.hashComparisons[0].normalizedMatch).toBe(true);
  });

  it('--strict-hash promove divergência de hash a falha; sem a flag fica só advisory', async () => {
    const root = tempDir('promo-gifts-ledger-runcheck-strict-');
    const allowlistPath = join(root, 'allowlist.json');
    writeFileSync(
      allowlistPath,
      JSON.stringify({ cutoffVersion: '20260623111612', nonCanonicalExemptVersions: [] }),
      'utf8',
    );
    const migrationsDir = join(root, 'migrations');
    const fs = await import('node:fs');
    fs.mkdirSync(migrationsDir);
    fs.writeFileSync(join(migrationsDir, '20260701000000_nova.sql'), 'SELECT 2;', 'utf8');

    const rows = [{ version: '20260701000000', name: 'nova', statements: ['SELECT 1;'] }];

    const advisoryReport = await runCheck({ allowlistPath, migrationsDir, rows });
    expect(advisoryReport.ok).toBe(true);
    expect(advisoryReport.hashMismatches).toHaveLength(1);

    const strictReport = await runCheck({ allowlistPath, migrationsDir, rows, strictHash: true });
    expect(strictReport.ok).toBe(false);
    expect(strictReport.hashMismatches).toHaveLength(1);
  });

  it('sem credenciais Supabase, degrada com graça (não lança, não trava) em vez de falhar o processo', async () => {
    const envKeys = [
      'SUPABASE_ACCESS_TOKEN',
      'SUPABASE_PROJECT_REF',
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const saved = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
    for (const k of envKeys) delete process.env[k];

    try {
      const report = await runCheck(); // sem `rows` injetado → força o caminho de fetch live real
      expect(report.degraded).toBe(true);
      expect(report.reason).toBe('missing-config');
    } finally {
      for (const k of envKeys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  });
});
