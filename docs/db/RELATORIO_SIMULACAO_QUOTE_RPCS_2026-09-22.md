# RPCs transacionais de orçamento — implementação proposta e simulação isolada

**Atualizado em 22/09/2026. Preparação e simulação autorizadas pelo PO; aplicação no Supabase canônico NÃO autorizada.**

## Veredito

**`SIMULATION_PASS_LOCAL_ONLY`**: o pacote de código, SQL proposto e testes está completo para revisão. Foram aprovadas **43 verificações PostgreSQL 17.11**, **93 testes TypeScript/React/estáticos focados**, **285 testes de regressão de orçamento/Kit Maker** e o typecheck integral. As propostas continuam deliberadamente fora de `supabase/migrations`; não houve `db push`, DDL, repair, deploy de função ou escrita no projeto `doufsxqlfjyuvxuezpln`.

Isso comprova o comportamento no fixture isolado e os contratos do consumidor. Não é recibo de aplicação, E2E autenticado no canônico nem autorização implícita de produção.

## Baseline e proveniência

- Base Git: `main` em `796a52f075c532344b02179fcd5aac2cb260d65d`, trabalho na branch `codex/quote-rpc-proposals-20260922`.
- Captura canônica somente leitura: `tests/fixtures/quote-rpc-live-20260922.json`, SHA-256 `1824b5ffa58395e698a86198c3a7ce4cfeac3a84d1e91e26792128a4ca0876e3`.
- Catálogo adjacente somente leitura: `tests/fixtures/quote-rpc-catalog-20260922.json`, SHA-256 `3203b5683a08ea764317d12cbe65a2665c0d6243a072bba23be48cbc2117d3b3`.
- Corpos vivos capturados antes da proposta: create MD5 `d3f154669f068acb2d5087a4ae059e14`; update MD5 `2f716e5ee22dd3de4043feb5bedc6387`; `increment_quote_version` MD5 `8dc69376bb204fa774c7b193a7bbce4f`.
- Revalidação Management API read-only em `2026-09-22T22:16:37Z`: as três assinaturas existem, mas não contêm os marcadores `_removed_item_ids`/`explicit_client_version_bump_v1`; portanto este pacote continua ausente do canônico.
- Fixture reduzido: `tests/sql/quote-rpc-fixture.sql`, SHA-256 `2811e4eadf78a8629dc304b68d5806f65a554d56a05c8e5cc53d02ffeb1eed15`.
- Imagem imutável: `postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675`, PostgreSQL 17.11, rede desabilitada, sem portas e dados em tmpfs.
- Manifesto verificável: `tests/fixtures/quote-rpc-proposal-manifest.json`; os testes recusam divergência de qualquer hash ou imagem.

## Propostas forward-only — não aplicadas

| Objeto                                                        | Arquivo                                                                                                                        | SHA-256                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `public.create_quote_transactional(jsonb,jsonb)`              | [20260922210000_create_quote_lineage.sql](proposals/20260922210000_create_quote_lineage.sql)                                   | `94ec0a32148ddccd2a71f8a67783a8f64f7c3d2d5968a28aa82855c975a90d55` |
| `public.increment_quote_version()`                            | [20260922210500_increment_quote_version_explicit_bump.sql](proposals/20260922210500_increment_quote_version_explicit_bump.sql) | `502caec43349a3bd5e88e3dbb989f96f4401f9d2b9440e7790124dd4534142be` |
| `public.update_quote_transactional(uuid,jsonb,jsonb,integer)` | [20260922211000_update_quote_lineage_lock.sql](proposals/20260922211000_update_quote_lineage_lock.sql)                         | `ae87ae018f88ab9b9c8496de9fcdafe8b2321778135de79ed46377fb429c57bc` |

Cada proposta valida o corpo vivo esperado, owner, ACL, `search_path`, dependências e invariantes antes de substituir o objeto. Reaplicação e drift concorrente são rejeitados. Falha tardia durante o deploy reverte a transação inteira.

### Contrato de criação

- Preserva variante, SKU/cor/tamanho, descrição congelada, kit, custos, descontos por item, embalagem, mockups, artes e configuração/custo de personalização.
- Valida objeto/array, UUID, quantidade, custos não negativos, URLs limitadas e elementos de personalização.
- Novos itens exigem produto e variante ativos e associação variante → produto válida.
- Mantém `SECURITY INVOKER`, ACL e `search_path`; RLS decide a visibilidade/escrita do chamador.
- Erro em qualquer linha, arte, personalização ou auditoria desfaz pai e filhos.

### Contrato de edição

- Bloqueia a linha pai com `FOR UPDATE` e exige `_expected_version` inteiro positivo para callers autenticados.
- Atualiza diferencialmente: IDs existentes são preservados; não há delete/reinsert geral.
- Remoção exige `_removed_item_ids`; desaparecimento silencioso de uma linha persistida é rejeitado.
- Campo omitido preserva o valor anterior; `null`/`[]` explícitos limpam apenas onde o contrato permite.
- Linhas legadas sem ID só são reconciliadas quando a correspondência é exata e única; ambiguidade falha fechada.
- Mudança de produto/variante exige seleção ativa válida. Uma variante histórica posteriormente inativada continua editável enquanto produto/variante não mudarem.
- Mudança apenas nos itens incrementa a versão exatamente uma vez. Dois writers reais com a mesma versão produzem um vencedor e um `SQLSTATE 40001`, sem lost update.
- O retorno é o snapshot final posterior aos triggers; o frontend reidrata IDs por `sort_order` para preservar identidade no segundo save.

