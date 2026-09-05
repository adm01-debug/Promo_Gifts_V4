import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SCRIPT = 'scripts/check-public-views-columns.mjs';
const CONTRACT = JSON.parse(readFileSync('.security/public-views-columns.json', 'utf8')) as {
  views: Record<string, { columns: string[]; forbidden?: string[]; masked_null?: string[] }>;
};

const PUBLIC_VIEWS = [
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

describe('contrato de colunas das views SECURITY DEFINER públicas', () => {
  it('cobre exatamente as 8 views expostas ao anon', () => {
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
});
