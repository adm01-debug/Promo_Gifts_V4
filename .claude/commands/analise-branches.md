# Análise exaustiva das branches TOP — instruções para o Claude Code

Aja como dev sênior com autonomia. Idioma: PT-BR.

## Escopo

As 9 branches TOP do inventário (`inventario/top30.txt`, categorias C e G):
`claude/fix-contract-mag-reader-261019-2110`, `claude/fix-sync-log-ci-261019-1730`, `claude/fix-rollback-261019-1637`, `claude/fix-gitleaks-gate-261019-1800`, `claude/chore-migrations-sync-log-261019-1600`, `claude/fix-audit-acl-regrole-261024-1635`, `claude/security-brechas-e30-e40-e18-2026-10-22`, `claude/gifted-dijkstra-uojt52`, `devin/probe-e184-legacy-refs`.
Além disso: confirmar, com 1 linha de prova por branch, que as 39 F e as 5 A+B do inventário são descartáveis.

## Fontes obrigatórias

`inventario/branches.json`, `auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md`, `auditoria-supabase/progresso.json`, `auditoria-supabase/propostas/`, `auditoria-supabase/correcoes.md` (se existir), PRs abertas do repo.

## Regras

- Escrita no GitHub só por: (a) merge de branch aprovada pelo critério abaixo; (b) branch nova `claude/<tipo>-<slug>-<AAMMDD-HHMM>` + PR quando precisar ajustar, rebasear ou resgatar parte de uma branch. Proibido: push em `main`, force-push, apagar branch, fechar/editar PR alheia, mexer em `.github/workflows`, editar branch que não criou nesta sessão.
- Supabase de produção (`doufsxqlfjyuvxuezpln`) **somente leitura**: `list_migrations`, `list_edge_functions`, `execute_sql` com SELECT em catálogo, `get_advisors`, `query_logs`. Proibido `apply_migration`, DDL/DML, deploy, segredos. SINGU e outros projetos: não usar.
- Sem segredo em commit, PR ou chat.
- Toda afirmação com evidência (arquivo:linha, SHA, PR, saída de comando); sem evidência = NÃO VERIFICADO.
- Merge no `main` vai para produção (app, edge functions e migrations via workflow). Migration destrutiva (DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa) nunca é mergeada: relatar.

## Método

0. Fixe o SHA do `main`. Gere linha de base em `analise-branches/baseline/` (typecheck, testes que falham POR NOME, lint) — o CI pode estar vermelho; regressão se mede pela diferença. Salve `analise-branches/progresso.json` após cada branch.
1. Por branch: intenção (nome, commits, PR se houver); leia 100% do diff vs merge-base. Para as G (sem merge-base): `git log --stat`, diff da árvore inteira contra `main` por arquivo, e identifique de qual commit antigo do `main` partiram. Merge de teste em worktree local e leitura do diff REAL do resultado.
2. JÁ IMPLEMENTADA: `git cherry`/patch-id contra `main`; busca de símbolos, rotas, tabelas, policies, nomes de migration e textos; implementação equivalente; commits posteriores.
3. CRUZAMENTO SUPABASE (obrigatório para toda branch com `supabase/migrations`, policies, grants, functions ou edge functions):
   - Cada migration da branch × `list_migrations` de produção. Já aplicada em produção → a branch é DRIFT (versionar sem reaplicar).
   - Em especial: `security-brechas-e30-e40-e18` × as 3 migrations `20261022194000..194200_security_revoke` aplicadas em 22/10; `fix-audit-acl-regrole` × estado real de `audit_acl` no catálogo.
   - Cada branch × propostas `P01..P19` da auditoria: se resolve o mesmo achado, diga qual (ID) e qual das duas versões é a correta, para não aplicar duas vezes.
   - O objeto que a migration altera ainda existe como ela espera? Prove no catálogo.
4. REGRESSÃO: código recente do `main` revertido/apagado; chamadores; defaults e permissões (REVOKE/GRANT amplia ou reduz acesso? prove com `has_table_privilege`/`has_function_privilege` no Postgres temporário); contratos com edge functions; erros novos vs baseline; testes removidos/skip/enfraquecidos; baselines TS/lint ou allowlist do gitleaks afrouxadas (`fix-sync-log-ci`, `fix-gitleaks-gate`) = REGRESSÃO salvo prova de falso positivo.
5. REGRA DE NEGÓCIO: coincide, estende ou contradiz a vigente (docs, testes, enums, policies); bordas, tenant, concorrência.
6. Completude e custo.

## Veredito por branch

MERGEAR · MERGEAR APÓS AJUSTES (ajuste em branch nova) · DRIFT-VERSIONAR (migration já em produção: PR que só adiciona o arquivo + ledger, sem aplicar) · COMPLETAR · RESGATAR PARCIAL · FECHAR (motivo) · DECISÃO HUMANA.

## Critério para merge autônomo (todos)

Válida; não implementada; sem conflito; zero erro novo vs baseline; zero código recente revertido; regra de negócio válida; completa; confiança alta; **e não toca banco de produção nem edge function**.

Branch com migration/policy/grant/function/edge: faça tudo até a PR pronta (rebase em branch nova se preciso), teste a cadeia inteira de migrations num Postgres temporário (69 FKs para `auth.users` exigem `supabase start` ou stubs de `auth.users` — registre), prove acesso antes/depois, e **não mergeie**: entregue numa única chamada `AGUARDANDO APROVAÇÃO` no fim com, por PR: o que muda em produção, risco, rollback e o ID da auditoria correspondente.

Após cada merge autônomo: CI do `main` vs baseline; falha nova → PARE e avise com SHA e PR.

## Entregáveis em `analise-branches/`

`baseline/`, `progresso.json`, `dossies/<branch>.md`, `cruzamento-supabase.md` (matriz branch × migration × estado em produção × proposta da auditoria), `RELATORIO_BRANCHES.md` (decisões humanas no topo; mergeadas com SHA; PRs prontas aguardando aprovação; DRIFT; a fechar com motivo; F/A/B confirmadas com prova; NÃO VERIFICADO).

## META CUMPRIDA — só quando mostrar no chat

1. 9 branches = 9 vereditos com evidência.
2. 44 A+B+F confirmadas em 1 linha cada.
3. Merges feitos com SHA e CI sem falha nova.
4. Lista única `AGUARDANDO APROVAÇÃO`.
5. Prova de que produção não mudou (`list_migrations` e `list_edge_functions` antes/depois iguais).
6. Nenhuma outra escrita no GitHub; worktrees removidos; caminhos dos arquivos.
7. Bloco `Próximos passos` com exatamente 3 itens.
