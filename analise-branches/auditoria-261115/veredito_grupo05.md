# Veredito — grupo 05 (13 branches apagadas do GitHub, commits vivos no clone local)

Base: `origin/main` (2251 commits). Evidência de produção lida via MCP `SUPABASE - GESTÃO DE PRODUTOS`
(`doufsxqlfjyuvxuezpln`), somente leitura. Nenhuma escrita, push, merge ou checkout foi feito.

Resumo: **0 APROVEITAR · 10 INCORPORADA · 0 DESCARTAR · 3 DECISAO_HUMANA**

---

## 1. `claude/fix-ft079-min-quantity-261108-2215` — `8f202b80c9` — INCORPORADA

Cria a view `vw_products_min_quantity` (quantidade mínima efetiva do produto: override do produto >
default da categoria > 1).

Prova: `origin/main:supabase/migrations/20261108030100_ft079_view_products_min_quantity.sql:7-24` tem a
MESMA view (mesmas 12 colunas, mesmo `COALESCE(p.min_order_quantity, c.min_order_quantity, 1)`, mesmo
`CASE ... product_override/category_default/system_default`, mesmo `LEFT JOIN categories` e
`WHERE p.is_active = true`). Rollback equivalente em
`origin/main:supabase/rollbacks/20261108030100_rollback.sql`.
Único delta da branch era `GRANT SELECT ... TO authenticated` — já verdadeiro em produção:
`has_table_privilege('authenticated','public.vw_products_min_quantity','SELECT') = true`.
Nada a resgatar.

## 2. `codex/fix-swatch-layout-trigger-261106-1523` — `95254bbac5` — INCORPORADA

Mantém a cor escolhida pelo usuário na bolinha do produto entre re-renders (catálogo grid/lista/tabela).

Prova (código de produção, main):
- `src/hooks/useProductColorSwatch.ts:22` (`selected_color_name`) e `:43-57` — o efeito da main é
  SUPERCONJUNTO do da branch (resolve por nome **e** por `selected_variant_id`).
- `src/components/products/ProductCard.tsx:254`, `src/components/products/ProductListItem.tsx:180`,
  `src/components/products/table-view/ProductTableRow.tsx:153` — as 3 linhas que a branch adicionava.

Resíduo apenas de teste (não é código de produção): em `e2e/catalog/helpers/swatch-view.ts` a main
resolveu a instabilidade do popover "Layout" por outro caminho (`scrollIntoViewIfNeeded` + `focus` +
Enter, main:60-80) em vez do `element.click()` via `evaluate`; e em
`e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts` a main segue com o locator por
`xpath=ancestor::div[...flex-wrap]` (main:77-87), sem a ancoragem por
`[data-testid="product-card"][data-product-id]` da branch. Opcional, só reduz flake de E2E.

## 3. `importado/vps-fabrica/v2/fix-insert-do-mockup-gravar-technique-id-2610081909` — `6faf99739f` — DECISAO_HUMANA

A branch volta a gravar `technique_id` no histórico de mockups (`generated_mockups`), usando o id vindo
da RPC `fn_get_product_customization_options` (tabela de preço de gravação), e amplia o retry de FK.

NÃO está na main: `origin/main:src/hooks/mockup/mockupGenerationService.ts:221` ainda é
`const safeTechniqueId = null;` e `:270` só trata FK de `product_id`.

Por que é decisão do dono e não merge direto — medido em produção agora:
- `generated_mockups_technique_id_fkey` ainda referencia `personalization_techniques` (FK viva).
- Interseção de ids entre `tabela_preco_gravacao_oficial` e `personalization_techniques` = **0 linhas**.
Logo, com a branch TODO insert dispararia 23503 e cairia no retry — e o retry da branch grava
`{ product_id: null, technique_id: null }`, ou seja **perderia o `product_id` válido em todo salvamento**.
Conflito direto com a decisão documentada na main (BUG-10, linhas 213-221).
O que o dono precisa decidir: qual é a fonte de verdade da técnica (apontar a FK para a tabela de preço
de gravação, ou carregar as técnicas de `personalization_techniques` na UI). Os 3 testes da branch
(`src/hooks/mockup/__tests__/mockupGenerationService.test.ts`) servem de ponto de partida.

## 4. `claude/fix-scripts-workflow-contracts-261110-0245` — `87b1cde276` — INCORPORADA

