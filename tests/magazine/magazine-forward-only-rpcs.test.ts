import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = [
  ['magazine_add_items_atomic', '20260909181000_magazine_add_items_atomic.sql'],
  ['magazine_remove_items_atomic', '20260909181100_magazine_remove_items_atomic.sql'],
  ['magazine_reorder_items_atomic', '20260909181200_magazine_reorder_items_atomic.sql'],
  ['magazine_duplicate_atomic', '20260909181300_magazine_duplicate_atomic.sql'],
  ['magazine_update_metadata_atomic', '20260909181400_magazine_update_metadata_atomic.sql'],
  ['magazine_duplicate_atomic', '20260909190000_magazine_duplicate_remap_page_order.sql'],
  [
    'magazine_update_metadata_atomic',
    '20260909190100_magazine_page_order_validation_null_safe.sql',
  ],
  ['magazine_add_items_atomic', '20260909190200_magazine_add_items_null_safe.sql'],
  ['magazine_publish_atomic', '20260909190300_magazine_publish_atomic.sql'],
] as const;

function sql(filename: string): string {
  return readFileSync(resolve(process.cwd(), 'supabase/migrations', filename), 'utf8');
}

describe('Magazine forward-only atomic RPC drafts', () => {
  it.each(migrations)('%s is locked down and contains no destructive DDL', (functionName, file) => {
    const source = sql(file);
    expect(source).toMatch(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}\\(`));
    expect(source).toContain('SECURITY DEFINER');
    expect(source).toContain("SET search_path TO 'public', 'pg_temp'");
    expect(source).toContain('auth.uid()');
    expect(source).toContain("public.has_role(v_actor, 'admin'::public.app_role)");
    expect(source).toMatch(
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${functionName}\\([\\s\\S]+FROM PUBLIC, anon;`),
    );
    expect(source).toMatch(
      new RegExp(
        `GRANT EXECUTE ON FUNCTION public\\.${functionName}\\([\\s\\S]+TO authenticated, service_role;`,
      ),
    );
    expect(source).not.toMatch(/\b(?:DROP|TRUNCATE)\b/i);
    expect(source).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it.each([
    '20260909181000_magazine_add_items_atomic.sql',
    '20260909181100_magazine_remove_items_atomic.sql',
    '20260909181200_magazine_reorder_items_atomic.sql',
  ])('%s uses row locking, CAS and draft-only mutation', (file) => {
    const source = sql(file);
    expect(source).toContain('FOR UPDATE');
    expect(source).toContain('p_expected_updated_at');
    expect(source).toContain('magazine_edit_conflict');
    expect(source).toContain("v_status <> 'draft'");
  });

  it('reorder requires the complete, unique item set', () => {
    const source = sql('20260909181200_magazine_reorder_items_atomic.sql');
    expect(source).toContain('COUNT(DISTINCT id)');
    expect(source).toContain('magazine_reorder_requires_complete_item_set');
    expect(source).toContain('WITH ORDINALITY');
  });

  it('metadata update allows only an explicit field whitelist and reports CAS conflicts', () => {
    const source = sql('20260909181400_magazine_update_metadata_atomic.sql');
    for (const field of [
      'title',
      'subtitle',
      'template_id',
      'branding',
      'content_settings',
      'page_order',
    ]) {
      expect(source).toContain(`'${field}'`);
    }
    expect(source).toContain("'conflict', TRUE");
    expect(source).toContain("'conflict', FALSE");
    expect(source).not.toContain("'status'");
    expect(source).not.toContain("'public_token'");
  });

  it('duplicate correction builds an old-to-new item map before persisting page_order', () => {
    const source = sql('20260909190000_magazine_duplicate_remap_page_order.sql');
    expect(source).toContain('v_id_map');
    expect(source).toContain("jsonb_set(v_source.page_order, '{pages}'");
    expect(source).toContain("v_id_map ? (item.value #>> '{}')");
    expect(source).toContain('SET page_order = v_mapped_page_order');
  });

  it('metadata correction makes required page fields null-safe', () => {
    const source = sql('20260909190100_magazine_page_order_validation_null_safe.sql');
    expect(source).toContain("jsonb_typeof(value->'kind') IS DISTINCT FROM 'string'");
    expect(source).toContain("value->>'kind' = ANY");
    expect(source).toContain("jsonb_typeof(value->'id') IS DISTINCT FROM 'string'");
    expect(source).toContain('COUNT(DISTINCT item_id.value)');
  });

  it('add correction rejects SQL NULL before evaluating array length', () => {
    const source = sql('20260909190200_magazine_add_items_null_safe.sql');
    expect(source).toContain("p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'");
    expect(source).toMatch(/END IF;\s+IF jsonb_array_length\(p_items\)/);
  });

  it('publish validates requirements and token inside the server transaction', () => {
    const source = sql('20260909190300_magazine_publish_atomic.sql');
    expect(source).toContain('FOR UPDATE');
    expect(source).toContain("SET status = 'published'");
    expect(source).toContain('magazine_publish_requirements_not_met');
    expect(source).toContain('magazine_publish_token_missing');
    expect(source).not.toContain("SET status = 'draft'");
  });
});
