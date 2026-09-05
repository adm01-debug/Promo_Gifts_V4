# 🔬 Auditoria Técnica Exaustiva — Promo Gifts V4 (Round 3)

> **Data:** 2026-09-05 · **HEAD auditado:** `9ef07bf` (main = produção Vercel `dpl_EezkTWeQZrP1nzGx6yXdJHuDKgUc`, READY)
> **Nota geral ponderada:** **8.1 / 10** (r2 de 2026-09-02: 8.0 · r1 de 2026-09-01: 7.8)
> **Método:** 20 dimensões, pesos crítico ×3 / alto ×2 / padrão ×1
> **Fontes:** repo local, `pg_catalog` + `pg_stat_statements` + `cron.job_run_details` + advisors do projeto `doufsxqlfjyuvxuezpln` (MCP GESTÃO DE PRODUTOS), Portainer (VPS AtomicaBR), Vercel (team juca1), GitHub API (ruleset, runs, PRs, Dependabot), headers ao vivo de `www.promogifts.com.br`, execução local de `tsc`, `ssot:validate` e `test:ci-core`.
> **Antecessora:** `docs/reports/auditoria-tecnica-2026-09-02-r2.md`. Este round re-mede após #1825–#1828 e registra o que os quick wins da r2 mudaram (ou não) em produção.

---

## Fase 0 — Inventário do Sistema

