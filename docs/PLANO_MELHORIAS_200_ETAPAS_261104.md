# PLANO DE MELHORIAS E CORREÇÕES — Promo Gifts V4
**Gerado em:** 2026-11-04  
**Branch de execução:** `claude_pink/happy-cray-usiqzr`  
**Baseado em:** análise exaustiva de 500 commits + 5 agentes especializados  
**Escopo:** adm01-debug/Promo_Gifts_V4  
**Status:** PLANO APENAS — NÃO EXECUTAR sem revisão do dono nas etapas marcadas [REQUER-PO]

---

## LEGENDA
- 🔴 CRÍTICO — impacto direto em produção ou segurança
- 🟠 ALTO — risco de falha de CI ou degradação de serviço
- 🟡 MÉDIO — dívida técnica ou gap de governança
- 🟢 BAIXO — melhoria incremental
- [REQUER-PO] — exige decisão ou aprovação do dono (DDL, secrets, custo)
- [AUTO] — executável diretamente via MCP sem aprovação adicional

---

## DIMENSÃO 1: SEGURANÇA E SECRETS (Etapas 1–25)

### 🔴 E001 — Rotação de credentials em commits históricos [REQUER-PO]
**Achado:** 6 commits marcados `[ROTACIONAR]` em `.gitleaks.toml` contêm credentials possivelmente ativas.  
**Commits:** b5e044f4, 06461a45, 86ecbbb4, 7fc1a8cb, 0bebb586, b0cc98c1  
**Impacto:** Chaves de service_role expostas em histórico git público (repo privado, mas dev/ex-dev com acesso pode exfiltrar).  
**Ação:** PO rotaciona no painel Supabase: Settings → API → `service_role` key → Regenerate. Após rotação, atualizar todos os GitHub Secrets que usam a chave antiga.  
**Verificação:** `gitleaks detect --source . --no-git` deve retornar 0 findings com as novas chaves.

### 🔴 E002 — Atualizar SEGREDOS.md: adicionar contexto.yml como consumidor [AUTO]
**Achado:** PR #3059 (merged 2026-11-04) criou `.github/workflows/contexto.yml` que usa PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT. SEGREDOS.md lista esses PG* mas não inclui `contexto.yml` como consumidor.  
**Violação:** Gate 1.14 (`check-secrets-inventory --gate`).  
**Ação:** Editar `docs/ci/SEGREDOS.md` — adicionar `contexto.yml` na coluna "Workflows consumidores" das linhas PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT.  
**Arquivo:** `docs/ci/SEGREDOS.md`  
**Verificação:** `node scripts/check-secrets-inventory.mjs --gate` exit 0.

### 🔴 E003 — Verificar/criar VERCEL_TOKEN no GitHub Secrets [REQUER-PO]
**Achado:** `VERCEL_TOKEN` documentado em SEGREDOS.md como obrigatório para `deploy-vercel.yml`, mas NÃO está entre os 18 secrets configurados no repo.  
**Impacto:** Se `deploy-vercel.yml` existir e for acionado, deploy falha silenciosamente.  
**Ação:** PO verifica em Settings → Secrets → Actions se VERCEL_TOKEN existe. Se não: criar com token do Vercel. Se `deploy-vercel.yml` não existir mais: remover entrada de SEGREDOS.md.  
**Verificação:** `grep VERCEL_TOKEN .github/workflows/*.yml` para confirmar quais workflows o usam.

### 🟠 E004 — Configurar PGPORT como GitHub Secret explícito [AUTO]
**Achado:** `PGPORT` não está entre os 18 secrets configurados; workflows dependem de fallback `5432`.  
**Risco:** Mudança de porta no banco de produção quebraria contexto.yml e db-apply-migration.yml sem alerta.  
**Ação:** Adicionar secret `PGPORT=5432` via GitHub API (`github_set_actions_secret`).  
**Verificação:** Confirmar na lista de secrets após criação.

### 🟠 E005 — Auditoria de secrets documentados vs configurados [AUTO]
**Achado:** ~12 secrets documentados em SEGREDOS.md não existem como GitHub Secrets (TEST_SELLER_A_JWT, TEST_SELLER_B_JWT, CART_TUNE_PAT, CRM_CALLBACK_API_KEY, V4_CALLBACK_URL, SENTINEL_SLACK_WEBHOOK, LHCI_GITHUB_APP_TOKEN, RELEASE_PLEASE_TOKEN, E2E_DEV_EMAIL, E2E_DEV_PASSWORD).  
**Ação:** Para cada um, verificar se o workflow que o usa está em `.github/workflows/`. Se workflow não existe mais: remover de SEGREDOS.md. Se existe e precisa do secret: adicionar à fila [REQUER-PO].  
**Arquivo:** `docs/ci/SEGREDOS.md`

### 🟡 E006 — Adicionar nota de frescura ao .gitleaks.toml [AUTO]
**Achado:** Allowlist do gitleaks tem 19 commits, mas não documenta quando foi revisado por último.  
**Ação:** Adicionar comentário de data na seção `[[allowlist.commits]]` de `.gitleaks.toml`.  
**Arquivo:** `.gitleaks.toml`

### 🟡 E007 — Verificar secret scanning no GitHub (Secret Scanning Alerts) [AUTO]
**Achado:** `secret_scanning_non_provider_patterns` não liga (plano pago), mas secret scanning básico pode estar ativo.  
**Ação:** Consultar `github_list_secret_scanning_alerts` para verificar se há alertas abertos. Documentar resultado em `docs/ci/SEGREDOS.md`.

### 🟡 E008 — Dependabot alerts auditoria [AUTO]
**Achado:** Gate 0.5 (`npm audit --audit-level high`) cobre deps atuais, mas Dependabot pode ter alertas abertos.  
**Ação:** Consultar `github_list_dependabot_alerts` — listar alertas HIGH/CRITICAL abertos. Fechar os resolvidos.

### 🟡 E009 — Revisar CODEOWNERS: entrada explícita para docs/contexto/regras/manual/ [AUTO]
**Achado:** `docs/contexto/regras/manual/` coberto pelo catch-all `*` mas sem entrada explícita. Arquivos de regras de negócio manuais deveriam ter revisão obrigatória explícita.  
**Ação:** Adicionar linha em `.github/CODEOWNERS`:  
```
docs/contexto/regras/manual/ @adm01-debug
```  
**Arquivo:** `.github/CODEOWNERS`

### 🟢 E010 — Documentar política de rotação de secrets [AUTO]
**Achado:** SEGREDOS.md tem campo "Rotação" por linha, mas sem política geral (periodicidade, responsável, processo).  
**Ação:** Adicionar seção `## Política de Rotação` em `docs/ci/SEGREDOS.md` com: frequência recomendada (service_role: trimestral, E2E tokens: semestral), responsável (PO), processo (painel Supabase + GitHub Secrets update).

### 🟡 E011 — Code scanning alerts auditoria [AUTO]
**Achado:** CodeQL (`codeql.yml`) roda semanalmente — verificar se há alertas JavaScript/TypeScript abertos.  
**Ação:** Consultar `github_list_code_scanning_alerts` para alertas HIGH/CRITICAL. Listar e priorizar.

### 🟢 E012 — Verificar se .lovableignore está completo [AUTO]
**Achado:** `.lovableignore` protege arquivos críticos contra Lovable. PR #3059 adicionou novos scripts — verificar se precisam de proteção.  
**Ação:** Ler `.lovableignore` e comparar com lista de arquivos críticos em CLAUDE.md. Adicionar entradas faltantes.  
**Arquivos:** `.lovableignore`, `src/integrations/supabase/client.ts` já protegido ✅

### 🟡 E013 — Revogar tokens de ex-colaboradores [REQUER-PO]
**Achado:** PATs e tokens de agentes externos (Devin, Cline, Codex) podem ter sido criados sem prazo de expiração.  
**Ação:** PO revisa GitHub Settings → Developer Settings → Personal Access Tokens e revoga tokens criados por agentes externos ou inativos há >90 dias.

### 🟢 E014 — Adicionar hash check em gitleaks-action [AUTO]
**Achado:** `gitleaks/gitleaks-action` está pinada por SHA (R15 ✅), mas a versão do gitleaks CLI pode divergir da do action.  
**Ação:** Verificar se a versão do CLI em `deploy-gates.yml` (8.21.2) corresponde à incluída na action pinada. Documentar em `.gitleaks.toml`.

### 🟢 E015 — Alertas de secret scanning para novos padrões [REQUER-PO]
**Achado:** Padrão `DESTINO_URL` não é capturado pelo secret scanning padrão (plano gratuito).  
**Ação:** PO avalia upgrade para GitHub Advanced Security para habilitar `secret_scanning_non_provider_patterns`. Ou adicionar padrão custom em `.gitleaks.toml`.

---

## DIMENSÃO 2: BANCO DE DADOS E MIGRAÇÕES (Etapas 16–45)

