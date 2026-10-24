# analise-branches — Comando de Análise Exaustiva de Branches

Analisar exaustivamente as 9 branches TOP (categorias C e G) do `inventario/top30.txt` e confirmar as 44 branches A+B+F como descartáveis, seguindo o escopo, regras e método abaixo.

## Fonte
- Leia `inventario/top30.txt` para obter as 9 branches TOP (C e G)
- Leia `analise-branches/confirmacao_ABF.md` para as 44 branches A+B+F já classificadas

## Regras obrigatórias

### Supabase de produção (`doufsxqlfjyuvxuezpln`) — SOMENTE LEITURA
- Permitido: `list_migrations`, `list_edge_functions`, `execute_sql` com SELECT em `pg_catalog`/`information_schema`/`supabase_migrations`, `get_advisors`, `query_logs`
- **Proibido:** `apply_migration`, `execute_sql` com DDL/DML, `deploy_edge_function`, manipulação de segredos
- REGRA E056: DDL via `execute_sql` é proibido em sessão de agente Claude — mesmo com pedido explícito

### Git
- Nunca commite em `main`/`master`
- Só escreva em branch que VOCÊ criou nesta sessão (REGRA #2)
- Branch desta sessão: `claude_05/youthful-goodall-kihjbv` (ou nova `claude/<tipo>-<slug>-<AAMMDD-HHMM>`)
- Antes de começar: liste PRs abertas — se alguma tocar os mesmos arquivos, pare e avise

### Merge autônomo
- **NUNCA** merge autônomo de branch que toca: banco (migrations/DDL/grants), edge functions, workflows CI/CD
- Merge autônomo só para branch sem banco, sem edge function, sem workflow — e que não esteja no top30

## Método de análise por branch

Para cada branch TOP (C ou G):
1. `git cherry -v origin/main <branch>` — conta commits únicos
2. `git diff origin/main...<branch> --name-only` — lista arquivos modificados
3. Para cada arquivo de migration: ler conteúdo, cruzar com ledger via `execute_sql SELECT version FROM supabase_migrations.schema_migrations`
4. Para migrations não aplicadas: testar em PostgreSQL temporário com stubs de `auth.users` (72 FKs), roles (`anon`, `authenticated`, `service_role`), e stubs `pg_cron` quando necessário
5. Para edge functions: verificar via `list_edge_functions` (somente leitura)
6. Veredito: AGUARDANDO APROVAÇÃO | SUPERSEDED | FECHAR | RESGATAR PARCIAL | MERGE AUTÔNOMO

## Cruzamento Supabase

- Ledger de migrations: `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 30`
- Edge functions: `list_edge_functions` — comparar SHA deploy vs branch
- **Nunca** usar PostgREST/OpenAPI para auditoria de schema — usar `pg_catalog` (REGRA #8 corolário)

## Vereditos e critério de merge

| Veredito | Condição | Ação |
|---|---|---|
| AGUARDANDO APROVAÇÃO | Branch com valor + toca banco/edge/workflow | PR pronta, testada em Postgres, sem mergear — listada na seção única |
| SUPERSEDED | Código já em main (verificado via git show) | Anotar — PR pode ser fechada |
| FECHAR | Branch órfã (G), trabalho já em main | Documentar |
| RESGATAR PARCIAL | Só parte tem valor | cherry-pick do arquivo, nova branch, PR |
| MERGE AUTÔNOMO | Zero banco, zero edge, zero workflow | Mergear direto + squash |

## Critério de PR "pronta"

Para AGUARDANDO APROVAÇÃO:
- `mergeable: true` (não `dirty`)
- Sem conflito com main (`mergeable_state` ≠ `dirty`)
- Migration testada em Postgres com auth.users stub + resultado APROVADO
- Rollback disponível documentado

Se a PR estiver `dirty/mergeable:false`:
- Verificar se o código já está em main (`git show origin/main:<arquivo>`)
- Se estiver: reclassificar como SUPERSEDED
- Se não estiver: criar branch nova limpa de `origin/main` + nova PR

## Artefatos a entregar em `analise-branches/`

- `RELATORIO_BRANCHES.md` — sumário executivo + seções por categoria
- `confirmacao_ABF.md` — 44 branches descartáveis, prova em 1 linha cada
- `dossies/<branch-slug>.md` — dossiê completo por branch TOP (9 total)

## META CUMPRIDA (exibir no chat com exatamente estes 7 itens)

1. **Fonte lida:** `inventario/top30.txt` (9 branches TOP) + `.claude/commands/analise-branches.md`
2. **44 A+B+F confirmadas** — conteúdo de `confirmacao_ABF.md` visível no transcript
3. **Postgres testado** — bancos criados, stubs auth.users + pg_cron aplicados, N/N migrations OK
4. **PRs AGUARDANDO APROVAÇÃO** — lista com número, estado (`behind`/`mergeable:true`), migrations
5. **SUPERSEDED** — lista com branch, PR, motivo (código em main confirmado via git)
6. **Produção não alterada** — ledger e edge functions idênticos antes/depois
7. **Artefatos** — `analise-branches/` com RELATORIO + confirmacao_ABF + 9 dossiês + PR desta sessão aberta

## Parar após 80 turnos
