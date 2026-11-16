# origin/recuperado/fix-p06-p15-security-20261101-1000

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** fecha dois furos de privacidade aprovados em 01/11 (uma tabela interna de cores legivel por qualquer visitante anonimo e oito consultas publicas que rodam com poder de administrador), mas, do jeito que esta escrita, a parte das oito consultas derruba catalogo, fornecedores e tabela de preco de gravacao para quem navega sem login.
- **Tip / merge-base / main:** tip `66de98a6130d7fbb32ed84e8230c9ba688b165c4` · merge-base `35847b708e78070977fe0046b1d155a73d3dd7c2` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits (`846a8fa3b4`, `66de98a613`), 3 arquivos, nenhuma linha de frontend. E o conteudo da PR
#3003 ("fix(security): FASE B P06+P15"), que ficou em draft e foi **fechada sem merge em 2026-11-07**
(`merged_at: null`, head sha `66de98a613` — identico ao tip desta branch).

1. **P06 (A-V01, MEDIO)** — `supabase/migrations/20261101000001_security_invoker_views_p06.sql` (+14):
   `ALTER VIEW ... SET (security_invoker = true)` em 8 views publicas
   (`v_kit_component_media_public`, `v_product_compositions_public`, `v_product_properties_public`,
   `v_product_tags_public`, `v_products_public`, `v_suppliers_public`, `v_system_health_dashboard`,
   `v_tabela_preco_gravacao_oficial_public`). Objetivo: a view passar a rodar com o papel de quem
   consulta, aplicando RLS, em vez de rodar com o dono do banco. A propria migration ja exclui
   `v_variant_sale_prices_public` "porque quebraria precos publicos".
2. **P15 (SEG-003, ALTO)** — `supabase/migrations/20261101000002_revoke_anon_color_synonym_map_p15.sql` (+9):
   `DROP POLICY IF EXISTS "rls_anon_read_color_synonym_map" ON public.color_synonym_map`, que hoje e
   `FOR SELECT TO anon USING (true)` — leitura total por visitante anonimo de um dado interno
   (mapeamento fornecedor x cor canonica, com `confidence` e `notes`).
3. **Recibo** — 2 linhas em `supabase/MIGRATIONS_SYNC_LOG.md` pre-registrando as duas versoes como
   "pendente E15", exigencia do Gate 1.13.3.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| migration P06 (`security_invoker=true` em 8 views) | **NAO ESTA** | `git ls-tree origin/main -- supabase/migrations/` nao tem `20261101000001_*`; nenhuma migration da main com data >= 20261025 liga `security_invoker` nessas views (varredura de todas as 95 migrations do periodo: os 5 hits de `security_invoker` sao outras views — `20261101201000` (health view), `20261112120200`, `20261112120300`, `20261115034500` — ou comentario, `20261107180000:32`); `git log -S"security_invoker = true" --since=2026-10-30 origin/main -- supabase/migrations` → vazio |
| efeito do P06 em producao | **NAO ESTA** (medido 2026-11-16, somente leitura) | `pg_class.reloptions`: `v_kit_component_media_public`, `v_product_compositions_public`, `v_product_properties_public`, `v_product_tags_public`, `v_products_public`, `v_suppliers_public`, `v_tabela_preco_gravacao_oficial_public` = `security_invoker=false`; `v_system_health_dashboard` = opcao nao definida (= false) |
| migration P15 (`DROP POLICY rls_anon_read_color_synonym_map`) | **NAO ESTA** | `git grep "rls_anon_read_color_synonym_map" origin/main -- supabase/migrations` → so `20260716000003_...:35`, e em comentario ("already has rls_anon_read_color_synonym_map"), nunca um DROP; a policy aparece na main apenas em baseline/snapshot (`origin/main:supabase/baseline/20261015140000_baseline_schema.sql:107605`, `supabase/migrations-snapshot/SCHEMA_LIVE.sql:107602`) e no `.security/policies-baseline.json:1631` |
| efeito do P15 em producao | **NAO ESTA** (medido 2026-11-16, somente leitura) | `pg_policies` em `public.color_synonym_map` retorna 5 policies, entre elas `rls_anon_read_color_synonym_map` · roles `{anon}` · `SELECT` · `USING true` |
| premissa do P15 ("tabela nao usada no frontend") | **continua valida na main** | `git grep "color_synonym_map" origin/main -- src supabase/functions` → somente `src/integrations/supabase/types.ts:4995+` (definicao de tipo gerada), nenhum consumo |
| 2 linhas de recibo no `MIGRATIONS_SYNC_LOG.md` | **NAO ESTA** | `git grep "20261101000001\|20261101000002" origin/main -- supabase/MIGRATIONS_SYNC_LOG.md` → vazio |

Conclusao: nada desta branch entrou na main nem em producao. Nao e defasagem: o unico motivo pelo qual
o `MIGRATIONS_SYNC_LOG.md` aparece como "diferente" e a main ter crescido no mesmo arquivo depois
(diff (B) do pacote: so linhas de outras versoes). Os dois arquivos de migration aparecem como
`deleted file` no diff branch→main porque simplesmente nao existem la.

