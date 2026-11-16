# origin/claude_pink/peaceful-planck-q4ee1i

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** guarda as correcoes de uma auditoria do banco de producao — entre elas o aviso de que apagar uma coluna de senha/segredo na ordem errada derruba todas as integracoes, e a prova de que um cliente nao consegue ver orcamento/pedido de outro cliente.
- **Tip / merge-base / main:** tip `1653f5d32c2571898469d2578a3976ea4cccae58` / merge-base `e0b569f18cdfc8c7bc63466e567597cf799aaae7` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

13 commits, duas intencoes distintas:

1. **Fechar e corrigir a auditoria Supabase da sessao `01VXkRxX4vkrqFTfH53NAEBx` (2026-10-27/28)** — 12 dos 13 arquivos sao de `auditoria-supabase/`. Nao era "escrever a auditoria do zero": a maioria dos commits sao *correcoes de medicoes erradas da sessao anterior*, com a medicao refeita contra producao. Exemplos pelos proprios textos de commit: MED-010 ("query anterior usava view_definition ILIKE com LIMIT 30 — incorreta... 192 views"), ALT-008 ("sessao anterior incluia get_catalog_bestseller_page por erro"), PERF-001 ("ORDER BY name ASC usa idx_products_is_active_name (Index Scan), nao Sort em memoria"), C3/C8 em `correcoes.md`, e drift de edge functions ("3 so no repo" -> "1 funcao").
2. **Um conserto de CI** (commit `1653f5d32c`, 2026-11-09): proteger o portao de lint contra travar sem explicacao quando o processo morre antes de gravar o relatorio.

