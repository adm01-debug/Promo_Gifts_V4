import { describe, expect, it } from 'vitest';
import {
  auditSupabaseReferences,
  scanSupabaseReferences,
} from '../../scripts/check-supabase-reference-catalog.mjs';

describe('check-supabase-reference-catalog', () => {
  it('separa PostgREST canônico, Storage, clientes externos, wrappers e placeholders', () => {
    const refs = scanSupabaseReferences(
      `
        const canonical = createClient(SUPABASE_URL, SERVICE_KEY);
        const externalClient = createClient(EXTERNAL_CRM_URL, EXTERNAL_CRM_KEY);
        const { url: crmUrl, key: crmKey } = await getCrmCreds();
        const crmFromCredentials = createClient(crmUrl, crmKey);
        canonical.from('products');
        canonical.rpc(\`get_catalog_bestseller_page\`);
        canonical.storage.from('avatars');
        externalClient.from('companies');
        crmFromCredentials.from('foreign_quotes');
        createClient(crmUrl, crmKey).rpc('foreign_sync_quote');
        untypedFrom('quotes');
        untypedRpc('get_quote_summary');
        goldFrom('v_products_public');
        dbInvoke({ table: 'product_variants', operation: 'select' });
        // @supabase-reference-placeholder
        canonical.rpc('fn_my_rpc');
        Array.from(['not-a-relation']);
      `,
      'src/contracts/example.ts',
    );

    expect(refs.map((ref) => [ref.kind, ref.name, ref.classification, ref.form])).toEqual([
      ['relation', 'products', 'canonical', 'direct'],
      ['rpc', 'get_catalog_bestseller_page', 'canonical', 'direct'],
      ['relation', 'avatars', 'storage', 'direct'],
      ['relation', 'companies', 'external', 'direct'],
      ['relation', 'foreign_quotes', 'external', 'direct'],
      ['rpc', 'foreign_sync_quote', 'external', 'direct'],
      ['relation', 'quotes', 'canonical', 'wrapper'],
      ['rpc', 'get_quote_summary', 'canonical', 'wrapper'],
      ['relation', 'v_products_public', 'canonical', 'wrapper'],
      ['relation', 'product_variants', 'canonical', 'wrapper'],
      ['rpc', 'fn_my_rpc', 'placeholder', 'direct'],
      ['relation', null, 'non_database', 'direct'],
    ]);
  });

  it('bloqueia novo objeto ausente e novo despacho dinâmico, mas preserva baseline source-scoped', () => {
    const refs = scanSupabaseReferences(
      `
        supabase.from('products');
        supabase.from('stock_notes');
        supabase.from(tableName);
      `,
      'src/hooks/useStock.ts',
    );
    const catalog = {
      relations: ['products'],
      rpcs: [],
      exceptions: [
        {
          kind: 'relation',
          name: 'stock_notes',
          file: 'src/hooks/useStock.ts',
          occurrences: 1,
          reason: 'feature waiting for PO decision',
        },
      ],
      dynamic_baseline: [
        {
          kind: 'relation',
          file: 'src/hooks/useStock.ts',
          receiver: 'supabase',
          occurrences: 1,
          reason: 'legacy generic selector',
        },
      ],
    };

    const result = auditSupabaseReferences(refs, catalog);
    expect(result.ok).toBe(true);
    expect(result.acknowledged.map((reference) => reference.reason)).toEqual([
      'known_exception',
      'known_dynamic_dispatch',
    ]);

    const withNewMissing = scanSupabaseReferences(
      `
        supabase.from('products');
        supabase.from('stock_notes');
        supabase.from('stock_notes');
        supabase.from(tableName);
        supabase.rpc(rpcName);
      `,
      'src/hooks/useStock.ts',
    );
    const failed = auditSupabaseReferences(withNewMissing, catalog);
    expect(failed.ok).toBe(false);
    expect(failed.errors.map((error) => error.reason)).toEqual([
      'missing_catalog_object',
      'new_dynamic_dispatch',
    ]);
  });

  it('aceita alias apenas pelo wrapper e destino documentados no catálogo', () => {
    const refs = scanSupabaseReferences(
      `
        dbInvoke({ table: 'customization_price_tables', operation: 'select' });
        supabase.from('customization_price_tables');
      `,
      'src/hooks/useTechniques.ts',
    );
    const result = auditSupabaseReferences(refs, {
      relations: ['tabela_preco_gravacao_oficial'],
      rpcs: [],
      relation_aliases: {
        customization_price_tables: {
          target: 'tabela_preco_gravacao_oficial',
          forms: ['wrapper'],
          receivers: ['dbInvoke'],
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.acknowledged.map((reference) => reference.reason)).toEqual(['documented_alias']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].receiver).toBe('supabase');
  });
});