### 🔴 E016 — URGENTE: Criar partições supplier_products_raw_history 2027 [REQUER-PO]
**Achado:** `supplier_products_raw_history` é tabela particionada da camada Bronze; não tem partições além de dez/2026. Pipeline de ingestão Bronze PARA em 2027-01-01.  
**Deadline:** 2026-12-15 (última data segura para aplicar).  
**Ação:** Criar migration `supabase/migrations/YYYYMMDD_create_history_partitions_2027.sql` com:
```sql
-- Rollback: DROP TABLE IF EXISTS supplier_products_raw_history_2027_01, ..., supplier_products_raw_history_2027_12;
CREATE TABLE supplier_products_raw_history_2027_01 
  PARTITION OF supplier_products_raw_history 
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
-- ... repetir para meses 02-12/2027
```
Aplicar via `db-apply-migration.yml` com aprovação PO. **Esta etapa é a mais crítica do plano.**  
**Arquivo:** `supabase/migrations/`

### 🔴 E017 — Aplicar migration pendente: fix health view [REQUER-PO]
**Achado:** `20261101201000_fix_health_view_backup_check.sql` está no ledger mas não aplicada em produção. Remove referência a `_backup_stock_daily_summary_20260618` da view `vw_system_health_quick`.  
**Ação:** Dispatch de `db-apply-migration.yml` com `version=20261101201000`. PO aprova no environment `production`.  
**Verificação:** `SELECT * FROM vw_system_health_quick LIMIT 1` sem erro.

### 🔴 E018 — Aplicar migration pendente: DROP revoke agent functions [REQUER-PO]
**Achado:** `20261101202000_drop_revoke_agent_created_functions.sql` pendente — DROPs `perf002_drop_unused_snapshot_indexes()` + REVOKE EXECUTE de `cleanup_expired_auth_sessions()` do papel `authenticated`.  
**Ação:** Dispatch de `db-apply-migration.yml` com `version=20261101202000`. PO aprova.  
**Verificação:** `SELECT proname FROM pg_proc WHERE proname LIKE 'perf002%'` deve retornar 0 linhas.

### 🔴 E019 — Dropar 12+ tabelas de backup criadas em jun/2026 [REQUER-PO]
**Achado:** Agent 3 identificou 12+ tabelas `_backup_*` criadas em jun/2026 ainda existentes em produção. Ocupam espaço e criam ruído em auditorias.  
**Ação:** Criar migration com `DROP TABLE IF EXISTS _backup_stock_daily_summary_20260618, [demais tabelas]`. Listar todas com `SELECT tablename FROM pg_tables WHERE tablename LIKE '_backup_%'` antes de criar a migration.  
**Arquivo:** `supabase/migrations/YYYYMMDD_drop_backup_tables_jun2026.sql`

### 🔴 E020 — Resolver E046: migration 20260716000055 fora do ledger [REQUER-PO]
**Achado:** `supabase/migrations/20260716000055_dynamic_explicit_deny_rls_no_policy_tables.sql` existe no repo mas NÃO está no ledger (`supabase_migrations.schema_migrations`). Decisão [REQUER-PO] pendente há >3 meses.  
**Ação PO decide:** (a) Aplicar via `db-apply-migration.yml` com `mode: repair-only` se o DDL já estiver no banco; (b) Arquivar na subpasta `_superseded/` (dentro de `supabase/migrations/`) se nunca deverá ser aplicada.  
**Impacto:** Gate 1.3 pode falhar intermitentemente por inconsistência no ledger.

### 🟠 E021 — Regenerar SCHEMA_REFERENCE.md [AUTO]
**Achado:** `docs/SCHEMA_REFERENCE.md` tem 49 dias (última medição: 2026-09-16). Métricas de tabelas, RLS, cron, funções podem estar desatualizadas.  
**Ação:** Executar `SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs` via container `claude-code` na VPS. Commitar resultado em branch separada (tamanho do arquivo ~2MB exige PR próprio).  
**Arquivo:** `docs/SCHEMA_REFERENCE.md`

### 🟠 E022 — Verificar 100 funções SECURITY DEFINER executáveis por authenticated [AUTO]
**Achado:** Número cresceu de 94 (set/26) para 100 (out/26). Cada nova função SECDEF aumenta a superfície de ataque.  
**Ação:** Query em produção para listar as 6 novas funções: `SELECT proname, nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef AND has_function_privilege('authenticated', p.oid, 'execute')` e comparar com baseline de set/26. Revisar se realmente precisam de SECDEF.

### 🟠 E023 — Criar migration espelho para PERF-002 drift reconciliado [AUTO]
**Achado:** `perf002_drop_unused_snapshot_indexes` foi aplicado via MCP (fora do fluxo) em 2026-11-01 mas o espelho de migration não está no ledger.  
**Ação:** Criar em `supabase/migrations/` o arquivo `20261101XXXXXX_perf002_drop_unused_snapshot_indexes_mirror.sql` (XXXXXX = timestamp real) com `-- Rollback: (index já foi dropado — rebuild com CREATE INDEX)` + INSERT no ledger via `db-apply-migration.yml` com `mode: repair-only`.

### 🟡 E024 — Adicionar partições supplier_products_raw_history 2028 após E016 [AUTO]
**Achado:** Mesmo problema da E016 se repetirá em 2028. Padrão: criar 2 anos de antecedência.  
**Ação:** Incluir na mesma migration de E016 as partições de jan-dez/2028, ou criar migration separada `YYYYMMDD_create_history_partitions_2028.sql`.

### 🟡 E025 — Criar migration de criação dos schemas de aplicação [AUTO]
**Achado:** 5 schemas (`analytics`, `supplier_stricker`, `cf_recon`, `prod_audit`, `classification_audit`) existem em produção mas não têm migration de criação (`CREATE SCHEMA IF NOT EXISTS`).  
**Ação:** Criar migration `YYYYMMDD_create_application_schemas.sql` com `CREATE SCHEMA IF NOT EXISTS` para cada um. Aplicar com `mode: repair-only` (schemas já existem).  
**Arquivo:** `supabase/migrations/`

### 🟡 E026 — Regenerar supabase/baseline após aplicação das migrations pendentes [AUTO]
**Achado:** Após E017, E018, E019, E020 serem aplicadas, o baseline do drift-check ficará desatualizado.  
**Ação:** Dispatch de `schema-snapshot-export.yml` com `force_rotate: true` após todas as migrations serem aplicadas.  
**Workflow:** `.github/workflows/schema-snapshot-export.yml`

### 🟡 E027 — Verificar paridade arquivos×ledger após E023 [AUTO]
**Achado:** Regra de paridade em CLAUDE.md §8: count de arquivos `.sql` em `supabase/migrations/` deve igualar count de registros no ledger.  
**Ação:** `SELECT count(*) FROM supabase_migrations.schema_migrations` vs `ls supabase/migrations/*.sql | wc -l`. Documentar no MIGRATIONS_SYNC_LOG.md.

### 🟡 E028 — Verificar cron jobs ativos vs documentados [AUTO]
**Achado:** SCHEMA_REFERENCE (set/26) listava 138 cron jobs. Número atual pode diferir após PERF-002.  
**Ação:** `SELECT jobname, schedule, command FROM cron.job ORDER BY jobname` em produção. Comparar com inventário em `inventario/estado/banco.json`.

### 🟡 E029 — Auditoria de RLS: tabelas com zero policies (Gate 1.13.1) [AUTO]
**Achado:** Gate 1.13.1 (`check-rls-no-policy-drift.mjs --gate`) detecta tabelas com RLS habilitado mas sem policies (deny-all silencioso). Verificar se passou verde no último CI.  
**Ação:** Consultar últimas execuções de `deploy-gates.yml` para resultado do Gate 1.13.1. Se vermelho: query `SELECT tablename FROM pg_tables t WHERE schemaname='public' AND row_security='on' AND (SELECT count(*) FROM pg_policies p WHERE p.tablename=t.tablename)=0`.

### 🟡 E030 — Auditoria de rate guard triggers (Gate 1.13.2) [AUTO]
**Achado:** Gate 1.13.2 verifica 7 tabelas com INSERT anônimo têm trigger de rate guard.  
**Ação:** Verificar resultado do Gate 1.13.2 no último CI. Query: `SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE '%rate%'`.

### 🟢 E031 — Documentar política de particionamento em SCHEMA_REFERENCE [AUTO]
**Achado:** Risco de E016 se repetir porque não há documentação sobre quando criar novas partições.  
**Ação:** Adicionar seção `## Particionamento` em `docs/SCHEMA_REFERENCE.md` com: lista de tabelas particionadas, intervalo das partições existentes, deadline de criação de novas.

### 🟢 E032 — Verificar autovacuum em tabelas de alta escrita [AUTO]
**Achado:** `supplier_products_raw` e `supplier_products_raw_history` recebem ingestões frequentes. Autovacuum pode não estar otimizado.  
**Ação:** `SELECT relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables WHERE relname LIKE 'supplier_products_raw%'`. Se `n_dead_tup > 100000`: ajustar parâmetros de autovacuum via migration.

---

## DIMENSÃO 3: CI/CD E GATES (Etapas 33–60)

### 🔴 E033 — E2E timeout: suite principal não passa desde 2026-10-02 [REQUER-PO]
**Achado:** `e2e-smoke` e demais jobs E2E falham por timeout (30min). ~3096 testes × ~9.5s = timeout.  
**Causa-raiz:** Número de testes cresceu sem ajuste do `timeout-minutes` ou shard count.  
**Ação:** Editar `.github/workflows/e2e.yml`: aumentar `timeout-minutes` para 60 e/ou adicionar mais shards. Esta é mudança de CI/workflow → [REQUER-PO] para merge.  
**Arquivo:** `.github/workflows/e2e.yml`

