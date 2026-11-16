# origin/recuperado/chore-migration-supplier-rls-261108-2230

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Tranca as 17 tabelas internas do fornecedor Stricker para que nenhum usuario do site consiga ler custo, estoque ou catalogo bruto do fornecedor — e a main de hoje ja faz isso, de forma mais segura.
- **Tip / merge-base / main:** tip `3ddfd97c658c8defd01e89cd8ffdede6b8a24259` · merge-base `ed0733f91c720e47f9f2a1dee2862683fe4841ab` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`3ddfd97c65`, 2026-11-08), com dois arquivos novos e nada mais:

- `supabase/migrations/20261027200000_supplier_stricker_rls_deny_all.sql`
- `supabase/rollbacks/20261027200000_rollback.sql`

A intencao esta escrita no cabecalho do proprio arquivo: o schema `supplier_stricker` tem tabelas com
`GRANT SELECT` para `authenticated` ja concedido, mas **sem RLS**. Hoje o schema nao e alcancavel porque
falta `USAGE`; se alguem conceder `USAGE` no futuro, as tabelas ficam abertas. A correcao proposta: ligar
RLS em todas as tabelas e criar uma policy `deny_all` que nega tudo, mais o script de desfazer.

A branch nao toca em nenhuma outra area: sem codigo de tela, sem edge function, sem workflow.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Migration de RLS deny-all no schema `supplier_stricker` | **ESTA** — `supabase/migrations/20261027195959_supplier_stricker_rls_deny_all.sql` (mesmo proposito, timestamp 1 segundo antes) | `git ls-tree -r --name-only origin/main supabase/migrations \| grep -i stricker` lista `20261027195959_supplier_stricker_rls_deny_all.sql` |
| Reconhecimento explicito de que a versao da branch foi substituida | **ESTA** — a main declara isso no cabecalho | `origin/main:supabase/migrations/20261027195959_...sql:9` → `-- Esta versão substitui 20261027200000, ainda pendente e nunca aplicada.` |
| `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nas tabelas Stricker | **ESTA**, em laco sobre a lista de tabelas | `origin/main:...195959...sql:45-48` → `FOREACH _table IN ARRAY _tables LOOP / EXECUTE format('ALTER TABLE supplier_stricker.%I ENABLE ROW LEVEL SECURITY', _table)` |
| Policy `deny_all` negando todas as linhas | **ESTA, e mais forte**: a main cria `AS RESTRICTIVE`, a branch criava permissiva | main `...195959...sql:53-56` → `CREATE POLICY deny_all ON supplier_stricker.%I AS RESTRICTIVE USING (false)`; branch → `CREATE POLICY deny_all ON supplier_stricker.canceled_products USING (false)` (sem `RESTRICTIVE`) |
| Pre-condicao (falhar se faltar tabela) | **ESTA** — main usa `to_regclass` e levanta excecao com a lista de ausentes | main `...195959...sql:36-43` |
| Pos-condicao (conferir que ficou protegido) | **ESTA, e mais rigorosa**: a main tambem exige que a policy seja RESTRICTIVE e que a expressao seja `false` | main `...195959...sql:61-82` → `AND NOT p.polpermissive AND pg_get_expr(p.polqual, p.polrelid) = 'false'` |
| Script de rollback | **ESTA** — `supabase/rollbacks/20261027195959_rollback.sql`, com guarda `to_regclass` para nao quebrar se a tabela nao existir | `git ls-tree -r --name-only origin/main supabase/` lista `supabase/rollbacks/20261027195959_rollback.sql` |
| Lista das 17 tabelas a proteger | **A da main esta certa; a da branch esta errada** | Em producao (`doufsxqlfjyuvxuezpln`, consulta a `pg_class`/`pg_namespace`) existem exatamente as 17 tabelas da lista da main, incluindo `stg_colors`, `stg_customizations`, `stg_images`, `stg_product_types`. As 4 tabelas que **so** a branch lista — `config`, `failed_products`, `images`, `price_rules` — **nao existem** no schema |
| Documento de auditoria citado pelas duas versoes | **ESTA** | `git ls-tree -r --name-only origin/main docs/db` lista `docs/db/SCHEMAS_EXTRA_AUDIT_2026-10-27.md` |

Quando a main recebeu esse trabalho: `git log origin/main -- supabase/migrations/20261027195959_...sql` mostra
`b817fa2a3b 2026-11-01 fix(db): reconciliar migrations pendentes com o canônico (#2937)` e depois
`6b859b0fbf 2026-11-09 fix(migrations): idempotência em RLS deny-all e partições 2027 (#3257)`. Ou seja: a
intencao ja estava na main **uma semana antes** do commit desta branch, e foi reforcada um dia depois dele.

## A resgatar

Nada. Os dois arquivos da branch sao a versao antiga e pior do mesmo trabalho, e a propria main diz que os
substituiu. Trazer a versao da branch seria uma regressao por tres motivos concretos:

1. **Quebraria na hora de aplicar.** A pre-condicao da branch exige as tabelas `config`,
   `failed_products`, `images` e `price_rules`, que nao existem em producao → a migration levantaria
   `Pré-condição falhou: tabelas não encontradas em supplier_stricker: ...` e o deploy de banco falharia.
2. **Deixaria 4 tabelas reais desprotegidas.** A branch nao lista `stg_colors`, `stg_customizations`,
   `stg_images` e `stg_product_types`, que existem em producao e estao na lista da main.
3. **A trava seria mais fraca do que o proprio comentario promete.** A branch cria a policy permissiva;
   bastaria uma policy permissiva futura para abrir acesso. A da main e `RESTRICTIVE`, que nao pode ser
   anulada desse jeito.

## Risco de fechar esta branch

Praticamente nulo. A protecao que esta branch queria dar as tabelas do fornecedor Stricker ja esta escrita
na main, cobrindo as tabelas certas e de forma mais segura. Fechar a branch nao remove nenhuma protecao e
nao deixa nenhuma tabela mais exposta do que ja esta.

**Ponto de atencao que nao e desta branch, mas o dono deve saber:** hoje, em producao, **nenhuma** das 17
tabelas tem RLS ligada (consulta a `pg_class.relrowsecurity` retornou `false` para todas as 17, e nenhuma
policy) e a migration da main ainda nao foi aplicada (`supabase_migrations.schema_migrations` nao tem nem
`20261027195959` nem `20261027200000`). Em outras palavras: a trava existe no repositorio, mas ainda nao
foi para o banco. Isso nao se resolve com esta branch — a versao dela nem rodaria. Resolve-se aplicando a
migration que ja esta na main pelo caminho oficial (`db-apply-migration.yml`). Enquanto nao for aplicada, a
protecao de hoje depende so de `USAGE` nao estar concedido no schema.

## Nao verificado

- Nao foi verificado se os `GRANT SELECT` para `authenticated` citados no cabecalho das duas migrations
  continuam concedidos hoje, nem o estado atual de `USAGE` no schema `supplier_stricker`. Isso nao muda o
  veredito desta branch (a questao e a mesma para as duas versoes), mas e o que define o tamanho do risco
  descrito acima.
- Nao foi aberto o conteudo de `docs/db/SCHEMAS_EXTRA_AUDIT_2026-10-27.md`; apenas confirmada sua existencia
  na main.
