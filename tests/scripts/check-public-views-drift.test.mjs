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
  diffLive,
  findUnacknowledgedSensitiveColumns,
  loadContract,
  PUBLIC_VIEWS,
  SENSITIVE_PATTERNS,
  validateContractStructure,
} from '../../scripts/check-public-views-drift.mjs';

// ─── loadContract + validateContractStructure sobre o contrato real ───────

describe('contrato real (.security/public-views-columns.json)', () => {
  it('cobre exatamente as 8 views SECURITY DEFINER expostas ao anon', () => {
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
