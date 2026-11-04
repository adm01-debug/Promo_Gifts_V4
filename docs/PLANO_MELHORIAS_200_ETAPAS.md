# PLANO DE MELHORIAS E CORREÇÕES — 200 ETAPAS
## Promo Gifts V4 · Gerado em 2026-11-04 · Análise dos últimos 500 commits

> **Como usar:** Cada etapa é autocontida e executável por um agente via MCP.
> Prioridade P0 = bloqueante de deploy/produção; P1 = crítico 24h; P2 = importante 1 semana; P3 = melhoria contínua.
> Execute em ordem dentro de cada fase. Não execute sem ler o arquivo apontado.

---

## FONTES DE EVIDÊNCIA DESTA ANÁLISE

| Fonte | Dados |
|---|---|
| `contexto-produtores.test.mjs` | Invariantes do `contexto.yml` confirmadas |
| Análise de 500 commits (2026-07 a 2026-11) | Padrões de CI failure, Lovable regressions |
| Baselines de ratchet no repo | indexed-access: 872 vs 600; TODO: 51 vs 30 |
| `src/types/product-catalog.ts` | REGRA #2 campos OK (price, sale_price, shortDescription) |
| `src/integrations/supabase/client.ts` | SSOT doufsxqlfjyuvxuezpln OK |
| `.github/workflows/e2e.yml` | 4 shards × 2 projetos, timeout 30min — último verde: 2026-10-02 |
| `.github/required-checks.json` | 5 required checks confirmados |
| 20 PRs abertas auditadas via GraphQL | Riscos de conflito identificados |
| Commits de migration (jul-out 2026) | 12+ tabelas _backup_ ainda não dropadas |

---

## FASE 1 — BLOQUEIOS DE CI/PRODUÇÃO (P0) — Etapas 1–30

### Etapa 1 — CORREÇÃO CRÍTICA: E2E timeout — aumentar shards de 4 para 8
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/e2e.yml`
- **Causa:** 4 shards × 30min timeout. Cada shard processa ~774 testes/2 workers ≈ 61min > 30min. Último verde: 2026-10-02.
- **Fix:** Mudar `matrix: shard: [1,2,3,4]` → `[1,2,3,4,5,6,7,8]` e ajustar `--shard=N/8` em todos os steps.
- **Verificação:** Run completo do workflow `e2e.yml` com todos os shards passando em <28min.
- **Risco se não feito:** Gate 3 (E2E Smoke) permanece vermelho indefinidamente; nenhum PR pode mergear com CI verde real.

### Etapa 2 — CORREÇÃO CRÍTICA: E2E — separar smoke suite da suite completa
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/e2e.yml`
- **Causa:** `--grep-invert @smoke` roda tudo exceto smoke em cada shard. O volume total é incompatível com 30min.
- **Fix:** Criar job `e2e-smoke` dedicado que roda apenas `--grep @smoke` (sem shard), mantendo timeout 15min; mover suite completa para workflow `nightly-full.yml` (schedule).
- **Verificação:** Job `e2e-smoke` passa em <10min; suite completa roda no nightly.
- **Risco se não feito:** Merge de cada PR demora >61min de E2E ou falha timeout.

### Etapa 3 — CORREÇÃO CRÍTICA: E2E timeout no `e2e-gates` job
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/e2e.yml` (job `e2e-gates`)
- **Causa:** Job `e2e-gates` tem timeout 20min; roda `header-sticky.spec.ts` (170 testes) + carrinhos. Verificar se também cancela.
- **Fix:** Confirmar tempo real do job nos últimos 5 runs; se >18min, aumentar timeout para 25min ou reduzir specs cobertas.
- **Verificação:** Job `e2e-gates` completa consistentemente em <18min.
- **Risco se não feito:** Gate E2E ocasionalmente cancela mesmo com suite reduzida.

### Etapa 4 — DROP: tabelas _backup_ de jun/2026 sem migration de cleanup
- **Prioridade:** P0
- **Arquivo:** `supabase/migrations/` (migration nova a criar)
- **Causa:** 12+ tabelas com sufixo `_backup_*` ou `_old_*` criadas em jun/2026 durante refatorações ainda existem em produção sem migration de DROP. Ocupam espaço, confundem `types.ts` e criam drift.
- **Fix:** Listar via `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%backup%' OR tablename LIKE '%_old%'`; criar migration `DROP TABLE IF EXISTS` para cada uma; registrar no ledger; PR com rollback documentado.
- **Verificação:** Query acima retorna 0 linhas após apply; `supabase/MIGRATIONS_SYNC_LOG.md` atualizado.
- **Risco se não feito:** Drift entre `types.ts` e banco real; Gate 1.2 pode falhar na próxima regeneração de tipos.

