/**
 * Regras puras do relatório "Produtos sem dados de frete": quais produtos
 * entram, como o que falta é escrito e como a linha vira CSV.
 */
import { getFreightReadiness, type MissingMeasure } from '@/lib/freight';
import type { FreightReadinessProduct } from '@/services/freightReadinessService';

export const NO_SUPPLIER_LABEL = 'Sem fornecedor';

export type ReadinessReportRow = {
  id: string;
  sku: string;
  name: string;
  supplierId: string | null;
  supplierName: string;
  missing: MissingMeasure[];
  missingLabel: string;
};

const MISSING_LABELS: Record<MissingMeasure, string> = {
  height: 'Altura',
  width: 'Largura',
  length: 'Comprimento',
  weight: 'Peso',
};

export function describeMissing(missing: MissingMeasure[]): string {
  return missing.map((m) => MISSING_LABELS[m]).join(', ');
}

/** Só os produtos que o motor não consegue empacotar, ordenados por SKU. */
export function buildReadinessRows(
  products: FreightReadinessProduct[],
  supplierNames: Map<string, string>,
): ReadinessReportRow[] {
  const rows: ReadinessReportRow[] = [];
  for (const p of products) {
    const readiness = getFreightReadiness(p);
    if (readiness.ready) continue;
    rows.push({
      id: p.id,
      sku: p.sku,
      name: p.name,
      supplierId: p.supplier_id,
      supplierName: (p.supplier_id && supplierNames.get(p.supplier_id)) || NO_SUPPLIER_LABEL,
      missing: readiness.missing,
      missingLabel: describeMissing(readiness.missing),
    });
  }
  return rows.sort((a, b) => a.sku.localeCompare(b.sku, 'pt-BR', { numeric: true }));
}

/** `supplierId` vazio = todos; `'none'` = produtos sem fornecedor. */
export const NO_SUPPLIER_FILTER = 'none';

export function filterBySupplier(
  rows: ReadinessReportRow[],
  supplierId: string,
): ReadinessReportRow[] {
  if (!supplierId) return rows;
  if (supplierId === NO_SUPPLIER_FILTER) return rows.filter((r) => r.supplierId === null);
  return rows.filter((r) => r.supplierId === supplierId);
}

const READINESS_CSV_COLUMNS = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Produto' },
  { key: 'supplierName', header: 'Fornecedor' },
  { key: 'missingLabel', header: 'O que falta' },
] as const;

/** Excel lê célula que começa com = + - @ como fórmula; o apóstrofo a mantém texto. */
function csvCell(value: string): string {
  const seguro = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** CSV com ';' (separador do Excel em português) e BOM para os acentos. */
export function buildReadinessCsv(rows: ReadinessReportRow[]): string {
  const header = READINESS_CSV_COLUMNS.map((c) => csvCell(c.header)).join(';');
  const body = rows.map((r) => READINESS_CSV_COLUMNS.map((c) => csvCell(r[c.key])).join(';'));
  return `\ufeff${[header, ...body].join('\n')}`;
}