Corrige o parser do gate `check-workflow-contracts` (passos escritos com `- uses:`/`- run:`,
`pull_request_target`, YAML inválido deixando de passar em silêncio).

Prova: `origin/main:scripts/check-workflow-contracts.mjs:72` (`hasPullRequestTrigger`), `:245`
(`/^\s+(?:-\s+)?run:/m`), `:266`, `:388`, `:447`, `:668-677` (`parseError`), `:703-710` (YAML inválido vira
violação explícita). Testes: `origin/main:tests/scripts/check-workflow-contracts-parser.test.mjs` é
superconjunto (mesmos describes + 9 casos extras), mais
`check-workflow-contracts-parser.regressions.test.mjs`.

As 3 entradas de allowlist da branch para `ci.yml` ficaram obsoletas: a main já tem
`.github/workflows/ci.yml:13-15` (`defaults.run.shell: bash`) e as actions pinadas por SHA
(`:39`, `:43`), então aquelas violações não existem mais. Nada a resgatar.

## 5. `fix/p200-e2e-default-query-cleanup-20261031` — `81414f5b4f` — INCORPORADA

Remove da URL filtros que estão no valor default ao abrir um deep-link (ex. `?status=all` → `/orcamentos`).

Prova: `origin/main:src/hooks/common/useListUrlState.ts:111-129` faz a canonicalização e é
SUPERCONJUNTO (trata também valor vazio: `!params.get(key) || params.get(key) === defaultValue`);
`:171-178` tem a mesma guarda contra navegação concorrente da busca debounced
(`if (target === null && (!current || current === defaultValue)) return;`).
Testes equivalentes em `origin/main:src/hooks/common/__tests__/useListUrlState.test.tsx:83` e `:104`.

## 6. `claude/fix-p06-p15-security-20261101-1000` — `66de98a613` — DECISAO_HUMANA

Duas migrations de segurança, NENHUMA aplicada e NENHUMA na main:
- P06: `security_invoker = true` em 8 views públicas. Produção hoje:
  `v_kit_component_media_public`, `v_product_compositions_public`, `v_product_properties_public`,
  `v_product_tags_public`, `v_products_public`, `v_suppliers_public`,
  `v_tabela_preco_gravacao_oficial_public` = `security_invoker` **false**; `v_system_health_dashboard`
  = não definido (= false). Ou seja: o endurecimento não está em pé.
- P15: `DROP POLICY rls_anon_read_color_synonym_map` em `color_synonym_map`. A policy **existe em
  produção agora** (1 linha em `pg_policies`) e na main só aparece no baseline
  (`origin/main:supabase/baseline/20261015140000_baseline_schema.sql:107605`), nunca revogada.

Trabalho real e pendente, mas é DDL em produção com risco de negócio: a main tem uma decisão posterior
explícita em sentido contrário para uma das views —
`origin/main:supabase/migrations/20260717173348_secure_tabela_gravacao_anon_definer_v1.sql:36` põe
`v_tabela_preco_gravacao_oficial_public` em `security_invoker = false` de propósito. Trocar as 8 de uma vez
pode derrubar preço público/catálogo anônimo. Precisa do dono (e do workflow `db-apply-migration.yml`).

## 7. `fix/ci-url-state-defaults` — `08ee74e833` — INCORPORADA

Mesmo problema do item 5 (defaults explícitos na query string), versão mais antiga/estreita (só compara
com o default, não trata string vazia).

Prova: `origin/main:src/hooks/common/useListUrlState.ts:111-129` e `:171-178` (superconjunto);
teste fuzz em `origin/main:src/hooks/common/__tests__/useListUrlState.fuzz.test.tsx`.

## 8. `claude/fix-sb0002-sb0006-migrations-261101-1825` — `756f8f61b0` — DECISAO_HUMANA

A branch (a) apaga `20261101140002` (REPLICA IDENTITY FULL) e `20261101140003` (índices das FK
`user_id`) e (b) cria `20261101190001` com o opt-out `-- transaction: none` exigido pelo preflight
(CREATE INDEX CONCURRENTLY não roda dentro de transação).

