/**
 * Regression guard for bulk product import (batch-import.ts).
 *
 * Two bugs this protects against:
 *  - imported rows lacked organization_id → the products RLS INSERT policy
 *    (is_org_owner_or_admin(organization_id)) rejected every row.
 *  - 'upsert' mode used the batch_insert (plain INSERT) op → unique-sku violations on
 *    existing rows; it must use the real upsert op with onConflict='sku'.
 *  - the phantom `image_url` field (no such column) must be dropped / folded into
 *    primary_image_url so the write doesn't 400 (PGRST204).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const dbInvokeMock = vi.fn();
vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: (opts: unknown) => dbInvokeMock(opts),
}));

import { executeBatchImport, type ImportRow } from './batch-import';

const ORG = '5db5aee1-064b-4ef4-9193-345dcd8274ea';

beforeEach(() => {
  dbInvokeMock.mockReset();
  dbInvokeMock.mockResolvedValue({ records: [{ id: '1', sku: 'A', name: 'A' }], count: 1 });
});

describe('executeBatchImport', () => {
  it('injects organization_id and folds phantom image_url into primary_image_url (insert mode)', async () => {
    const rows: ImportRow[] = [
      { sku: 'A', name: 'Prod A', sale_price: 10, image_url: 'https://cdn/x/a.jpg' },
    ];
    await executeBatchImport(rows, 'insert');

    expect(dbInvokeMock).toHaveBeenCalledTimes(1);
    const opts = dbInvokeMock.mock.calls[0][0] as {
      table: string;
      operation: string;
      data: Array<Record<string, unknown>>;
      onConflict?: string;
    };
    expect(opts.table).toBe('products');
    expect(opts.operation).toBe('batch_insert');
    const sent = opts.data[0];
    expect(sent.organization_id).toBe(ORG);
    expect(sent).not.toHaveProperty('image_url');
    expect(sent.primary_image_url).toBe('https://cdn/x/a.jpg');
  });

  it('uses the real upsert op with onConflict=sku in upsert mode (and still sets org)', async () => {
    const rows: ImportRow[] = [{ sku: 'B', name: 'Prod B', sale_price: 5 }];
    await executeBatchImport(rows, 'upsert');

    const opts = dbInvokeMock.mock.calls[0][0] as {
      operation: string;
      onConflict?: string;
      data: Array<Record<string, unknown>>;
    };
    expect(opts.operation).toBe('upsert');
    expect(opts.onConflict).toBe('sku');
    expect(opts.data[0].organization_id).toBe(ORG);
  });

  it('does not overwrite an explicit primary_image_url with image_url', async () => {
    const rows: ImportRow[] = [
      {
        sku: 'C',
        name: 'Prod C',
        sale_price: 1,
        image_url: 'https://cdn/x/fallback.jpg',
        primary_image_url: 'https://cdn/x/primary.jpg',
      },
    ];
    await executeBatchImport(rows, 'insert');
    const sent = (dbInvokeMock.mock.calls[0][0] as { data: Array<Record<string, unknown>> })
      .data[0];
    expect(sent.primary_image_url).toBe('https://cdn/x/primary.jpg');
    expect(sent).not.toHaveProperty('image_url');
  });

  it('lote misto: linhas com e sem ships_separately saem em pedidos de chaves iguais, na ordem da planilha', async () => {
    // 3 linhas: A (com campo), B (sem), C (com). Lotes contíguos: [A], [B], [C] = 3 pedidos.
    const rows: ImportRow[] = [
      { sku: 'A', name: 'A', sale_price: 1, ships_separately: true },
      { sku: 'B', name: 'B', sale_price: 1 },
      { sku: 'C', name: 'C', sale_price: 1, ships_separately: false },
    ];
    dbInvokeMock.mockImplementation((opts: { data: unknown[] }) =>
      Promise.resolve({
        records: opts.data.map((_, k) => ({ id: String(k) })),
      }),
    );
    const r = await executeBatchImport(rows, 'upsert');

    expect(dbInvokeMock).toHaveBeenCalledTimes(3);
    const pedidos = dbInvokeMock.mock.calls.map(
      (c) => (c[0] as { data: Array<Record<string, unknown>> }).data,
    );
    expect(pedidos.map((p) => p.map((d) => d.sku))).toEqual([['A'], ['B'], ['C']]);
    expect(pedidos[0][0].ships_separately).toBe(true);
    expect(pedidos[1][0]).not.toHaveProperty('ships_separately');
    expect(pedidos[2][0].ships_separately).toBe(false);
    expect(r.succeeded).toBe(3);
    expect(r.failed).toBe(0);
  });

  it('planilha alternada de 51 linhas: nada perdido nem duplicado e faixa de erro exata', async () => {
    // 51 linhas alternando com/sem campo (linha 1 com): cada linha vira um lote = 51 pedidos.
    // Entrada 51 = enviadas 51 (26 com + 25 sem). O pedido 30 (linha 30, sem campo) é recusado:
    // a faixa de erro tem de ser exatamente 30-30.
    const rows: ImportRow[] = Array.from({ length: 51 }, (_, k) => ({
      sku: `S${k + 1}`,
      name: `N${k + 1}`,
      sale_price: 1,
      ...(k % 2 === 0 ? { ships_separately: true } : {}),
    }));
    dbInvokeMock.mockImplementation((opts: { data: Array<{ sku: string }> }) =>
      opts.data[0].sku === 'S30'
        ? Promise.reject(new Error('duplicate key'))
        : Promise.resolve({ records: opts.data.map((d) => ({ id: d.sku })) }),
    );
    const r = await executeBatchImport(rows, 'insert');

    const enviados = dbInvokeMock.mock.calls.flatMap((c) =>
      (c[0] as { data: Array<{ sku: string }> }).data.map((d) => d.sku),
    );
    expect(enviados).toEqual(rows.map((x) => x.sku));
    expect(new Set(enviados).size).toBe(51);
    expect(r.succeeded + r.failed).toBe(51);
    expect(r.failed).toBe(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].startRow).toBe(30);
    expect(r.errors[0].endRow).toBe(30);
  });

  it('faixa de erro de um lote de 25 contíguos aponta as linhas daquele lote', async () => {
    // Linhas 1-2 sem campo, 3-30 com campo: lotes [1-2], [3-27] (25), [28-30].
    // O lote do meio é recusado: faixa esperada 3-27.
    const rows: ImportRow[] = Array.from({ length: 30 }, (_, k) => ({
      sku: `T${k + 1}`,
      name: 'n',
      sale_price: 1,
      ...(k >= 2 ? { ships_separately: false } : {}),
    }));
    dbInvokeMock.mockImplementation((opts: { data: Array<{ sku: string }> }) =>
      opts.data[0].sku === 'T3'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ records: opts.data.map((d) => ({ id: d.sku })) }),
    );
    const r = await executeBatchImport(rows, 'insert');
    expect(r.errors.map((e) => [e.startRow, e.endRow])).toEqual([[3, 27]]);
    expect(r.succeeded).toBe(5);
    expect(r.failed).toBe(25);
  });

  it('SKU repetido (linha 3 vazia, linha 40 "Sim"): o último pedido que cita o SKU é o da linha 40', async () => {
    // Linhas 1-51; linha 3 e linha 40 com o SKU 'DUP'. Cada pedido segue a ordem da planilha,
    // então o pedido da linha 40 é enviado depois do da linha 3 (última linha vence, como na main).
    const rows: ImportRow[] = Array.from({ length: 51 }, (_, k) => ({
      sku: k === 2 || k === 39 ? 'DUP' : `U${k + 1}`,
      name: `linha ${k + 1}`,
      sale_price: 1,
      ...(k === 39 ? { ships_separately: true } : {}),
    }));
    dbInvokeMock.mockImplementation((opts: { data: unknown[] }) =>
      Promise.resolve({ records: opts.data.map((_, k) => ({ id: String(k) })) }),
    );
    await executeBatchImport(rows, 'upsert');
    const pedidos = dbInvokeMock.mock.calls.map(
      (c) => (c[0] as { data: Array<Record<string, unknown>> }).data,
    );
    const quaisCitam = pedidos
      .map((p, idx) => ({ idx, linhas: p.filter((d) => d.sku === 'DUP').map((d) => d.name) }))
      .filter((x) => x.linhas.length > 0);
    expect(quaisCitam).toHaveLength(2);
    expect(quaisCitam[0].linhas).toEqual(['linha 3']);
    expect(quaisCitam[1].linhas).toEqual(['linha 40']);
    expect(pedidos[quaisCitam[1].idx][0].ships_separately).toBe(true);
  });
});
