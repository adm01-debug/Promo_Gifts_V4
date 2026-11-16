# origin/recuperado/fix-ft079-min-quantity-261108-2215

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante que o sistema saiba a quantidade minima de compra de cada produto (a do proprio produto, senao a da categoria, senao 1) para o Kit Builder barrar orcamento abaixo do minimo — e isso ja esta funcionando em producao.
- **Tip / merge-base / main:** tip `8f202b80c947d0f4b29c59a437f0ac95e9c0c740` · merge-base `34ac6453d1f7a9ced950f2fb579db711219b4495` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`8f202b80c9`, 2026-11-08, "feat: cria view vw_products_min_quantity para quantidade minima efetiva (FT-079)"). Pela mensagem, a intencao era: consolidar a regra `product_override > category_default > system_default` numa view do banco, expondo `effective_min_quantity` e `min_quantity_source`, para que a UI e as validacoes do kit-builder nao recalculassem isso no cliente.

Entregou exatamente 2 arquivos novos, nada mais:
- `supabase/migrations/20261108221501_ft079_vw_products_min_quantity.sql` — `CREATE OR REPLACE VIEW public.vw_products_min_quantity` (11 colunas) + `GRANT SELECT ... TO authenticated`
- `supabase/rollbacks/20261108221501_rollback.sql` — `DROP VIEW IF EXISTS public.vw_products_min_quantity`

Nao mexeu em front, hook, tipos nem teste.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| View `public.vw_products_min_quantity` versionada como migration | `supabase/migrations/20261108030100_ft079_view_products_min_quantity.sql` (timestamp diferente, mesmo FT-079) | `git show origin/main:supabase/migrations/20261108030100_ft079_view_products_min_quantity.sql` linhas 7-24: mesmo `CREATE OR REPLACE VIEW`, mesmas 11 colunas na mesma ordem, mesmo `COALESCE(p.min_order_quantity, c.min_order_quantity, 1)`, mesmo `LEFT JOIN categories`, mesmo `WHERE p.is_active = true`. Entrou pela PR #3264 (`908f30abba` 2026-11-09, "feat: versionar view vw_products_min_quantity (FT-079)") |
| Coluna `effective_min_quantity` | main, mesma expressao | `supabase/migrations/20261108030100_ft079_view_products_min_quantity.sql:15` |
| Coluna `min_quantity_source` (product_override / category_default / system_default) | main, mesmo `CASE` | `supabase/migrations/20261108030100_ft079_view_products_min_quantity.sql:16-21` |
| Arquivo de rollback correspondente | `supabase/rollbacks/20261108030100_rollback.sql` | `git show origin/main:supabase/rollbacks/20261108030100_rollback.sql` → `DROP VIEW IF EXISTS public.vw_products_min_quantity;` (identico ao da branch) |
| `GRANT SELECT ON public.vw_products_min_quantity TO authenticated` | Ja vigente em producao; tambem no baseline do schema | `execute_sql` (somente leitura) em `doufsxqlfjyuvxuezpln`: grants da view = `authenticated:SELECT, postgres:..., service_role:...`. E `supabase/baseline/20261015140000_baseline_schema.sql:120545` → `GRANT SELECT,MAINTAIN ON TABLE "public"."vw_products_min_quantity" TO "authenticated";` (baseline de 2026-10-15, anterior a branch) |
| View realmente existindo em producao com as colunas da branch | Sim | `execute_sql`: `information_schema.columns` da view devolve as 11 colunas `id, sku, name, category_id, category_name, category_min, product_override, effective_min_quantity, min_quantity_source, sale_price, is_active` na mesma ordem; `pg_class.reloptions = {security_invoker=true}` |
| Finalidade declarada no commit ("para a UI e validacoes do kit-builder") | Sim, ja consumida ponta a ponta | `src/hooks/kit-builder/useKitMinQuantityValidation.ts:30` le `.from('vw_products_min_quantity').select('id, effective_min_quantity')`; chamada real em `src/pages/kit-builder/useKitBuilderQuote.ts:382` (`await validateKitMinQuantityForQuote(...)`), importada na linha 22; coberta por `src/pages/kit-builder/__tests__/useKitBuilderQuote.sem-cliente.test.tsx:26`. Entrou pela PR #3269 (`b737d49aed`, "feat(kit-builder): validacao min-quantity via vw_products_min_quantity") |

Por que os 2 arquivos "diferem da main": a main versionou a mesma view com **outro nome de arquivo e outro timestamp** (`20261108030100_...` em vez de `20261108221501_...`), um dia depois. Comparacao de nome de arquivo acusa diferenca; comparacao de comportamento mostra o mesmo objeto. Nao ha nenhuma linha de SQL da branch sem equivalente na main ou em producao.

## A resgatar

Nada. Nenhum item da branch ficou de fora.

## Risco de fechar esta branch

Nenhum risco para o negocio. Tudo o que ela fez ja esta em producao (a view existe, com as mesmas colunas e a mesma permissao de leitura) e ja esta versionado no repositorio sob outro nome de arquivo, com rollback. Fechar a branch nao remove nada do banco e nao desliga a validacao de quantidade minima do Kit Builder, que hoje roda pelo hook da main. Manter a branch/aplicar o arquivo dela seria pior: criaria uma segunda migration para o mesmo objeto, com dois numeros de versao disputando o mesmo historico.

## Nao verificado

- Observacao lateral, **nao e trabalho perdido desta branch**: nenhuma das duas versoes esta registrada em `supabase_migrations.schema_migrations` (consulta somente leitura em `doufsxqlfjyuvxuezpln` com `version in ('20261108030100','20261108221501')` devolveu vazio). Isso e uma condicao pre-existente da main (o proprio arquivo da main diz, na linha 3, "Objeto JA EXISTE em producao (confirmado via pg_get_viewdef 2026-11-08)"): a view foi criada fora do fluxo de migrations e o arquivo e so versionamento. O arquivo da branch tem exatamente o mesmo defeito, logo resgata-lo nao corrige nada. Quem decide isso e o trem de governanca de migrations, nao esta branch.
- Nao verifiquei se `CREATE OR REPLACE VIEW` sem `WITH (security_invoker=true)` (ausente tanto na branch quanto na main) preservaria a opcao `security_invoker=true` hoje ativa em producao caso a migration seja reaplicada. Como o risco e identico nas duas versoes, nao altera o veredito desta branch.
- Arquivos sem leitura por truncamento: 0 (o pacote trouxe os 2 de 2 arquivos com os dois diffs completos).
