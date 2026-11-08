import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BOOTSTRAP_PATH = resolve(
  ROOT,
  'supabase/migrations/20260511235959_bootstrap_public_dependencies_for_application_schemas.sql',
);
const CONSUMER_PATH = resolve(
  ROOT,
  'supabase/migrations/20260512000000_bootstrap_missing_application_schemas.sql',
);
const sql = readFileSync(BOOTSTRAP_PATH, 'utf8');

describe('bootstrap das dependências públicas do baseline', () => {
  const relations = [
    'material_groups',
    'material_types',
    'product_category_assignments',
    'product_images',
    'product_materials',
    'stock_daily_summary',
    'variant_supplier_sources',
  ];

  it.each(relations)('cria public.%s antes do consumidor analytics', (relation) => {
    expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${relation}\\b`, 'i'));
    const consumer = readFileSync(CONSUMER_PATH, 'utf8');
    expect(consumer).toMatch(new RegExp(`[\"]?public[\"]?\\s*\\.\\s*[\"]?${relation}`, 'i'));
    expect(20260511235959n).toBeLessThan(20260512000000n);
  });

  it('reconcilia o contrato de categories de forma idempotente', () => {
    expect(sql).toMatch(/ALTER TABLE public\.categories[\s\S]*?ADD COLUMN IF NOT EXISTS level\b/i);
    for (const column of [
      'display_order',
      'is_active',
      'full_path_readable',
      'path',
      'slug',
      'products_count',
    ]) {
      expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, 'i'));
    }
    expect(sql).toContain('categories_level_check');
  });

  it('cria supplier_branches antes das FKs de estoque', () => {
    const supplierBranches = sql.search(/CREATE TABLE IF NOT EXISTS public\.supplier_branches\b/i);
    const variantSources = sql.search(
      /CREATE TABLE IF NOT EXISTS public\.variant_supplier_sources\b/i,
    );
    expect(supplierBranches).toBeGreaterThan(-1);
    expect(supplierBranches).toBeLessThan(variantSources);
  });

  it('preserva as chaves usadas pelos drops e joins posteriores', () => {
    expect(sql).toContain('product_materials_organization_id_product_id_material_id_pa_key');
    expect(sql).toContain('variant_stocks_organization_id_variant_id_supplier_id_key');
    expect(sql).toContain('product_category_assignments_product_id_category_id_key');
  });

  it('não contém DROP, TRUNCATE ou DELETE', () => {
    expect(sql).not.toMatch(/(^|;)\s*(DROP|TRUNCATE|DELETE)\b/im);
  });
});
