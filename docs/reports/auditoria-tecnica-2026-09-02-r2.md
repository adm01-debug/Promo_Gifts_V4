# 🔬 Auditoria Técnica Exaustiva — Promo Gifts V4 (Round 2)

> **Data:** 2026-09-02 · **HEAD auditado:** `042423e` (main = produção Vercel)
> **Nota geral ponderada:** **8.0 / 10** (r1 de 2026-09-01: 7.8)
> **Método:** 20 dimensões, pesos crítico ×3 / alto ×2 / padrão ×1
> **Fontes:** repo local, `pg_catalog` + advisors do projeto `doufsxqlfjyuvxuezpln` (MCP GESTÃO DE PRODUTOS), Portainer (VPS AtomicaBR), Vercel (team juca1), GitHub API, execução local de `tsc`, `ssot:all` e `test:ci-core`.
> **Antecessora:** `docs/reports/auditoria-tecnica-2026-09-02.html` (r1). Este round re-mede após os merges #1819–#1822 e corrige 4 erratas da r1 (ver §Erratas).

---

## Fase 0 — Inventário do Sistema

| Item | Valor | Fonte |
|---|---|---|
| Repositório | `adm01-debug/Promo_Gifts_V4` · branch `main` · **visibilidade pública** | GitHub API |
| Stack | React 19.2.8 · TS 5.4.5 (strict) · Vite 8 · Supabase PG 17.6 · Vercel | package.json |
| Arquivos versionados | 6.780 (~207k linhas TS/TSX) | `git ls-files` |
| Arquivos de teste | 1.914 (`*.test.*` + `*.spec.*`), sendo 456 specs E2E | `git ls-files` |
| Workflows CI | 108 (113.472 runs históricos) | `.github/workflows/` + Actions API |
| Edge Functions | 111 no repo (`supabase/functions/`); 36 com `verify_jwt = false` no config.toml | repo |
| Migrations SQL | 1.686 | `supabase/migrations/` |
| Banco (public) | 393 tabelas · 192 views · 4 matviews · 927 policies · 1.287 funções (535 SECURITY DEFINER) · 389 triggers · 397 FKs · 6.015 MB | pg_catalog |
| pg_cron | 137 jobs (135 ativos) · 2 com falha nos últimos 7 dias | cron.job / job_run_details |
| Deploy | Vercel prod = main auto (`042423e` READY) · domínios `www.promogifts.com.br` + apex 307→www · previews com SSO protection | Vercel MCP |
| VPS (auxiliar) | Portainer 2.39.5 · 93 stacks · 166 containers up (n8n, evolution, supabase self-hosted, rabbitmq, minio, obs-*, crowdsec, backups em 3 camadas, runner GH) | Portainer MCP |
| Grafo | 33.090 nós / 40.457 arestas — **stale** (build `4126d7a` de 2026-08-09 vs HEAD `042423e`) | graphify-out/GRAPH_REPORT.md |
| Último deploy prod | 2026-09-02 (mesmo SHA do HEAD de main) | Vercel MCP |

**Validações executadas nesta sessão (não herdadas):**
- `tsc -p tsconfig.app.json --noEmit` → **0 erros** (exit 0)
- `npm run ssot:all` → OK (452 arquivos .md varridos, hosts canônicos)
- `npm run test:ci-core` → **38 suítes / 889 testes PASS em 25s**
- CI de main no HEAD: **14/14 workflows recentes SUCCESS** (CI/CD Pipeline, SSOT Guard, Gitleaks full-history, Supabase Linter Gate, Branch Protection Sentinel, Deploy Edge Functions, etc.)

**Não auditável nesta sessão (declarado):** restore de backup (não executei um restore), suite E2E Playwright completa, medição Lighthouse ao vivo, pen test externo.

---

## Fase 1 — As 20 Dimensões

### 01 · Arquitetura — **7.5/10** (Alto ×2)

**Evidências ✅**
- Feature-based `src/` (components, services, hooks, logic, contexts, stores, routes, types) + camada de services (quoteService, productService…) + `src/logic/` isolado.
- Medallion Bronze→Silver→Gold no Supabase; frontend nunca toca o banco fora de PostgREST/RPC/edge.
- 7 ADRs datados de 2026-08-26 (`docs/ADR_*`).
- `check:chunk-cycles` roda no build (`package.json:47`).