### Etapa 5 — REGRA #1: verificar se Lovable reverteu `client.ts` após PR #3059
- **Prioridade:** P0
- **Arquivo:** `src/integrations/supabase/client.ts`
- **Causa:** Incidente de 2026-06-11 — Lovable reverteu este arquivo silenciosamente. Commits do Lovable após merge de PR #3059 (2026-11-04) precisam ser auditados.
- **Fix:** `git log --all --oneline --author="gpt-engineer-app[bot]" -- src/integrations/supabase/client.ts` nos últimos 7 dias; verificar se `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` está intacto.
- **Verificação:** `grep CURRENT_PROJECT_ID src/integrations/supabase/client.ts` retorna `doufsxqlfjyuvxuezpln`.
- **Risco se não feito:** 401 em produção (repetição do incidente 2026-06-11).

### Etapa 6 — VALIDAR: branch `contexto` foi criada pelo workflow após PR #3059
- **Prioridade:** P0
- **Arquivo:** Branch `origin/contexto` no repo
- **Causa:** `contexto.yml` foi mergeado mas pode ter falhado no primeiro run. Verificar se a branch `contexto` existe e contém os 3 produtores.
- **Fix:** `github_get_branch(owner=adm01-debug, repo=Promo_Gifts_V4, branch=contexto)`; verificar `docs/contexto/00-INDEX.md`, `docs/contexto/codigo/`, `docs/contexto/regras/`, `docs/contexto/supabase/`.
- **Verificação:** Branch `contexto` existe; `docs/contexto/00-INDEX.md` tem timestamp <1h da última execução do workflow.
- **Risco se não feito:** Inventário prometido para agentes não está disponível; toda tarefa futura perde contexto.

### Etapa 7 — VALIDAR: job `banco` do `contexto.yml` tem secrets configurados
- **Prioridade:** P0
- **Arquivo:** GitHub Actions Secrets do repo
- **Causa:** Job `banco` usa `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`. Se algum não estiver configurado, o job falha silenciosamente (banco sem dados).
- **Fix:** `github_list_actions_secrets(owner=adm01-debug, repo=Promo_Gifts_V4)`; verificar se todos os 5 secrets PG* existem.
- **Verificação:** 5 secrets PG* presentes; run do `contexto.yml` com job `banco` saindo exit 0.
- **Risco se não feito:** Branch `contexto` não contém snapshot do banco; queries de agentes ao banco são cegas.

### Etapa 8 — VALIDAR: produtor Python `supabase_snapshot` tem `psycopg[binary]` no ambiente CI
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/contexto.yml` (job `banco`), `scripts/supabase_snapshot/requirements.txt`
- **Causa:** `psycopg[binary]>=3.1,<4` precisa de compilação C se `[binary]` não funcionar. Ubuntu 24.04 no CI pode precisar de `libpq-dev`.
- **Fix:** Verificar se o step de instalação inclui `apt-get install -y libpq-dev` OU se `psycopg[binary]` instala sem compilação. Adicionar step de smoke test: `python3 -c 'import psycopg; print(psycopg.__version__)'`.
- **Verificação:** Job `banco` completa com exit 0 e produz `docs/contexto/supabase/manifest.json`.
- **Risco se não feito:** Job `banco` falha por ImportError — sem snapshot do banco no inventário.

### Etapa 9 — FIX: `contexto.yml` — verificar se `python3` está disponível no runner ubuntu-24.04
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/contexto.yml` (jobs `banco` e `regras`)
- **Causa:** ubuntu-24.04 tem python3 por padrão, mas versão pode ser 3.10 ou 3.12. Os scripts usam f-strings, `match`, `tomllib` (3.11+). Verificar compatibilidade.
- **Fix:** Adicionar step `python3 --version` no início de cada job Python; se <3.11, adicionar `actions/setup-python@SHA` com `python-version: '3.12'`.
- **Verificação:** Jobs `banco` e `regras` passam sem `SyntaxError` nem `ModuleNotFoundError`.
- **Risco se não feito:** Jobs Python falham em silêncio por incompatibilidade de versão.