### 🟠 E034 — Atualizar required-checks.json se mudança de workflow alterar job names [AUTO]
**Achado:** Qualquer alteração em `name:` de job nos 5 workflows required exige atualização de `.github/required-checks.json`.  
**Ação:** Após E033, verificar que `required-checks.json` ainda lista os mesmos 5 checks. Se divergir: atualizar.  
**Arquivo:** `.github/required-checks.json`

### 🟠 E035 — Revisar workflow-lint.yml após mudanças em E033 [AUTO]
**Achado:** `workflow-lint.yml` roda `actionlint` + `shellcheck` em todos os workflows. E2E modificado deve passar esse lint.  
**Ação:** Após E033, verificar que `actionlint .github/workflows/e2e.yml` exit 0 localmente.

### 🟡 E036 — Verificar se contexto.yml passa Gate E89 (SUPABASE_ACCESS_TOKEN) [AUTO]
**Achado:** Gate E89 rejeita uso de `SUPABASE_ACCESS_TOKEN` em cron de 10min. Test em `tests/scripts/contexto-produtores.test.mjs` já verifica isso.  
**Ação:** Confirmar que o teste `não usa SUPABASE_ACCESS_TOKEN` passa na última execução do CI. Resultado esperado: ✅.  
**Arquivo:** `tests/scripts/contexto-produtores.test.mjs:78`

### 🟡 E037 — Verificar invariante: contexto.yml publica só na branch contexto [AUTO]
**Achado:** Teste `publica só na branch gerada contexto, nunca na main` em `contexto-produtores.test.mjs:88`.  
**Ação:** Confirmar test suite verde. Verificar no último run de `contexto.yml` que o push foi para `refs/heads/contexto`, não `main`.

### 🟡 E038 — Adicionar test de frescura do contexto gerado [AUTO]
**Achado:** `docs/contexto/00-INDEX.md` na branch `contexto` é regerado a cada 10min. Não há alerta automático se geração falhar > 30min.  
**Ação:** Adicionar step em `contexto.yml` que verifica se `manifest.json` tem `gerado_em` mais recente que 15min. Se não: job `gate` falha.

### 🟡 E039 — Verificar DDL out-of-band detector (semanal) [AUTO]
**Achado:** `ddl-out-of-band-detector.yml` roda semanalmente. Relatório em `docs/ci/DDL_OUT_OF_BAND_REPORT.md` atualmente limpo ✅. Mas drift PERF-002 (2026-11-01) não foi detectado pelo job semanal.  
**Ação:** Verificar se o detector tem cobertura para cron jobs (`cron.job`) ou só para tabelas/views/functions. Adicionar cobertura faltante.

### 🟡 E040 — Verificar contratos de workflow (Gate 1.11) [AUTO]
**Achado:** `contexto.yml` foi adicionado em PR #3059 — verificar se passou Gate 1.11 (check-workflow-contracts C10–C26).  
**Ação:** Consultar resultado do Gate 1.11 no último run de `deploy-gates.yml` após PR #3059. Se vermelho: identificar contrato violado e corrigir.

### 🟡 E041 — Verificar contrato C17: continue-on-error proibido em bloqueantes [AUTO]
**Achado:** CLAUDE.md REGRA #5: `continue-on-error: true` só em checks opcionais. Verificar se algum dos 29 gates bloqueantes usa isso.  
**Ação:** `grep -n "continue-on-error: true" .github/workflows/deploy-gates.yml`. Se encontrar em gate bloqueante: corrigir.  
**Arquivo:** `.github/workflows/deploy-gates.yml`

### 🟡 E042 — Verificar se todos gates têm linha na tabela do CLAUDE.md [AUTO]
**Achado:** `scripts/check-gates-table.mjs` exige que todo step `Gate X.Y` em `deploy-gates.yml` tenha linha na tabela do CLAUDE.md.  
**Ação:** Executar `node scripts/check-gates-table.mjs` localmente. Listar gates sem entrada na tabela.

### 🟡 E043 — Atualizar inventário de workflows no CLAUDE.md [AUTO]
**Achado:** CLAUDE.md lista 23 workflows. Após PR #3059 (contexto.yml), deve ser 24. Verificar se a contagem está correta.  
**Ação:** Contar `ls .github/workflows/*.yml | wc -l` e comparar com inventário em CLAUDE.md seção CI.

### 🟡 E044 — Verificar cobertura de CODEOWNERS para gates [AUTO]
**Achado:** Gate 1.17 verifica cobertura de CODEOWNERS para "gate files". Listar quais arquivos são considerados "gate files".  
**Ação:** Consultar `scripts/check-codeowners-gate-coverage.mjs` (ou equivalente). Verificar que todos os scripts de gate têm cobertura.

### 🟢 E045 — Adicionar smoke test para branch contexto após PR merge [AUTO]
**Achado:** Não há verificação automática de que a branch `contexto` foi atualizada após um merge em `main`.  
**Ação:** Adicionar step em `contexto.yml` (ou workflow separado) que verifica o timestamp da última atualização da branch `contexto` após push na `main`. Alertar se > 15min.

### 🟢 E046 — Revisar retention-days em todos artifacts do CI [AUTO]
**Achado:** R6/R20 do PADRAO_WORKFLOW.md: `retention-days` obrigatório em todo `upload-artifact`. Verificar `contexto.yml` e demais workflows adicionados recentemente.  
**Ação:** `grep -A3 "upload-artifact" .github/workflows/contexto.yml` — verificar se tem `retention-days`. Se não: adicionar (padrão: 14).

### 🟢 E047 — Verificar que contexto.yml não tem trigger pull_request [AUTO]
**Achado:** Teste em `contexto-produtores.test.mjs:83` verifica que não há `pull_request` nos triggers (pois o job `publicar` tem `contents: write`).  
**Ação:** Confirmar que teste passa. `grep "pull_request" .github/workflows/contexto.yml` não deve retornar nada.

### 🟢 E048 — Verificar actions de terceiros em contexto.yml vs whitelist [AUTO]
**Achado:** CLAUDE.md lista 8 actions de terceiros permitidas. `contexto.yml` pode usar outras não whitelistadas.  
**Ação:** `grep "uses:" .github/workflows/contexto.yml | grep -v "actions/" | grep -v "github/"`. Verificar que todas as actions usadas estão na whitelist ou são do GitHub.

---

## DIMENSÃO 4: DÍVIDA TÉCNICA E CÓDIGO (Etapas 49–90)

### 🟠 E049 — Reduzir indexed-access ratchet: 872 → meta 600 [AUTO]
**Achado:** Ratchet `indexed-access` tem 872 ocorrências de `object[key]` vs meta de 600. 272 acima do limite → Gate 1.10 pode estar bloqueando PRs ou meta foi atualizada.  
**Ação:** Verificar baseline atual em `scripts/ratchets/indexed-access-baseline.json`. Se meta foi ampliada para 900: documentar justificativa. Se ainda é 600: identificar os 272 casos acima e planejar redução gradual (10/semana via PRs automatizadas).

### 🟠 E050 — Dropar tabelas magazine_* silenciosamente removidas [AUTO]
**Achado:** `types.ts` perdeu `magazine_items`, `magazine_templates` em commit `7716ae9` (Lovable). Verificar se tabelas ainda existem no banco mas foram removidas do tipo.  
**Ação:** `SELECT tablename FROM pg_tables WHERE tablename LIKE 'magazine%' AND schemaname='public'`. Se existem: adicionar de volta em `types.ts`. Se não existem: documentar remoção.  
**Arquivo:** `src/integrations/supabase/types.ts`

### 🟠 E051 — Verificar personalization_techniques no banco [AUTO]
**Achado:** Agent 3: `personalization_techniques` tem 0 hits no code search. Pode ter sido removida silenciosamente pelo Lovable.  
**Ação:** `SELECT count(*) FROM personalization_techniques` em produção. Se tabela existe: verificar por que não é usada no código. Se não existe: remover de `types.ts` com entrada na allowlist.

### 🟡 E052 — Reduzir TODO/FIXME ratchet: 51 → meta 30 [AUTO]
**Achado:** 51 TODOs/FIXMEs no código vs meta de 30. Gate 1.9 cobre isso.  
**Ação:** `grep -rn "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx"`. Resolver os 21 mais antigos (por data de commit).

### 🟡 E053 — Reduzir arquivos >500 linhas: 138 → meta 100 [AUTO]
**Achado:** 138 arquivos acima de 500L (7 acima de 1000L). Gate 1.9 (file-size ratchet).  
**Ação:** Identificar os 7 acima de 1000L: `find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -10`. Planejar split dos maiores.

### 🟡 E054 — Migrar console.* para structuredLogger: 22 arquivos [AUTO]
**Achado:** 22 arquivos ainda usam `console.log/error/warn`. Gate 1.9.1 rastreia o baseline.  
**Ação:** `grep -rl "console\." src/ --include="*.ts" --include="*.tsx" | head -22`. Substituir pelo logger estruturado. Priorizar edge functions (risco de log de dados sensíveis).

