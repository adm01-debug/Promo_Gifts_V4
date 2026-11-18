/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useQuoteTemplates.raw-fetch.test.ts
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 3 · neste arquivo: 3
 * Casos em runtime: 3 de 3 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * 1) Import: `@/hooks/useQuoteTemplates` -> `@/hooks/quotes/useQuoteTemplates`. O
 * arquivo `src/hooks/useQuoteTemplates.ts` da branch de origem era um ADAPTADOR LEGADO
 * (git show
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/hooks/useQuoteTemplates.ts)
 * com `validateTemplateItems()` que produzia o par `items_data`/`items_error`. Esse
 * adaptador foi movido para fora de src/ no commit 5dd9b949d ("chore(repo): move 316
 * arquivos obsoletos da #3361 de src/ para recovery/src-legacy") e hoje NAO existe em
 * src/ (`ls src/hooks/useQuoteTemplates.ts` -> No such file or directory). Só sobrou o
 * hook canônico src/hooks/quotes/useQuoteTemplates.ts.
 *
 * 2) Contrato de preservação do raw mudou de nome e de semântica. Hoje, em
 * src/hooks/quotes/useQuoteTemplates.ts:70-90 (`transformTemplates`), o raw é
 * preservado nos campos `raw_items` (linha 73) e `raw_template_data` (linha 74),
 * enquanto `items` é COAGIDO (`Array.isArray(item.items) ? ... : []`, linha 76) e
 * `template_data` é coagido para `{}` quando não é objeto (linhas 77-80). Na versão
 * testada pelo outro agente, `items`/`template_data` carregavam o raw e a visão tipada
 * ia em `items_data`. As 3 asserções de preservação foram reapontadas para
 * `raw_items`/`raw_template_data` + a coerção medida, mantendo os 3 casos e a intenção
 * original (nada de raw é perdido no fetch canônico, nenhum item inválido é descartado
 * silenciosamente, campos extras da tabela passam inteiros).
 *
 * 3) Nenhuma RPC/função de dados mudou neste caminho: o hook ainda usa
 * supabase.from('quote_templates').select('*').order('updated_at').limit(200) (linhas
 * 148-152), compatível com o mock de chain do teste — por isso a asserção
 * `expect(state.from).toHaveBeenCalledWith('quote_templates')` foi mantida.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * Nenhum caso de teste foi removido (3 originais, 3 preservados e verdes). Foram
 * retiradas apenas as asserções sobre os campos `items_data` e `items_error`, que não
 * existem mais em produção:
 *
 * - Esperado pelo teste: `templates[0].items_data === null` e
 * `templates[0].items_error` casando /preservados/ ou contendo "item 2".
 * - Medido hoje (saída real do vitest antes do ajuste): `expected undefined to be
 * null` para `items_data`; `items_error` também `undefined`. O objeto retornado tem 25
 * chaves e nenhuma delas é items_data/items_error.
 * - Causa com arquivo:linha: a validação que gerava esse par (`validateTemplateItems`
 * -> `{items_data: null, items_error: 'Os itens deste template precisam de revisão. Os
 * dados originais foram preservados.'}` e `O item ${index+1} contém dados
 * incompletos...`) vivia em src/hooks/useQuoteTemplates.ts da branch de origem (linhas
 * ~104-125 daquele arquivo), removido de src/ no commit 5dd9b949d. O transform atual,
 * src/hooks/quotes/useQuoteTemplates.ts:70-90, não valida item por item nem emite
 * mensagem de erro: ele só coage `items` para array vazio e `template_data` para `{}`,
 * guardando o original em `raw_items`/`raw_template_data`.
 * - Consequência medida da perda dessa camada (não é bug de runtime, é cobertura/UX
 * perdida): um array parcial como `[{productName:'Valid',quantity:1,unitPrice:5},
 * {plannedProduct:'incomplete'}]` hoje chega inteiro em `templates[0].items` e é
 * consumido como `QuoteTemplateItem[]` via cast `as unknown as QuoteTemplateItem[]`
 * (linha 76), sem nenhum sinal de que o item 2 está incompleto. O caso 2 foi mantido
 * testando exatamente isso (o array parcial passa íntegro, nada é descartado), que é o
 * contrato atual verificável.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * Nenhum bug de runtime confirmado. Risco de tipo (não é crash, não mexi em src/):
 * src/hooks/quotes/useQuoteTemplates.ts:76 faz `items: Array.isArray(item.items) ?
 * (item.items as unknown as QuoteTemplateItem[]) : []` — cast duplo sem validação,
 * então entradas parciais do JSONB (ex.: objeto sem productName/quantity/unitPrice)
 * são entregues à UI tipadas como QuoteTemplateItem. A validação que barrava isso
 * (items_data/items_error) existia no adaptador removido em 5dd9b949d. Decisão de
 * negócio/PR separada: reintroduzir a validação no transform canônico ou aceitar o
 * cast.
 *
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuoteTemplates } from '@/hooks/quotes/useQuoteTemplates';
import type { Json, Tables } from '@/integrations/supabase/types';

const state = vi.hoisted(() => ({
  user: { id: 'test-user' },
  rows: new Array<Tables<'quote_templates'>>(),
  from: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user, isAdmin: false }),
}));
vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.from } }));

function row(items: Json, templateData: Json): Tables<'quote_templates'> {
  return {
    id: 't',
    name: 'Stored template',
    seller_id: 'test-user',
    items,
    template_data: templateData,
    category: 'category',
    created_at: null,
    created_by: null,
    delivery_time: null,
    description: null,
    discount_amount: null,
    discount_percent: null,
    internal_notes: null,
    is_active: true,
    is_default: null,
    notes: null,
    payment_method: 'pix',
    payment_terms: null,
    shipping_cost: 20,
    shipping_type: 'fob',
    updated_at: null,
    usage_count: 3,
    validity_days: null,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.from.mockImplementation(() => ({
    select() {
      return this;
    },
    order() {
      return this;
    },
    limit: () => Promise.resolve({ data: state.rows, error: null }),
  }));
});

describe('real canonical fetch raw preservation', () => {
  it('keeps the original non-array items and primitive metadata in the raw fields while coercing the typed view', async () => {
    const raw = row({ plannedItems: ['partial'] }, 'planned metadata');
    state.rows = [raw];
    const { result } = renderHook(() => useQuoteTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates[0]).toMatchObject({
      raw_items: raw.items,
      raw_template_data: raw.template_data,
      items: [],
      template_data: {},
    });
    expect(state.from).toHaveBeenCalledWith('quote_templates');
  });

  it('keeps the complete raw partial array without dropping the incomplete entry', async () => {
    const rawItems = [
      { productName: 'Valid', quantity: 1, unitPrice: 5 },
      { plannedProduct: 'incomplete' },
    ];
    state.rows = [row(rawItems, {})];
    const { result } = renderHook(() => useQuoteTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates[0].items).toEqual(rawItems);
    expect(result.current.templates[0].raw_items).toEqual(rawItems);
  });

  it('retains valid items, array metadata and the real extra table fields', async () => {
    const rawItems = [
      { productName: 'Caneta', quantity: 2, unitPrice: 5, plannedPackaging: { keep: true } },
    ];
    const raw = row(rawItems, ['planned metadata']);
    state.rows = [raw];
    const { result } = renderHook(() => useQuoteTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates[0]).toMatchObject({
      items: rawItems,
      raw_items: rawItems,
      template_data: raw.template_data,
      category: raw.category,
      payment_method: raw.payment_method,
      shipping_type: raw.shipping_type,
      shipping_cost: raw.shipping_cost,
      usage_count: raw.usage_count,
    });
  });
});