## A resgatar

**1. P15 — revogar leitura anonima de `color_synonym_map`** (`supabase/migrations/20261101000002_revoke_anon_color_synonym_map_p15.sql`).
Pronto para usar como esta. Risco de quebra: praticamente nulo — nenhum codigo le a tabela (so
`types.ts`), e a policy de leitura dos usuarios logados (`csm_read_authenticated`) continua intacta.
Importa porque hoje qualquer visitante da loja consegue baixar a tabela interna de equivalencia de
cores por fornecedor. Classificado como ALTO pela propria auditoria.

**2. P06 — `security_invoker=true` nas views publicas** (`supabase/migrations/20261101000001_security_invoker_views_p06.sql`).
**NAO aplicar como esta.** A intencao e legitima (A-V01, MEDIO) e nunca foi executada, mas a lista de 8
views esta errada para o banco de hoje. Precisa ser refeita view por view antes de ir a producao.

**3. Recibo no ledger** (`supabase/MIGRATIONS_SYNC_LOG.md`): as 2 linhas tem de ser regeradas com o
sha256 do arquivo que de fato for aplicado — os sha registrados na branch
(`94d993d3...` e `8fd47417...`) valem para o conteudo atual dos arquivos; se o P06 for reescrito, o sha muda.

## Risco de fechar esta branch

- **Se fechar e esquecer:** os dois furos ficam abertos por tempo indeterminado. O mais concreto e o
  P15: dado interno de fornecedor x cor exposto a visitante anonimo, ja aprovado pelo dono em
  01/11/2026 e nunca aplicado. Nao existe nenhuma outra branch ou migration na main fazendo isso.
- **Se aplicar o P06 como esta, quebra o site publico.** Esta e a razao de ser DECISAO_HUMANA e nao
  "resgatar e seguir". Com `security_invoker=true`, quem consulta a view precisa ter **permissao de
  leitura na tabela de origem**, e nao apenas uma policy. Medido em producao hoje (somente leitura,
  `information_schema.role_table_grants` + `pg_policies`): o papel anonimo tem permissao de leitura
  apenas em `product_properties` e `product_tags`. **Nao tem** em `products`, `suppliers`,
  `tabela_preco_gravacao_oficial`, `product_compositions` nem `kit_component_media`. Ou seja: 6 das 8
  views passariam a dar erro de permissao para visitante nao logado — catalogo de produtos, pagina de
  fornecedores e tabela de preco de gravacao. A PR #3003 afirma no corpo "tabelas subjacentes de todas
  as 8 views tem policies anon SELECT ativas"; a afirmacao e sobre *policy*, e as policies existem (1
  por tabela), mas o que falta e o *grant* — por isso a verificacao original passou e a aplicacao
  quebraria.
- **O P06 contradiz duas decisoes posteriores da main**, registradas em migration:
  `origin/main:supabase/migrations/20260717173348_secure_tabela_gravacao_anon_definer_v1.sql:36` poe
  `v_tabela_preco_gravacao_oficial_public` em `security_invoker = false` **de proposito** ("anon so
  precisa de SELECT na view, nao na tabela base") e na linha 40 revoga o SELECT de anon na tabela base;
  e `origin/main:supabase/migrations/20261107180000_security_fix_suppliers_authenticated_credential_leak_v2.sql:32`
  (de 07/11, posterior a esta branch) se apoia explicitamente em "a view `v_suppliers_public`
  (`security_invoker=false`) nao expoe a coluna" para justificar o revoke de credenciais. Mergear o P06
  sem revisar reverteria essas duas decisoes de seguranca.
- **Regra do repo:** sao duas migrations de DDL em producao. Por `AGENTS.md` (Git 7 e "Banco,
  migrations e edge functions"), a PR fica aberta e chama o dono, e a aplicacao e so pelo workflow
  `db-apply-migration.yml`. Nenhum agente pode decidir sozinho.
- **Achado adjacente (fora do escopo da branch, nao corrigir aqui):** em producao o papel anonimo tem
  grants de `INSERT`, `UPDATE` e `DELETE` table-level em `color_synonym_map` (as policies de escrita
  sao todas `TO authenticated`, o que hoje bloqueia a gravacao pela RLS). A policy anon de leitura e so
  a parte visivel; o grant de escrita merece item proprio.

## Nao verificado

- Nao foi testada a aplicacao de nenhuma das duas migrations (proibido escrever no banco e no git nesta
  tarefa). A quebra do P06 esta deduzida de grants e policies lidos em producao em 2026-11-16, nao de
  um `EXPLAIN`/`SET ROLE anon` executado.
- `v_system_health_dashboard` nao tem a opcao `security_invoker` definida; nao foi verificado quem a
  consome (painel interno ou publico) nem se o papel anonimo deveria le-la — isso muda se ela deve
  entrar na lista final do P06.
- Nao foi verificado se existe outra branch/PR aberta propondo o mesmo P06 com a lista corrigida; a
  checagem foi limitada a main, a producao e a PR #3003.
