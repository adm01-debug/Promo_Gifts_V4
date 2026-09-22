// PLANO_DBA E41 — testa scripts/extract-types-inventory.mjs (parser) e
// scripts/check-types-inventory-drift.mjs (gate) que substituem o proxy
// `grep -c "export type" types.ts` da REGRA #4 do CLAUDE.md.
//
// O teste central (describe "gate falha ao remover uma tabela sem
// allowlist") reproduz o incidente magazine_* (2026-07-16, commit
// 7716ae9): cria um repositório git temporário com dois commits de um
// `types.ts` fixture — o commit-base tem `magazines` em `Tables`, o commit
// atual não tem. Isso NUNCA toca o `src/integrations/supabase/types.ts`
// real do repo; é um fixture isolado em `mkdtempSync`.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  auditRemovals,
  diffInventories,
  diffContracts,
  diffLiveVsTypes,
  loadRemovalAllowlist,
  readFileAtGitRef,
  runCheck,
} from '../../scripts/check-types-inventory-drift.mjs';
import { countsOf, extractTypesInventory, extractTypesContracts } from '../../scripts/extract-types-inventory.mjs';

// ─── extractTypesInventory (parser) ────────────────────────────────────────

const FIXTURE_SOURCE = `
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { query?: string }
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      magazines: {
        Row: { id: string; title: string }
        Insert: { id?: string; title: string }
        Update: { id?: string; title?: string }
        Relationships: []
      }
      products: {
        Row: { id: string }
        Insert: { id?: string }
        Update: { id?: string }
        Relationships: []
      }
    }
    Views: {
      products_view: {
        Row: { id: string }
        Relationships: []
      }
    }
    Functions: {
      fn_search_products: {
        Args: { q: string }
        Returns: unknown
      }
    }
    Enums: {
      magazine_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;

describe('extractTypesInventory (TypeScript Compiler API)', () => {
  it.each(['export type Database = {}', 'export type Database = { public: { Tables: { broken:', 'export type Database = { public: UnknownSchema }', 'export type Database = { public: { Tables: UnknownTables } }'])('rejeita entrada vazia, truncada ou desconhecida: %s', (source) => {
    expect(() => extractTypesInventory(source)).toThrow();
  });
  it('extrai Tables/Views/Functions/Enums por schema e ignora __InternalSupabase', () => {
    const inventory = extractTypesInventory(FIXTURE_SOURCE, 'fixture.ts');

    expect(Object.keys(inventory).sort()).toEqual(['graphql_public', 'public']);
    expect(inventory.public.Tables).toEqual(['magazines', 'products']);
    expect(inventory.public.Views).toEqual(['products_view']);
    expect(inventory.public.Functions).toEqual(['fn_search_products']);
    expect(inventory.public.Enums).toEqual(['magazine_status']);
    expect(inventory.public.CompositeTypes).toEqual([]);
    expect(inventory.graphql_public.Tables).toEqual([]);
    expect(inventory.graphql_public.Functions).toEqual(['graphql']);
  });

  it('countsOf reduz o inventário a contagens por schema/categoria', () => {
    const inventory = extractTypesInventory(FIXTURE_SOURCE, 'fixture.ts');
    const counts = countsOf(inventory);

    expect(counts.public).toEqual({ Tables: 2, Views: 1, Functions: 1, Enums: 1, CompositeTypes: 0 });
  });

  it('lança erro claro quando não encontra "export type Database = { ... }"', () => {
    expect(() => extractTypesInventory('export const x = 1;', 'not-a-types-file.ts')).toThrow(
      /Não encontrei "export type Database/,
    );
  });

  it('extrai o inventário real do repo e confirma que "magazines" está presente hoje', () => {
    // Regressão direta do incidente de 2026-07-16: a tabela existe hoje e o
    // parser real (não o fixture) precisa enxergá-la.
    const realSource = readFileSync(resolve('src/integrations/supabase/types.ts'), 'utf8');
    const inventory = extractTypesInventory(realSource, 'src/integrations/supabase/types.ts');
    expect(inventory.public.Tables).toContain('magazines');
  });
});

describe('contratos detalhados', () => {
  it('ignora comentários, ordem de propriedades, whitespace e ordem de union', () => {
    const changed = FIXTURE_SOURCE.replace('id: string; title: string', 'title: string; /* anotação */ id: string')
      .replace('"draft" | "published" | "archived"', '"published" | "archived" | "draft"');
    expect(diffContracts(extractTypesContracts(FIXTURE_SOURCE), extractTypesContracts(changed)))
      .toEqual({ removed: [], added: [], changed: [] });
  });

  it.each([
    ['nulabilidade', 'title: string', 'title: string | null', ['Row', 'title']],
    ['argumento RPC', 'q: string', 'q?: string', ['Args', 'q']],
    ['retorno RPC', 'Returns: unknown', 'Returns: string', ['Returns']],
    ['FK', 'Relationships: []', 'Relationships: [{ foreignKeyName: "fk"; columns: ["id"]; referencedRelation: "products"; referencedColumns: ["id"] }]', ['Relationships']],
  ])('detecta mudança de %s sem mudar nome de objeto', (_name, from, to, member) => {
    const diff = diffContracts(extractTypesContracts(FIXTURE_SOURCE), extractTypesContracts(FIXTURE_SOURCE.replace(from, to)));
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].member).toEqual(member);
  });

  it('uma exceção da tabela inteira não autoriza remover silenciosamente uma coluna', () => {
    const removal = { schema: 'public', category: 'Tables', name: 'magazines', member: ['Row', 'title'] };
    const wholeTable = { schema: 'public', category: 'Tables', name: 'magazines' };
    expect(auditRemovals([removal], [wholeTable]).unjustified).toEqual([removal]);
    expect(auditRemovals([removal], [{ ...removal, reason: 'aprovada' }]).justified).toHaveLength(1);
  });
});

// ─── diffInventories + auditRemovals (lógica pura do gate) ────────────────

describe('diffInventories', () => {
  it('detecta remoção e adição por objeto individual, não só por contagem', () => {
    const base = extractTypesInventory(FIXTURE_SOURCE, 'base.ts');
    // Simula removendo "magazines" diretamente do inventário JSON extraído
    // (não do types.ts em disco) e adicionando uma tabela nova, para provar
    // que uma remoção não é mascarada por uma adição na mesma categoria.
    const current = JSON.parse(JSON.stringify(base));
    current.public.Tables = current.public.Tables.filter((name) => name !== 'magazines');
    current.public.Tables.push('new_table');

    const { removed, added } = diffInventories(base, current);

    expect(removed).toContainEqual({ schema: 'public', category: 'Tables', name: 'magazines' });
    expect(added).toContainEqual({ schema: 'public', category: 'Tables', name: 'new_table' });
    expect(removed).toHaveLength(1);
    expect(added).toHaveLength(1);
  });
});

describe('auditRemovals', () => {
  const removal = { schema: 'public', category: 'Tables', name: 'magazines' };

  it('classifica uma remoção sem allowlist como não justificada (fail-closed)', () => {
    const { justified, unjustified } = auditRemovals([removal], []);
    expect(unjustified).toEqual([removal]);
    expect(justified).toEqual([]);
  });

  it('classifica uma remoção coberta pela allowlist como justificada', () => {
    const entry = {
      schema: 'public',
      category: 'Tables',
      name: 'magazines',
      reason: 'migrada para magazine_v2 — ver PR #999',
      approvedBy: 'PO Teste',
      date: '2026-09-16',
    };
    const { justified, unjustified } = auditRemovals([removal], [entry]);
    expect(unjustified).toEqual([]);
    expect(justified).toHaveLength(1);
    expect(justified[0].justification).toEqual(entry);
  });
});

// ─── loadRemovalAllowlist ───────────────────────────────────────────────────

describe('loadRemovalAllowlist', () => {
  const temporaryRoots = [];
  afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function tempFile(content) {
    const root = mkdtempSync(join(tmpdir(), 'promo-gifts-types-allowlist-'));
    temporaryRoots.push(root);
    const path = join(root, 'allowlist.json');
    writeFileSync(path, content, 'utf8');
    return path;
  }

  it('devolve [] quando o arquivo não existe', () => {
    expect(loadRemovalAllowlist('/tmp/does-not-exist-promo-gifts.json')).toEqual([]);
  });

  it('aceita {entries: [...]} e valida campos obrigatórios', () => {
    const path = tempFile(
      JSON.stringify({
        entries: [
          {
            schema: 'public',
            category: 'Tables',
            name: 'magazines',
            reason: 'x',
            approvedBy: 'PO',
            date: '2026-09-16',
          },
        ],
      }),
    );
    expect(loadRemovalAllowlist(path)).toHaveLength(1);
  });

  it('lança erro quando uma entrada está incompleta', () => {
    const path = tempFile(JSON.stringify({ entries: [{ schema: 'public', category: 'Tables' }] }));
    expect(() => loadRemovalAllowlist(path)).toThrow(/incompleta/);
  });

  it('lança erro quando a categoria é inválida', () => {
    const path = tempFile(
      JSON.stringify({
        entries: [
          {
            schema: 'public',
            category: 'NotACategory',
            name: 'x',
            reason: 'x',
            approvedBy: 'PO',
            date: '2026-09-16',
          },
        ],
      }),
    );
    expect(() => loadRemovalAllowlist(path)).toThrow(/category "NotACategory" inválida/);
  });
});

// ─── diffLiveVsTypes (checagem (b), lógica pura) ───────────────────────────

describe('diffLiveVsTypes', () => {
  it('lista tabelas/views/enums vivas ausentes de types.ts e ignora Functions', () => {
    const liveRows = [
      { category: 'Tables', name: 'magazines' },
      { category: 'Tables', name: 'orphan_live_table' },
      { category: 'Views', name: 'products_view' },
      { category: 'Enums', name: 'magazine_status' },
    ];
    const currentInventory = {
      public: {
        Tables: ['magazines'],
        Views: ['products_view'],
        Functions: [],
        Enums: ['magazine_status'],
        CompositeTypes: [],
      },
    };

    const missing = diffLiveVsTypes(liveRows, currentInventory);
    expect(missing).toEqual([{ schema: 'public', category: 'Tables', name: 'orphan_live_table' }]);
  });
});

// ─── runCheck end-to-end: repositório git temporário (fixture isolado) ────

describe('gate end-to-end: repositório git temporário', () => {
  const temporaryRoots = [];
  afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function buildFixtureTypesSource(tableNames) {
    const entries = tableNames
      .map(
        (name) =>
          `      ${name}: { Row: { id: string }, Insert: { id?: string }, Update: { id?: string }, Relationships: [] }`,
      )
      .join('\n');
    return `export type Database = {
  public: {
    Tables: {
${entries}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;
  }

  function initFixtureRepo() {
    const root = mkdtempSync(join(tmpdir(), 'promo-gifts-types-inventory-drift-'));
    temporaryRoots.push(root);
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Teste E41'], { cwd: root });
    return root;
  }

  function commitFixtureTypes(root, tableNames, message) {
    writeFileSync(join(root, 'types.ts'), buildFixtureTypesSource(tableNames), 'utf8');
    execFileSync('git', ['add', 'types.ts'], { cwd: root });
    execFileSync('git', ['commit', '-q', '-m', message], { cwd: root });
  }

  it('readFileAtGitRef lê o arquivo em um commit anterior', () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines', 'products'], 'commit base');

    const result = readFileAtGitRef('HEAD', join(root, 'types.ts'), { root });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('magazines');
  });

  it('readFileAtGitRef sinaliza skip (não erro fatal) quando o ref não existe', () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'único commit');

    // HEAD~1 não existe — repositório com um único commit (equivalente a um
    // clone raso fetch-depth=1 em CI).
    const result = readFileAtGitRef('HEAD~1', join(root, 'types.ts'), { root });
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('FALHA o gate quando "magazines" é removida entre o commit-base e o atual, sem allowlist', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines', 'products'], 'base: magazines presente');
    commitFixtureTypes(root, ['products'], 'atual: magazines removida (simula incidente 2026-07-16)');

    const report = await runCheck({
      path: join(root, 'types.ts'),
      base: 'HEAD~1',
      allowlistPath: join(root, 'allowlist-inexistente.json'),
      root,
    });

    expect(report.ok).toBe(false);
    expect(report.localDiff.skipped).toBe(false);
    expect(report.localDiff.unjustified).toContainEqual({
      schema: 'public',
      category: 'Tables',
      name: 'magazines',
    });
    expect(report.localDiff.justified).toEqual([]);
  });

  it('PASSA o gate quando a remoção de "magazines" está coberta pela allowlist', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines', 'products'], 'base: magazines presente');
    commitFixtureTypes(root, ['products'], 'atual: magazines removida, com allowlist');

    const allowlistPath = join(root, 'allowlist.json');
    writeFileSync(
      allowlistPath,
      JSON.stringify({
        entries: [
          {
            schema: 'public',
            category: 'Tables',
            name: 'magazines',
            reason: 'teste E41 — remoção simulada e justificada',
            approvedBy: 'PO Teste',
            date: '2026-09-16',
          },
        ],
      }),
      'utf8',
    );

    const report = await runCheck({
      path: join(root, 'types.ts'),
      base: 'HEAD~1',
      allowlistPath,
      root,
    });

    expect(report.ok).toBe(true);
    expect(report.localDiff.unjustified).toEqual([]);
    expect(report.localDiff.justified).toHaveLength(1);
  });

  it('falha fechado quando o commit-base não existe — comparação não realizada não é sucesso', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'único commit');

    const report = await runCheck({
      path: join(root, 'types.ts'),
      base: 'HEAD~1',
      allowlistPath: join(root, 'allowlist-inexistente.json'),
      root,
    });

    expect(report.localDiff.skipped).toBe(true);
    expect(report.localDiff.toolingError).toBe(true);
    expect(report.ok).toBe(false);
  });

  it('não consulta banco implicitamente, mesmo com credenciais disponíveis', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'base');
    const queryLive = vi.fn().mockResolvedValue({ ok: true, rows: [] });
    await runCheck({ path: join(root, 'types.ts'), base: 'HEAD', root, queryLive });
    expect(queryLive).not.toHaveBeenCalled();
    await runCheck({ path: join(root, 'types.ts'), base: 'HEAD', root, live: true, queryLive });
    expect(queryLive).toHaveBeenCalledTimes(1);
  });

  it('report.ok é falso se a leitura live explicitamente solicitada não estiver disponível', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'base');
    const queryLive = vi.fn().mockResolvedValue({ ok: false, reason: 'credencial ausente' });
    const report = await runCheck({ path: join(root, 'types.ts'), base: 'HEAD', root, live: true, queryLive });
    expect(report.ok).toBe(false);
    expect(report.liveDiff.toolingError).toBe(true);
  });

  it('detecta coluna perdida sem mudar o nome nem a quantidade de tabelas', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'base');
    writeFileSync(join(root, 'types.ts'), buildFixtureTypesSource(['magazines']).replace('Row: { id: string }', 'Row: { replacement: string }'));
    const report = await runCheck({ path: join(root, 'types.ts'), base: 'HEAD', root });
    expect(report.ok).toBe(false);
    expect(report.localDiff.unjustified).toContainEqual({ schema: 'public', category: 'Tables', name: 'magazines', member: ['Row', 'id'] });
  });

  it.each([
    ['coluna nova', 'Row: { id: string }', 'Row: { id: string; product_variant_id: string | null }'],
    ['tipo da coluna', 'Row: { id: string }', 'Row: { id: number }'],
    ['RPC nova', 'Functions: {', 'Functions: { set_custom_kit_pinned: { Args: { pinned: boolean }; Returns: boolean };'],
  ])('--generated falha com %s e identifica o contrato', async (_name, from, to) => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'base');
    const generatedPath = join(root, 'generated.ts');
    // Mapped type Functions vazio precisa ser substituído integralmente no caso RPC.
    const base = buildFixtureTypesSource(['magazines']);
    const candidate = _name === 'RPC nova'
      ? base.replace(/Functions: \{\s*\[_ in never\]: never\s*\}/, 'Functions: { set_custom_kit_pinned: { Args: { pinned: boolean }; Returns: boolean } }')
      : base.replace(from, to);
    writeFileSync(generatedPath, candidate);
    const report = await runCheck({ path: join(root, 'types.ts'), base: 'HEAD', root, generatedPath });
    expect(report.ok).toBe(false);
    expect(report.generatedDiff.contracts.added.length + report.generatedDiff.contracts.changed.length).toBeGreaterThan(0);
  });

  it('--generated passa somente quando ambos os contratos coincidem', async () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'base');
    const generatedPath = join(root, 'generated.ts');
    writeFileSync(generatedPath, buildFixtureTypesSource(['magazines']));
    const report = await runCheck({ path: join(root, 'types.ts'), base: 'HEAD', root, generatedPath });
    expect(report.ok).toBe(true);
    expect(report.generatedDiff.contracts).toEqual({ added: [], removed: [], changed: [] });
  });

  it('CLI devolve exit 2 e JSON ok:false quando a base é inválida', () => {
    const script = resolve('scripts/check-types-inventory-drift.mjs');
    try {
      execFileSync(process.execPath, [script, '--base', 'refs/does-not-exist', '--json'], { encoding: 'utf8', stdio: 'pipe' });
      throw new Error('CLI indevidamente aprovada');
    } catch (error) {
      expect(error.status).toBe(2);
      expect(JSON.parse(error.stdout).ok).toBe(false);
    }
  });

  it('CLI devolve exit 1 e diagnóstico de coluna quando a geração diverge', () => {
    const root = initFixtureRepo();
    commitFixtureTypes(root, ['magazines'], 'base');
    const generatedPath = join(root, 'generated.ts');
    writeFileSync(generatedPath, buildFixtureTypesSource(['magazines']).replace('Row: { id: string }', 'Row: { id: string; missing_column: number }'));
    const script = resolve('scripts/check-types-inventory-drift.mjs');
    try {
      execFileSync(process.execPath, [script, '--base', 'HEAD', '--generated', generatedPath, '--json'], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 });
      throw new Error('CLI indevidamente aprovada');
    } catch (error) {
      expect(error.status).toBe(1);
      const report = JSON.parse(error.stdout);
      expect(report.ok).toBe(false);
      expect(report.generatedDiff.contracts.added.some((entry) => entry.member.join('.') === 'Row.missing_column')).toBe(true);
    }
  });
});