A branch declara explicitamente que nao escreveu nada em producao (`baseline_depois.json`: delta=0 migrations, delta=0 edges).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Guarda `existsSync(out)` + sinal no erro em `scripts/check-eslint-baseline.mjs` | **ESTA** (main ainda acrescentou `NODE_OPTIONS=--max-old-space-size=4096`) | `git show origin/main:scripts/check-eslint-baseline.mjs` linhas 88-97: `console.error(\`❌ eslint falhou com status ${res.status} (sinal: ${res.signal ?? 'nenhum'})\`)` e `if (!existsSync(out))` |
| MED-010 — 192 views sem `security_invoker=on` (corrigindo as 30 do LIMIT) | **ESTA** | `auditoria-supabase/ADENDO_2026-10-28.md:60` "**192 views** sem `security_invoker=on`" |
| CRIT-003 — nota "464 pelo metodo version-set (PR #2664)" | **ESTA** | `ADENDO_2026-10-28.md:12` e `:73` "Por version-set ... **464**" |
| ALT-009 / LOG-001 (auth 504 em producao) | **ESTA** | `ADENDO_2026-10-28.md` e `secao10_logs.md` contem `LOG-001` |
| CRON-001 — causa raiz `cron.use_background_workers=off` | **ESTA** (e a main tem diagnostico mais novo: `max_worker_processes=6` vs `cron.max_running_jobs=32`, 2026-11-01) | `propostas/P19_cron_failures_remediation.md` contem `use_background_workers`; `RELATORIO_AUDITORIA_SUPABASE.md:588-620` traz o root cause de 2026-11-01 |
| Insight "ai_usage_quotas nao tem coluna user_id" | **ESTA no relatorio**, mas **NAO ESTA nos arquivos de correcao** (ver "A resgatar" 1 e 2) | `RELATORIO_AUDITORIA_SUPABASE.md:946` marca SB-0007 como "❌ INVÁLIDO — tabela não tem coluna `user_id`" |
| Drift de edge functions = 1 funcao (`xbz-image-uploader`), nao 3 | **PARCIAL**: o inventario da main concorda (110 no repo x 109 publicadas), mas o relatorio da main ainda diz "3 funcoes a sincronizar" | `inventario/edge_functions.md:16` "109 publicadas, 110 no repo" vs `RELATORIO_AUDITORIA_SUPABASE.md:380` "Divergência \| 3 funções a sincronizar" |
| Aviso critico de ordem antes de apagar `integration_credentials.secret_value` | **NAO ESTA** | main `auditoria-supabase/correcoes.md:48` tem so "4. `ALTER TABLE integration_credentials DROP COLUMN secret_value`"; `grep -rn resolveCredential` em todo `auditoria-supabase/` da main: zero resultados |
| Policy correta para `ai_usage_quotas` (C8 + P01) | **NAO ESTA** — a main tem a versao errada | main `correcoes.md:120` e `propostas/P01_rls_restrictive_correcao.sql` com `USING (user_id = auth.uid())`; blob de P01 na main (`3f0d953629`) e identico ao do merge-base, ou seja a main nunca recebeu a correcao |
| Teste de isolamento entre clientes — 11/11 PASS (quotes/orders/order_items/profiles) | **NAO ESTA** | blob de `testes/rls_matrix_tenant_ab.md` na main (`a2419d536f`) = merge-base; `progresso.json` da main, secao A.11: "testes por role NÃO VERIFICADO" |
| PERF-001 corrigido: `ORDER BY name` usa `idx_products_is_active_name` (Index Scan), nao Sort | **NAO ESTA** — a main mantem a conclusao antiga "Sort sem índice em name" | main `inventario/explain_top_queries.md:32` "Mesmo problema de ausência de índice de ordenação"; `grep -rn idx_products_is_active_name` em `auditoria-supabase/` da main: zero resultados |
| Top-20 de `pg_stat_statements` reexecutado em 2026-10-28 | **NAO ESTA** (main tem o top-10 antigo) | diff (B) de `inventario/explain_top_queries.md`: main troca "Top-20 resumo (re-executado 2026-10-28)" por "Top-10 resumo" |
| `migrations_zero_result.md` (27 migrations aplicam do zero; #28 para em `storage.buckets`) | **NAO ESTA** — arquivo inexistente na main | `git ls-tree -r --name-only origin/main -- auditoria-supabase/` nao lista `migrations_zero_result.md` |
| S6 — bucket `signatures` sem policies de escrita listadas | **NAO ESTA** | diff (B) de `inventario/auth_storage_realtime.md` remove a secao "### S6 — signatures bucket sem policies de escrita listadas" |
| ALT-008 — 9 funcoes SECURITY DEFINER para `anon` (excluindo `get_catalog_bestseller_page`) | **CONTRADIZ a main**, que diz 10 e trata essa funcao como achado proprio (FUNC-NEW-002) | branch `RELATORIO...md:207` "9 funções"; main `RELATORIO...md:449` "10 Funções" e `propostas/P17_security_fn_cron_guard.md:59` lista `get_catalog_bestseller_page` |
| Relatorio principal da sessao 2026-10-28 (33 achados, CRIT/ALT/MED) | **SUPERADO**: a main tem um relatorio mais novo (2026-11-01, IDs SB-0001..SB-0011 + secoes A.2–A.13, 1.104 linhas vs 509) | main `RELATORIO_AUDITORIA_SUPABASE.md:1-24` ("Data: 2026-11-01") |
| `progresso.json`, `baseline_antes/depois.json`, `inventario/performance.md`, `inventario/drift_repo.md` | **SUPERADOS / equivalentes**: main esta em versao 2026-11-01; os achados sobrevivem em `advisors.md`, `P02_fk_indexes.sql`, `secao4_integridade.md` | main `progresso.json:2` `"ultima_atualizacao": "2026-11-01"`; `grep -rln kit_quote_requests_user_id_fkey` -> `inventario/advisors.md` |

## A resgatar

1. **`auditoria-supabase/correcoes.md` — aviso de ordem antes de apagar a coluna de segredo.**
   A branch escreveu: `supabase/functions/_shared/credentials.ts` (`resolveCredential`, ~linha 410) le `.select("secret_value")` direto; apagar a coluna sem antes trocar a leitura para o Vault **quebra todas as integracoes que resolvem credencial**. Isso continua verdadeiro hoje: `git show origin/main:supabase/functions/_shared/credentials.ts` linha 444 `.select("secret_value")` e linha 600 `.select("secret_name, secret_value")`. A main perdeu o aviso e ficou com o roteiro de 4 passos que termina no `DROP COLUMN` (main `correcoes.md:48`). **Por que importa:** se alguem seguir o roteiro da main, as integracoes externas param em producao.

2. **`auditoria-supabase/correcoes.md` (C8) e `auditoria-supabase/propostas/P01_rls_restrictive_correcao.sql` — regra de acesso de `ai_usage_quotas`.**
   A main propoe `USING (user_id = auth.uid())` numa tabela que **nao tem** coluna `user_id` (o proprio relatorio da main confirma isso em `RELATORIO...md:946`). A branch tem a versao que funciona: separar leitura (authenticated) de escrita (`is_dev() OR has_role(..., 'admin')`). **Por que importa:** a proposta da main nao aplica — e, se aplicada as cegas, deixa a tabela de limites de IA sem policy valida.

3. **`auditoria-supabase/testes/rls_matrix_tenant_ab.md` — teste de isolamento entre clientes, 11/11 PASS.**
   Sessao 2026-10-28, PostgreSQL 16 local, policies e funcoes auxiliares extraidas de producao, `FORCE ROW LEVEL SECURITY`: nenhum vazamento entre clientes em `quotes`, `orders`, `order_items`, `profiles`. A main esta no estado anterior a branch (blob identico ao merge-base) e o `progresso.json` da main registra esse teste como "NÃO VERIFICADO". **Por que importa:** e a unica prova executada de que um cliente nao ve orcamento/pedido de outro; sem ela a auditoria fica com um buraco declarado.

4. **`auditoria-supabase/inventario/explain_top_queries.md` — correcao do achado de performance do catalogo.**
   A branch reexecutou o plano e mostrou `Index Scan using idx_products_is_active_name`; o problema nao e falta de indice, e volume de chamadas (8.414 chamadas). A main continua afirmando "Sort sem índice em name". **Por que importa:** seguir a main leva a criar um indice que ja existe e nao resolve nada; a acao certa (cache/paginacao) fica de fora. Ressalva: o nome `idx_products_is_active_name` nao aparece em `supabase/migrations/` da main — a evidencia e o plano lido em producao, nao o repo.

5. **`auditoria-supabase/migrations_zero_result.md` — arquivo inteiro (61 linhas), inexistente na main.**
   Registra que 27 migrations aplicam do zero em Postgres puro e a #28 (`20251214184441_...`) para em `storage.buckets`, com a tabela de dependencias Supabase (storage 45, cron 172, pg_net 31, vault 24...) e o roteiro para o teste completo com Docker. **Por que importa:** evita que a proxima pessoa repita o teste e conclua erradamente que as migrations estao quebradas.

6. **`auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md` — numero de edge functions divergentes: 1, nao 3.**
   A tabela de drift da main (`:380`) diz "3 funções a sincronizar"; o inventario da main (`inventario/edge_functions.md:16`) diz 110 no repo x 109 publicadas. A branch explica a diferenca: `deno.json` e `tests` nao sao funcoes deployaveis. **Por que importa:** corrige um numero que esta sendo usado para decidir sincronizacao de edge functions.

7. **`auditoria-supabase/inventario/auth_storage_realtime.md` — achado S6** (bucket `signatures` sem policies de escrita listadas; verificar se INSERT/DELETE estao bloqueados de proposito). Removido na main. Baixo impacto, mas e um achado de permissao de arquivo que ninguem mais registrou.

## Risco de fechar esta branch

Se a branch for apagada sem resgate, perde-se:

- O **aviso que evita derrubar as integracoes externas** ao limpar a coluna de segredos (item 1). Esse e o risco de dinheiro: integracoes de fornecedor/CRM param e ninguem sabe por que.
- A **unica prova executada de que um cliente nao ve dados de outro** (item 3). A main registra esse teste como nao feito; sem o arquivo, a prova precisa ser refeita do zero.
- Uma **proposta de regra de acesso que nao funciona** fica como a versao oficial no repo (item 2), e um achado de performance **errado** continua guiando decisao (item 4).

Nao se perde: o conserto do portao de lint (ja esta na main, com melhoria extra) nem o relatorio principal (a main tem versao mais nova e mais completa).

## Nao verificado

- **ALT-008: 9 ou 10 funcoes SECURITY DEFINER acessiveis por `anon`?** A branch diz 9 (excluindo `get_catalog_bestseller_page`); a main diz 10 e lista essa funcao em dois lugares. Sao duas leituras de producao em datas diferentes; nao reexecutei a consulta (esta tarefa e somente leitura do git). Antes de usar qualquer um dos numeros, refazer a consulta de advisors em producao.
- **Se o indice `idx_products_is_active_name` existe hoje em producao.** Nao aparece em `supabase/migrations/` da main (`git grep` sem resultados) — compativel com o drift conhecido entre repo e banco, mas nao confirmado contra o banco nesta analise.
- **Numeros de `pg_stat_statements` e de falhas de cron** divergem entre branch (2026-10-28) e main (2026-11-01). Nao sao contradicao: sao janelas diferentes. Vale a medicao mais nova (a da main).
- **`progresso.json` e os dois `baseline_*.json`**: li os diffs, mas nao tentei reconciliar linha a linha os contadores de severidade das duas versoes — sao arquivos de controle da propria auditoria, nao achados; a versao da main (2026-11-01) e a mais recente.

Arquivos sem leitura por truncamento: 0 (o pacote trouxe os 13 diffs completos, sem marca de TRUNCADO).
