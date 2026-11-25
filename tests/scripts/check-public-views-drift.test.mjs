// PLANO_DBA E16 — testa scripts/check-public-views-drift.mjs, o gate que
// substitui scripts/check-public-views-columns.mjs (PR #1830, auditoria r3,
// 2026-09-05) como dono do contrato `.security/public-views-columns.json`
// (as 8 views `v_*_public` com `security_invoker=false`, todas com SELECT
// para `anon` — mecanismo que substituiu GRANTs diretos em tabela, ver
// docs/SCHEMA_REFERENCE.md §P6).
//
// Padrão de teste espelha tests/scripts/check-types-inventory-drift.test.mjs
// (E41): importa as funções puras do script (não só invoca via subprocess)
// e reproduz, via fixture local, o cenário que motivou o gate — aqui, uma
// coluna nova (ou sensível) aparecendo numa view pública sem passar pelo
// contrato. Nenhum destes testes toca o banco real; `diffLive` recebe
// sempre `liveRows` construído em memória.
//
// tests/security/public-views-columns.test.ts (pré-existente) cobre o
// mesmo gate via subprocess (spawnSync + --live <arquivo>); este arquivo
// complementa testando a lógica pura unitariamente, sem custo de spawn.
import { describe, expect, it } from 'vitest';
import {
  diffAnonTables,
  diffLive,
  findUnacknowledgedSensitiveColumns,
  loadAnonTablesBaseline,
  loadContract,
  PUBLIC_VIEWS,
  SENSITIVE_PATTERNS,
  validateAnonTablesBaseline,
  validateContractStructure,
} from '../../scripts/check-public-views-drift.mjs';

// ─── loadContract + validateContractStructure sobre o contrato real ───────

describe('contrato real (.security/public-views-columns.json)', () => {
  it('cobre exatamente as 10 views do contrato público', () => {
    const contract = loadContract();
    expect(Object.keys(contract.views).sort()).toEqual([...PUBLIC_VIEWS].sort());
  });

  it('passa a validação estrutural hoje (0 erros) — nenhuma coluna sensível sem allowlist', () => {
    const contract = loadContract();
    const errors = validateContractStructure(contract);
    expect(errors).toEqual([]);
  });

  it('v_products_public documenta ncm_code/ncm_id/bitrix_product_id como REQUER-PO', () => {
    // Achado central da E16: essas 3 colunas passam sem máscara (NULL) na
    // view — não são erro do gate, mas precisam estar reconhecidas.
    const contract = loadContract();
    const ack = contract.views.v_products_public.sensitive_acknowledged;
    for (const col of ['ncm_code', 'ncm_id', 'bitrix_product_id']) {
      expect(ack[col]?.status).toBe('REQUER-PO');
    }
  });
});

// ─── findUnacknowledgedSensitiveColumns (lógica pura) ──────────────────────

describe('findUnacknowledgedSensitiveColumns', () => {
  it('ignora coluna sensível mascarada para NULL (masked_null)', () => {
    const findings = findUnacknowledgedSensitiveColumns(['cost_price', 'name'], {
      masked_null: ['cost_price'],
    });
    expect(findings).toEqual([]);
  });

  it('ignora coluna sensível já em sensitive_acknowledged', () => {
    const findings = findUnacknowledgedSensitiveColumns(['ncm_code'], {
      sensitive_acknowledged: { ncm_code: { status: 'REQUER-PO' } },
    });
    expect(findings).toEqual([]);
  });

  it('reporta coluna sensível nova, sem masked_null nem sensitive_acknowledged', () => {
    const findings = findUnacknowledgedSensitiveColumns(['cnpj', 'name'], {});
    expect(findings).toEqual([{ column: 'cnpj', pattern: 'pii-document' }]);
  });

  it('cobre os padrões centrais da E16: cost, custo, supplier_price, ncm, bitrix, PII', () => {
    const labels = SENSITIVE_PATTERNS.map((p) => p.label);
    for (const l of ['cost', 'custo', 'supplier_price', 'ncm', 'bitrix', 'pii-email', 'pii-document']) {
      expect(labels).toContain(l);
    }
  });
});

// ─── diffLive: reproduz "coluna nova aparece numa view pública" ───────────