### 🟡 E055 — Verificar import cross-domain (Gate 1.9.2) [AUTO]
**Achado:** Gate 1.9.2 proíbe imports novos entre `src/pages/*` de domínios diferentes.  
**Ação:** Verificar resultado do Gate 1.9.2 no último CI. Se vermelho: identificar o import cross-domain e corrigir.

### 🟡 E056 — Verificar TSC ratchet baseline (Gate 1.7) [AUTO]
**Achado:** Agent 3 confirma 0 erros TSC (baseline limpo ✅). Mas Gate 1.7 tem label `ratchet-override` para PRs que precisam aumentar.  
**Ação:** Confirmar que `scripts/ratchets/tsc-errors-baseline.json` reflete 0 erros. Se divergir: atualizar.

### 🟡 E057 — Revisar lógica de product_variants em types.ts [AUTO]
**Achado:** Agent 3 identificou `product_variants` com 0 hits em code search — possível tabela morta ou regressão.  
**Ação:** `SELECT count(*) FROM product_variants` em produção + `grep -r "product_variants" src/ --include="*.ts"`. Verificar se tabela é usada.

### 🟡 E058 — Verificar bundle size (Gate 1.6) [AUTO]
**Achado:** Gate 1.6 verifica bundle size dentro de limites. Verificar resultado nos últimos 5 runs.  
**Ação:** Consultar job `build` no último `deploy-gates.yml` run. Se vermelho: identificar qual chunk cresceu.

### 🟡 E059 — Verificar baselines de visual snapshots (Gate 1.4) [AUTO]
**Achado:** Gate 1.4 verifica baselines commitados. Após mudanças da última semana, baselines podem estar desatualizados.  
**Ação:** Verificar resultado Gate 1.4 no último CI. Se vermelho: gerar novos baselines com `npx playwright test --update-snapshots --project chromium-smoke`.

### 🟡 E060 — Verificar invariante overflow-x-clip (Gate 1.15) [AUTO]
**Achado:** Gate 1.15 detecta regressão de layout horizontal (overflow-x-clip em MainLayout).  
**Ação:** Verificar resultado Gate 1.15 no último CI. `grep -n "overflow-x-clip" src/` para confirmar presença.

### 🟡 E061 — Verificar quotes list invariants (Gate 1.16) [AUTO]
**Achado:** Gate 1.16 verifica integridade da listagem de orçamentos.  
**Ação:** Verificar resultado Gate 1.16 no último CI.

### 🟢 E062 — Verificar as any ratchet [AUTO]
**Achado:** Gate 1.9 rastreia `as any`. Verificar baseline atual.  
**Ação:** `grep -c "as any" src/**/*.ts 2>/dev/null | awk -F: '{sum+=$2} END {print sum}'`. Comparar com `scripts/ratchets/as-any-baseline.json`.

### 🟢 E063 — Verificar eslint baseline [AUTO]
**Achado:** Gate 1 cobre lint. Verificar se há regras desativadas temporariamente que nunca foram reativadas.  
**Ação:** `grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | wc -l`. Lista de disabled por arquivo.

### 🟢 E064 — Revisar arquivos maiores de 1000L para candidatos a split [AUTO]
**Achado:** 7 arquivos acima de 1000L identificados por Agent 3.  
**Ação:** Para cada um: avaliar se split por domínio/responsabilidade é viável sem quebrar imports existentes.

### 🟢 E065 — Verificar Lovable-protected-audit.yml [AUTO]
**Achado:** `lovable-protected-audit.yml` audita alterações do Lovable em arquivos protegidos. Verificar se foi acionado recentemente.  
**Ação:** Consultar `github_list_runs_for_workflow` para `lovable-protected-audit.yml`. Se falhou: verificar qual arquivo protegido foi alterado.

---

## DIMENSÃO 5: CONTEXTO.YML VALIDAÇÃO (Etapas 66–90)

### 🟠 E066 — Verificar se branch contexto foi criada após PR #3059 [AUTO]
**Achado:** `contexto.yml` foi merged em 2026-11-04. A branch `contexto` deveria ter sido criada/atualizada nos primeiros 10min.  
**Ação:** `github_get_ref(owner=adm01-debug, repo=Promo_Gifts_V4, ref=refs/heads/contexto)`. Se não existe: verificar logs do primeiro run de `contexto.yml` após merge.

### 🟠 E067 — Verificar conteúdo de docs/contexto/00-INDEX.md [AUTO]
**Achado:** O índice deve listar 3 fontes: `banco real` (supabase/), `código` (codigo/), `regras de negócio` (regras/).  
**Ação:** `github_get_file(owner=adm01-debug, repo=Promo_Gifts_V4, path=docs/contexto/00-INDEX.md, ref=contexto)`. Verificar que as 3 fontes aparecem.

### 🟠 E068 — Verificar que scripts/ai-context/gerar.mjs produz saída válida [AUTO]
**Achado:** Script produz docs/contexto/codigo/INDEX.md com metadados de rotas, módulos, hooks, edges.  
**Ação:** Verificar `github_get_file(..., path=docs/contexto/codigo/manifest.json, ref=contexto)`. Verificar campos `gerado_em`, `commit`, `arquivos`.

### 🟠 E069 — Verificar que scripts/regras_negocio/generate.py produz saída válida [AUTO]
**Achado:** Script gera docs/contexto/regras/ com regras de negócio.  
**Ação:** Verificar `github_get_file(..., path=docs/contexto/regras/manifest.json, ref=contexto)`. Verificar campos.

### 🟠 E070 — Verificar que scripts/supabase_snapshot/snapshot.py conecta ao banco [AUTO]
**Achado:** Snapshot usa PGHOST, PGUSER, PGPASSWORD, PGDATABASE + `SUPABASE_DB_URL=''` (URI vazia).  
**Ação:** Verificar `github_get_file(..., path=docs/contexto/supabase/manifest.json, ref=contexto)`. Se `gerado_em` é recente: snapshot está funcionando.

### 🟡 E071 — Criar docs/contexto/regras/manual/regras.md com regras de negócio [AUTO]
**Achado:** `docs/contexto/regras/manual/` deve conter regras que só o negócio conhece (descontos, fluxo de aprovação, transições de status de orçamento).  
**Ação:** Criar arquivo com regras verificadas no código:
- Limites de desconto (porcentagem máxima por perfil)
- Fluxo de status de orçamento (rascunho → enviado → aprovado → pedido)
- Regras de pricing (preço × sale_price)
- Validações de categorias/produtos  
**Arquivo:** `docs/contexto/regras/manual/regras.md`

### 🟡 E072 — Verificar teste de suíte ai-context (node --test) [AUTO]
**Achado:** `scripts/ai-context/gerar.unit.mjs` deve passar. Teste integrado em `contexto-produtores.test.mjs:25`.  
**Ação:** Verificar resultado do Gate 2 (vitest) no último CI para `tests/scripts/contexto-produtores.test.mjs`.

### 🟡 E073 — Verificar teste de suíte regras_negocio (python3) [AUTO]
**Achado:** `scripts/regras_negocio/test_generate.py` deve passar. Teste integrado em `contexto-produtores.test.mjs:31`.  
**Ação:** Verificar resultado do Gate 2 no último CI.

### 🟡 E074 — Verificar teste de suíte supabase_snapshot (connexão simulada) [AUTO]
**Achado:** `scripts/supabase_snapshot/test_snapshot.py` deve passar sem conexão real ao banco. Teste integrado em `contexto-produtores.test.mjs:37`.  
**Ação:** Verificar resultado do Gate 2 no último CI.

### 🟡 E075 — Verificar invariante: banco usa PG* com URI vazia [AUTO]
**Achado:** Teste `contexto-produtores.test.mjs:96` verifica `SUPABASE_DB_URL=''` e conexão via variáveis PG*.  
**Ação:** Confirmar que teste passa. Nenhuma connection string com senha deve aparecer no workflow.

### 🟡 E076 — Verificar que cron do contexto não usa range com passo [AUTO]
**Achado:** Teste `contexto-produtores.test.mjs:103` verifica que cron não usa `d-d+/` (ci-cron-table não entende).  
**Ação:** Confirmar que teste passa. `grep "schedule:" .github/workflows/contexto.yml` deve mostrar lista de minutos sem range.

### 🟢 E077 — Adicionar alerta de degradação do contexto [AUTO]
**Achado:** Não há notificação quando contexto.yml falha 2+ vezes seguidas.  
**Ação:** Adicionar job `notifica-falha` em `contexto.yml` que comenta issue ou envia notificação quando `publicar` falha. Reutilizar padrão do `notifica-falha-main.yml`.

### 🟢 E078 — Verificar que ai-context.config.json está completo [AUTO]
**Achado:** `ai-context.config.json` configura o produtor de código. Verificar se inclui todos os domínios: produtos, fornecedores, categorias, orçamentos, pedidos, suppliers.  
**Ação:** `cat ai-context.config.json` e comparar com `src/pages/` e `src/hooks/`.