**Gaps ❌**
- God files persistem: `QuoteBuilderSummaryColumn.tsx` (1.710 linhas), `PromoFlixPlayer.tsx` (1.512), `useQuoteBuilderState.ts` (1.345).
- Grafo de conhecimento stale (build `4126d7a`, ~3 semanas atrás) — auto-sync N8N de 15 min não está cobrindo este repo.
- Sem boundary explícito de domínio (barrel por módulo).

**Ações →10:** quebrar os 3 god files (≤400 linhas/arquivo); `graphify update . --force` na VPS + corrigir o auto-sync; barrel `index.ts` por domínio.

---

### 02 · Autenticação — **8.5/10** (Crítico ×3) ↑ de 8.0

**Evidências ✅**
- **T38 mergeado (#1820): bypass `X-Simulation-Bypass` removido** de visual-search e product-visual-search — o maior risco de auth da r1 eliminado.
- **F-12 mergeado (#1822): service-role client só instanciado após `authenticateRequest()`**.
- Supabase Auth + MFA AAL1/AAL2 (`useAuthMFA.ts`, `step-up-verify`), rate limit (`check-login`), audit (`log-login-attempt`), device detection, `auth-fuzz-weekly.yml`.

**Gaps ❌**
- MFA disponível mas não enforçado para roles admin/editor (AAL2 não exigido em middleware de rota).
- Password policy não documentada; sem revogação global de sessões.

**Ações →10:** exigir AAL2 em rotas admin; documentar password policy no SECURITY.md; endpoint de logout global.

---

### 03 · Autorização — **7.5/10** (Crítico ×3) ↓ de 8.0

**Evidências ✅**
- RLS em 391/393 tabelas (99,5%), 927 policies, verificadas por gates de CI (`check:secdef-anon`, `check:lint-0029`, `check:lint-0011`, Supabase Linter Gate).
- 397 FKs — **0 sem índice**; 535 SECURITY DEFINER — **0 sem `search_path` fixo** (pg_catalog, medido hoje).
- `admin_audit_log` existente e consumido com select explícito (T22, #1820).

**Gaps ❌ (novos, medidos hoje)**
- **ERROR (advisor): 2 partições sem RLS** — `supplier_products_raw_history_p2026_11` e `_p2026_12`. Root cause: partições `p2026_06`–`p2026_10` têm RLS; as 2 criadas pela rotina de manutenção (`fn_purge_spr_history` faz `CREATE TABLE`) **não recebem `ENABLE ROW LEVEL SECURITY`**. Acesso via tabela-mãe aplica RLS, mas acesso direto via PostgREST/pg_graphql às partições não.
- pg_graphql expõe 59 tabelas ao `anon` e 454 ao `authenticated` (advisors WARN) — REVOKE de 2026-05 cobriu 27 tabelas, superfície restante não re-auditada.
- 8 views SECURITY DEFINER (`v_products_public` etc. — design intencional do catálogo anon, mas sem `security_invoker` documentado caso a caso).
- 3 tabelas com RLS habilitado e zero policies (default-deny — ok, mas sem comentário de intenção).

**Ações →10:**
```sql
ALTER TABLE public.supplier_products_raw_history_p2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products_raw_history_p2026_12 ENABLE ROW LEVEL SECURITY;
-- + patch em fn_purge_spr_history: EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_new_partition);
```
Re-rodar o harden de pg_graphql sobre a lista atual dos advisors; comentar intenção das 8 views SECURITY DEFINER.

---

### 04 · Banco de Dados — **8.5/10** (Alto ×2) ↑ de 8.0

**Evidências ✅**
- 1.686 migrations versionadas; naming contract com gate (`check:migration-filename-contract`).
- FKs 100% indexadas; SECURITY DEFINER 100% com search_path; NUMERIC para dinheiro; particionamento mensal de `supplier_products_raw_history` com purge automatizado.
- `idle_session_timeout=600s`, `idle_in_transaction=60s`, `log_min_duration=2s` aplicados (STATUS.md + pg_settings).
- Backups: Supabase Cloud + camada própria na VPS (pgbackrest, daily/weekly/monthly).

**Gaps ❌ (medidos hoje)**
- **206 índices sem uso** (advisor performance) — apesar da limpeza de 67 em 2026-06, a dívida voltou a crescer; penaliza a ingestão (write amplification).
- **2 cron jobs quebrados:** `smoke_tests_monthly` (jobid 32 — `column "test_category" does not exist`, drift entre a função de smoke e a view consumida) e `vacuum-high-dead-tuples` (jobid 297 — `VACUUM cannot run inside a transaction block`; este job **nunca** executou com sucesso neste formato).
- Sem migrations de rollback (down); sem seed p/ dev.
- Tabelas de maior peso: `stock_snapshots` 1.574 MB, partições spr_history ~500–750 MB/mês — crescimento de ~600 MB/mês no plano.

**Ações →10:** dropar unused indexes em lote validado (script com `pg_stat_user_indexes.idx_scan=0` + idade >30d); consertar a query do smoke mensal; **remover** o job de VACUUM e configurar `autovacuum_vacuum_scale_factor` por tabela nas high-dead-tuples; seed mínimo em `supabase/seeds/`.

---

### 05 · CI/CD — **9.0/10** (Padrão ×1)

**Evidências ✅**
- 108 workflows, 113.472 runs; HEAD de main com 14/14 SUCCESS hoje.
- Gate 0 SSOT → Gates 1–6; required check único agregador **"Gate Final - Deploy Ready"** (strict) no ruleset — fan-in correto.
- Ratchets: `.tsc-baseline`, `.eslint-baseline`, `.any-type-baseline`, `ts-unused-ratchet.yml` (novo, #1819, baseline 48.427).
- Gitleaks full-history, CodeQL, CodeRabbit, Dependabot, deploy fallback GH Pages verificável (#1817).

**Gaps ❌**
- 108 workflows sem inventário ativo/obsoleto (superfície de manutenção).
- Lighthouse gate perf ≥75 e **medindo apenas `/auth`** (`.lighthouserc.json` → 1 URL).
- Sem versionamento semântico automatizado.

**Ações →10:** medir 3 URLs no LHCI (`/`, `/catalogo`, `/auth`) e subir perf p/ ≥85; job trimestral que lista workflows sem run em 90d; release-please.

---

### 06 · Data Integrity — **8.0/10** (Crítico ×3) ↑ de 7.5

**Evidências ✅ (corrige r1)**
- **Idempotência comprovada**: `product-webhook/idempotency_test.ts` + `contract_test.ts`; `webhook-inbound` com characterization test; `quote-followup-reminders` idempotente.
- Deduplicação por UNIQUE + upsert na ingestão bronze; NUMERIC em valores; TZ São Paulo enforçada em testes.
- `useDiscountApproval.transactional.test.tsx` — fluxo de aprovação transacional testado.

**Gaps ❌**
- **Optimistic locking ausente em quote/cart** (sem coluna `version`; race em edição concorrente) — gap da r1, sem mudança.
- Operações quote+items+personalizations no service layer sem transação única fim-a-fim (inserts sequenciais em `quoteService.createQuoteWithItems`).
- Política soft-delete vs hard-delete não documentada.

**Ações →10:** RPC transacional `fn_create_quote_with_items(jsonb)`; coluna `version int` + check no UPDATE de quotes/carts; documentar soft delete no CLAUDE.md.

---

### 07 · Documentação — **8.0/10** (Padrão ×1)

**Evidências ✅** README 38KB, CONTRIBUTING, CLAUDE.md operacional (regras 1–8), SECURITY.md, 7 ADRs, `SCHEMA_REFERENCE.md` com queries pg_catalog canônicas, DATA_DICTIONARY.md, 40+ docs de auditoria históricos.

**Gaps ❌**
- **STATUS.md congelado em 2026-06-02** — apresenta como "estado atual" fatos de 3 meses atrás.
- Sem OpenAPI das edge functions; sem diagrama ER; runbook de incidente/rollback disperso.

**Ações →10:** atualizar/aposentar STATUS.md (uma linha apontando para CHANGELOG); gerar OpenAPI a partir dos contratos Zod das 5 edges principais; `docs/runbook.md` único.

---

### 08 · Infraestrutura / DevOps — **7.5/10** (Padrão ×1) ↑ de 7.0

**Evidências ✅ (medidas hoje via Portainer — a r1 não enxergava a VPS)**
- 93 stacks / 166 containers up: backups em camadas (postgres daily/weekly/monthly, **pgbackrest** p/ supabase e evolution, minio-backup, volume-backup, portainer-state-backup), observabilidade (obs-prometheus, obs-grafana, obs-loki, cadvisor), segurança (crowdsec, evolution-security-guardian), watchdogs por serviço, docker-housekeeping, disk-monitor/actioner, runner GH self-hosted.
- Vercel: SSL/CDN gerenciados, previews protegidos por SSO (`all_except_custom_domains`), rollback nativo (`isRollbackCandidate` nos deploys de prod).
- DB não público; Cloudflare Images p/ mídia.

**Gaps ❌**
- Compose files das 93 stacks vivem no Portainer, **não em git** — IaC sem versionamento/PR.
- Sem staging (preview Vercel + prod DB único; sem branch de banco).
- DR: backups existem, **teste de restore não evidenciado**.

**Ações →10:** exportar os stack files p/ um repo `infra` (o Portainer MCP tem `portainer_get_stack_file` — automatizável); agendar teste de restore trimestral documentado; avaliar Supabase branch p/ staging de schema.

---

### 09 · Logging / Monitoring — **8.5/10** (Padrão ×1)

**Evidências ✅** Logger JSON `createClientLogger` c/ request_id propagado; Sentry lazy (`src/lib/sentry.ts`); CSP report-uri ativo em prod (verificado no header hoje); `check:client-structured-logging` e `check:toast-leaks` como gates; console strippado em prod; VPS com Loki/Grafana p/ infra.

**Gaps ❌** Uptime externo do site não evidenciado (obs-* monitora a VPS, não a Vercel); alertas por threshold (error rate, P99) não configurados; retenção de logs não documentada.

**Ações →10:** workflow N8N de uptime (ping `www.promogifts.com.br` + `health-check` edge a cada 5 min → alerta WhatsApp via Evolution — stack já existe); alerta Sentry error-rate >1%/5min.

---

### 10 · Observabilidade — **7.5/10** (Padrão ×1)

**Evidências ✅** Sentry `tracesSampleRate: 0.1` em prod (traces amostrados existem, `src/lib/sentry.ts:88`); telemetryService; navigationMetrics com sampling; ADRs de contratos de observabilidade; CSP reporting como canal.

**Gaps ❌** Sem tracing cross-service (frontend → edge → Bitrix24/N8N) — request_id propaga, mas não há spans; SLO/SLI não definidos; métricas RED por endpoint não instrumentadas.

**Ações →10:** subir `tracesSampleRate` p/ 0.2 + `browserTracingIntegration` com propagação p/ `*.supabase.co`; definir 3 SLOs (uptime ≥99,5%, P99 quote <2s, erro <1%); dashboard SQL de negócio (cotações/dia).

---

### 11 · Lógica de Negócio — **8.0/10** (Padrão ×1) ↑ de 7.5

**Evidências ✅** `QuoteStatus` tipado + `quote-status-schema.test.ts` + `quote-status-config.test.ts` (transições testadas — melhor que o que a r1 registrou); suítes dedicadas de frete (unit+integration+fuzz+load) e replenishment; NUMERIC; TZ-aware; Zod em regras.

**Gaps ❌** Lógica ainda embutida em god hooks (`useQuoteBuilderState` 1.345 linhas); state machine de cotação sem diagrama/documento único; glossário negócio↔código incompleto.

**Ações →10:** extrair cálculo de `useQuoteBuilderState` p/ `src/logic/quote/`; documentar a máquina de estados como diagrama no ADR.

---

### 12 · Manutenibilidade — **7.5/10** (Padrão ×1) ↑ de 7.0

**Evidências ✅** `tsc --noEmit` **0 erros** (validado hoje); ratchet novo de noUnusedLocals (#1819); baselines de eslint/any/tsc impedem regressão silenciosa; lint-staged + husky; `check:package-duplicate-scripts`.

**Gaps ❌** `noUnusedLocals/Parameters: false` (dívida de 48.427 apontamentos na baseline do ratchet); 106 ocorrências de `any` em src; eslint.config.js de 98KB monolítico; **dois lockfiles** (`bun.lock` + `package-lock.json`) com `lint:lockfile` mitigando mas não eliminando o risco de drift.

**Ações →10:** remover `bun.lock` se o pipeline é npm-only; sprint de redução de `any` (106→50); fatiar eslint.config.js por domínio.

---

### 13 · Operacionalidade — **7.5/10** (Padrão ×1) ↑ de 7.0

**Evidências ✅** Circuit breakers **mergeados** em 8 edge functions de HTTP externo (T17, com catches corretos 503+Retry-After e `probeInFlight` anti-race CB-4, #1822); kill switches `system_kill_switches` com `assertSwitchEnabled` (T19 estende a +6 funções no PR #1823); rollback Vercel 1-clique; deploy zero-downtime; feature gates parciais via `system_settings`/`useDevGate`.

**Gaps ❌** T19 ainda em draft (#1823) — 6 funções críticas sem kill switch em prod; sem playbook de incidente/post-mortem; graceful degradation sem doc (o que o site faz se o Supabase cair).

**Ações →10:** promover e mergear #1823; `docs/incident-response.md` com severidades; smoke de degradação (`simulate:bi-degradation` já existe — agendar).

---

### 14 · Performance — **7.5/10** (Padrão ×1)

**Evidências ✅ (corrige r1)** **TanStack Query em uso real** — 231 arquivos com useQuery/useMutation + QueryClientProvider em `App.tsx` (a r1 alegou ausência — errata); react-virtual; bundle baseline por chunk com gate; manualChunks; Cloudflare Images; lazy pages.

**Gaps ❌ (medidos hoje em pg_stat_statements)**
- **Hot path de ingestão:** `INSERT INTO supplier_products_raw` via PostgREST — 4,77M chamadas, **média 1.308 ms** (trigger chain bronze→silver pesada). É a maior carga do banco.
- RPCs com média 12–14s (`fn_reposicao_backfill_today` 14,4s; 3 RPCs PostgREST 6,8–13s); `fn_xbz_run_image_cycle` média 50s.
- 206 unused indexes penalizando writes.
- Lighthouse mede só `/auth`, gate perf ≥75.

**Ações →10:** `EXPLAIN ANALYZE` no INSERT de spr + mover processamento síncrono do trigger p/ fila (pg_cron batch); dropar unused indexes; LHCI multi-URL ≥85.

---

### 15 · Qualidade de Código — **8.5/10** (Padrão ×1) ↑ de 8.0

**Evidências ✅** tsc 0 erros; 889 testes core verdes em 25s; Gitleaks full-history SUCCESS hoje; ratchets em 4 eixos; conventional commits; 20+ gates especializados (`check:no-inline-cors`, `check:iframe-sandbox`, `check:edge-cors`, `check:aschild-nesting`…).

**Gaps ❌** 24 `console.log` em src (parte em testes; strippado em prod, mas fora do padrão logger); 106 `any`; eslint monolítico.

**Ações →10:** varredura única console.log→logger.debug; regra eslint `no-restricted-syntax` p/ `as any` sem justificativa.

---

### 16 · Segurança — **8.0/10** (Crítico ×3)

**Evidências ✅ (headers verificados ao vivo hoje em www.promogifts.com.br)**
- CSP enforce + report-uri/report-to; `script-src 'self' blob: data: cdn.gpteng.co vercel.live` — **sem `unsafe-inline`/`unsafe-eval` em script-src**; `frame-ancestors 'none'`; HSTS preload; XFO DENY; nosniff; Referrer-Policy; Permissions-Policy restritiva.
- T38 (bypass) e T34 (credential SSOT via `resolveCredential`, DB-first) mergeados; secrets-manager com rotation_history; step-up auth p/ ações sensíveis; webhook signature verification; `audit:credentials` gate com baseline.
- Gitleaks + CodeQL + auth-fuzz semanal; CrowdSec na VPS.

**Gaps ❌**
- **`script-src` permite `data:`** — vetor de XSS conhecido (bypassa a ausência de unsafe-inline); `blob:` idem em menor grau. Provável herança do Lovable (`cdn.gpteng.co`).
- `style-src 'unsafe-inline'` em prod — fix T32 pronto **mas parado no draft #1823**.
- Repo **público** com histórico completo — Gitleaks verde hoje, mas eleva o custo de qualquer deslize futuro.
- 3 buckets storage públicos: `art-files`, `avatars`, `mockup-assets` — `art-files` (artes de cliente) público merece revisão de conteúdo/URLs adivinháveis.
- 36 edge functions com `verify_jwt=false` (parte é webhook/público por design; sem matriz documentada função→motivo).
- LGPD: sem procedimento de esquecimento documentado.

**Ações →10:** mergear #1823; testar remoção de `data:` de script-src em preview (checar quebra do Lovable tagger); documentar matriz verify_jwt=false; revisar `art-files` (URLs assinadas); checklist LGPD.

---

### 17 · Testes — **9.0/10** (Alto ×2) ↑ de 8.5

**Evidências ✅** 1.914 arquivos de teste; **889 core tests verdes em 25s** (medido); E2E Playwright com 10 projects (3 browsers × public/authed + mobile + smoke); property-based (fast-check), fuzz (auth semanal, uploads, freight), mutation testing (magazine), visual regression com baseline própria, a11y (axe), contract tests de 84 edges (`check:edge-live-coverage` 84/84), RLS integration tests; flakiness report com runs=10.

**Gaps ❌** Sem threshold global de coverage que falhe CI (thresholds pontuais existem, ex. supplier-comparison 85–90%); contract tests consumer-driven p/ Bitrix24/N8N ausentes.

**Ações →10:** `coverage.thresholds` 70% em `src/services/` e `src/logic/`; contract test do payload Bitrix24.

---

### 18 · Tipagem / Type Safety — **8.0/10** (Alto ×2)

**Evidências ✅** strict completo; **0 erros tsc no app hoje**; types gerados do Supabase (63k linhas) com guarda de tabelas críticas (REGRA #4); Zod runtime em 63+ arquivos; `as any` eliminado de auth.ts (#1819).

**Gaps ❌** `noUnusedLocals/Parameters: false` (ratchet criado, dívida 48.427); `skipLibCheck: true`; 106 `any`; sem geração automática de tipos compartilhados front↔edge a partir dos contratos Zod.

**Ações →10:** campanha de redução do ratchet (meta: −20%/mês); avaliar `zod-to-ts` no `_shared/contracts/`.

---

### 19 · Validação — **8.0/10** (Alto ×2) ↑ de 7.5

**Evidências ✅** Zod dos dois lados com `_shared/contracts/` + `zod-validate.ts`; gate `check:contract-coverage`; CNPJ com suíte própria (schema+render+e2e); `secure-upload` valida tipo/tamanho; webhooks assinados; fuzz de uploads.

**Gaps ❌** DOMPurify usado em apenas 1 arquivo de src — campos rich-text/markdown de produto sem sanitização evidente na renderização (react-markdown mitiga por default, mas sem teste garantindo); mensagens de erro Zod sem padronização i18n.

**Ações →10:** teste de sanitização XSS nos campos de descrição renderizados; catálogo de mensagens de erro por tipo.

---

### 20 · Operações (Processos) — **7.5/10** (Padrão ×1)

**Evidências ✅** Ruleset "Protect main" ativo (PR obrigatório, required check strict "Gate Final - Deploy Ready", no-force-push, no-delete); Branch Protection Sentinel + Required Checks Guard como workflows-vigia; CONTRIBUTING com git flow; Dependabot; CodeRabbit; Lovable Edit Tracker monitorando o bot.

**Gaps ❌ (medidos hoje no ruleset)**
- `required_approving_review_count: 0` e **`require_code_owner_review: false`** — o CODEOWNERS (defesa anti-Lovable documentada como "exige aprovação manual") **não é enforçado pelo ruleset**; um PR do bot tocando `client.ts` pode mergear sem review humano se os checks passarem. Bypass "always" para admin (aceitável solo, mas soma com o ponto acima).
- STATUS.md desatualizado; backlog técnico disperso (sem label/milestone único).

**Ações →10:** ligar `require_code_owner_review: true` no ruleset (mantém count 0 — não trava o fluxo solo, trava o bot em arquivo crítico); label `tech-debt` + milestone trimestral.

---

## Fase 2 — Scorecard Consolidado

```
╔══════════════════════════════════╦═══════╦═══════════════════════════════════════════╗
║ DIMENSÃO                         ║ NOTA  ║ GAP PRINCIPAL PARA 10/10                  ║
╠══════════════════════════════════╬═══════╬═══════════════════════════════════════════╣
║ 1.  Arquitetura            (×2)  ║ 7.5   ║ 3 god files 1.3–1.7k linhas; grafo stale  ║
║ 2.  Autenticação           (×3)  ║ 8.5 ↑ ║ MFA não enforçado p/ admin (AAL2)         ║
║ 3.  Autorização            (×3)  ║ 7.5 ↓ ║ 2 partições sem RLS (ERROR advisor)       ║
║ 4.  Banco de Dados         (×2)  ║ 8.5 ↑ ║ 206 unused indexes; 2 crons quebrados     ║
║ 5.  CI/CD                  (×1)  ║ 9.0   ║ Lighthouse só /auth; 108 wf sem inventário║
║ 6.  Data Integrity         (×3)  ║ 8.0 ↑ ║ Sem optimistic locking em quote/cart      ║
║ 7.  Documentação           (×1)  ║ 8.0   ║ STATUS.md 3 meses desatualizado           ║
║ 8.  Infraestrutura/DevOps  (×1)  ║ 7.5 ↑ ║ Stacks Portainer fora do git; sem restore ║
║ 9.  Logging / Monitoring   (×1)  ║ 8.5   ║ Sem uptime externo do site                ║
║ 10. Observabilidade        (×1)  ║ 7.5   ║ Sem tracing cross-service; sem SLOs       ║
║ 11. Lógica de Negócio      (×1)  ║ 8.0 ↑ ║ Lógica presa em god hooks                 ║
║ 12. Manutenibilidade       (×1)  ║ 7.5 ↑ ║ noUnusedLocals off (dívida 48.427)        ║
║ 13. Operacionalidade       (×1)  ║ 7.5 ↑ ║ T19 kill switches parados no draft #1823  ║
║ 14. Performance            (×1)  ║ 7.5   ║ INSERT spr_raw média 1,3s × 4,77M calls   ║
║ 15. Qualidade de Código    (×1)  ║ 8.5 ↑ ║ 24 console.log; 106 any                   ║
║ 16. Segurança              (×3)  ║ 8.0   ║ CSP script-src com data:; T32 no draft    ║
║ 17. Testes                 (×2)  ║ 9.0 ↑ ║ Sem coverage threshold global no CI       ║
║ 18. Tipagem / Type Safety  (×2)  ║ 8.0   ║ skipLibCheck; ratchet 48.427              ║
║ 19. Validação              (×2)  ║ 8.0 ↑ ║ Sanitização rich-text sem teste           ║
║ 20. Operações (Processos)  (×1)  ║ 7.5   ║ CODEOWNERS não enforçado no ruleset       ║
╠══════════════════════════════════╬═══════╬═══════════════════════════════════════════╣
║ NOTA GERAL PONDERADA             ║ 8.0   ║ r1: 7.8 → r2: 8.0 (+0.2)                  ║
╚══════════════════════════════════╩═══════╩═══════════════════════════════════════════╝
Críticos ×3: 8.0 · Altos ×2: 8.2 · Padrão ×1: 7.9
```

---

## Top 10 Ações por ROI (impacto ÷ esforço)

| # | Ação | Dim. | Impacto | Esforço | Tipo |
|---|---|---|---|---|---|
| 1 | **RLS nas partições p2026_11/12 + patch na função criadora** (SQL de 3 linhas + 1 EXECUTE na fn) | Autorização | Alto | Baixo | Migration |
| 2 | **Promover e mergear PR #1823** (T32 CSP style-src, T19 kill switches ×6, T22 P0, T17 catches) — pronto, deploy preview verde | Segurança/Oper. | Alto | Baixo | Merge |
| 3 | **Consertar 2 crons quebrados** — corrigir coluna do `smoke_tests_monthly`; remover `vacuum-high-dead-tuples` e configurar autovacuum por tabela | BD | Alto | Baixo | SQL |
| 4 | **`require_code_owner_review: true` no ruleset** — enforce real do CODEOWNERS contra o Lovable | Operações | Alto | Baixo | Config |
| 5 | **Dropar os 206 unused indexes** (lote validado por idx_scan=0 e idade) — alivia o hot path de ingestão | BD/Perf | Alto | Médio | Migration |
| 6 | **Perfilar INSERT `supplier_products_raw`** (EXPLAIN + mover trigger síncrono p/ processamento batch) | Performance | Alto | Médio | SQL/Código |
| 7 | **MFA enforce (AAL2) p/ roles admin/editor** em middleware de rota | Autenticação | Alto | Médio | Código |
| 8 | **Optimistic locking** (`version int`) em quotes/carts + RPC transacional de criação | Data Integrity | Alto | Médio | Migration+Código |
| 9 | **Uptime externo** via N8N (ping site+health-check → alerta WhatsApp) | Logging | Médio | Baixo | Workflow |
| 10 | **Remover `data:` de `script-src`** no CSP (testar em preview — dependência Lovable) | Segurança | Médio | Médio | Config |

## Roadmap em 3 Ondas

**🔴 Quick Wins (1–3 dias):** ações 1, 2, 3, 4, 9 — todas executáveis via MCP nesta sessão/semana.
**🟠 Sprint 1 (1–2 semanas):** ações 5, 6, 7, 10 + LHCI multi-URL ≥85 + STATUS.md/grafo refresh.
**🟡 Sprint 2 (2–4 semanas):** ação 8 + extração dos god files + export das stacks Portainer p/ git + coverage thresholds + docs/incident-response.md.

---

## Erratas da r1 (2026-09-01)

1. **"Sem React Query/cache de API"** — incorreto: `@tanstack/react-query` em uso em 231 arquivos, provider em `App.tsx`.
2. **"Idempotência de webhooks não evidenciada"** — incorreto: `product-webhook` tem `idempotency_test.ts` e contract test.
3. **"Sem audit_log centralizado"** — `admin_audit_log` existe e é consumido no admin.
4. **"React 18"** no inventário — o projeto está em React 19.2.8.

## Adendo — Execução dos Quick Wins (2026-09-02/03)

Aplicado em produção via MCP, cada item simulado antes (transação com ROLLBACK) e validado depois:

1. **RLS das partições + causa raiz** — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` em `p2026_11`/`p2026_12` e patch no JOB 3 de `fn_purge_spr_history` (toda partição futura nasce com RLS). Validado: `relrowsecurity=true` nas duas; `fn_purge_spr_history()` executa limpa (retorno 0).
2. **Cron 32 (smoke mensal)** — `fn_run_and_persist_smoke_tests` alinhada à assinatura atual de `fn_run_smoke_tests()` (`TABLE(test_name, result)`; drift desde a simplificação da função). Validado: execução real insere em `smoke_test_runs`.
3. **Cron 297 (VACUUM)** — comando reescrito como statement único `VACUUM ANALYZE t1,t2,t3,t4` (multi-statement roda em transação no pg_cron e VACUUM é proibido; o job nunca havia executado). Validado empiricamente com job temporário: 2 runs `succeeded`.
4. **Smokes 31/33/38 desatualizados vs hardening** — esperavam GRANTs que o T38 (`20260514000001`) e os REVOKEs de 2026-06-23/26 removeram de propósito; verificado que zero policies de SELECT avaliáveis por anon usam as 4 fns SECURITY DEFINER e que `fn_pgrst_reload` roda via pg_cron (1.704 runs/30d, 0 falhas) sem precisar de grant. Testes atualizados para o estado endurecido. **Resultado: 38/38 PASS** — a suíte de smoke de produção voltou a ser confiável (e o teste 05 `rls_coverage` volta a vigiar exatamente o tipo de gap do item 1).
5. **CSP `script-src`** — removido `data:` (vetor de XSS) do `vercel.json`, mantendo `blob:` (workers); asserções de regressão adicionadas em `tests/security/security-headers.test.ts`.
6. **Uptime Monitor** — `.github/workflows/uptime-monitor.yml` (a cada 15 min: site + edge `health-check` com anon key lida do `client.ts`; falha abre/comenta issue com label `uptime`).

**Veredito PR #1823 (T32 — `style-src` sem `unsafe-inline`): NÃO mergear como está.** Três injetores de `<style>` em runtime quebrariam em produção: `src/utils/proposalPdfReactGenerator.ts:115-117` (`textContent` — PDFs de proposta renderizariam imagens quebradas no html2canvas), `goober` (motor CSS do react-hot-toast) e `sonner` — ambos fazem `createElement("style")`. Caminho para o T32 real: nonce via edge middleware ou migração dos injetores para CSSOM (`sheet.insertRule`), tratado como item próprio de Sprint.

## Nota Final — 8.0/10

Sistema **acima da média de mercado** para operação 1-dev, com progresso real e verificável desde a r1 (bypass de auth removido, credential SSOT, circuit breakers, ratchet de dead code, tsc zerado). Os bloqueadores do 9 são poucos e cirúrgicos: os **2 ERROR de RLS em partições** (fix de minutos, com correção de causa raiz na função de manutenção), o **PR #1823 parado em draft** segurando CSP e kill switches fora de produção, e o **hot path de ingestão a 1,3s/insert**. Nenhum exige reescrita — todos são hardening pontual sobre uma base sólida.