| Item | Valor | Fonte |
|---|---|---|
| Repositório | `adm01-debug/Promo_Gifts_V4` · branch `main` · **público** · 301 issues abertas · 2 PRs abertos (#1823 T32, #1829 R4) | GitHub API |
| Stack | React 19.2.8 · TS 5.4.5 (strict) · Vite 8.0.16 · Vitest 4.1.8 · Playwright 1.59.1 · Supabase PG 17.6 (aarch64) · Vercel (Node 24.x, iad1) | package.json / pg / Vercel |
| Arquivos versionados | 6.792 · 2.553 arquivos TS/TSX em `src/` (~554k linhas, 63k só em `types.ts`) | `git ls-files`, `wc` |
| Arquivos de teste | 1.845 (`*.test.*` + `*.spec.*`) | `git ls-files` |
| Workflows CI | 109 (`.github/workflows/`) · HEAD de main: **25/25 runs recentes SUCCESS** | Actions API |
| Edge Functions | 108 dirs no repo · **108 deployadas** (37 com `verify_jwt=false`; config.toml declara 36) · drift: `mcp-query` deployada (v2, 2026-08-25, `verify_jwt=false`) **sem diretório no repo**; `tests/` no repo não é função | repo + `list_edge_functions` |
| Migrations SQL | 1.696 (+10 desde r2) · 5 com "down/rollback" no nome · sem `supabase/seed*` | `supabase/migrations/` |
| Banco (public) | 393 tabelas · **393 com RLS (100%)** · 192 views · 4 matviews · 935 policies · 1.288 funções (536 SECURITY DEFINER, **0 sem search_path**) · 389 triggers · 397 FKs (**0 sem índice**) · 5.823 MB | pg_catalog |
| pg_cron | 137 jobs (135 ativos) · 2 jobs com falha nos últimos 7 dias (32 e 297 — execuções **anteriores** ao fix de 2026-09-02; ver §04) | `cron.job_run_details` |
| Auth | 13 usuários · 2 ativos em 30d · 9 sessões · **1 fator MFA verificado** · 179 logins falhos em 7d (rate limit ativo, 24 linhas em `edge_rate_limits`) | auth.* / login_attempts |
| Deploy | Vercel prod = main auto (`9ef07bf` READY em 2026-09-04) · domínios `www.promogifts.com.br` + apex + 3 aliases · **0 runtime errors em 7d** | Vercel MCP |
| VPS (auxiliar) | Portainer 2.39.5 · 90 stacks ativas · ~170 containers `running` (n8n 2.25.7, evolution, supabase self-hosted PG 15.8, rabbitmq, minio, obs-*, crowdsec, pgbackrest, 7 runners GH) | Portainer MCP |
| Grafo | **stale** (build `4126d7a` de 2026-08-09 vs HEAD `9ef07bf`) — auto-sync N8N de 15 min continua não cobrindo este repo | graphify-out/GRAPH_REPORT.md |

**Validações executadas nesta sessão (não herdadas):**
- `npm ci` limpo (Node 22.22.2) → `tsc -p tsconfig.app.json --noEmit` → **0 erros** (exit 0)
- `npm run ssot:validate` → OK (client aponta para `doufsxqlfjyuvxuezpln`)
- `npm run test:ci-core` → **38 suítes / 889 testes PASS em 21,4s**
- Headers ao vivo em `www.promogifts.com.br`: CSP **sem `data:` em `script-src`** (fix da r2 confirmado em produção), hashes sha256 para os 2 inline scripts, HSTS preload, XFO DENY, nosniff
- Smoke de produção (`smoke_test_runs`): última bateria 2026-09-03 17:27 → **38/38 PASS** (6 baterias em 7 dias, todas 38/38)

**Não auditável nesta sessão (declarado):** restore de backup (não executado — o próprio `docs/VALIDACAO_BACKUP_ROLLBACK_2026-08-26.md` registra "Não executei restore"), suite E2E Playwright completa, Lighthouse ao vivo, pen test externo, configuração de password policy/MFA no painel Auth (não exposta via SQL).

---

## Fase 1 — As 20 Dimensões

### 01 · Arquitetura — **7.5/10** (Alto ×2) =

**Evidências ✅** Feature-based `src/` com camada de services e `src/logic/`; Medallion Bronze→Silver→Gold; 7 ADRs (`docs/ADR_*`); `check:chunk-cycles` no build; kill switches e circuit breakers centralizados em `_shared/` (`circuit-breaker.ts`, `external-fetch.ts`).

**Gaps ❌ (sem mudança desde r2)**
- God files intactos: `QuoteBuilderSummaryColumn.tsx` 1.710 linhas · `PromoFlixPlayer.tsx` 1.512 · `useQuoteBuilderState.ts` 1.345.
- Grafo stale há 27 dias; o auto-sync N8N não cobre este repo.
- `docs/RUNBOOKS/` e `docs/runbooks/` coexistem com conteúdo duplicado (`CF_RECONCILIATION.md`, `EDGE_FUNCTIONS_BASE_URL.md`) — sintoma de ausência de boundary de documentação.

**Ações →10:** quebrar os 3 god files (≤400 linhas); `graphify update . --force` na VPS + corrigir o auto-sync; fundir `docs/runbooks` em `docs/RUNBOOKS`.

---

### 02 · Autenticação — **8.5/10** (Crítico ×3) =

**Evidências ✅** Supabase Auth + MFA AAL1/AAL2 (`useAuthMFA.ts`, `MfaChallengeDialog`, `AdminRoute.tsx` e `route-matrix.ts` referenciam AAL2); `check-login` com rate limit e `fn_check_login_allowed` (IP/cidade whitelist); 179 tentativas falhas em 7d absorvidas sem incidente; `auth-fuzz-weekly.yml`; `enforce_password_reset_rate_limit` como trigger.

**Gaps ❌**
- **MFA na prática: 1 fator verificado entre 13 usuários** — AAL2 referenciado em código, mas não enforçado (2 usuários ativos em 30d sem MFA).
- PR **#1829** (fail-closed em `check-login`, `CF_ORIGIN_SECRET` para confiar em `cf-ipcity`) está aberto: as migrations já foram aplicadas no banco (`get_quote_token_public` com grant anon; `get_quote_token_by_value` sem grant), mas o código da edge `check-login` fail-closed **ainda não está em produção** — e o fix depende de um segredo (`CF_ORIGIN_SECRET`) + Transform Rule na Cloudflare que não há evidência de terem sido configurados.
- `check_login_rate_limit` e `fn_check_login_allowed` continuam com EXECUTE para `anon` e `authenticated` (SECURITY DEFINER) — a edge usa service_role e não precisa do grant.
- Password policy não documentada; sem revogação global de sessões.

**Ações →10:** mergear #1829 **junto** com a configuração do `CF_ORIGIN_SECRET` (Supabase secret + Cloudflare Transform Rule) — sem isso `city = null` e o gate fecha para todos se `city_whitelist_enabled=true`; `REVOKE EXECUTE ... FROM anon, authenticated` nas 2 fns de login; exigir AAL2 em `AdminRoute`; documentar password policy no `SECURITY.md`.

---

### 03 · Autorização — **8.0/10** (Crítico ×3) ↑ de 7.5

**Evidências ✅ (medidas hoje)**
- **RLS em 393/393 tabelas (100%)** — as 2 partições da r2 foram corrigidas e `fn_purge_spr_history` cria partições futuras já com RLS.
- 935 policies; 397 FKs 100% indexadas; 536 SECURITY DEFINER 100% com `search_path`.
- **Auditoria das 92 tabelas com policy de escrita aplicável a `anon`/`public`:** todas condicionadas — `is_dev()`, `is_org_owner_or_admin()`, `user_is_org_member()`, `auth.uid()`, `false`, ou `user_id IS NULL` (telemetria anônima com checks de tamanho). Nenhuma policy de escrita incondicional para anon.
- Ruleset "Protect main" agora com **`require_code_owner_review: true`** (gap da r2 fechado em 2026-09-03).

**Gaps ❌ (medidos hoje)**
- **8 views SECURITY DEFINER agora reportadas como ERROR** pelo advisor (`v_products_public`, `v_suppliers_public`, `v_variant_sale_prices_public`, `v_tabela_preco_gravacao_oficial_public`, `v_kit_component_media_public`, `v_product_compositions_public`, `v_product_tags_public`, `v_product_properties_public`) — design intencional do catálogo anônimo, mas sem `COMMENT ON VIEW` documentando a intenção nem teste que garanta que só colunas públicas são expostas.
- pg_graphql expõe **59 tabelas ao `anon` e 454 ao `authenticated`** (513 WARN) — inalterado desde r2.
- 10 SECURITY DEFINER executáveis por `anon` e 72 por `authenticated` (WARN) — allowlist existe (`.security/secdef-anon-allowlist.json`), mas as 2 fns de login acima não deveriam estar nela.
- `anon_catalog_grant_audit_log`: RLS habilitado sem policy (INFO — default-deny, ok; 200 linhas).
- Tabelas de telemetria (`analytics_events`, `catalog_analytics`, `frontend_telemetry`, `product_views`, `search_analytics`, `password_reset_requests`) aceitam INSERT anônimo — vetor de spam/enchimento sem rate limit no banco (só na edge).

**Ações →10:** `COMMENT ON VIEW` + teste de contrato de colunas nas 8 views; desabilitar pg_graphql para `anon` (`REVOKE USAGE ON SCHEMA graphql_public FROM anon`) se o frontend não o usa; REVOKE nas 2 fns de login; trigger de rate limit por IP/dia nas tabelas de telemetria anônimas.

---

### 04 · Banco de Dados — **8.5/10** (Alto ×2) =

**Evidências ✅**
- 1.696 migrations versionadas com contrato de nome; NUMERIC para dinheiro; particionamento mensal com purge automatizado (e agora com RLS herdado).
- **Unused indexes: 206 → 158** (69 MB) — dívida caiu 23% (advisor reporta 205 por contar partições).
- `idle_in_transaction_session_timeout=60s`, `log_min_duration_statement=2s`; 17 conexões de 90.
- Autovacuum saudável nas tabelas grandes (`stock_snapshots` 1.574 MB, 0 dead tuples, vacuum hoje; `stock_daily_summary` 1,7M linhas, 32k dead).
- Crons 32 e 297 **reescritos** (comando de 297 é agora `VACUUM ANALYZE t1,t2,t3,t4` em statement único; 32 chama `fn_run_and_persist_smoke_tests()` alinhada).

**Gaps ❌ (medidos hoje)**
- **Os 2 crons corrigidos ainda não executaram no agendamento real**: última run de 297 = 2026-08-30 (falha, pré-fix; próxima 2026-09-06 04:30 UTC), última de 32 = 2026-09-01 (falha, pré-fix; próxima 2026-10-01). A validação da r2 foi com job temporário — o `job_run_details` ainda mostra 4 falhas consecutivas de 297 (08-16, 08-23, 08-30) e o advisor de "crons quebrados" só limpa após a próxima execução.
- 158 unused indexes restantes; sem migrations de rollback sistemáticas (5 de 1.696); sem seed para dev.
- Auth server limitado a **10 conexões** (advisor INFO) — não escala com instância.
- `security_definer_view` ×8 em nível ERROR (ver §03).

**Ações →10:** verificar `cron.job_run_details` em 2026-09-06 após 04:30 UTC (job 297) e disparar 32 manualmente uma vez (`SELECT public.fn_run_and_persist_smoke_tests()`) para fechar o ciclo; lote 2 de drop de unused indexes (`idx_scan=0` + idade >30d); `supabase/seed.sql` mínimo (1 org, 1 fornecedor, 10 produtos).

---

### 05 · CI/CD — **8.5/10** (Padrão ×1) ↓ de 9.0

**Evidências ✅** 109 workflows; HEAD de main com **25/25 SUCCESS** (Deploy Gates, SSOT Guard, Gitleaks full-history, CodeQL, Security Scan, Credentials Audit, Branch Protection Sentinel, Required Checks Guard, TS Unused Ratchet, Uptime Monitor ×5, E2E ×4, Production Health Check…); required check único "Gate Final - Deploy Ready" (strict); ratchets em 11 baselines (`.tsc-baseline`, `.eslint-baseline`, `.any-type-baseline`, `.security-definer-acl-baseline`, `.toast-leaks-baseline`, `.invoke-direct-baseline`…); Husky pre-commit com fail-fast do eslint.config.

**Gaps ❌ (medidos hoje)**
- **Previews Vercel do PR #1829: 19 deployments consecutivos em `ERROR` (`BUILD_FAILED` / "Resource provisioning failed")** desde 2026-09-04 22:xx, sem nenhuma linha de erro no build log — falha de provisionamento do lado Vercel, não do código. Consequência: PR aberto sem preview navegável há ~5h; produção (main) não afetada. Sem alerta configurado para "preview falhou".
- 8 workflows ainda referenciam `bun` enquanto o pipeline é npm (`bun.lock` 260 KB + `package-lock.json` 502 KB coexistem).
- Lighthouse mede só `/auth` com perf ≥0.75.
- 109 workflows sem inventário ativo/obsoleto; sem versionamento semântico automatizado.

**Ações →10:** abrir ticket Vercel/redeploy do preview de #1829 e adicionar `deployment_status` failure → issue no `uptime-monitor.yml`; remover `bun.lock` e os 8 usos de `bun` nos workflows; LHCI em 3 URLs ≥0.85; job trimestral listando workflows sem run em 90d.

---

### 06 · Data Integrity — **8.0/10** (Crítico ×3) =

**Evidências ✅** Idempotência testada (`product-webhook/idempotency_test.ts`); deduplicação por UNIQUE+upsert no bronze; NUMERIC; TZ São Paulo enforçada; `pipeline_run_log` 100% `ok` em 7d (1.015 `promote_tick` + 168 `health`, 0 falhas); `useDiscountApproval.transactional.test.tsx`.

**Gaps ❌** Optimistic locking: apenas **1 coluna `version`** entre `quotes`/`carts`/`seller_carts` (cobertura parcial, sem check no UPDATE); criação quote+items+personalizations sem RPC transacional única; política soft/hard delete não documentada; `admin_audit_log` com **apenas 2 linhas em 30d** — ou a operação foi mínima ou ações admin não estão sendo auditadas (2 usuários ativos, 2 quotes criadas em 30d — consistente com operação baixa, mas vale confirmar cobertura).

**Ações →10:** `fn_create_quote_with_items(jsonb)` transacional; `version` + `WHERE version = $expected` nas 3 tabelas; documentar soft delete; teste que garante que toda mutation admin gera linha em `admin_audit_log`.

---

### 07 · Documentação — **7.5/10** (Padrão ×1) ↓ de 8.0

**Evidências ✅** README 38 KB, CONTRIBUTING 12 KB, CLAUDE.md com regras 1–8, SECURITY.md, 7 ADRs, `SCHEMA_REFERENCE.md`, `DATA_DICTIONARY.md`, `docs/INCIDENTS/` com 2 post-mortems, runbooks de rotação de credencial e conexões, PR template.

**Gaps ❌** **STATUS.md continua congelado em 2026-06-02/03** (3 meses); `docs/RUNBOOKS/` e `docs/runbooks/` duplicados; CHANGELOG `[Unreleased]` com entrada mais recente de 2026-05-27 (não registra #1819–#1828); sem OpenAPI das edges; sem diagrama ER; 40+ relatórios de auditoria sem índice.

**Ações →10:** substituir STATUS.md por 5 linhas apontando para CHANGELOG + último relatório; fundir os dois diretórios de runbooks; entrada de CHANGELOG por PR mergeado (release-please resolve os dois); `docs/reports/README.md` como índice.

---

### 08 · Infraestrutura / DevOps — **7.5/10** (Padrão ×1) =

**Evidências ✅ (Portainer, hoje)** 90 stacks ativas: backups em camadas (postgres daily/weekly/monthly, pgbackrest para supabase e evolution, minio-backup, volume-backup, portainer-state-backup, supabase-config-backup, obs-backup), observabilidade (prometheus, grafana, loki, cadvisor, 4 pg-exporters), segurança (crowdsec + bouncer + ban-agent, evolution-security-guardian), 20+ watchdogs, docker-housekeeping, disk-monitor/actioner/deep-clean, 7 runners GH, stack-change-alert, schema-drift-guard, wal-slot-guard. Vercel: SSL/CDN, previews com SSO, rollback nativo, 0 runtime errors 7d. DB não público.

**Gaps ❌**
- Compose files das 90 stacks **não versionados em git** (o Portainer MCP tem `portainer_get_stack_file` — exportável).
- **Restore nunca demonstrado** (declarado explicitamente no doc de 2026-08-26: "Não executei restore"; "Backup geral de dados restaurável: NÃO COMPROVADO").
- Sem staging com banco próprio; Vercel "Resource provisioning failed" em série sem alerta.
- 3 stacks com `updated: 1970-01-01` (disk-actioner, disk-monitor, scanopy-ops, metabase-watchdog, supabase-pgbackrest-backup, traefik, guard-pin) — metadado quebrado no Portainer, dificulta auditoria de mudança.

**Ações →10:** repo `infra-stacks` alimentado por job N8N semanal via `portainer_get_stack_file`; teste de restore trimestral (pgbackrest → container efêmero → `SELECT count(*)` em 5 tabelas) documentado; Supabase branch para staging de schema.

---

### 09 · Logging / Monitoring — **9.0/10** (Padrão ×1) ↑ de 8.5

**Evidências ✅** Logger JSON com request_id; Sentry lazy; CSP report-uri ativo; gates `check:client-structured-logging` e `check:toast-leaks`; console strippado em prod; **Uptime Monitor a cada 15 min ativo (5/5 runs SUCCESS hoje)** abrindo issue com label `uptime` em falha — gap da r2 fechado; Production Health Check workflow; Loki/Grafana/Prometheus na VPS com exporters PG.

**Gaps ❌** Alertas por threshold (error rate, P99) não configurados no Sentry; retenção de logs não documentada; uptime monitor cobre site + `health-check`, não cobre `check-login`/`crm-db-bridge` (as edges críticas de negócio).

**Ações →10:** 2 URLs a mais no uptime (`check-login` OPTIONS, `crm-db-bridge` health); alerta Sentry error-rate >1%/5min → WhatsApp via Evolution; seção "retenção" em `docs/OBSERVABILITY.md`.

---

### 10 · Observabilidade — **7.5/10** (Padrão ×1) =

**Evidências ✅** Sentry `tracesSampleRate: 0.1` em prod; telemetryService; `pg_stat_statements` ativo (4.975 statements); `pipeline_run_log` + `pipeline_health_log`; ADRs de contratos de observabilidade.

**Gaps ❌** Sem tracing cross-service (frontend → edge → Bitrix24/N8N); SLO/SLI não definidos; métricas RED por endpoint não instrumentadas; `magazine_public_view_events` com 0 linhas (feature instrumentada mas sem tráfego ou sem coleta funcionando).

**Ações →10:** `browserTracingIntegration` com propagação para `*.supabase.co`; 3 SLOs (uptime ≥99,5%, P99 quote <2s, erro <1%); verificar por que `magazine_public_view_events` está vazia.

---

### 11 · Lógica de Negócio — **8.0/10** (Padrão ×1) =

**Evidências ✅** `QuoteStatus` tipado com testes de transição; suítes de frete (unit+integration+fuzz+load) e replenishment; NUMERIC; TZ-aware; Zod nas regras; kill switches por integração em `system_kill_switches` (7 switches, `edge_external_db_bridge=false` desligado de propósito).

**Gaps ❌** Lógica presa em `useQuoteBuilderState` (1.345 linhas); state machine sem diagrama; glossário incompleto.

**Ações →10:** extrair cálculo para `src/logic/quote/`; diagrama da máquina de estados no ADR.

---

### 12 · Manutenibilidade — **7.5/10** (Padrão ×1) =

**Evidências ✅** tsc 0 erros; `.any-type-baseline` com **1 `any` em produção** (`useSellerCarts.ts`); ratchet de unused locals (48.427); lint-staged + husky; 36 TODO/FIXME em src (rastreáveis).

**Gaps ❌** `noUnusedLocals/Parameters: false` + `skipLibCheck: true`; `eslint.config.js` com 1.659 linhas monolítico; 2 lockfiles; 14 `console.log` em src; god files.

**Ações →10:** remover `bun.lock`; fatiar eslint.config por domínio; campanha −20%/mês no ratchet.

---

### 13 · Operacionalidade — **8.0/10** (Padrão ×1) ↑ de 7.5

**Evidências ✅** Circuit breaker em `_shared/external-fetch.ts` usado por 5 edges; **kill switches em 8 edges** (`assertSwitchEnabled`) com 7 switches em produção; rollback Vercel 1-clique; `docs/INCIDENTS/` com 2 post-mortems reais; `SECURITY_RUNBOOK.md`, `RUNBOOK_CONNECTIONS.md`, `CREDENTIAL_ROTATION.md`.

**Gaps ❌** PR #1823 (T32) aberto há 3 dias com veredito "não mergear" da r2 e sem fechamento nem plano alternativo (nonce/CSSOM); sem `docs/incident-response.md` com severidades e SLA; graceful degradation do site sem Supabase não documentada.

**Ações →10:** fechar #1823 com comentário apontando para o caminho nonce/CSSOM (ou converter em issue); `docs/incident-response.md` (SEV1–SEV3, quem, canal, post-mortem em 48h).

---

### 14 · Performance — **7.5/10** (Padrão ×1) =

**Evidências ✅** TanStack Query; bundle baseline por chunk com gate (max chunk 993 KB raw, total 13,7 MB raw); Cloudflare Images; lazy pages; unused indexes −23%.

**Gaps ❌ (pg_stat_statements hoje, acumulado)**
- `INSERT INTO supplier_products_raw` via PostgREST: **4,78M chamadas, média 1.308 ms, 6,25M s acumulados** — inalterado; é 90% do tempo total do banco.
- `fn_cron_safe_run` média 1.102 ms × 308k; 3 RPCs PostgREST com média 6,8–19,3 s; `fn_reposicao_backfill_today` 14,5 s; `fn_xbz_run_image_cycle` 50 s.
- Introspecção do PostgREST (`pks_fks`, `base_types`) 20k chamadas × ~600 ms = 6,5h acumuladas — `fn_pgrst_reload` disparando reload de schema com frequência alta.
- Auth server com 10 conexões; Lighthouse só `/auth`.

**Ações →10:** `EXPLAIN ANALYZE` do INSERT + mover a trigger chain bronze→silver para processamento em lote via pg_cron; reduzir frequência de `fn_pgrst_reload` (só após DDL); LHCI multi-URL.

---

### 15 · Qualidade de Código — **8.5/10** (Padrão ×1) =

**Evidências ✅** 889 testes core verdes; Gitleaks full-history SUCCESS; CodeQL SUCCESS; conventional commits; 1 `any` em prod; 20+ gates especializados; CodeRabbit + cubic + Copilot revisando PRs (visível no histórico de #1829).

**Gaps ❌** 14 `console.log` em src; eslint monolítico; `dangerouslySetInnerHTML` em 1 arquivo sem DOMPurify no mesmo ponto (1 uso de DOMPurify em src, em outro arquivo).

**Ações →10:** varredura console.log→logger; teste garantindo que o único `dangerouslySetInnerHTML` recebe conteúdo sanitizado.

---

### 16 · Segurança — **8.0/10** (Crítico ×3) =

**Evidências ✅ (ao vivo hoje)**
- CSP em produção: `script-src 'self' cdn.gpteng.co vercel.live + 2 hashes sha256` — **`data:` removido e confirmado no header**; `frame-ancestors 'none'`; HSTS preload; XFO DENY; nosniff; Referrer-Policy; Permissions-Policy.
- Gitleaks, CodeQL, secret scanning **habilitado**, Dependabot security updates habilitado; CrowdSec na VPS; `audit:credentials` gate; 24 buckets de rate limit ativos; fail-closed no login já no banco (`fn_check_login_allowed` com IP/cidade).

**Gaps ❌ (medidos hoje)**
- **`secret_scanning_push_protection: disabled`** — repo público; o Gitleaks pega depois do push, push protection bloqueia antes.
- **2 alertas Dependabot HIGH abertos** (`image-size` ≤2.0.2, CVE-2025-71329/71330, DoS por loop infinito, **sem versão corrigida**; transitiva em runtime) — precisa `overrides` ou substituição.
- **Drift edge ↔ repo:** `mcp-query` deployada em produção com `verify_jwt=false`, criada em 2026-08-24, **inexistente no repo** — função não versionada, não auditada, sem contract test. 37 funções `verify_jwt=false` deployadas vs 36 no `config.toml`.
- **0 rotações de segredo em 90 dias** (`secret_rotation_log`) — política de rotação existe no runbook, não é executada.
- 3 buckets públicos (`art-files`, `avatars`, `mockup-assets`) — `art-files` com artes de cliente.
- `style-src 'unsafe-inline'` permanece (T32 travado); 8 views SECURITY DEFINER em ERROR; pg_graphql aberto a anon.
- Migrations de segurança do #1829 (SEC-006–010) **aplicadas no banco mas não mergeadas** — o repo não reflete produção até o merge (risco de replay divergente).
- LGPD: `get_quote_token_public` redige PII (bom), mas não há procedimento de esquecimento documentado.

**Ações →10:** ligar push protection (1 clique/API); `overrides.image-size` ou remover a dependência que a puxa; `supabase functions download mcp-query` → commitar ou deletar; rodar 1 rotação (service_role/anon) e registrar; `art-files` → URLs assinadas; mergear #1829.

---

### 17 · Testes — **9.0/10** (Alto ×2) =

**Evidências ✅** 1.845 arquivos de teste; 889 core PASS em 21s (medido); **coverage thresholds globais existem** em `vitest.config.ts` (lines 60 / functions 60 / branches 50 / statements 60 — corrige a r2 que os declarou ausentes); E2E Playwright multi-projeto; fuzz (auth, uploads, frete, rupture), mutation (magazine), visual regression, a11y (axe), contract tests de 84 edges, RLS tests, smoke de produção 38/38 automatizado 2×/dia.

**Gaps ❌** Thresholds em 60% (não 70–80%) e sem separação por camada (`services/`, `logic/`); sem contract test consumer-driven do payload Bitrix24; `mcp-query` sem teste.

**Ações →10:** thresholds 75% em `src/services/**` e `src/logic/**`; contract test Bitrix24.

---

### 18 · Tipagem / Type Safety — **8.0/10** (Alto ×2) =

**Evidências ✅** strict; 0 erros tsc; types gerados (63k linhas) com guarda das tabelas críticas; Zod runtime; 1 `any` em prod.

**Gaps ❌** `noUnusedLocals/Parameters: false` (48.427 na baseline); `skipLibCheck: true`; `types.ts` ainda declara `get_quote_token_by_value` mas não `get_quote_token_public` (drift de tipos vs banco após #1829 — `regenerate-supabase-types.yml` precisa rodar após merge).

**Ações →10:** regenerar types após merge de #1829 (REGRA #4: contar `export type` antes/depois); campanha do ratchet.

---

### 19 · Validação — **8.0/10** (Alto ×2) =

**Evidências ✅** Zod dos dois lados (`_shared/contracts/`); `check:contract-coverage`; CNPJ com suíte própria; `secure-upload` valida tipo/tamanho; webhooks assinados; policies de telemetria anônima com checks de tamanho (`length(event_type) >= 1 …`); `password_reset_requests` com regex de e-mail na policy.

**Gaps ❌** Sanitização rich-text sem teste; mensagens Zod sem catálogo; INSERT anônimo em 6 tabelas de telemetria sem limite de volume no banco.

**Ações →10:** teste XSS nas descrições renderizadas; trigger `BEFORE INSERT` com contagem por IP/hora nas tabelas de telemetria.

---

### 20 · Operações (Processos) — **8.0/10** (Padrão ×1) ↑ de 7.5

**Evidências ✅** Ruleset ativo com PR obrigatório, **CODEOWNERS enforçado** (`require_code_owner_review: true`, `require_extra_approval_for_unattributed_changes: true`, `dismiss_stale_reviews_on_push: true`), required check strict, no-force-push, no-delete; Sentinel + Required Checks Guard; CONTRIBUTING; Dependabot; 3 revisores automáticos; Lovable Edit Tracker.

**Gaps ❌** `required_approving_review_count: 0` + bypass "always" para admin (aceitável solo, documentar); **301 issues abertas** sem milestone/label de dívida técnica visível; `delete_branch_on_merge: false` (branches `claude/*` acumulam); `allow_auto_merge: false`; STATUS.md stale.

**Ações →10:** `delete_branch_on_merge: true`; label `tech-debt` + milestone trimestral e triagem das 301 issues; release-please para CHANGELOG/versão.

---

## Fase 2 — Scorecard Consolidado

```
╔══════════════════════════════════╦═══════╦═══════════════════════════════════════════╗
║ DIMENSÃO                         ║ NOTA  ║ GAP PRINCIPAL PARA 10/10                  ║
╠══════════════════════════════════╬═══════╬═══════════════════════════════════════════╣
║ 1.  Arquitetura            (×2)  ║ 7.5   ║ 3 god files; grafo stale 27 dias          ║
║ 2.  Autenticação           (×3)  ║ 8.5   ║ MFA 1/13 usuários; #1829 sem CF secret    ║
║ 3.  Autorização            (×3)  ║ 8.0 ↑ ║ 8 views SECDEF em ERROR; graphql anon     ║
║ 4.  Banco de Dados         (×2)  ║ 8.5   ║ Crons corrigidos ainda não rodaram        ║
║ 5.  CI/CD                  (×1)  ║ 8.5 ↓ ║ 19 previews Vercel ERROR sem alerta       ║
║ 6.  Data Integrity         (×3)  ║ 8.0   ║ Optimistic locking parcial (1 coluna)     ║
║ 7.  Documentação           (×1)  ║ 7.5 ↓ ║ STATUS.md 3 meses; runbooks duplicados    ║
║ 8.  Infraestrutura/DevOps  (×1)  ║ 7.5   ║ Restore nunca demonstrado; stacks s/ git  ║
║ 9.  Logging / Monitoring   (×1)  ║ 9.0 ↑ ║ Sem alerta de threshold no Sentry         ║
║ 10. Observabilidade        (×1)  ║ 7.5   ║ Sem tracing cross-service; sem SLOs       ║
║ 11. Lógica de Negócio      (×1)  ║ 8.0   ║ Lógica presa em god hooks                 ║
║ 12. Manutenibilidade       (×1)  ║ 7.5   ║ 2 lockfiles; eslint 1.659 linhas          ║
║ 13. Operacionalidade       (×1)  ║ 8.0 ↑ ║ #1823 sem fechamento; sem incident doc    ║
║ 14. Performance            (×1)  ║ 7.5   ║ INSERT spr_raw 1,3s × 4,78M (inalterado)  ║
║ 15. Qualidade de Código    (×1)  ║ 8.5   ║ 14 console.log; eslint monolítico         ║
║ 16. Segurança              (×3)  ║ 8.0   ║ Push protection off; mcp-query fora repo  ║
║ 17. Testes                 (×2)  ║ 9.0   ║ Thresholds 60% sem separação por camada   ║
║ 18. Tipagem / Type Safety  (×2)  ║ 8.0   ║ types.ts desatualizado vs banco (#1829)   ║
║ 19. Validação              (×2)  ║ 8.0   ║ Telemetria anônima sem limite no banco    ║
║ 20. Operações (Processos)  (×1)  ║ 8.0 ↑ ║ 301 issues sem triagem; branches acumulam ║
╠══════════════════════════════════╬═══════╬═══════════════════════════════════════════╣
║ NOTA GERAL PONDERADA             ║ 8.1   ║ r1 7.8 → r2 8.0 → r3 8.1 (+0.1)           ║
╚══════════════════════════════════╩═══════╩═══════════════════════════════════════════╝
Críticos ×3: 8.1 · Altos ×2: 8.2 · Padrão ×1: 8.0
```

**O que a r2 prometeu e o que se confirmou em produção:**

| Quick win r2 | Estado hoje | Evidência |
|---|---|---|
| RLS nas 2 partições + causa raiz | ✅ confirmado | 393/393 tabelas com RLS |
| CSP sem `data:` em script-src | ✅ confirmado ao vivo | header de `www.promogifts.com.br` |
| Uptime externo | ✅ ativo | 5/5 runs SUCCESS, cron */15 |
| CODEOWNERS enforçado no ruleset | ✅ confirmado | `require_code_owner_review: true` (2026-09-03) |
| Cron 32 (smoke mensal) | ⏳ reescrito, execução real só em 2026-10-01 | `cron.job` command atualizado; última run ainda é a falha de 09-01 |
| Cron 297 (VACUUM) | ⏳ reescrito, execução real em 2026-09-06 | idem; 4 falhas históricas ainda visíveis |
| Unused indexes | 🟡 206 → 158 | pg_stat_user_indexes |
| PR #1823 (T32) | ❌ ainda aberto, sem fechamento | GitHub |
| INSERT spr_raw 1,3 s | ❌ inalterado | pg_stat_statements |

---

## Top 10 Ações por ROI (impacto ÷ esforço)

| # | Ação | Dim. | Impacto | Esforço | Tipo |
|---|---|---|---|---|---|
| 1 | **Mergear #1829 + configurar `CF_ORIGIN_SECRET`** (Supabase secret + Cloudflare Transform Rule) — o banco já está no estado do PR; o código não | Auth/Seg | Alto | Baixo | Merge+Config |
| 2 | **Ligar `secret_scanning_push_protection`** no repo público | Segurança | Alto | Baixo | Config (1 chamada API) |
| 3 | **Resolver `mcp-query`**: baixar a função deployada, revisar, commitar com contract test — ou deletar | Segurança | Alto | Baixo | Código |
| 4 | **REVOKE EXECUTE de anon/authenticated** em `check_login_rate_limit` e `fn_check_login_allowed` (a edge usa service_role) | Autorização | Alto | Baixo | Migration |
| 5 | **`overrides` para `image-size`** (2 HIGH sem patch upstream) ou trocar o pacote que a puxa | Segurança | Médio | Baixo | Config |
| 6 | **Investigar "Resource provisioning failed"** nos previews Vercel + alerta de preview falho | CI/CD | Médio | Baixo | Config |
| 7 | **Remover `bun.lock` e os 8 usos de `bun` nos workflows** | Manut/CI | Médio | Baixo | Chore |
| 8 | **Regenerar `types.ts` após #1829** (REGRA #4) e fechar #1823 com plano nonce/CSSOM | Tipagem/Oper | Médio | Baixo | Chore |
| 9 | **Teste de restore trimestral documentado** (pgbackrest → container efêmero) | Infra | Alto | Médio | Processo |
| 10 | **Perfilar INSERT `supplier_products_raw`** e mover trigger chain para lote | Performance | Alto | Médio | SQL |

## Roadmap em 3 Ondas

**🔴 Quick Wins (1–3 dias):** ações 1–8 — todas executáveis via MCP (GitHub FOREVER para ruleset/repo settings, Supabase MCP para REVOKE, Vercel MCP para redeploy).
**🟠 Sprint 1 (1–2 semanas):** ações 9–10 + lote 2 de unused indexes + MFA enforce AAL2 em `AdminRoute` + `COMMENT ON VIEW` nas 8 views SECDEF + LHCI multi-URL + STATUS.md/CHANGELOG/runbooks.
**🟡 Sprint 2 (2–4 semanas):** optimistic locking + RPC transacional de cotação; export das stacks Portainer para git; extração dos god files; SLOs + tracing; triagem das 301 issues.

---

## Erratas da r2 (2026-09-02)

1. **"Sem threshold global de coverage que falhe CI"** — incorreto: `vitest.config.ts:117-122` define lines/functions/statements 60% e branches 50%.
2. **"Crons 32/297 consertados — 38/38 PASS"** — o 38/38 refere-se à bateria de smoke (correta); os **crons agendados** ainda não executaram após o fix (próximas execuções 2026-09-06 e 2026-10-01). A validação foi via job temporário, não via agendamento real.
3. **"8 views SECURITY DEFINER (WARN)"** — o advisor as classifica como **ERROR**, não WARN.

## Nota Final — 8.1/10

Progresso real e verificável em produção desde a r2: RLS 100%, CSP endurecida ao vivo, uptime externo rodando, CODEOWNERS enforçado, dívida de índices −23%. O que segura o 9 mudou de natureza: já não são gaps estruturais, são **itens de fechamento** — um PR de segurança (#1829) cujas migrations já estão no banco mas cujo código e segredo Cloudflare não estão em produção, uma edge function deployada fora do repo, push protection desligada num repo público, dois crons corrigidos que ainda precisam provar-se no agendamento real, e o hot path de ingestão a 1,3 s/insert que ninguém tocou em três rounds. Nenhum exige reescrita; os 8 primeiros itens do Top 10 cabem em uma sessão.