### 🟢 E079 — Adicionar seção de edge functions ao contexto gerado [AUTO]
**Achado:** Produtor `gerar.mjs` deve incluir lista de edge functions. Verificar se `docs/contexto/codigo/INDEX.md` lista as funções de `supabase/functions/`.  
**Ação:** Verificar `docs/contexto/codigo/INDEX.md` na branch contexto. Se edge functions não estão listadas: adicionar ao `gerar.mjs`.

### 🟢 E080 — Verificar renovação automática do contexto a cada push na main [AUTO]
**Achado:** `contexto.yml` tem trigger `push: branches: [main]` além do schedule.  
**Ação:** Verificar no log do último merge (PR #3059) se contexto.yml foi acionado. `github_list_runs_for_workflow(workflow_id=contexto.yml)`.

---

## DIMENSÃO 6: SCHEMA E RLS (Etapas 81–110)

### 🟠 E081 — Verificar P7: 100 funções SECURITY DEFINER (baseline set/26 era 94) [AUTO]
**Achado:** 6 funções novas SECDEF desde set/26. Cada uma pode ser vetor de privilege escalation.  
**Ação:** Query em produção para listar as 6 novas: `SELECT proname FROM pg_proc p WHERE p.prosecdef AND p.oid NOT IN (SELECT oid FROM pg_proc WHERE proname IN ('<lista baseline set/26>'))`. Revisar se precisam de SECDEF.

### 🟡 E082 — Verificar P5: anon_catalog_grant_audit_log e magazine_duplicate_requests com policies [AUTO]
**Achado:** Revalidação de 2026-10-30 confirmou que ambas têm policies agora (P5 resolvido ✅). Verificar que ainda estão no estado correto.  
**Ação:** `SELECT tablename, (SELECT count(*) FROM pg_policies p WHERE p.tablename=t.tablename) as policy_count FROM pg_tables t WHERE tablename IN ('anon_catalog_grant_audit_log','magazine_duplicate_requests')`.

### 🟡 E083 — Verificar que RLS está habilitado em todas as tabelas públicas [AUTO]
**Achado:** Gate 1.13 verifica policies vs baseline. Mas não verifica tabelas novas criadas sem RLS.  
**Ação:** `SELECT tablename FROM pg_tables WHERE schemaname='public' AND row_security='off' AND tablename NOT IN ('<tabelas explicitamente sem RLS>') ORDER BY tablename`.

### 🟡 E084 — Atualizar SCHEMA_REFERENCE com contagens reais pós-migrations [AUTO]
**Achado:** SCHEMA_REFERENCE tem 49 dias. Após E016-E023, as contagens de tabelas, funções, cron jobs mudarão.  
**Ação:** Após todas as migrations serem aplicadas, regenerar SCHEMA_REFERENCE.md via `scripts/inventario/gerar-banco.mjs`. Commitar em PR separado.

### 🟡 E085 — Verificar rate guard triggers (Gate 1.13.2): 7 tabelas [AUTO]
**Achado:** 7 tabelas com INSERT anônimo devem ter trigger de rate guard. Verificar lista atual.  
**Ação:** `SELECT table_name, trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%rate_guard%'`. Comparar com manifesto.

### 🟡 E086 — Verificar migration receipts (Gate 1.13.3) [AUTO]
**Achado:** Gate 1.13.3 verifica migrations sem recibo há >24h. Com 2 migrations pendentes (E017, E018), pode ter alertas.  
**Ação:** Verificar resultado do Gate 1.13.3 no último CI. Se vermelho: aplicar as migrations pendentes.

### 🟡 E087 — Verificar funções crm-db-bridge no banco de clientes [AUTO]
**Achado:** `src/lib/crm-db.ts` acessa banco de clientes (`pgxfvjmuubtbowutlide`) via edge function `crm-db-bridge`. Verificar se a edge function está deployada.  
**Ação:** Verificar `github_list_runs_for_workflow(workflow_id=edge-functions-drift-check.yml)` — a função `crm-db-bridge` deve aparecer como sincronizada.

### 🟢 E088 — Verificar índices duplicados pós-PERF-002 [AUTO]
**Achado:** PERF-002 dropou índices desnecessários. Verificar se ainda existem duplicatas.  
**Ação:** `SELECT schemaname, tablename, count(*) as idx_count FROM pg_indexes WHERE schemaname='public' GROUP BY schemaname, tablename HAVING count(*) > 10 ORDER BY idx_count DESC` — listar tabelas com excesso de índices.

### 🟢 E089 — Verificar foreign keys sem índice [AUTO]
**Achado:** Padrão comum de degradação: FK sem índice causa full scan em JOINs.  
**Ação:** Query padrão de FKs sem índice em pg_catalog. Listar candidatas a índice novo.

### 🟢 E090 — Verificar estatísticas de tabela (pg_stat_user_tables) [AUTO]
**Achado:** Tabelas de alta leitura podem ter estatísticas desatualizadas após ingestões grandes.  
**Ação:** `SELECT relname, n_live_tup, n_dead_tup, last_analyze FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY n_dead_tup DESC LIMIT 10`.

---

## DIMENSÃO 7: EDGE FUNCTIONS (Etapas 91–115)

### 🟠 E091 — Verificar drift de edge functions (Compare GitHub × Canonical) [AUTO]
**Achado:** Últimos 5 runs do `edge-functions-drift-check.yml`: todos SUCCESS ✅.  
**Ação:** Confirmar que run mais recente (após PR #3059) também é SUCCESS. Se falhou: verificar qual função divergiu.

### 🟡 E092 — Verificar timeout de edge functions em produção [AUTO]
**Achado:** `kit-ai-builder` teve timeout apenas em produção em 2026-09-23 (mencionado no CLAUDE.md).  
**Ação:** Verificar logs de execução da função `kit-ai-builder` em produção via MCP Supabase: `query_logs(function_name=kit-ai-builder)`. Se ainda ocorre timeout: aumentar timeout via `supabase/config.toml`.

### 🟡 E093 — Verificar que magazine-reader-state-read está sincronizada [AUTO]
**Achado:** Em 2026-09-24, `magazine-reader-state-read` foi deployada antes da revisão (fix fora do fluxo). Verificar estado atual.  
**Ação:** `get_edge_function(function_name=magazine-reader-state-read)` para confirmar versão sincronizada com GitHub.

### 🟡 E094 — Verificar secrets das edge functions no Supabase Vault [AUTO]
**Achado:** Secrets de edge functions gerenciados só via `supabase secrets set`. Verificar se todos estão configurados.  
**Ação:** Consultar `list_edge_functions` e para cada função crítica verificar se os secrets necessários estão no vault.

### 🟡 E095 — Verificar log de errors de edge functions nas últimas 24h [AUTO]
**Achado:** Erros silenciosos em edge functions podem indicar config incorreta ou secrets faltando.  
**Ação:** `query_logs(function_name=*, level=error, since=24h)` via MCP Supabase. Listar funções com erros recorrentes.

### 🟡 E096 — Verificar CORS origins em edge functions [AUTO]
**Achado:** `supabase/functions/_shared/cors-origins.ts` lista as origens permitidas. Após mudanças de domínio, pode estar desatualizado.  
**Ação:** `cat supabase/functions/_shared/cors-origins.ts`. Verificar que `zappweb.app.br`, `promobrindes.com.br` e Vercel preview URLs estão listados se necessário.

### 🟡 E097 — Verificar evolution-go-routes.ts atualizado [AUTO]
**Achado:** `supabase/functions/_shared/evolution-go-routes.ts` traduz rotas GO ↔ v2. Verificar se está atualizado após mudanças na Evolution GO.  
**Ação:** Verificar última modificação do arquivo vs último deploy da Evolution GO.

### 🟢 E098 — Adicionar timeout explícito em edge functions sem timeout [AUTO]
**Achado:** `supabase/config.toml` pode não ter timeout configurado para todas as funções.  
**Ação:** `grep -n "timeout" supabase/config.toml`. Funções de ingestão pesada (catalog, snapshot) devem ter timeout >= 30s.

### 🟢 E099 — Verificar que crm-db-bridge só acessa banco de clientes [AUTO]
**Achado:** `crm-db-bridge` deve acessar apenas `pgxfvjmuubtbowutlide`. Verificar que não há referência ao banco de produtos (`doufsxqlfjyuvxuezpln`) dentro da função.  
**Ação:** `cat supabase/functions/crm-db-bridge/index.ts | grep "doufsxqlfjyuvxuezpln"` — deve retornar 0 linhas.

---

## DIMENSÃO 8: ARQUITETURA E INFRAESTRUTURA (Etapas 100–130)

### 🟠 E100 — Verificar que .vercel/project.json não foi alterado pelo Lovable [AUTO]
**Achado:** CLAUDE.md REGRA #11: `.vercel/project.json` ancora projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`. Lovable já reverteu arquivos de config.  
**Ação:** `github_get_file(path=.vercel/project.json, ref=main)`. Confirmar `projectId = prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`.

### 🟠 E101 — Verificar deploy Vercel após PR #3059 [AUTO]
**Achado:** Merge em main = deploy automático na Vercel. Confirmar que deploy do PR #3059 (contexto.yml) subiu sem erros.  
**Ação:** Verificar `mcp__Vercel__list_deployments` para projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`. Último deploy deve ser SUCCESS.

### 🟡 E102 — Verificar se projeto legado Vercel ainda existe [AUTO]
**Achado:** `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado acidentalmente em 2026-09-15 e ainda existe, dobrando builds.  
**Ação:** `mcp__Vercel__get_project(id=prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok)`. Se ainda ativo: PO pausa e deleta pelo dashboard Vercel [REQUER-PO].

### 🟡 E103 — Verificar variáveis de ambiente Vercel [AUTO]
**Achado:** CLAUDE.md §5 Vercel: nunca vars de servidor (OPENAI, ANTHROPIC, service_role) no Vercel. Verificar se a auditoria de out/26 ainda está válida.  
**Ação:** Consultar `mcp__Vercel__filter_project_envs(projectId=prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ)`. Verificar que não há `SERVICE_ROLE`, `OPENAI`, `ANTHROPIC` entre as vars.

### 🟡 E104 — Verificar VITE_SUPABASE_PROJECT_ID correto no Vercel [AUTO]
**Achado:** REGRA #1: `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`. Verificar que `VITE_SUPABASE_PROJECT_ID` no Vercel é `doufsxqlfjyuvxuezpln` e não o projeto legado.  
**Ação:** Consultar env vars do Vercel e confirmar `VITE_SUPABASE_PROJECT_ID`.

### 🟡 E105 — Verificar que VITE_SUPABASE_URL aponta para o projeto correto [AUTO]
**Achado:** `VITE_SUPABASE_URL` deve ser `https://doufsxqlfjyuvxuezpln.supabase.co`.  
**Ação:** Consultar env vars do Vercel e confirmar. Se diferente: corrigir via dashboard Vercel [REQUER-PO].

### 🟡 E106 — Verificar inventario/estado/ frescura [AUTO]
**Achado:** `inventario/estado/` gerado por scripts. Verificar `gerado_em` nos arquivos JSON.  
**Ação:** `github_get_file(path=inventario/estado/banco.json, ref=main)` → verificar campo `gerado_em`. Se >7 dias: regenerar.

### 🟡 E107 — Verificar que graphify-out/GRAPH_REPORT.md está do commit atual [AUTO]
**Achado:** Grafo de código precisa ser rebuild após mudanças. Verificar frescura.  
**Ação:** `github_get_file(path=graphify-out/GRAPH_REPORT.md, ref=main)` → comparar commit no relatório vs HEAD.

### 🟢 E108 — Verificar GitHub Actions usage e custo [AUTO]
**Achado:** `contexto.yml` roda a cada 10min = ~144 runs/dia = ~4320/mês. Cada run usa minutos de Actions.  
**Ação:** Verificar `mcp__GITHUB__github_get_workflow_run_usage` para estimar custo mensal do `contexto.yml`. Se > $50/mês: considerar reduzir frequência para 30min.

### 🟢 E109 — Verificar cache de Actions [AUTO]
**Achado:** PRs frequentes sem cache de node_modules geram overhead.  
**Ação:** Verificar se `actions/cache` está configurado para `node_modules/` em `deploy-gates.yml`. Se não: adicionar.

### 🟢 E110 — Verificar que sentinel-check.sh é executado no pre-merge [AUTO]
**Achado:** `scripts/sentinel-check.sh` recusa merge entre branches de agentes diferentes. Verificar que está configurado como hook no CI.  
**Ação:** `grep -n "sentinel-check" .github/workflows/*.yml`. Deve aparecer em pelo menos um workflow de PR.

---

## DIMENSÃO 9: GOVERNANÇA E DOCUMENTAÇÃO (Etapas 111–145)

### 🟠 E111 — Verificar que CLAUDE.md reflete estado atual pós-PR #3059 [AUTO]
**Achado:** PR #3059 adicionou contexto.yml ao repo. CLAUDE.md deve listar `contexto.yml` na tabela de workflows e na seção "Contexto vivo para agentes".  
**Ação:** Verificar seção CI do CLAUDE.md — a tabela de workflows deve incluir `contexto` (a cada 10 min) + push: main. Se já inclui: ✅. Se não: corrigir.  
**Arquivo:** `CLAUDE.md`

### 🟡 E112 — Verificar que AGENTS.md está sincronizado entre todos os repos [AUTO]
**Achado:** AGENTS.md tem comentário `<!-- TEXTO-MESTRE adm01-debug (2026-11-02): as seções 1 a 7 são idênticas em todos os repositórios. Mudou aqui → mude em todos. -->`. Verificar se Zapp_Web_V2 está atualizado.  
**Ação:** Comparar AGENTS.md do Promo_Gifts_V4 vs Zapp_Web_V2. Se divergirem: sincronizar.

### 🟡 E113 — Verificar PENDENCIAS.md [AUTO]
**Achado:** `PENDENCIAS.md` lista itens pendentes de sessões anteriores. Verificar se itens resolvidos foram marcados e novos foram adicionados.  
**Ação:** Ler `PENDENCIAS.md` e comparar com achados desta sessão. Atualizar.

### 🟡 E114 — Verificar docs/db/POLITICA_DDL.md atualizada [AUTO]
**Achado:** Política de DDL em `docs/db/POLITICA_DDL.md` deve refletir incidente de 2026-10-13 (8 cron.alter_job fora do fluxo).  
**Ação:** Verificar se `POLITICA_DDL.md` tem seção sobre cron jobs (`cron.alter_job` precisa de migration).

### 🟡 E115 — Verificar MIGRATIONS_SYNC_LOG.md atualizado [AUTO]
**Achado:** `supabase/MIGRATIONS_SYNC_LOG.md` deve ter registro das 2 migrations pendentes (E017, E018) com status "AGUARDANDO PO".  
**Ação:** Verificar últimas linhas do MIGRATIONS_SYNC_LOG.md. Adicionar entradas se faltarem.

### 🟡 E116 — Verificar docs/SCHEMA_REFERENCE.md data de medição [AUTO]
**Achado:** Documento deve ter data no topo. Atualmente: 2026-09-16 (49 dias atrás).  
**Ação:** Após E021 (regeneração), atualizar data no topo do arquivo.

### 🟢 E117 — Verificar docs/ci/PADRAO_WORKFLOW.md atualizado [AUTO]
**Achado:** Documento descreve regras R1-R20 de workflow. Verificar se R21+ existem (pós nov/2026).  
**Ação:** `github_get_file(path=docs/ci/PADRAO_WORKFLOW.md)`. Verificar se há novos contratos após nov/2026.

### 🟢 E118 — Verificar docs/ci/README.md gerado [AUTO]
**Achado:** `docs/ci/README.md` é gerado automaticamente por `scripts/ci/render-workflow-docs.mjs`. Não deve ser editado à mão.  
**Ação:** Verificar última data de geração. Reexecutar se necessário.

### 🟢 E119 — Atualizar docs/_arquivo/ com relatórios desta sessão [AUTO]
**Achado:** `docs/_arquivo/` contém relatórios antigos. Esta sessão gerou análises extensas.  
**Ação:** Mover relatório desta sessão para `docs/_arquivo/analise-261104.md` após concluir o plano.

### 🟢 E120 — Verificar que required-checks-guard.yml está rodando diariamente [AUTO]
**Achado:** `required-checks-guard.yml` roda diariamente para auditar checks. Verificar últimos runs.  
**Ação:** `github_list_runs_for_workflow(workflow_id=required-checks-guard.yml)`. Deve ter run diário recente.

---

## DIMENSÃO 10: TESTES E QUALIDADE (Etapas 121–155)

### 🟠 E121 — Verificar cobertura de testes unitários dos produtores do contexto [AUTO]
**Achado:** `tests/scripts/contexto-produtores.test.mjs` foi adicionado em PR #3059. Verificar que Gate 2 (vitest) o inclui.  
**Ação:** `grep "contexto-produtores" package.json` ou equivalente — confirmar que está incluído em `npm run test:ci-core`.

### 🟡 E122 — Verificar que Gate 2.5 (integridade transacional PostgreSQL) passou [AUTO]
**Achado:** Gate 2.5 (`database-integrity`) testa integridade transacional. Verificar último resultado.  
**Ação:** Consultar job `database-integrity` no último `deploy-gates.yml` run.

### 🟡 E123 — Verificar Gate 5.5 (restore_seller_cart RPC) [AUTO]
**Achado:** Gate 5.5 verifica que RPC `restore_seller_cart` está presente no banco canônico.  
**Ação:** `SELECT proname FROM pg_proc WHERE proname='restore_seller_cart'`. Deve retornar 1 linha.

### 🟡 E124 — Verificar Gate 5 (SEO sanity) [AUTO]
**Achado:** Gate 5 roda verificações de SEO. Verificar último resultado.  
**Ação:** Consultar job `seo-sanity` no último `deploy-gates.yml` run.

### 🟡 E125 — Verificar Gate 2.5 cobertura de migrations [AUTO]
**Achado:** `database-integrity` provavelmente testa paridade archives × ledger. Com migrations pendentes (E017, E018), pode falhar.  
**Ação:** Verificar resultado. Se vermelho por paridade: aplicar migrations pendentes primeiro.

### 🟡 E126 — Adicionar testes para E016 (partições 2027) [AUTO]
**Achado:** Após criar partições 2027, adicionar teste que verifica existência das partições mensais.  
**Ação:** Criar `tests/db/supplier_products_raw_history_partitions.test.sql` ou equivalente.

### 🟡 E127 — Verificar cobertura E2E dos fluxos de orçamento [AUTO]
**Achado:** Fluxo de orçamento (quotes) é o core do sistema. Verificar se há specs E2E cobrindo o fluxo completo.  
**Ação:** `find e2e/ -name "*.spec.ts" | xargs grep -l "quote\|orçamento" 2>/dev/null`. Listar specs existentes.

### 🟡 E128 — Verificar cobertura E2E do fluxo de catálogo [AUTO]
**Achado:** Catálogo B2B é o produto principal. Verificar specs E2E para listagem, filtro, busca.  
**Ação:** `find e2e/ -name "*.spec.ts" | xargs grep -l "catalog\|catálogo\|product" 2>/dev/null`.

### 🟢 E129 — Verificar que testes de regras_negocio cobrem transições de status [AUTO]
**Achado:** `scripts/regras_negocio/test_generate.py` testa o gerador mas não as regras em si.  
**Ação:** Verificar se existe teste separado para validação de transições de status de orçamento.

### 🟢 E130 — Verificar Lighthouse CI (Gate 4 opcional) [AUTO]
**Achado:** Gate 4 (Lighthouse) é opcional (`continue-on-error: true`). Verificar métricas de performance atuais.  
**Ação:** Consultar último resultado do job `lighthouse`. Performance < 70 requer atenção.

---

## DIMENSÃO 11: MELHORIAS DE PRODUTO (Etapas 131–165)

### 🟡 E131 — Implementar regras.md com regras de negócio validadas no código [AUTO]
**Achado:** `docs/contexto/regras/manual/regras.md` não existe ainda. É a etapa mais importante para o contexto de agentes de IA.  
**Ação:** Criar com seções:
1. Status de orçamentos (rascunho → enviado → aprovado → pedido → entregue)
2. Regras de pricing (price vs sale_price, quando cada um é usado)
3. Validações de produto (campos obrigatórios de Product interface)
4. Limites de desconto por perfil de usuário
5. Fluxo de aprovação de orçamentos acima de R$ X  
**Arquivo:** `docs/contexto/regras/manual/regras.md`

### 🟡 E132 — Verificar que magazine_* ainda são usados no produto [AUTO]
**Achado:** Tabelas `magazine_items`, `magazine_templates` perdidas em `types.ts` pelo Lovable. Verificar se funcionalidade de magazine ainda está ativa.  
**Ação:** `grep -r "magazine" src/pages/ src/components/ --include="*.tsx" | wc -l`. Se 0: funcionalidade foi removida. Se >0: `types.ts` precisa ser corrigido.

### 🟡 E133 — Verificar uso de personalization_techniques no produto [AUTO]
**Achado:** Agent 3: 0 referências no código. Verificar se foi dropada do banco também.  
**Ação:** `SELECT count(*) FROM personalization_techniques` em produção. Documentar resultado.

### 🟡 E134 — Verificar fluxo de rascunho (Gate 1.5: "Salvar Alterações") [AUTO]
**Achado:** Gate 1.5 verifica ausência de "Salvar Alterações" em fluxos de rascunho.  
**Ação:** Verificar resultado do Gate 1.5 no último CI. Se vermelho: identificar componente com botão incorreto.

### 🟢 E135 — Verificar métricas de uso do catálogo [AUTO]
**Achado:** `docs/contexto/codigo/` deve incluir rotas mais acessadas. Verificar se analytics estão configurados.  
**Ação:** `cat inventario/estado/rotas.json` → listar rotas com maior tráfego.

---

## DIMENSÃO 12: CORREÇÕES DE ALTA PRIORIDADE IMEDIATA (Etapas 136–160)

### 🔴 E136 — HOTFIX IMEDIATO: SEGREDOS.md não lista contexto.yml como consumidor PG* [AUTO]
**Achado:** Gate 1.14 pode falhar no próximo check (roda diariamente).  
**Ação IMEDIATA:** Editar `docs/ci/SEGREDOS.md` — acrescentar `contexto.yml` na coluna de consumidores de PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT. Commitar, abrir PR, mergear.  
**Prioridade:** HOJE (antes do próximo run diário do required-checks-guard.yml).

### 🔴 E137 — HOTFIX: Verificar que Gate Final passou no PR #3059 [AUTO]
**Achado:** PR #3059 foi merged — confirmar que todos os 5 required checks passaram antes do merge.  
**Ação:** `github_list_check_runs(ref=385af81ad204acada06c6593b4c978e60dca170b)`. Todos devem ser SUCCESS.

### 🟠 E138 — Verificar que deploy Vercel do PR #3059 não introduziu regressão [AUTO]
**Achado:** Merge em main = deploy em produção. Verificar que app ainda funciona pós-deploy.  
**Ação:** Verificar `mcp__Vercel__list_deployments` → deployment mais recente deve ser READY. Verificar runtime errors nas últimas 24h.

### 🟠 E139 — Verificar que contexto.yml run inicial gerou branch contexto [AUTO]
**Achado:** Após PR #3059 merged, o primeiro run de `contexto.yml` deveria ter gerado a branch `contexto`.  
**Ação:** `github_get_ref(ref=refs/heads/contexto)`. Se não existe: verificar logs do primeiro run.

### 🟡 E140 — Verificar que Gate 0 (SSOT banco) passou pós-PR #3059 [AUTO]
**Achado:** Lovable pode ter revertido `client.ts` em qualquer commit. REGRA #1.  
**Ação:** `github_get_file(path=src/integrations/supabase/client.ts, ref=main)`. Confirmar `doufsxqlfjyuvxuezpln` presente e `validateEnv()` existente.

### 🟡 E141 — Verificar que Gate 0 (SSOT) falha corretamente se banco errado [AUTO]
**Achado:** `scripts/validate-supabase-config.mjs` deve retornar exit 1 se `pqpdolkaeqlyzpdpbizo` (projeto legado — não use) for usado.  
**Ação:** Teste: `echo "const id='pqpdolkaeqlyzpdpbizo'" | node scripts/validate-supabase-config.mjs` deve falhar. (Teste teórico — não modificar o arquivo). _(pqpdolkaeqlyzpdpbizo = projeto legado — não use)_

---

## DIMENSÃO 13: AUTOMAÇÃO E PRODUTIVIDADE (Etapas 142–175)

### 🟡 E142 — Criar scheduled task para lembrar da deadline E016 [AUTO]
**Achado:** Partições de 2027 devem ser criadas antes de 2026-12-15. Sem lembrete, pode passar despercebido.  
**Ação:** Criar scheduled task via `mcp__claude-code-remote__create_trigger` para 2026-12-01 com prompt "URGENTE: Criar partições supplier_products_raw_history 2027 — deadline 2026-12-15".

### 🟡 E143 — Verificar `auto-update-pr-branch.yml` funcionando [AUTO]
**Achado:** Fila de merge substitui merge_queue nativo. `auto-update-pr-branch.yml` roda a cada 7/37min.  
**Ação:** Verificar últimos runs. Se falhou: verificar `scripts/ci/fila-merge.mjs`.

### 🟡 E144 — Verificar `branch-hygiene-audit.yml` [AUTO]
**Achado:** `branch-hygiene-audit.yml` roda semanalmente. Verificar se há branches stale de agentes anteriores.  
**Ação:** `github_list_runs_for_workflow(workflow_id=branch-hygiene-audit.yml)`. Verificar relatório.

### 🟡 E145 — Atualizar inventário semanal (inventario-estado-semanal.yml) [AUTO]
**Achado:** `inventario-estado-semanal.yml` roda toda segunda. Verificar se PR automático de atualização está aberto.  
**Ação:** Verificar PRs abertas com título "Inventário de Estado — {data}". Se há: verificar se está atualizado.

### 🟢 E146 — Verificar que types-sync.yml funciona corretamente [AUTO]
**Achado:** `types-sync` regenera `types.ts` automaticamente. Verificar se a última execução (seg 05:49 UTC) funcionou.  
**Ação:** `github_list_runs_for_workflow(workflow_id=types-sync.yml)`. Último run deve ser SUCCESS.

### 🟢 E147 — Verificar `db-live-guard.yml` último resultado [AUTO]
**Achado:** `db-live-guard.yml` roda semanalmente (seg 06:13 UTC). Verifica migrations vs ledger.  
**Ação:** `github_list_runs_for_workflow(workflow_id=db-live-guard.yml)`. Se vermelho: verificar qual issue abriu.

### 🟢 E148 — Verificar `talkx-status-regen.yml` [AUTO]
**Achado:** `talkx-status-regen.yml` roda semanalmente. Verificar estado.  
**Ação:** `github_list_runs_for_workflow(workflow_id=talkx-status-regen.yml)`. Verificar último run.

---

## DIMENSÃO 14: MONITORAMENTO E OBSERVABILIDADE (Etapas 149–175)

### 🟡 E149 — Verificar `uptime-monitor.yml` (a cada 30min) [AUTO]
**Achado:** `uptime-monitor.yml` verifica health externo do app.  
**Ação:** `github_list_runs_for_workflow(workflow_id=uptime-monitor.yml)`. Verificar se há falhas recentes.

### 🟡 E150 — Verificar `vw_system_health_quick` após E017 (fix health view) [AUTO]
**Achado:** Migration E017 corrige `vw_system_health_quick` que referenciava tabela apagada. Após aplicar: verificar que view funciona.  
**Ação:** `SELECT * FROM vw_system_health_quick LIMIT 1` em produção. Deve retornar sem erro.

### 🟡 E151 — Verificar alertas de cron jobs com falha [AUTO]
**Achado:** `inventario/estado/banco.json` tem campo `alertas` incluindo cron jobs com falha. Verificar estado atual.  
**Ação:** `SELECT jobname, status, return_message FROM cron.job_run_details WHERE status!='succeeded' ORDER BY end_time DESC LIMIT 20`.

### 🟢 E152 — Verificar métricas de Vercel (runtime errors) [AUTO]
**Achado:** Vercel tem runtime errors tracking. Verificar se há erros recorrentes nas últimas 48h.  
**Ação:** `mcp__Vercel__get_runtime_errors(projectId=prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ)`.

### 🟢 E153 — Verificar Web Analytics do Vercel [AUTO]
**Achado:** Vercel tem Web Analytics. Verificar se está ativo para o projeto.  
**Ação:** `mcp__Vercel__aggregate_pageviews(projectId=prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ)`. Se desativado: verificar se é necessário.

---

## DIMENSÃO 15: LONGO PRAZO E ARQUITETURA (Etapas 154–200)

### 🟡 E154 — Planejar renovação de SCHEMA_REFERENCE trimestral [AUTO]
**Achado:** SCHEMA_REFERENCE desatualizado é risco recorrente. Precisa de atualização automatizada.  
**Ação:** Adicionar job semanal em `ddl-out-of-band-detector.yml` que verifica frescura do SCHEMA_REFERENCE e abre issue se >30 dias.

### 🟡 E155 — Avaliar migração de console.* para logger estruturado [AUTO]
**Achado:** 22 arquivos com console.* (E054). Migração completa deve ser feita incrementalmente.  
**Ação:** Criar issue de rastreamento com lista dos 22 arquivos. Dividir em PRs de 5 arquivos cada (4-5 PRs).

### 🟡 E156 — Planejar redução de indexed-access: 272 acima da meta [AUTO]
**Achado:** `indexed-access` em 872 vs meta 600. Redução de 272 em semanas.  
**Ação:** Criar issue com lista dos top 50 arquivos com mais indexed-access. Planejar refatoração incremental.

### 🟡 E157 — Avaliar criação de camada de abstração para supplier_products_raw_history [AUTO]
**Achado:** Tabela particionada gerenciada manualmente. Risco de E016 se repetir.  
**Ação:** Avaliar pg_partman para gerenciamento automático de partições. Criar RFC em `docs/`.

### 🟡 E158 — Avaliar separação de edge functions por domínio [AUTO]
**Achado:** `supabase/functions/` tem 86 edge functions em um único diretório.  
**Ação:** Avaliar reorganização em subdiretórios por domínio (catalog/, crm/, supplier/, system/).

### 🟡 E159 — Revisar arquitetura Medallion Bronze→Silver→Gold [AUTO]
**Achado:** Arquitetura documentada mas fluxo completo não verificado recentemente.  
**Ação:** Verificar `inventario/estado/banco.json` para pipeline de transformação Bronze→Silver→Gold. Documentar gaps.

### 🟡 E160 — Avaliar consolidação de migrations históricas [AUTO]
**Achado:** 1.073+ arquivos de migration. Manutenção e replay ficam cada vez mais lentos.  
**Ação:** Avaliar squash de migrations até um baseline (NÃO executar sem [REQUER-PO]). Documentar pros/cons.

### 🟢 E161 — Atualizar docs/SCHEMA_REFERENCE.md com seção de Medallion [AUTO]
**Achado:** SCHEMA_REFERENCE descreve tabelas mas não o fluxo Medallion.  
**Ação:** Adicionar seção `## Arquitetura Medallion` com diagrama simplificado Bronze→Silver→Gold.

### 🟢 E162 — Criar runbook de incidente para partições esgotadas [AUTO]
**Achado:** Risco de E016 se repetir. Sem runbook, resposta de incidente será lenta.  
**Ação:** Criar `docs/INCIDENT-RUNBOOK.md` seção "Partição esgotada" com comandos de diagnóstico e criação de emergência.

### 🟢 E163 — Verificar política de backup do banco [AUTO]
**Achado:** Supabase tem backup automático. Verificar política de retenção.  
**Ação:** Verificar Settings → Backups no painel Supabase. Documentar em `docs/db/POLITICA_DDL.md`.

### 🟢 E164 — Revisar permissões de roles no banco [AUTO]
**Achado:** `authenticated`, `anon`, `service_role` têm permissões distintas. Verificar que nenhuma permission foi ampliada silenciosamente.  
**Ação:** `SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee IN ('authenticated','anon') ORDER BY table_name`.

### 🟢 E165 — Avaliar uso de RLS policies por schema [AUTO]
**Achado:** Schemas `analytics`, `supplier_stricker`, etc. podem ter tabelas sem RLS.  
**Ação:** `SELECT schemaname, count(*) as tabelas, sum(CASE WHEN row_security='on' THEN 1 ELSE 0 END) as com_rls FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','pg_toast') GROUP BY schemaname`.

### 🟢 E166–E200 — Backlog de melhorias incrementais (ver próximas sessões)

**E166** — Adicionar lint de SQL para migrations novas (sqlfluff)  
**E167** — Verificar que todos os PRs têm labels de categoria (fix/feat/chore)  
**E168** — Verificar que deprecated functions do Supabase não são usadas  
**E169** — Verificar uso de `realtime` subscriptions no front  
**E170** — Verificar que Storage buckets têm RLS configurado  
**E171** — Verificar que Edge Functions não têm hardcoded URLs de produção  
**E172** — Verificar consistência de nomenclatura de tabelas (snake_case)  
**E173** — Verificar que views têm comentários de propósito  
**E174** — Verificar que triggers têm documentação  
**E175** — Verificar que cron jobs têm comentários de propósito  
**E176** — Revisar queries N+1 no front (consultas por item em loop)  
**E177** — Verificar que hooks do React têm cleanup correto  
**E178** — Verificar que forms têm validação client-side  
**E179** — Verificar que rotas protegidas têm guard de autenticação  
**E180** — Verificar que error boundaries estão em todos os lazy-loaded components  
**E181** — Verificar uso de Suspense/loading states  
**E182** — Verificar que imagens têm alt text (acessibilidade)  
**E183** — Verificar SEO tags em páginas principais  
**E184** — Verificar que meta tags de Open Graph estão corretas  
**E185** — Verificar bundle splitting por rota  
**E186** — Verificar lazy loading de componentes pesados  
**E187** — Verificar uso de React.memo e useMemo em listas grandes  
**E188** — Verificar que inputs de busca têm debounce  
**E189** — Verificar que requests de API têm timeout  
**E190** — Verificar que erros de API são tratados graciosamente  
**E191** — Verificar que estado offline é tratado  
**E192** — Verificar que toasts de erro têm mensagens claras  
**E193** — Verificar que loading skeletons estão em todos os componentes assíncronos  
**E194** — Verificar que paginação funciona em todas as listagens  
**E195** — Verificar que filtros são preservados na URL (deep linking)  
**E196** — Verificar que exportações de dados funcionam (PDF/Excel de orçamentos)  
**E197** — Verificar que impressão de orçamentos funciona  
**E198** — Verificar que e-mails transacionais são enviados corretamente  
**E199** — Verificar que webhooks externos têm retry logic  
**E200** — Verificar que sistema funciona em mobile (responsividade)  

---

## RESUMO EXECUTIVO

### Achados Críticos (ação imediata):
| # | Risco | Deadline | Tipo |
|---|---|---|---|
| E016 | Pipeline Bronze PARA em 2027-01-01 se partições não criadas | 2026-12-15 | [REQUER-PO] |
| E002/E136 | Gate 1.14 falha: contexto.yml não em SEGREDOS.md | Hoje | [AUTO] |
| E001 | 6 commits com credentials ativas em histórico | Hoje | [REQUER-PO] |
| E017/E018 | 2 migrations pendentes há 3+ dias | Urgente | [REQUER-PO] |
| E033 | E2E timeout: CI vermelho desde 2026-10-02 | Alta | [REQUER-PO] |

### Métricas de Dívida Técnica Atual:
| Métrica | Atual | Meta | Delta |
|---|---|---|---|
| indexed-access | 872 | 600 | +272 |
| TODO/FIXME | 51 | 30 | +21 |
| Arquivos >500L | 138 | 100 | +38 |
| console.* | 22 | 0 | +22 |
| TSC errors | 0 | 0 | ✅ |

### Etapas executáveis sem aprovação do PO (classificadas [AUTO]): ~148
### Etapas que requerem aprovação do PO ([REQUER-PO]): ~12
### Etapas de backlog (E166-E200): 35

---
*Gerado em 2026-11-04 · Análise de 500 commits · 5 agentes especializados*  
*Plano para execução por outro agente — NÃO EXECUTAR diretamente desta sessão*