### Trigger de versão

A proposta intermediária mantém a lógica existente e acrescenta um único caso autorizado: aceitar o bump explícito `OLD.version + 1`. Valores arbitrários continuam ignorados. Isso permite à RPC representar alterações apenas nos filhos sem falsificar alteração de notas/tags nem desabilitar o trigger.

## Correções no consumidor

- `QuoteItem` e payloads agora transportam todos os campos comerciais e de linhagem usados pela RPC.
- `updateQuote` exige versão, consulta IDs persistidos, declara remoções, envia IDs existentes e reidrata IDs novos após sucesso.
- O fluxo “sobrescrever” adota primeiro a versão remota e ainda usa compare-and-swap; não contorna concorrência por timestamp.
- Drag-and-drop e agrupamentos não escrevem mais `quote_items` diretamente. A ordem entra no próximo save transacional único.
- O helper granular legado permanece marcado como deprecated e falha se PostgREST não confirmar exatamente uma linha; ele não é mais usado pelo editor.
- O simulador PostgreSQL está no `package.json` e no job `database-integrity` de `deploy-gates.yml`.

## Evidências reproduzíveis

```bash
npm run test:quote-rpc:postgres
npx vitest run \
  tests/scripts/quote-rpc-proposals.test.mjs \
  src/services/__tests__/quoteServicePayloadContract.test.ts \
  src/services/__tests__/quoteItemsReorder.test.ts \
  src/services/__tests__/quoteReorderAutosaveRace.test.ts \
  src/hooks/__tests__/useQuoteBuilderState.overwrite.test.tsx \
  tests/hooks/quotes/quoteHelpers.freight.test.ts \
  src/hooks/quotes/__tests__/useQuoteConcurrencyGuard.test.ts
npm run typecheck:full
npx vitest run src/hooks/quotes/__tests__ \
  src/services/__tests__/quoteService.test.ts \
  src/services/__tests__/quoteServiceVariantSkuHydration.test.ts \
  src/services/__tests__/quoteServicePayloadContract.test.ts \
  src/services/__tests__/quoteReorderAutosaveRace.test.ts \
  src/services/__tests__/quoteItemsReorder.test.ts \
  tests/pages/kit-builder/useKitBuilderQuote.test.ts \
  tests/hooks/quoteHelpers.priceConfirmed.test.ts \
  tests/hooks/quotes/quoteHelpers.freight.test.ts \
  src/tests/quotePersistence.test.ts
```

### 43 verificações PostgreSQL aprovadas

1. Reproduzem três defeitos da versão viva: perda de linhagem, ausência de bump item-only e lost update.
2. Validam rollback e guards das três propostas, inclusive drift de privilégios, FK ausente e reaplicação.
3. Validam round-trip completo e compatibilidade do create legado.
4. Rejeitam payload não objeto/array, UUID inválido, quantidade/custo inválidos, arte/personalização malformada.
5. Rejeitam anon, escopo cruzado, variante inexistente/inativa/de outro produto.
6. Preservam campos omitidos, IDs e variante histórica inativada sem mudança de seleção.
7. Rejeitam versão obsoleta, `expected_version=NULL`, ID estrangeiro/duplicado, remoção implícita e correspondência ambígua.
8. Confirmam remoção explícita, limpeza explícita, rollback tardio e concorrência com duas sessões reais.
9. Confirmam ACL, `SECURITY INVOKER` e `search_path` inalterados.

## Limites e riscos residuais

- O fixture é reduzido; não clona Auth, Edge Functions, jobs, notificações, toda a cadeia de desconto/aprovação ou dados reais.
- A validação variante → produto é transacional e coberta, mas não há ainda FK composta `(product_variant_id, product_id)`. Alteração concorrente do `product_variants.product_id` por outro writer continua um risco de catálogo separado; a policy atual impede usar `FOR KEY SHARE` pela sessão autenticada sem ampliar autorização.
- `updateQuoteStatus` ainda usa leitura + update diretos e possui janela TOCTOU própria. Corrigi-lo exige RPC/status contract separado e revisão de grants.
- Writers externos que alterem filhos sem bloquear a linha pai não recebem automaticamente a garantia da nova RPC. O editor principal já deixou de fazê-lo.
- Grants amplos preexistentes não foram alterados. Qualquer revisão de ACL/RLS precisa de aprovação por objeto.
- Não houve teste E2E autenticado contra o Supabase canônico nem aplicação produtiva.

## Critério de promoção

Para sair de `LOCAL_ONLY`, ainda são obrigatórios: revisão humana do SQL e dos limites; autorização nominal dos **três objetos**; recoleta read-only imediatamente antes da janela; aplicação transacional pelo executor controlado; validação via `pg_catalog`; testes de criação/edição/concorrência em ambiente autorizado; recibo do ledger; regeneração segura de tipos; rollout da interface e monitoramento. Nenhuma dessas ações deve ser inferida deste relatório.