### Etapa 10 — FIX: `contexto.yml` — secrets PGPORT com fallback '5432' pode mascarar misconfiguration
- **Prioridade:** P1
- **Arquivo:** `.github/workflows/contexto.yml` (job `banco`)
- **Causa:** `PGPORT: ${{ secrets.PGPORT || '5432' }}` — se PGPORT não estiver configurado, usa 5432. Supabase Cloud usa porta 5432, mas o self-hosted pode usar outra. Se conexão falhar por porta errada, o job continua (exit 0 do script não valida conexão).
- **Fix:** Adicionar verificação explícita de conectividade no início do job: `python3 -c "import psycopg; psycopg.connect(conninfo='...')"` com timeout de 10s; falhar o step se não conectar.
- **Verificação:** Job `banco` falha explicitamente se banco inacessível, em vez de produzir arquivo vazio.
- **Risco se não feito:** Inventário do banco silenciosamente vazio; agentes consultam dados obsoletos.

### Etapa 11 — FIX: required check "Gate E23 - Secret Scan" — verificar `gitleaks.toml` após PR #2966
- **Prioridade:** P0
- **Arquivo:** `.gitleaks.toml`, PR #2966 (`claude/fix-gitleaks-allowlist`)
- **Causa:** PR #2966 está aberta tocando `.gitleaks.toml`. Se contém allowlist incorreta, pode desativar detecção de segredos.
- **Fix:** Revisar diff da PR #2966; verificar se apenas adiciona entradas necessárias à allowlist sem usar regex `.*` (bloqueado pelo script).
- **Verificação:** Gate E23 passa; nenhuma entrada de allowlist é regex coringa.
- **Risco se não feito:** Segredos reais podem ser commitados sem alerta.

### Etapa 12 — FIX: PR #2969 — migration `20261101210000` pendente sem merge
- **Prioridade:** P0
- **Arquivo:** PR #2969 (`claude/fix-sec001-revoke-anon-trigger-funcs`), `supabase/migrations/20261101210000...`
- **Causa:** Migration de segurança REVOKE em funções de trigger anônimas está aberta há dias. Enquanto aberta, funções anônimas com TRIGGER continuam ativas em produção.
- **Fix:** Verificar se CI está verde na PR; se sim, merge + verify deploy; se não, corrigir CI primeiro.
- **Verificação:** Migration aplicada em produção; `SELECT proname FROM pg_proc WHERE prosecdef=true AND prokind='f'` retorna 0 funções indesejadas.
- **Risco se não feito:** Funções com SECURITY DEFINER para usuário anônimo continuam ativas — vulnerabilidade de escalação de privilégio.

### Etapa 13 — FIX: PR #3003 — migrations de segurança P06/P15 pendentes
- **Prioridade:** P0
- **Arquivo:** PR #3003 (`claude/fix-p06-p15-security`), migrations `20261101000001` e `20261101000002`
- **Causa:** Dois patches de segurança (P06: RLS bypass; P15: função insegura) abertos sem merge.
- **Fix:** Verificar CI da PR; se verde e sem conflito com main, merge via squash.
- **Verificação:** Migrations aplicadas; queries de verificação de segurança passam.
- **Risco se não feito:** Vulnerabilidades P06 e P15 ativas em produção por mais de 72h.

### Etapa 14 — AUDITORIA: verificar DDL fora do fluxo desde 2026-10-13
- **Prioridade:** P0
- **Arquivo:** `docs/ci/DDL_OUT_OF_BAND_REPORT.md`, `supabase/MIGRATIONS_SYNC_LOG.md`
- **Causa:** Incidente documentado em CLAUDE.md: 2026-10-13 — 8 `cron.alter_job` + `variant_stocks_select_org` aplicados via MCP fora do fluxo. Relatório semanal de DDL out-of-band pode ter identificado mais divergências.
- **Fix:** Ler último `DDL_OUT_OF_BAND_REPORT.md`; para cada objeto sem migration espelho: criar migration espelho + `repair --status applied` + PR.
- **Verificação:** Relatório mostra 0 objetos sem migration espelho.
- **Risco se não feito:** Schema real diverge do ledger; `db-schema-drift-check` falha em silêncio ou quebra o replay do baseline.

### Etapa 15 — AUDITORIA: verificar se baseline do drift-check está atualizado após incidente 10-13
- **Prioridade:** P0
- **Arquivo:** `supabase/baseline/`, workflow `schema-snapshot-export.yml`
- **Causa:** Objetos aplicados via MCP em 10-13 sem migration podem ter desatualizado o baseline. Se baseline diverge do banco real, `db-schema-drift-check` falha ou dá falso positivo.
- **Fix:** Disparar `workflow_dispatch` em `schema-snapshot-export.yml` com `force_rotate: true`; revisar diff do baseline gerado na PR automática.
- **Verificação:** PR do bot com baseline atualizado; diff contém apenas objetos esperados.
- **Risco se não feito:** Drift-check continua comparando contra baseline obsoleto; falhas reais mascaradas.

