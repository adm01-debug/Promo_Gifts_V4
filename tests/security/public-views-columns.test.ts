import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SCRIPT = 'scripts/check-public-views-drift.mjs';
const CONTRACT = JSON.parse(readFileSync('.security/public-views-columns.json', 'utf8')) as {
  views: Record<
    string,
    { columns: string[]; forbidden?: string[]; masked_null?: string[]; anon_select?: boolean }
  >;
};
const ANON_ALLOWLIST = JSON.parse(readFileSync('.security/anon-select-allowlist.json', 'utf8')) as {
  objects: { object: string; relkind: string; columns: string[]; reason: string }[];
};
const ANON_TABLES = JSON.parse(readFileSync('.security/anon-tables-baseline.json', 'utf8')) as {
  tables: { table: string; exposure: string; reason: string }[];
};

const PUBLIC_VIEWS = [
  'v_compras_catalogo',
  'v_compras_precos_faixa',
  'v_kit_component_media_public',
  'v_product_compositions_public',
  'v_product_properties_public',
  'v_product_tags_public',
  'v_products_public',
  'v_suppliers_public',
  'v_tabela_preco_gravacao_oficial_public',
  'v_variant_sale_prices_public',
];

function run(args: string[] = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

type LiveRow = { relname: string; relkind?: string; columns?: string[]; anon_select?: boolean; anon_columns?: string[] };

/** Banco fictício coerente com os três arquivos de contrato: 10 views + 7 objetos da allowlist + tabelas da baseline. */
function buildLive() {
  const contract: LiveRow[] = PUBLIC_VIEWS.map((relname) => ({
    relname,
    columns: [...CONTRACT.views[relname].columns],
  }));
  const anon: LiveRow[] = [
    ...PUBLIC_VIEWS.map((relname) => {
      const spec = CONTRACT.views[relname];
      const exposed = spec.anon_select !== false;
      return {
        relname,
        relkind: 'v',
        anon_select: exposed,
        columns: [...spec.columns],
        anon_columns: exposed ? [...spec.columns] : [],
      };
    }),
    ...ANON_ALLOWLIST.objects.map((o) => ({
      relname: o.object,
      relkind: o.relkind,
      anon_select: true,
      columns: [...o.columns],
      anon_columns: [...o.columns],
    })),
    // Etapa 008: tabelas legíveis por anon entram na baseline, não no contrato de views.
    ...ANON_TABLES.tables.map((t) => ({
      relname: t.table,
      relkind: 'r',
      anon_select: true,
      columns: ['id'],
      anon_columns: ['id'],
    })),
  ];
  return { contract, anon };
}

function runLive(mutate?: (db: ReturnType<typeof buildLive>) => void) {
  const db = buildLive();
  if (mutate) mutate(db);
  const dir = mkdtempSync(join(tmpdir(), 'pvc-anon-'));
  const f = join(dir, 'live.json');
  writeFileSync(f, JSON.stringify(db));
  return run(['--live', f]);
}

describe('contrato de colunas das views SECURITY DEFINER públicas', () => {
  it('cobre exatamente as 10 views do contrato público', () => {
    expect(Object.keys(CONTRACT.views).sort()).toEqual([...PUBLIC_VIEWS].sort());
  });

  it('v_suppliers_public nunca expõe credenciais/markup/contato', () => {
    const cols = CONTRACT.views.v_suppliers_public.columns;
    for (const f of ['api_credentials', 'api_base_url', 'default_markup_percent', 'cnpj', 'email', 'phone']) {
      expect(cols, f).not.toContain(f);
    }
  });

  it('v_tabela_preco_gravacao_oficial_public nunca expõe custos internos', () => {
    const cols = CONTRACT.views.v_tabela_preco_gravacao_oficial_public.columns;
    for (const f of ['custo_setup', 'markup_percent', 'custo_aplicacao', 'faturamento_minimo']) {
      expect(cols, f).not.toContain(f);
    }
  });

  it('v_products_public declara as colunas mascaradas como NULL', () => {
    expect(CONTRACT.views.v_products_public.masked_null).toEqual(
      expect.arrayContaining(['cost_price', 'organization_id', 'created_by']),
    );
  });

  it('script passa com o contrato atual', () => {
    const r = run();
    expect(r.status, r.stderr).toBe(0);
  });

  it('script falha quando o banco expõe coluna nova ou proibida', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pvc-'));
    const live = PUBLIC_VIEWS.map((relname) => ({ relname, columns: [...CONTRACT.views[relname].columns] }));
    live.find((v) => v.relname === 'v_suppliers_public')!.columns.push('api_credentials');
    const f = join(dir, 'live.json');
    writeFileSync(f, JSON.stringify(live));
    const r = run(['--live', f]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/api_credentials/);
  });

  it('script passa em modo live quando o banco bate com o contrato', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pvc-'));
    const live = PUBLIC_VIEWS.map((relname) => ({ relname, columns: [...CONTRACT.views[relname].columns] }));
    const f = join(dir, 'live.json');
    writeFileSync(f, JSON.stringify(live));
    const r = run(['--live', f]);
    expect(r.status, r.stderr).toBe(0);
  });

  it('script passa em modo live com a exposição anon descrita pelo contrato + allowlist', () => {
    const r = runLive();
    expect(r.status, r.stderr).toBe(0);
  });

  it('script falha quando objeto de public fica legível por anon fora do contrato', () => {
    const r = runLive((db) => {
      db.anon.push({
        relname: 'v_nova_public',
        relkind: 'v',
        anon_select: true,
        columns: ['id', 'unit_cost'],
        anon_columns: ['id', 'unit_cost'],
      });
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/v_nova_public.*sem entrada no contrato/);
    expect(r.stderr).toMatch(/unit_cost/);
  });

  it('script falha quando a allowlist está obsoleta (objeto perdeu o grant anon)', () => {
    const r = runLive((db) => {
      db.anon = db.anon.filter((row) => row.relname !== 'v_tags_public');
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/v_tags_public: entrada da allowlist sem efeito/);
  });

  it('script falha quando uma coluna nova passa a ser legível por anon em objeto da allowlist', () => {
    const r = runLive((db) => {
      const row = db.anon.find((o) => o.relname === 'v_site_products_public')!;
      row.columns = [...(row.columns ?? []), 'cost_price'];
      row.anon_columns = [...(row.anon_columns ?? []), 'cost_price'];
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/v_site_products_public: colunas NOVAS legíveis por anon.*cost_price/);
  });

  it('script falha quando o anon recupera SELECT em view marcada anon_select=false', () => {
    const r = runLive((db) => {
      const row = db.anon.find((o) => o.relname === 'v_compras_catalogo')!;
      row.anon_select = true;
      row.anon_columns = [...(row.columns ?? [])];
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/v_compras_catalogo: o contrato marca anon_select=false/);
  });

  it('script falha quando o contrato espera SELECT anon e a view não tem o grant', () => {
    const r = runLive((db) => {
      db.anon = db.anon.filter((row) => row.relname !== 'v_products_public');
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/v_products_public: o contrato espera SELECT para anon/);
  });
});