Resultado de negócio já está em produção, nada se perde:
- `idx_kit_quote_requests_user_id` e `idx_kit_save_requests_user_id` existem e são válidos.
- `login_attempts`, `workspace_notifications`, `device_login_notifications` estão com
  `relreplident = 'f'` (FULL) — ou seja, a 140002 **foi aplicada**.

Por isso as duas deleções propostas pela branch seriam um retrocesso (apagariam do repo migrations já
aplicadas em produção) e não devem ser restauradas. O único resíduo com valor é o cabeçalho
`-- transaction: none`, que a main não tem em
`origin/main:supabase/migrations/20261101140003_sb0006_index_kit_fk_user_id.sql:1-20` — se essa migration
for reexecutada pelo `db-apply-migration.yml` ela reprova no preflight. Decisão do dono (governança de
migration em produção): deixar como está (índices já existem) ou abrir PR só para o opt-out.

## 9. `claude/fix-mockup-seletor-cliente-261114-2200` — `4be7ab3880` — INCORPORADA

Botão "Usar logo do cliente" (puxa a logo do CRM para a área de personalização pelo mesmo caminho do
upload manual) + seletor de empresa acessível por teclado (combobox WAI-ARIA).

Prova, main:
- `src/components/mockup/MockupClientSelector.tsx:28` (`onUseClientLogo`), `:75` (`listboxId`),
  `:146` (`handleInputKeyDown`), `:230-237` (botão `data-testid="mockup-client-use-logo"`),
  `:268-281` (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `onKeyDown`),
  `:403-410` (`role="listbox"` / `role="option"` / `aria-selected`).
- `src/components/mockup/MockupConfigPanel.tsx:132-146` (`handleUseClientLogo`) e `:186`
  (passa para o seletor). As 4 linhas de `fetch`/`blob`/`new File` da branch não aparecem literalmente
  porque a main extraiu para o helper `fetchClientLogoFile(client.logo_url)` (main:140) —
  implementação equivalente.
- Testes: `src/components/mockup/__tests__/MockupClientSelector.a11y.test.tsx` e
  `MockupClientSelector.logo.test.tsx` existem na main.

## 10-12. `importado/vps-fabrica/v2/n35-2610082246` (`8cb577f453`), `.../refazer-4b335fb6` (`3d93c815e1`), `.../refazer-b07baf7e` (`8c66a873db`) — INCORPORADA (as três)

As três são o MESMO trabalho: patch contra o próprio merge-base byte a byte idêntico nas três
(md5 do diff = `b4837bd92d63875a111b9007e497bdb1`). Divergem só porque cada uma partiu de um ponto
diferente da main.

Conteúdo: a limpeza de dados de teste (edge `e2e-cleanup`) passa a apagar o histórico de mockups —
linhas de `generated_mockups` e os arquivos do bucket `mockup-assets` sob `${userId}/logos` e
`${userId}/mockups`.

Prova, main `supabase/functions/e2e-cleanup/index.ts`: `:13-14` (doc do item 7), `:95`
(`MOCKUP_BUCKET = 'mockup-assets'`), `:445` (`{ table: 'generated_mockups', column: 'user_id' }`),
`:476-493` (list por subpasta, `errors[...]`, `remove(mockupPaths)`, contagem em dryRun).
Testes: `supabase/functions/e2e-cleanup/index.mockups.test.ts` e
`tests/edge-functions/e2e-cleanup.mockups.test.ts` existem na main.

## 13. `claude/fix-sitemap-grant-anon-261112-0230` — `496210a4ba` — INCORPORADA

Devolve ao papel `anon` a permissão de executar `get_sitemap_public`, que deixava `/api/sitemap`
respondendo 503.

Prova: `origin/main:supabase/migrations/20261112130000_fix_get_sitemap_public_anon_grant.sql:19` tem o
mesmo `GRANT EXECUTE ON FUNCTION public.get_sitemap_public(integer, integer) TO anon`, com causa-raiz
documentada (event trigger `evt_auto_revoke_secdef_public_execute`) e um `DO` de verificação que a branch
não tinha; e `origin/main:supabase/migrations/20261111191000_restore_get_sitemap_public_anon_execute.sql:10`
já fazia o mesmo grant. Confirmado em produção:
`has_function_privilege('anon','public.get_sitemap_public(integer,integer)','EXECUTE') = true`.
O resto da branch era recibo em `supabase/MIGRATIONS_SYNC_LOG.md` (documentação). Nada a resgatar.