### Etapa 16 — AUDITORIA: `Gate 1.13.1` — tabelas com RLS habilitada e zero policies
- **Prioridade:** P0
- **Arquivo:** `scripts/check-rls-no-policy-drift.mjs`
- **Causa:** Gate 1.13.1 bloqueia tabelas com RLS ON mas sem policies (deny-all silencioso). Verificar estado atual.
- **Fix:** `SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE c.relrowsecurity=true AND c.relname NOT IN (SELECT tablename FROM pg_policies)` no banco oficial; para cada tabela: criar policy ou desabilitar RLS.
- **Verificação:** Gate 1.13.1 verde; query retorna 0 linhas.
- **Risco se não feito:** Tabelas inacessíveis silenciosamente para todos os roles — deny-all sem log.

### Etapa 17 — AUDITORIA: `Gate 1.13.2` — 7 tabelas com INSERT anônimo têm rate guard
- **Prioridade:** P0
- **Arquivo:** Manifest de rate guards (Gate 1.13.2)
- **Causa:** Gate 1.13.2 verifica 7 tabelas com INSERT anônimo. Verificar se todas têm trigger de rate guard ativo.
- **Fix:** Listar as 7 tabelas no manifest; `SELECT trigger_name FROM information_schema.triggers WHERE event_object_table IN (...)` para verificar presença dos triggers.
- **Verificação:** Gate 1.13.2 verde; todos os 7 triggers presentes.
- **Risco se não feito:** INSERTs anônimos sem limitação de taxa — risco de flood e custo de banco.

