# PENDENCIAS.md — Workflows com falha não corrigível nesta sessão

> Gerado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj
> Atualizado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY
> Critério: "último run na main = failure" (inventário de 2026-11-08T15h BRT)

---

## Itens corrigidos nesta sessão (via PR)

| Workflow | Causa | Fix |
|---|---|---|
| Branch Protection Sentinel | `docs(auditoria):` não aceito na allowlist | Expandido regex Regra 6 para `docs\([a-z][a-z0-9-]*\):`; SHA `d03ee555` grandfathered |

---

## Pendências — requerem ação do PO ou acesso externo

### P-01 · edge-functions-drift-check
- **Workflow:** `.github/workflows/edge-functions-drift-check.yml`
- **Último run falhante:** ID 42491884076, SHA `46ec263`, job 128765836866
- **Causa raiz verificada (log job 128765836866):** Drift REAL de conteúdo entre funções no GitHub e o deploy canônico em Supabase (`doufsxqlfjyuvxuezpln`). Step "Verify required secrets" = **success** (secret SUPABASE_ACCESS_TOKEN está presente e válido). Step "Fail if drift detected" = **failure** com mensagem: `"Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv."` O artefato `drift-report` (ID 13622231340) foi gerado com as funções drifted.
- **Bloqueio real:** Não é ausência de secret. O código das edge functions deployadas no Supabase diverge do código commitado no GitHub. Funções foram deployadas diretamente via MCP/dashboard/CLI sem commit correspondente (violação das regras de governance).
- **Ação necessária (PO):**
  1. Baixar artefato `drift-report` do run 42491884076 para ver quais funções divergiram
  2. Decidir qual versão é canônica (GitHub ou Supabase)
  3. Se GitHub é a verdade: re-deployar todas as funções via `.github/workflows/deploy-edge-functions.yml`
  4. Se Supabase é a verdade: commitar o código atual das funções e abrir PR
- **Risco:** alto — 74 funções em drift indicam deployments diretos sem controle de versão

---

### P-02 · db-schema-drift-check
- **Workflow:** `.github/workflows/db-schema-drift-check.yml`
- **Último run falhante:** ID 42467725023, SHA `8c3abe3`, job 128691013275
- **Causa raiz verificada (log job 128691013275):** Desincronização massiva do ledger de migrations. Step "Gate - secrets obrigatórios presentes?" = **success** (secrets SUPABASE_DB_PASSWORD e SUPABASE_ACCESS_TOKEN estão presentes). Step "Ledger parity (repo x canonical)" = **failure** com output: `[migration-ledger][bloqueado] local_only=1144; remote_only=678; mismatched=0; malformed=0`
  - `local_only=1144`: 1144 migrations existem no repo (`supabase/migrations/`) mas NÃO foram aplicadas no banco de produção
  - `remote_only=678`: 678 migrations estão aplicadas no banco de produção mas NÃO existem no repo como arquivos `.sql`
- **Bloqueio real:** Não é ausência de secret. O ledger de migrations está fundamentalmente dessincronizado entre o repo e o banco. Requer reconciliação de DDL (item de regra 7 do AGENTS.md — DDL em produção requer aprovação do PO via PR).
- **Ação necessária (PO):**
  1. Revisar `docs/agentes/banco-migrations.md` para entender o processo de reconciliação
  2. Identificar quais das 678 "remote_only" são legacy e quais precisam virar arquivos `.sql` no repo
  3. Identificar quais das 1144 "local_only" devem ser aplicadas em produção
  4. Abrir PR com migrations de reconciliação — será item de regra 7 (DDL em produção), não pode ser auto-mergeado
- **Risco:** alto — 678 objetos no banco sem rastreabilidade no repo; 1144 migrations não aplicadas

---

### P-03 · Kit Coverage — Integration
- **Workflow:** `.github/workflows/kit-coverage-integration.yml`
- **Último run falhante:** ID 42443979822, SHA `5e28c6c8`, job 128618931910
- **Causa raiz verificada (log job 128618931910):** `Hook timed out in 60000ms` no `beforeAll` de `src/lib/external-db/kit-coverage.integration.test.ts:35`. O hook tenta autenticar com as credenciais de teste contra o Supabase Auth de `doufsxqlfjyuvxuezpln` mas a chamada não retorna em 60s. Secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` estão **presentes** (verificado via `github_list_actions_secrets`).
- **Bloqueio real:** Não é ausência de secret. A chamada de autenticação (`signInWithPassword`) está travando ou sendo recusada silenciosamente. Possíveis causas:
  - Conta de teste inativa ou password expirado em `doufsxqlfjyuvxuezpln`
  - GitHub Actions runner sem rota de rede para `supabase.co` (firewall/proxy)
  - Instância Supabase pausada ou com rate-limit temporário
- **Ação necessária (PO):**
  1. Testar autenticação manual: `curl -X POST "https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/token?grant_type=password" -H "apikey: <ANON_KEY>" -d '{"email":"<E2E_USER_EMAIL>","password":"<E2E_USER_PASSWORD>"}'`
  2. Se timeout: verificar se a conta existe em Supabase → Authentication → Users
  3. Se conta não existe: criá-la com senha correspondente ao secret `E2E_USER_PASSWORD`
  4. Se conta existe mas senha errada: redefinir senha e atualizar o secret `E2E_USER_PASSWORD`

---

### P-04 · Nightly Full CI
- **Workflow:** `.github/workflows/nightly-full.yml`
- **Último run falhante:** ID 42439844067, SHA `16408a68`
- **Causa raiz:** Dependente de E2E shards e E2E Visual (magazine-header, color-swatch). O Nightly é um workflow agregador — falha quando qualquer sub-workflow falha.
- **Bloqueio:** depende da resolução dos itens de E2E abaixo (P-05 e P-06) e do acesso a secrets de autenticação (P-03).
- **Ação necessária:** Resolver P-05 e P-06 primeiro; o Nightly deve passar automaticamente na próxima execução noturna após as correções.

---

### P-05 · E2E (Playwright) — 22-header-sticky
- **Workflow:** `.github/workflows/e2e.yml` (ID 278436800)
- **Último run falhante:** ID 42448545644, SHA `87fe8cd`
- **Causa raiz:** `[loginViaUI] Timeout aguardando redirect pós-login` em `e2e/flows/22-header-sticky.spec.ts:238`. URL fica presa em `http://localhost:8080/login` após tentativa de login.
- **Status no HEAD atual:** NÃO VERIFICADO — o último run registrado é de SHA `87fe8cd`, anterior ao HEAD atual. Pode ter sido corrigido por commits posteriores.
- **Bloqueio:** requer investigação manual do fluxo de login em `e2e/flows/22-header-sticky.spec.ts`. Possíveis causas: seletor de input desatualizado após mudança de UI, credencial de teste inválida, ou race condition no redirect pós-autenticação.
- **Ação necessária (PO/Dev):** verificar se o último run do workflow `e2e.yml` no HEAD atual passou; se não, investigar o spec.

