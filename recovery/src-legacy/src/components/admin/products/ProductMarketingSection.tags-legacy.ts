/**
 * LEGADO — retirado de src/components/admin/products/ProductMarketingSection.tsx em 2026-11-13
 * (branch claude/fix-aba-marketing-261113). Guardado por regra do dono: não apagar código.
 *
 * Por que saiu de uso: lia o marketing de products.tags e gravava com
 * untypedFrom('v_products_public').update({ tags }). v_products_public é VIEW não atualizável
 * (todo clique dava "Erro ao salvar") e products.tags guarda as PALAVRAS-CHAVE DE BUSCA do
 * produto — gravar o objeto de marketing ali apagaria a busca de 7.529 produtos.
 * Substituto: src/components/admin/products/productMarketingData.ts (vínculos
 * product_target_audiences / product_commemorative_dates / product_endomarketing).
 *
 * NÃO religar este código sem tratar os dois problemas acima. Fora do build (recovery/).
 */
import { untypedFrom } from '@/lib/supabase-untyped';
import { dbInvoke } from '@/lib/db/postgrest';

interface ProductTags {
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === 'string' && !!v.trim());
  if (typeof value === 'string')
    return value
      .split(/[,;|]/)
      .map((v) => v.trim())
      .filter(Boolean);
  return [];
}

async function fetchProductTags(productId: string): Promise<ProductTags> {
  // FIX-BRIDGE-01: migrated from bridge to dbInvoke
  const result = await dbInvoke({
    table: 'products',
    operation: 'select',
    filters: { id: productId },
    limit: 1,
  });
  const product = result.records?.[0] as Record<string, unknown> | undefined;
  const raw = product?.tags;
  const tags =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        })()
      : raw || {};

  return {
    publicoAlvo: toArray(tags.publicoAlvo ?? tags.publico_alvo),
    datasComemorativas: toArray(tags.datasComemorativas ?? tags.datas_comemorativas),
    endomarketing: toArray(tags.endomarketing),
  };
}

async function saveProductTags(productId: string, tags: ProductTags): Promise<void> {
  const payload = {
    publicoAlvo: tags.publicoAlvo,
    datasComemorativas: tags.datasComemorativas,
    endomarketing: tags.endomarketing,
    publico_alvo: tags.publicoAlvo,
    datas_comemorativas: tags.datasComemorativas,
  };

  // FIX-BRIDGE-01: migrated from bridge to dbInvoke (REST native write)
  // v_products_public view doesn't have 'tags' in its generated types, so use untypedFrom.
  const { error } = await untypedFrom('v_products_public')
    .update({ tags: payload })
    .eq('id', productId);
  if (error) throw new Error(error.message);
}