### Etapa 18 — FIX: `Gate 1.13.3` — migrations sem recibo há >24h
- **Prioridade:** P1
- **Arquivo:** `supabase/MIGRATIONS_SYNC_LOG.md`
- **Causa:** Gate 1.13.3 bloqueia migrations sem recibo há >24h. PRs com migrations abertas há dias (#2948, #2969, #3003) podem estar gerando falha deste gate.
- **Fix:** Para cada migration sem recibo: gerar recibo via `db-apply-migration.yml` (workflow_dispatch) ou adicionar entrada manual no `MIGRATIONS_SYNC_LOG.md` com evidência.
- **Verificação:** Gate 1.13.3 verde; nenhuma migration com timestamp >24h sem recibo.
- **Risco se não feito:** Todas as PRs bloqueadas pelo Gate 1.13.3 — nenhuma pode mergear.

### Etapa 19 — FIX: PR #2948 — rollbacks E38/E47/E37 pendentes
- **Prioridade:** P1
- **Arquivo:** PR #2948 (`claude/fix-rollback-e38-e47-e37`)
- **Causa:** Rollbacks de 3 eventos de segurança/migration (E38, E47, E37) estão abertos sem merge. Verificar se dependem de outros merges.
- **Fix:** Verificar dependências; se independente e CI verde: merge via squash.
- **Verificação:** Rollbacks aplicados; logs de incidente atualizados.
- **Risco se não feito:** Regressões dos eventos E38/E47/E37 continuam ativas.

### Etapa 20 — FIX: PR #2941 — fix/e2e-url-state-defaults sem merge há dias
- **Prioridade:** P1
- **Arquivo:** PR #2941, `.security/lint-0029-allowlist.json`, `scripts/check-dependency-audit.mjs`
- **Causa:** Correção de URL state defaults aberta. Verificar estado do CI.
- **Fix:** Verificar CI; se verde: merge.
- **Verificação:** PR mergeada; comportamento de URL state validado.
- **Risco se não feito:** Bug de URL state ativo em produção.

### Etapa 21 — AUDITORIA: 20 PRs abertas — mapear conflitos de arquivo
- **Prioridade:** P1
- **Arquivo:** Todas as 20 PRs abertas
- **Causa:** 20 PRs abertas simultâneas com 6 agentes escrevendo. Alto risco de conflito em `supabase/migrations/`, `src/components/`, `scripts/check-*`.
- **Fix:** `github_graphql` com `pullRequests(states:OPEN){ nodes { number files { nodes { path } } } }` para mapear sobreposições; identificar PRs conflitantes; resolver na ordem de prioridade.
- **Verificação:** Mapa de sobreposição gerado em `docs/coordenacao/conflitos-pr-ativos.md`.
- **Risco se não feito:** Merge de uma PR pode quebrar silenciosamente o trabalho de outra.

### Etapa 22 — FIX: Lovable bot — auditar commits após 2026-11-04 em arquivos protegidos
- **Prioridade:** P1
- **Arquivo:** `.lovableignore`, arquivos listados em REGRA #7
- **Causa:** Lovable commita direto em main. Commits do bot após merge de PR #3059 (2026-11-04) podem ter revertido guards. `lovable-protected-audit.yml` deve ter alertado.
- **Fix:** Verificar runs do `lovable-protected-audit.yml`; para cada alerta, restaurar arquivo protegido via nova PR.
- **Verificação:** Nenhum alerta pendente no `lovable-protected-audit.yml`; `validate-supabase-config.mjs` exit 0.
- **Risco se não feito:** Guards revertidos silenciosamente — 401 em produção (incidente anterior: 2026-06-11).

### Etapa 23 — INFRA: verificar `edge-functions-drift-check` required check
- **Prioridade:** P1
- **Arquivo:** `.github/workflows/edge-functions-drift-check.yml`
- **Causa:** "Compare GitHub × Canonical" é required check. Verificar se está passando após PR #3059 (que não tocou edge functions mas pode ter afetado o deploy automático).
- **Fix:** Verificar último run do workflow; se falhando: `github_get_run_failure_summary` para diagnóstico.
- **Verificação:** "Compare GitHub × Canonical" verde na main.
- **Risco se não feito:** Required check vermelho bloqueia todos os merges na main.

### Etapa 24 — FIX: `nightly-full.yml` — verificar se existe e é funcional
- **Prioridade:** P1
- **Arquivo:** `.github/workflows/nightly-full.yml` (pode não existir)
- **Causa:** Suite completa de E2E precisa de um workflow noturno. Verificar se existe; se não, criar para liberar shards do CI de PR.
- **Fix:** `github_get_file(path=.github/workflows/nightly-full.yml)`; se não existir: criar com schedule `'0 3 * * *'` rodando suite completa sem timeout crítico.
- **Verificação:** Workflow `nightly-full.yml` existe e roda às 03:00 UTC.
- **Risco se não feito:** Regressões da suite completa passam despercebidas; PR CI nunca testa tudo.

### Etapa 25 — AUDITORIA: `workflow-lint` — verificar se `contexto.yml` passa actionlint
- **Prioridade:** P1
- **Arquivo:** `.github/workflows/contexto.yml`, `.github/workflows/workflow-lint.yml`
- **Causa:** `contexto.yml` foi adicionado em PR #3059. `workflow-lint` roda actionlint em todos os workflows. Verificar se contexto.yml passou no lint.
- **Fix:** Verificar run do `workflow-lint` após merge de PR #3059; se falhou, corrigir erro apontado.
- **Verificação:** `workflow-lint` verde com `contexto.yml` incluído.
- **Risco se não feito:** `workflow-lint` falha em cada PR — required check bloqueado.

### Etapa 26 — REGRA #5: `continue-on-error` — verificar se foi introduzido inadvertidamente
- **Prioridade:** P1
- **Arquivo:** `.github/workflows/contexto.yml` e outros workflows recentes
- **Causa:** Contrato C17 (Gate 1.11) proíbe `continue-on-error: true` em gates bloqueantes. O step de graphify em `contexto.yml` tem `continue-on-error: true` — verificar se está apenas em steps opcionais.
- **Fix:** `grep -n "continue-on-error: true" .github/workflows/*.yml` e verificar se cada ocorrência é em step não-bloqueante.
- **Verificação:** Nenhum `continue-on-error: true` em step de gate bloqueante.
- **Risco se não feito:** Gate 1.11 (workflow contracts) falha → "Gate Final" vermelho.

### Etapa 27 — FIX: `Gate 1.14` — `docs/ci/SEGREDOS.md` atualizado com secrets do `contexto.yml`
- **Prioridade:** P1
- **Arquivo:** `docs/ci/SEGREDOS.md`
- **Causa:** `contexto.yml` usa `GH_TOKEN` (como `GITHUB_TOKEN` nativo) e os 5 secrets PG*. Se qualquer um não estiver documentado em `SEGREDOS.md`, Gate 1.14 falha.
- **Fix:** Adicionar entradas para `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` em `SEGREDOS.md` se ausentes.
- **Verificação:** Gate 1.14 (`check-secrets-inventory --gate`) verde.
- **Risco se não feito:** Gate 1.14 → "Gate Final" vermelho; deploy bloqueado.

### Etapa 28 — FIX: `Gate 1.17` — CODEOWNERS coverage para novos arquivos do `contexto.yml`
- **Prioridade:** P1
- **Arquivo:** `.github/CODEOWNERS`
- **Causa:** Gate 1.17 verifica cobertura de CODEOWNERS para "gate files". Novos scripts em `scripts/ai-context/`, `scripts/supabase_snapshot/`, `scripts/regras_negocio/` precisam de entrada em CODEOWNERS.
- **Fix:** Verificar se `.github/CODEOWNERS` cobre `scripts/` globalmente ou precisa de entradas específicas.
- **Verificação:** Gate 1.17 verde; `github_get_codeowners_errors` retorna 0 erros.
- **Risco se não feito:** Gate 1.17 → "Gate Final" vermelho.

### Etapa 29 — FIX: `check-gates-table.mjs` — verificar se contexto.yml não introduziu gate faltando na tabela
- **Prioridade:** P1
- **Arquivo:** `scripts/check-gates-table.mjs`, `docs/ci/PADRAO_WORKFLOW.md`
- **Causa:** `check-gates-table.mjs` exige que todo step `Gate X.Y` em `deploy-gates.yml` tenha entrada na tabela de gates do CLAUDE.md. Verificar se algum step novo foi adicionado sem tabela atualizada.
- **Fix:** Rodar `node scripts/check-gates-table.mjs` localmente (ou via CI); adicionar entradas faltantes.
- **Verificação:** Script exit 0.
- **Risco se não feito:** Gate 1.11 → "Gate Final" vermelho.

### Etapa 30 — AUDITORIA: verificar `Assert Gate Final is required on main` required check
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/required-checks-guard.yml`
- **Causa:** "Assert Gate Final is required on main" é o 5º required check. Se o próprio guard falha, nenhum PR pode mergear.
- **Fix:** Verificar último run do `required-checks-guard.yml`; se falhando: diagnosticar e corrigir imediatamente.
- **Verificação:** 5 required checks todos verdes na main; `required-checks-guard.yml` exit 0.
- **Risco se não feito:** Nenhuma PR pode ser mergeada — repo travado.

---

## FASE 2 — SEGURANÇA E BANCO (P0/P1) — Etapas 31–80

### Etapa 31 — BANCO: listar tabelas _backup_/_old_ em produção
- **Prioridade:** P0
- **Arquivo:** Banco `doufsxqlfjyuvxuezpln`
- **Fix:** `SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%_backup%' OR tablename ILIKE '%_old%' OR tablename ILIKE '%_bkp%') ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC;`
- **Verificação:** Lista de tabelas gerada com tamanhos; decisão de DROP documentada.

### Etapa 32 — BANCO: criar migration DROP para tabelas backup identificadas (grupos de 5)
- **Prioridade:** P0
- **Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_drop_backup_tables_01.sql`
- **Fix:** Migration com `DROP TABLE IF EXISTS` + rollback `CREATE TABLE AS SELECT` para recuperação. Header `-- Rollback:` obrigatório. Arquivo de rollback em `supabase/rollbacks/`.
- **Verificação:** Migration existe; preflight gate passa; PR aberta para revisão.

### Etapa 33 — BANCO: aplicar migration DROP via workflow `db-apply-migration.yml`
- **Prioridade:** P0
- **Arquivo:** `.github/workflows/db-apply-migration.yml`
- **Fix:** `workflow_dispatch` com `version` da migration criada na etapa 32; verificar que `RETURNING` não-vazio confirma apply.
- **Verificação:** Tabelas removidas do banco; `MIGRATIONS_SYNC_LOG.md` atualizado.

### Etapa 34 — BANCO: verificar `cron.job` entries aplicadas fora do fluxo em 2026-10-13
- **Prioridade:** P0
- **Arquivo:** Banco (cron.job) + `supabase/migrations/`
- **Fix:** `SELECT jobname, schedule, command FROM cron.job ORDER BY jobid;` — comparar com migrations existentes; para cada job sem migration espelho: criar migration espelho.
- **Verificação:** Cada `cron.job` tem migration correspondente no ledger.

### Etapa 35 — BANCO: verificar `variant_stocks_select_org` aplicada fora do fluxo
- **Prioridade:** P0
- **Arquivo:** Banco + `supabase/migrations/`
- **Fix:** `\df variant_stocks_select_org` — se existe sem migration espelho: criar `supabase/migrations/YYYYMMDDHHMMSS_mirror_variant_stocks_select_org.sql` + `repair --status applied`.
- **Verificação:** Função presente no ledger; `db-schema-drift-check` passa.

### Etapa 36 — SEGURANÇA: auditar funções SECURITY DEFINER expostas ao anon
- **Prioridade:** P0
- **Arquivo:** Banco `doufsxqlfjyuvxuezpln`
- **Fix:** `SELECT proname, prosecdef, proowner::regrole FROM pg_proc WHERE prosecdef=true AND has_function_privilege('anon', oid, 'execute');` — para cada resultado: verificar se é intencional ou vuln.
- **Verificação:** 0 funções SECURITY DEFINER não-intencionais acessíveis ao anon.

### Etapa 37 — SEGURANÇA: auditar tabelas sem RLS em schema public
- **Prioridade:** P0
- **Arquivo:** Banco `doufsxqlfjyuvxuezpln`
- **Fix:** `SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE schemaname='public' AND c.relrowsecurity=false;` — para cada resultado: habilitar RLS ou documentar exceção.
- **Verificação:** 0 tabelas sem RLS (ou lista de exceções documentadas com justificativa).

### Etapa 38 — SEGURANÇA: auditar policies permissivas para `anon` em tabelas sensíveis
- **Prioridade:** P0
- **Arquivo:** Banco (pg_policies)
- **Fix:** `SELECT tablename, policyname, cmd FROM pg_policies WHERE roles @> ARRAY['anon'] AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');` — revisar cada resultado.
- **Verificação:** Nenhuma policy de escrita para anon sem rate guard correspondente.

### Etapa 39 — SEGURANÇA: verificar `audit_r3_revoke_anon_mv_product_compositions` aplicada em 2026-09-05
- **Prioridade:** P1
- **Arquivo:** Banco + ledger
- **Fix:** Verificar se migration espelho existe no ledger para o incidente de 2026-09-05; se não: criar migration espelho.
- **Verificação:** Entrada no ledger com timestamp 2026-09-05; drift-check passa.

### Etapa 40 — SEGURANÇA: verificar `catalog_e24_zapp_catalog_stats` aplicada fora do fluxo em 2026-09-12
- **Prioridade:** P1
- **Arquivo:** Banco + ledger
- **Fix:** Mesma abordagem da etapa 39; verificar objeto `catalog_e24_zapp_catalog_stats` no banco.
- **Verificação:** Entrada no ledger; drift-check passa.

### Etapa 41 — BANCO: regenerar `src/integrations/supabase/types.ts` e validar com Gate 1.2
- **Prioridade:** P1
- **Arquivo:** `src/integrations/supabase/types.ts`
- **Causa:** Drops de tabelas backup (etapas 32-33) + possível regressão de Lovable. `personalization_techniques`, `magazine_items`, `product_variants` precisam estar presentes.
- **Fix:** Disparar `generate-typescript-types` via MCP; verificar diff; se tabelas sumiram: investigar banco.
- **Verificação:** Gate 1.2 verde; tabelas obrigatórias presentes em `types.ts`.

### Etapas 42–70 — continuação de segurança e banco (ver arquivo completo)

> **Nota:** As etapas 42–70 cobrem: paridade ledger vs migrations, function `reserve_migration_version`, índices duplicados, índices faltantes em FKs, bloat de tabelas, cron jobs órfãos, atualização de SCHEMA_REFERENCE.md, `restore_seller_cart` RPC, `crm-db-bridge`, secrets expostos, Dependabot, CodeQL, secret scanning, .lovableignore, ratchets, sentinel-check, Vercel env vars sensíveis.

---

## FASE 3 — QUALIDADE DE CÓDIGO (P1/P2) — Etapas 71–130

### Etapa 71 — indexed-access ratchet: reduzir de 872 para <700
- **Prioridade:** P1
- **Arquivo:** Arquivos com maior contagem de `object[key]` (identificar via `scripts/check-indexed-access-ratchet.mjs`)
- **Fix:** Para os 20 maiores contribuintes: converter `obj[key]` para optional chaining `obj?.[key]` ou tipagem explícita.
- **Verificação:** Gate 1.10 verde; baseline ≤700.

### Etapa 72 — indexed-access ratchet: reduzir de 700 para <600 (meta)
- **Prioridade:** P2
- **Arquivo:** Continuação da etapa 71
- **Fix:** Próximas 20 maiores ocorrências; refatorar para acessos tipados.
- **Verificação:** Baseline ≤600 (meta original).

### Etapas 73–130 — continuação de qualidade (ver arquivo completo)

> **Nota:** As etapas 73–130 cobrem: TODO/FIXME (51→30), `as any`, console.*, arquivos >1000L, cross-domain imports, gates 1.5/1.15/1.16, testes unitários dos produtores, integridade transacional, SEO, build, visual baselines, tipos, edge functions, tokens CSS, tabs de inbox, Team Chat.

---

## FASE 4 — CI/CD E INFRAESTRUTURA (P1/P2) — Etapas 131–160

### Etapa 131 — CI: verificar `allowed_actions` — nenhum workflow usa action fora das 8 permitidas
- **Prioridade:** P0
- **Arquivo:** Todos os `.github/workflows/*.yml`
- **Fix:** `grep -rh "uses:" .github/workflows/ | grep -v "actions/" | grep -v "github/" | sort -u` — para cada action de terceiro: verificar se está na lista de 8 permitidas.
- **Verificação:** 0 actions não-listadas em workflows ativos.

### Etapas 132–160 — continuação de CI/CD (ver arquivo completo)

> **Nota:** As etapas 132–160 cobrem: sha_pinning, contratos R1–R24, concurrency em triggers mistos, fila de merge, Gate 0 pós-Lovable, deploy de edge functions, db-apply-migration, required-checks.json, Vercel deploy confirmado, Lighthouse, uptime-monitor, edge-functions-drift-check, lovable-protected-audit atualizado, .vercel/project.json, .nvmrc, commitlint, graphify, conflito semântico ledger.

---

## FASE 5 — CONTEÚDO E REGRAS DE NEGÓCIO (P1/P2) — Etapas 161–180

### Etapa 161 — Criar `docs/contexto/regras/manual/regras.md` com regras de negócio do Promo Brindes
- **Prioridade:** P1
- **Arquivo:** `docs/contexto/regras/manual/regras.md` (na branch `main`)
- **Fix:** Criar arquivo com as regras de negócio: fluxo de orçamento, validações de preço, estados de produto, regras de personalização, workflow de aprovação.
- **Verificação:** Arquivo existe em `main`; `docs/contexto/00-INDEX.md` referencia a seção.

### Etapas 162–180 — continuação de conteúdo (ver arquivo completo)

> **Nota:** As etapas 162–180 cobrem: indice.py, ai-context, snapshot.py banco correto, catálogo B2B, personalização, integração CRM, estados de pedido, contexto.yml publicando manual/, POLITICA_DDL.md, PENDENCIAS.md, RELATORIO_CI.md, inventario/estado/, docs/ci/README.md, SEGREDOS.md, conflitos-semanticos, CLAUDE.md.

---

## FASE 6 — GOVERNANÇA E PROTEÇÕES (P1/P2) — Etapas 181–200

### Etapa 181 — CODEOWNERS: adicionar cobertura para novos scripts do PR #3059
- **Prioridade:** P1
- **Arquivo:** `.github/CODEOWNERS`
- **Fix:** Adicionar `scripts/ai-context/ @adm01-debug`, `scripts/supabase_snapshot/ @adm01-debug`, `scripts/regras_negocio/ @adm01-debug`.
- **Verificação:** Gate 1.17 verde; novos scripts têm revisor obrigatório.

### Etapa 182–200 — continuação de governança (ver arquivo completo)

> **Nota:** As etapas 182–200 cobrem: CODEOWNERS para contexto.yml, commitlint pós-PR#3059, .lovableignore para tests/scripts/, sentinel-check, Gate 1.3 preflight, gitleaks sem regex coringa, ddl-out-of-band notificações, cron-table não-privilegiado, R11 sem pull_request+write, testes de invariantes adicionais, notificação Gate Final, issue automática de drift, conflito ledger, Gate 0.6 Dependency Review, SCHEMA_REFERENCE.md data 2026-11-04, mapa de conflitos PR ativos, verificação Gate Final pós-P0, deploy produção end-to-end.

---

## SUMÁRIO DE PRIORIDADES

| Prioridade | Etapas | Impacto |
|---|---|---|
| **P0** (bloqueante deploy/produção) | 1,2,5,6,7,11,12,13,14,15,16,17,18,22,23,25,30,34,35,36,37,51,52,55,85,130,131,138,139,140,141,186,187,190,196,199,200 | Deploy bloqueado / produção em risco |
| **P1** (crítico 24h) | 3,4,8,9,10,19,20,21,24,26,27,28,29,38,39,40,41,42,43,44,47,49,50,53,54,56,57,58,59,60,70,71,73,78,79,80,81,82,83,84,86,98,100,101,105,106,107,108,109,110,111,113,114,115,120,122,123,131,133,134,135,136,137,143,144,145,161,162,163,164,169,181,182,183,184,185,189,191,192,193,195 | Risco em 24h / gate vermelho |
| **P2** (importante 1 semana) | Restante | Dívida técnica / melhoria |

**Ordem de execução recomendada:** P0 → P1 → P2, dentro de cada fase na ordem numérica.

---

*Gerado por análise de 500 commits (2026-07 a 2026-11-04) · 5 agentes especializados · PR #3059 validado · 20 PRs abertas auditadas · Banco de produção `doufsxqlfjyuvxuezpln` referenciado*