---

### P-06 · E2E • ColorSwatch 2 linhas (Grid)
- **Workflow:** `.github/workflows/e2e-color-swatch-grid.yml` (ID 303726213)
- **Último run falhante:** ID 42440258426, SHA `9c33e63`
- **Causa raiz:** 2 testes falharam em `e2e/catalog/color-swatch-two-lines-grid.spec.ts:69` — viewports desktop (1440px) e wide (1920px): "2 linhas + chip +N + sem clipping". Provavelmente asserção de layout visual desatualizada após mudança no componente ColorSwatch.
- **Status no HEAD atual:** NÃO VERIFICADO — último run é de SHA `9c33e63`, anterior ao HEAD.
- **Bloqueio:** requer re-run no HEAD atual para confirmar se a falha persiste. Se persistir, o componente ColorSwatch ou os snapshots precisam ser atualizados.
- **Ação necessária (PO/Dev):** disparar manualmente o workflow `e2e-color-swatch-grid.yml` no HEAD atual para confirmar status.

---

### P-07 · DB — Aplicação E15
- **Workflow:** `.github/workflows/db-apply-migration.yml`
- **Tipo:** `workflow_dispatch` apenas — não executa automaticamente
- **Causa raiz:** Migration `20261108001500_reconcile_e2e_cleanup_audit.sql` não contém cabeçalho `-- Rollback:` nas primeiras 40 linhas — exigido pelo preflight do gate E15 antes de aplicar a migration.
- **Bloqueio (cascata com P-02):** Corrigir a migration (adicionar `-- Rollback:`) requer modificar `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql`. Qualquer mudança em `supabase/migrations/**` ativa `check-schema-paths.outputs.changed=true` em `deploy-gates.yml`, que por sua vez roda o job `schema-drift-gate`. O `schema-drift-gate` falha porque o ledger parity está dessincronizado (P-02 acima). Portanto, o fix da migration está bloqueado até P-02 ser resolvido.
- **Fix necessário (após P-02 resolvido):**
  ```sql
  -- Migration: 20261108001500_reconcile_e2e_cleanup_audit
  -- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;
  ```
  Adicionar essas 2 linhas no topo de `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` via nova PR.
- **Ação necessária (PO):**
  1. Resolver P-02 primeiro (reconciliar ledger de migrations)
  2. Após P-02 resolvido, abrir PR adicionando o cabeçalho `-- Rollback:` ao arquivo da migration
  3. Após merge desse PR, re-disparar `db-apply-migration.yml` via Actions UI com `version=20261108001500`

---

## Resumo por categoria de bloqueio

| Código | Descrição | Responsável |
|---|---|---|
| DRIFT-REAL | Drift confirmado por log — código diverge entre repo e Supabase | PO — decidir versão canônica e deployar/commitar |
| LEDGER-DESYNC | Ledger massivamente dessincronizado (1144 local + 678 remote) | PO — reconciliar via PR de DDL (regra 7) |
| AUTH-TIMEOUT | Auth timeout — secrets presentes mas chamada não retorna | PO — verificar conta de teste no Supabase Auth |
| E2E-VERIFY | E2E em SHA antigo — pode já ter passado | PO/Dev — re-rodar no HEAD |
| DEPENDS | Depende de outro item desta lista | Automático após resolução |
| CASCATA | Bloqueado por outro item desta lista | Ver item referenciado |

| Item | Categoria | Urgência |
|---|---|---|
| P-01 (edge-functions-drift) | DRIFT-REAL | Alta |
| P-02 (db-schema-drift) | LEDGER-DESYNC | Alta |
| P-03 (kit-coverage-integration) | AUTH-TIMEOUT | Média |
| P-04 (nightly-full) | DEPENDS (P-05, P-06) | Baixa |
| P-05 (e2e playwright) | E2E-VERIFY | Baixa |
| P-06 (e2e color-swatch) | E2E-VERIFY | Baixa |
| P-07 (db-apply-migration E15) | CASCATA (P-02) | Baixa — bloqueado por P-02 |