describe('diffLive (mutation: coluna extra aparecendo ao vivo)', () => {
  function liveRowsFromContract(contract) {
    return PUBLIC_VIEWS.map((relname) => ({ relname, columns: [...contract.views[relname].columns] }));
  }

  it('PASSA (0 erros) quando o banco ao vivo bate exatamente com o contrato', () => {
    const contract = loadContract();
    const liveRows = liveRowsFromContract(contract);
    expect(diffLive(contract, liveRows)).toEqual([]);
  });

  it('FALHA quando uma coluna nova (não sensível) aparece numa view ao vivo', () => {
    const contract = loadContract();
    const liveRows = liveRowsFromContract(contract);
    liveRows.find((r) => r.relname === 'v_suppliers_public').columns.push('new_totally_unrelated_column');

    const errors = diffLive(contract, liveRows);
    expect(errors.some((e) => e.includes('colunas NOVAS') && e.includes('new_totally_unrelated_column'))).toBe(
      true,
    );
  });

  it('FALHA e sinaliza achado sensível quando a coluna nova bate num padrão sensível (ex.: cnpj)', () => {
    const contract = loadContract();
    const liveRows = liveRowsFromContract(contract);
    liveRows.find((r) => r.relname === 'v_suppliers_public').columns.push('cnpj');

    const errors = diffLive(contract, liveRows);
    expect(errors.some((e) => e.includes('colunas NOVAS') && e.includes('cnpj'))).toBe(true);
    expect(errors.some((e) => e.includes('pii-document') && e.includes('cnpj'))).toBe(true);
  });

  it('FALHA quando uma coluna da lista forbidden aparece ao vivo', () => {
    const contract = loadContract();
    const liveRows = liveRowsFromContract(contract);
    liveRows.find((r) => r.relname === 'v_suppliers_public').columns.push('api_credentials');

    const errors = diffLive(contract, liveRows);
    expect(errors.some((e) => e.includes('PROIBIDA') && e.includes('api_credentials'))).toBe(true);
  });

  it('FALHA quando uma view do contrato está ausente no banco', () => {
    const contract = loadContract();
    const liveRows = liveRowsFromContract(contract).filter((r) => r.relname !== 'v_products_public');
    const errors = diffLive(contract, liveRows);
    expect(errors.some((e) => e.includes('v_products_public') && e.includes('ausente no banco'))).toBe(true);
  });

  it('FALHA quando o banco tem uma 9ª view v_*_public SECDEF sem entrada no contrato', () => {
    const contract = loadContract();
    const liveRows = liveRowsFromContract(contract);
    liveRows.push({ relname: 'v_new_unlisted_public', columns: ['id'] });
    const errors = diffLive(contract, liveRows);
    expect(errors.some((e) => e.includes('v_new_unlisted_public') && e.includes('sem entrada no contrato'))).toBe(
      true,
    );
  });
});

// ─── Etapa 008: tabelas legíveis por anon (o gate antes só olhava view/matview) ─

describe('baseline de tabelas legíveis por anon (.security/anon-tables-baseline.json)', () => {
  it('passa a validação estrutural hoje (0 erros)', () => {
    expect(validateAnonTablesBaseline(loadAnonTablesBaseline())).toEqual([]);
  });

  it('registra as tabelas internas que ainda têm grant herdado, como dívida explícita', () => {
    const doc = loadAnonTablesBaseline();
    const internas = doc.tables.filter((t) => t.exposure === 'interno-grant-herdado').map((t) => t.table);
    expect(internas).toContain('video_sim_results');
    expect(internas).toContain('system_settings');
  });

  it('tabela nova legível por anon fora da baseline falha o gate', () => {
    const doc = { tables: [{ table: 'categorias_publicas', exposure: 'catalogo-publico', reason: 'x' }] };
    const errors = diffAnonTables(doc, [
      { relname: 'categorias_publicas', relkind: 'r', anon_select: true, anon_columns: ['id'] },
      { relname: 'tabela_nova_sem_revisao', relkind: 'r', anon_select: true, anon_columns: ['id', 'custo'] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('tabela_nova_sem_revisao');
    expect(errors[0]).toContain('anon-tables-baseline.json');
  });

  it('tabela com SELECT só por coluna (relkind r) também conta como exposta', () => {
    const errors = diffAnonTables({ tables: [] }, [
      { relname: 'suppliers', relkind: 'r', anon_select: false, anon_columns: ['id', 'name'] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('suppliers');
  });

  it('entrada da baseline sem privilégio no banco falha — revogação exige limpar a linha', () => {
    const doc = { tables: [{ table: 'ja_revogada', exposure: 'catalogo-publico', reason: 'x' }] };
    const errors = diffAnonTables(doc, [{ relname: 'ja_revogada', relkind: 'r', anon_select: false, anon_columns: [] }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('remover a entrada');
  });

  it('tabela sem privilégio e fora da baseline não gera ruído', () => {
    const errors = diffAnonTables({ tables: [] }, [
      { relname: 'quotes', relkind: 'r', anon_select: false, anon_columns: [] },
      { relname: 'v_products_public', relkind: 'v', anon_select: true, anon_columns: ['id'] },
    ]);
    expect(errors).toEqual([]);
  });

  it('entrada com columns congela a coluna: coluna nova legível por anon falha', () => {
    const doc = {
      tables: [{ table: 'products', exposure: 'catalogo-publico-por-coluna', reason: 'x', columns: ['id', 'name'] }],
    };
    expect(
      diffAnonTables(doc, [
        { relname: 'products', relkind: 'r', anon_select: false, anon_columns: ['id', 'name'], columns: ['id', 'name', 'cost_price'] },
      ]),
    ).toEqual([]);
    const errors = diffAnonTables(doc, [
      { relname: 'products', relkind: 'r', anon_select: false, anon_columns: ['id', 'name', 'cost_price'], columns: ['id', 'name', 'cost_price'] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('cost_price');
  });

  it('entrada sem columns (null) não congela coluna, só o nome', () => {
    const doc = { tables: [{ table: 'tags', exposure: 'catalogo-publico', reason: 'x', columns: null }] };
    expect(
      diffAnonTables(doc, [{ relname: 'tags', relkind: 'r', anon_select: true, anon_columns: ['a', 'b', 'c'], columns: ['a', 'b', 'c'] }]),
    ).toEqual([]);
  });

  it('entrada sem reason ou com TODO é rejeitada na validação estrutural', () => {
    const errors = validateAnonTablesBaseline({
      measured_at: '2026-11-24',
      tables: [
        { table: 'a', exposure: 'catalogo-publico' },
        { table: 'b', exposure: 'catalogo-publico', reason: 'TODO revisar' },
        { table: 'c', exposure: 'outro', reason: 'ok' },
      ],
    });
    expect(errors).toHaveLength(3);
  });
});
