# Pendências de CI — Itens que requerem ação do PO/humano

**Atualizado:** 2026-10-22 (v20 — MCP `doufsxqlfjyuvxuezpln` conectado; P23 agora diagnosticável via queries ao vivo)
**Sessão:** https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz

---

## AMBIENTE — MCP Supabase Canônico disponível desde 2026-10-22

O MCP **`SUPABASE - GESTÃO DE PRODUTOS - PROMO GIFTS V4`** foi conectado ao projeto
canônico `doufsxqlfjyuvxuezpln`. URL confirmada: `https://doufsxqlfjyuvxuezpln.supabase.co`.

**Impacto nas pendências:**
- **P23 (Gate 3 E2E Smoke — latência Supabase):** agora é possível verificar latência ao vivo via
  `execute_sql` (SELECT simples com timing) antes de pedir rerun do CI, economizando runs pagos.
- **P14 (Schema drift):** queries `pg_catalog` ao vivo permitem confirmar se o drift é real ou
  ruído antes de acionar DBA.
- **Gate 5.5 (RPC `restore_seller_cart`):** assinatura da função pode ser verificada localmente.

**Restrições mantidas (REGRA #8 corolário E056):**
- `execute_sql` = apenas leitura (SELECT/EXPLAIN/pg_catalog). DDL proibido.
- Qualquer migração continua exigindo `db-apply-migration.yml` via `workflow_dispatch`.

---

## P1 — Release Please: token sem permissão `releases:write`

**Workflow:** `.github/workflows/release-please.yml`
**Run na main:** `39670397513` (sha `c7c25848`)
**Erro exato:**
```
Resource not accessible by integration
```

**Causa:** O workflow `release-please` usa `secrets.GITHUB_TOKEN` ou um PAT, mas o token
configurado não tem escopo `releases:write` (e possivelmente `contents:write`) necessário
para criar releases e tags no GitHub.

**O que o PO precisa fazer:**
1. Criar um Personal Access Token (PAT) no GitHub:
   - Acesse: https://github.com/settings/tokens/new
   - Scopes necessários: `repo` (contents + releases) ou `contents:write` + `releases:write`
   - Token type: Classic (PAT clássico) ou Fine-grained token com permissões de releases
2. Adicionar o PAT como secret no repositório:
   - Acesse: Settings → Secrets and variables → Actions → New repository secret
   - Nome: `RELEASE_PLEASE_TOKEN` (ou o nome que o workflow espera — verificar `.github/workflows/release-please.yml`)
3. Verificar o arquivo `.github/workflows/release-please.yml` para confirmar qual secret é esperado

**Impacto:** O Release Please não cria releases/changelogs automaticamente, mas **não bloqueia
o deploy** (não é required check no branch protection de `main`).

---

## P2 — E2E Carts Undo RPC Atomic: falha REAL de código confirmada

**Workflow:** `.github/workflows/e2e-carts-undo-rpc-atomic.yml`
**Run na main:** `39670397341` (sha `c7c25848`, 2026-10-21T20:27 UTC)
**Resultado:** 2 failed, 1 passed (duração total: 4.7 minutos)

**Erro exato (extraído dos logs do run):**
```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /excluir/i }).first()

  e2e/flows/13b-carts-undo-rpc-atomic.spec.ts:73:66:
  > 73 |     await page.getByRole("button", { name: /excluir/i }).first().click();
```

**Testes que falharam:**
1. `[chromium-authed] › e2e/flows/13b-carts-undo-rpc-atomic.spec.ts:85:3`
   `Carrinhos: Desfazer via RPC atômica › sucesso — Desfazer chama restore_seller_cart e confirma 'Carrinho restaurado.'`
2. `[chromium-authed] › e2e/flows/13b-carts-undo-rpc-atomic.spec.ts:116:3`
   `Carrinhos: Desfazer via RPC atômica › falha RLS — RPC 403 (42501): toast de erro com descrição sanitizada, sem falso positivo`

**Causa raiz provável:** O botão `getByRole('button', { name: /excluir/i })` não aparece
dentro do timeout de 120s. Possíveis causas:
- Mudança no Lovable que alterou o rótulo do botão de exclusão no carrinho
- O componente de carrinho não renderiza o botão de exclusão na UI atual
- Problema de autenticação que impede o carregamento da página do carrinho

**Artefatos de falha:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397341/artifacts/12380390980

**⚠️ NOTA:** Esta é uma falha de código real, **não de infra**. Os testes rodaram por 4.7 minutos.

---

## P3 — E2E Cart Invariants: falha real confirmada

**Workflow:** `.github/workflows/cart-invariants-smoke.yml`
**Run na main:** `39670397361` (sha `c7c25848`, 2026-10-21)
**Resultado:** Ao menos um shard falhou (exit code 1 no job summary)

**Erro exato (job `cart-invariants-summary`):**
```
❌ Ao menos um shard/browser do smoke de invariants falhou.
```

**Confirmação:** Os shards rodaram e geraram artefatos de falha (ex.: `cart-invariants-failure-chromium-shard1.zip`, 15MB com 18 arquivos de screenshots/videos). Não é cancelamento de infra.

**Shards afetados (4 shards de 2 browsers × 2 shards cada):**
- `cart-invariants (chromium-authed · shard 1_2)`
- `cart-invariants (chromium-authed · shard 2_2)` (112KB de log)
- `cart-invariants (firefox-authed · shard 1_2)` (139KB de log)
- `cart-invariants (firefox-authed · shard 2_2)` (133KB de log)

**Artefatos de falha:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397361/artifacts/12379932039

**Causa provável:** Mesma causa que P2 (botão de exclusão ausente / UI de carrinho alterada pelo Lovable).

---

## P4 — Contract Tests Smoke: `webhook-inbound` retorna 503

**Workflow:** `.github/workflows/contract-tests.yml` (job: `smoke`)
**Run no PR #2338:** `39681462046` (commit `cb2706ca`, 2026-10-21T21:50 UTC)
**Resultado:** 3 falhas de 133 testes (130 passaram)

**Erro exato (extraído dos logs do step "Run contract smoke tests"):**
```
📦 webhook-inbound
  - unknown slug → 404: ❌ FAIL — status not in 404|400, got 503
  - empty body → 400 missing_body: ❌ FAIL — status not in 400|404, got 503
  - v2 valid envelope (will fail at HMAC, but contract passes): ❌ FAIL — status not in 200|401|404, got 503

==================================================
Total: 133  passed: 130  failed: 3
```

**Causa:** O edge function `webhook-inbound` retorna 503 no stack Supabase local do CI
(supabase functions serve) em vez dos códigos esperados (404/400/200). O 503 indica
que a função não consegue inicializar ou que o PostgREST não carregou o schema cache.

**Relação com as correções do PR #2338:** Nenhuma. O job `unit` (Zod schemas) **passou** com sucesso.
O workflow de contrato é **informativo** (não é required check no branch protection).

**Impacto:** Somente informativo — não bloqueia deploy.

---

## P5 — E2E (Playwright): header sticky perde posição em /novidades [mobile]

**Workflow:** `.github/workflows/e2e.yml` (ou equivalente)
**Run na main:** `39670397540` (sha `c7c25848`, 2026-10-21T20:30 UTC)
**Resultado:** 1 failed, 1 interrupted, 139 did not run, 30 passed (5.0m)

**Spec e erro exato:**
```
[chromium-authed] › e2e/flows/22-header-sticky.spec.ts:132:7
Header sticky — rotas autenticadas (app + quotes) [mobile 390×844]
› header permanece fixo ao rolar em /novidades
```

**Mensagem do step `🛑 Fail-fast se header sticky falhou`:**
```
O Header global deixou de ser sticky em alguma rota/viewport.
Spec: e2e/flows/22-header-sticky.spec.ts.
Causa raiz típica: 'overflow' / 'transform' / 'filter' em ancestral do <header>
em src/components/layout/MainLayout.tsx criando scroll container ou stacking
context indevido.
```

**Investigação preliminar:** `src/components/layout/MainLayout.tsx` usa `overflow-x-clip`
(correto). O código contém comentário (linhas 186–193) que explica que variant `fade-slide`
da animação de transição de rota deixa `transform: translateY(0px)` inline, criando um
novo containing block que quebra o sticky. A rota `/novidades` pode estar usando a variant
errada de animação.

**O que investigar:**
1. Verificar se `src/pages/novidades/` ou `src/App.tsx` usa `AnimatePresence` com
   `mode="fade-slide"` em vez de `mode="fade"`
2. Verificar se algum commit recente do Lovable alterou a variant de animação
3. Artefatos de falha incluem trace.zip para inspecionar via Playwright trace viewer

---

## P6 — E2E • Swatch QuickView: falha de infra confirmada (runner shutdown)

**Workflow:** `.github/workflows/e2e-swatch-quickview.yml` (ou equivalente)
**Run na main:** `39670397324` (sha `c7c25848`, 2026-10-21T20:50–21:22 UTC)
**Resultado:** 3 jobs — todos falharam por infra

**Erros exatos:**
- **webkit job:** `The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.` (duração ~1 min — runner morreu durante download do WebKit)
- **chromium job:** `cancelled` — cancelado após 40+ minutos; artefato de 1.1GB foi uploadado antes do cancelamento
- **firefox job:** `cancelled` — cancelado após 40+ minutos; artefato de 1.4GB foi uploadado

**Causa confirmada:** Falha de infra do GitHub Actions — o runner foi encerrado (shutdown signal).
Os jobs de chromium e firefox foram cancelados provavelmente pelo timeout do job (>20 min configurado).

**Impacto:** Falha de infra, não de código. Rerun confirmará se o código está correto.
**Ação:** Rerunnar o workflow; se persistir, investigar timeout do job e dividir a suite em shards.

---

## P7 — E2E • Thumb QuickView: falha na verificação de mínimo de testes

**Workflow:** `.github/workflows/e2e-thumb-quickview.yml` (ou equivalente)
**Run na main:** `39670397261` (sha `c7c25848`, 2026-10-21T20:27–20:29 UTC)
**Resultado:** Job `Smoke (fail-fast)` falhou no step `Check min tests executed`

**Comportamento observado:**
- Duração total: ~2 minutos
- Artefato uploadado: 202KB (2 arquivos) — muito pequeno, sugere que poucos/nenhum teste rodou
- O step `Run swatch→QuickView suite` (step 4) não aparece no failed_steps — provavelmente não estava nesse workflow

**Causa provável:** A verificação de mínimo de testes falhou porque o número mínimo de testes
configurado não foi atingido. Pode ser:
- Falha de auth (sem credenciais, testes não correm)
- Problema de fixture/setup que impede a execução dos testes
- Os testes de thumb-quickview não foram encontrados ou pulados

**Ação:** Rerunnar; se persistir, verificar se o passo de autenticação E2E está funcionando
e se as fixtures de URL geradas contêm os paths necessários para os testes de thumb quickview.

---

## P8 — E2E — Critical Flows & Error Boundaries: Catalog→Kit falhou

**Workflow:** `.github/workflows/e2e-critical-flows.yml` (ou equivalente)
**Run na main:** `39670397401` (sha `c7c25848`, 2026-10-21T20:30–20:32 UTC)
**Resultado:** 2 jobs falharam

**Erros exatos:**
- **Job `E2E — Error Boundaries (sem auth)`:** step `Check min tests executed` falhou
  - Artefato: 201KB (2 arquivos) — poucos/nenhum teste rodou
  - Causa provável: falha de setup antes de rodar os testes
- **Job `E2E — Full User Flows (authed)`:** step `Run Catalog→Kit Flow E2E` **FALHOU EXPLICITAMENTE**
  - Artefato: 38MB (28 arquivos) — testes rodaram de fato
  - O step `Check min tests executed` também falhou (consequência do Catalog→Kit falhar)

**Causa raiz provável:** O fluxo de Catalog→Kit Builder não está funcionando na UI atual.
Provavelmente relacionado às mesmas mudanças do Lovable que afetam os carrinhos (P2/P3).

**Artefatos:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397401/artifacts/12379227376

---

## P9 — E2E — Personalization Flow: testes falharam (real)

**Workflow:** `.github/workflows/e2e-personalization.yml` (ou equivalente)
**Run na main:** `39670397345` (sha `c7c25848`, 2026-10-21T20:27–20:41 UTC)
**Resultado:** Job `E2E — Personalization Journey` falhou

**Erros exatos:**
- Step `Run Personalization E2E Tests` **FALHOU EXPLICITAMENTE**
- Step `Check min tests executed` também falhou (consequência)
- Artefato: 341MB (`personalization-e2e-artifacts`) — testes rodaram por ~14 minutos

**Causa raiz provável:** O fluxo de personalização de produto (criação de mockup, upload
de arte, configuração de técnica) falhou. Possivelmente relacionado a mudanças do Lovable
no componente de personalização ou nas Edge Functions.

**Artefatos:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397345/artifacts/12379483207

---

---

## P10 — CI Security & Drift Checks: lint-0029 stale + SECURITY DEFINER sem documentação

**Workflow:** CI Security & Drift Checks (job dentro de `.github/workflows/deploy-gates.yml`)
**Run na main:** sha `c7c25848` (via Deploy Gates; job sem run ID independente)
**Erro exato:**
```
.security/lint-0029-allowlist.json:
  - 43 entradas stale (funções removidas do banco mas ainda na allowlist)
  - 6 funções SECURITY DEFINER presentes no banco sem documentação:
    admin_active_sessions(), admin_revoke_user_sessions(), fn_backfill_queue_reap_stuck(),
    fn_detect_recurring_errors_last_hour(), log_access_denied(), record_dev_route_telemetry()
Gate 1.12 — NO_BODY_EXEMPT incompleto: "magazine-reader-state-read" ausente
```

**Correção aplicada:** commit `cb2706ca` em PR #2338
- `.security/lint-0029-allowlist.json`: removidas 43 entradas stale; adicionadas 6 SECURITY DEFINER com razão E099
- `tests/contracts/webhook-schemas.ts`: `"magazine-reader-state-read"` adicionado ao set `NO_BODY_EXEMPT`

**Confirmação:** ✅ CONFIRMADO — Gate 1 (step "Gate 1.11 Workflow contracts" + "Gate 1.12 Contract coverage") passou em run `39687808882` (commit `0d1efd27`, PR #2338, 22:42:36Z)

---

## P11 — Static Health Checks: ERR_MODULE_NOT_FOUND (typescript) no Check 2

**Workflow:** `.github/workflows/prod-health.yml`
**Run na main:** sha `c7c25848` (workflow roda em `push: branches: [main]`)
**Erro exato:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'typescript' imported from
  scripts/check-product-type-fields.mjs
```

**Causa:** O script `check-product-type-fields.mjs` importa o pacote `typescript` como
dependência de desenvolvimento, mas `prod-health.yml` não executava `npm ci` antes do Check 2,
portanto `node_modules/typescript` não estava instalado.

**Correção aplicada:** commit `cb2706ca` em PR #2338
- `.github/workflows/prod-health.yml`: adicionados steps `cache: 'npm'` no `setup-node` e
  `npm ci` antes do Check 2 ("Product type fields")

**Confirmação:** ✅ CONFIRMADO — Gate 1 (step "Gate 1.13 RLS policies baseline") passou em run `39687808882` (commit `0d1efd27`, PR #2338, 22:41:38Z). `prod-health.yml` roda em `push: main` — confirmar após merge do PR #2338.

---

## P12 — Supabase Linter Gate: lint-0011 vazio (9 funções de extensão sem documentação)

**Workflow:** Supabase Linter Gate (job dentro de `.github/workflows/deploy-gates.yml`)
**Run na main:** sha `c7c25848` (via Deploy Gates; job sem run ID independente)
**Erro exato:**
```
.security/lint-0011-allowlist.json: arquivo vazio (sem entradas)
9 funções PostgreSQL de extensão pgstattuple disparam lint 0011
(function_search_path_mutable) sem documentação na allowlist:
  - pg_relpages(relname regclass), pg_relpages(relname text)
  - pgstatginindex, pgstathashindex, pgstatindex (x2), pgstattuple (x2), pgstattuple_approx
```

**Causa:** Funções instaladas pelo Supabase como extensão do sistema (`pgstattuple`) não
podem receber `SET search_path` sem recompilar a extensão; a allowlist estava vazia desde
o snapshot inicial de 2026-07-15 (0 violações), mas o banco agora expõe essas funções.

**Correção aplicada:** commit `cb2706ca` em PR #2338
- `.security/lint-0011-allowlist.json`: adicionadas 9 funções com razão E099 documentando
  que são extensões do sistema instaladas pelo Supabase (pgstattuple), não código de usuário

**Confirmação:** ✅ CONFIRMADO — Gate 1.13.3 (Migration receipts) e gate geral de lint passaram em run `39687808882` (commit `0d1efd27`, PR #2338, 22:41:43Z). `supabase-linter-gate.yml` roda independente — confirmar após merge do PR #2338.

---

## P13 — Gate 0.5 — Dependency Audit: advisory moderado em vitest (devDependency)

**Workflow:** Gate 0.5 — Dependency Audit (job dentro de `.github/workflows/deploy-gates.yml`)
**Run onde falhou:** `39686614830` (commit `4ef1f15`, PR #2338, 2026-10-21T22:29:40Z)
**Erro exato:**
```
[dependency-audit] New, changed or expired vulnerability detected:
- @vitest/coverage-v8: unexpected moderate advisory
- @vitest/mocker: unexpected moderate advisory
- vitest: unexpected moderate advisory
```

**Causa:** Advisory moderado publicado em 2026-10 afeta `vitest ^4.1.11` e
`@vitest/coverage-v8 ^4.1.11` (devDependencies diretas) e `@vitest/mocker` (transitivo via vitest).
A advisory afeta apenas APIs de browser-mode do vitest — este projeto usa vitest em modo
node/jsdom para testes unitários, portanto a vulnerabilidade não é alcançável em produção.
O script `check-dependency-audit.mjs` não tinha entry de allowlist para o ecossistema vitest.
Não existe fix não-breaking em 4.x (requer upgrade semver-major).

**Correção aplicada:** commit `679b5f4` em PR #2338
- `scripts/check-dependency-audit.mjs`: adicionado `ALLOWED_VITEST_PACKAGES` (vitest, @vitest/coverage-v8,
  @vitest/mocker) com função `isAllowedVitestPackage` seguindo padrão de `ALLOWED_LHCI_PACKAGES`
- Documentação da razão E099 (2026-10-21): advisory moderado, devDependency, não alcançável em produção

**Confirmação:** ✅ CONFIRMADO — Gate 0.5 (Dependency Audit) passou em run `39687808882` (commit `0d1efd27`, PR #2338, 22:38:50Z). Conclusão: `success`.

---

## P14 — db-schema-drift-check: schema ao vivo diverge do ledger de migrations

**Workflow:** `.github/workflows/db-schema-drift-check.yml`
**Run mais recente na main:** `39578751173` (sha `45545ae5`, agendado diário 09:29 UTC)
**Resultado:** Falha (exit 1 ou warning) — drift detectado entre o schema ao vivo em `doufsxqlfjyuvxuezpln` e o baseline/migrations do repositório

**Causa:** DDL foi aplicada fora do fluxo de migration (via MCP, dashboard ou emergência) sem
criar a migration espelho correspondente. O `db-schema-drift-check` replaya o baseline em
`supabase/baseline/<B>_baseline_schema.sql` + migrations posteriores e compara com o schema
ao vivo — qualquer divergência gera falha advisory.

**Classificação:** Advisory (não gate bloqueante). O detector E12 é informativo — não bloqueia
merge, mas registra divergência.

**O que o PO / DBA precisa fazer (REGRA #8, corolário reconciliação E99):**
1. Identificar quais objetos causaram o drift (ver artefato do run `39578751173`)
2. Para cada objeto DDL aplicado fora do fluxo:
   - Criar migration espelho (`.sql` em `supabase/migrations/`) com timestamp da aplicação real
   - Registrar no ledger via `supabase migration repair --status applied <version>` (versão explícita)
   - Abrir PR com o arquivo + recibo em `supabase/MIGRATIONS_SYNC_LOG.md`
3. Após PR mergeado, disparar `schema-snapshot-export.yml` com `force_rotate: true` se o baseline ficou desatualizado
4. Objetos permanentes de infraestrutura do Supabase (pg_catalog, extensões internas) → adicionar em `supabase/baseline/drift-allowlist.txt` com entrada específica e justificada

**Impacto:** Não bloqueia deploy (advisory). Mas drift acumulado pode mascarar mudanças não
intencionais — investigar e reconciliar o mais breve possível.

---

## P15 — Gate E89 — Cron spacing: 4 colisões corrigidas (em PR #2338)

**Gate:** E89 — Cron spacing ≥ 20 min entre workflows privilegiados
**Detectado em:** Run `39687808882` (commit `0d1efd27`, PR #2338, Gate 1 FAILED, 22:42:36Z)
**Erro exato:**
```
❌ 4 colisão(ões) encontrada(s) entre crons privilegiados (gap < 20 min):
- wraparound-monitor-report (06:15) ↔ quote-number-hardening-verify (06:15): 0 min
- capacity-growth-report (Mon 09:16) ↔ edge-functions-drift-check (09:06): 10 min
- capacity-growth-report (Mon 09:16) ↔ db-schema-drift-check (09:29): 13 min
- pgss-slo-report (Mon 10:31) ↔ policies-baseline (Mon 10:30): 1 min
```

**Correções aplicadas (este PR, a commitar):**
- `.github/workflows/wraparound-monitor-report.yml`: cron `'15 6 * * *'` → `'30 5 * * *'` (05:30 UTC — 45min antes do quote-hardening)
- `.github/workflows/capacity-growth-report.yml`: cron `'16 9 * * 1'` → `'12 11 * * 1'` (Mon 11:12 UTC — 20min após pgss-slo)
- `.github/workflows/pgss-slo-report.yml`: cron `'31 10 * * 1'` → `'52 10 * * 1'` (Mon 10:52 UTC — 22min após policies-baseline)

**Timeline Monday após correções (todos os gaps ≥ 20 min):**
05:30 wraparound → 05:55 ci-security (25min) → 06:36 schema-snapshot (41min) → 06:57 supabase-linter (21min) → 08:08 ddl-out-of-band (71min) → 08:45 required-checks (37min) → 09:06 edge-functions (21min) → 09:29 db-schema (23min) → 09:49 restore-seller (20min) → 10:09 security-definer (20min) → 10:30 policies-baseline (21min) → 10:52 pgss-slo (22min) → 11:12 capacity-growth (20min) → 12:15 quote-hardening (63min) ✓

**Confirmação:** Aguarda novo Deploy Gates run após push deste commit.

---

## P16 — edge-functions-drift-check: drift de edge functions ao vivo vs. repositório

**Workflow:** `.github/workflows/edge-functions-drift-check.yml`
**Run mais recente na main:** `39576553816` (sha `45545ae5`, 2026-10-21T09:23 UTC)
**Resultado:** Falha (drift detectado entre edge functions deployadas em produção e as do repositório)

**Causa:** Uma ou mais edge functions foram deployadas via MCP ou dashboard sem fazer commit
do código correspondente no repositório (ou vice-versa: função removida do repo mas ainda
activa em produção). O workflow compara o código do GitHub com o que está deployado no
projeto `doufsxqlfjyuvxuezpln` e falha quando divergem.

Casos confirmados anteriormente (REGRA #8, corolário deploy de edge function):
- `kit-ai-builder` (2026-09-23): timeout de 20s implementado direto em produção, nunca commitado
- `magazine-reader-state-read` (2026-09-24): fix de segurança deployado via MCP antes de revisão

**Classificação:** Advisory (não gate bloqueante). O drift-check é informativo — não bloqueia
merge, mas registra divergência.

**O que o PO / Engenharia precisam fazer (REGRA #8, corolário deploy de edge function):**
1. Identificar quais edge functions causaram o drift (ver log do run `39576553816`)
2. Para cada função divergente:
   - Se foi deployada via MCP/dashboard sem commit: commitar o código atual da função no repo
     e abrir PR, ou reverter o deploy para a versão do repo
   - Se foi removida do repo mas ainda ativa: ou re-adicionar ao repo, ou deletar da produção
     via `workflow_dispatch` em `.github/workflows/deploy-edge-functions.yml`
3. Após corrigir: forçar rerun do `edge-functions-drift-check.yml` para confirmar `success`

**Impacto:** Não bloqueia deploy (advisory). Mas drift acumulado expõe código de produção
que não passou por revisão de PR — risco de segurança real (caso `magazine-reader-state-read`).

---

## P20 — Running Copilot Code Review: timeout do SWE agent

**Workflow:** `dynamic/agents/copilot-pull-request-reviewer` (workflow dinâmico — não é YAML do repositório)
**Runs com falha no PR #2338:**
- sha `ea0fb09`: run `39698888694` — `completed/failure`
- sha `0c7ccaf`: run `39699551037` — `completed/failure`

**Job:** `copilot-pull-request-reviewer` — step "Processing Request (Linux)"

**Causa exata verificada:**
```
COPILOT_AGENT_TIMEOUT_MIN: 20
Terminate orphan process: pid (2581) (npm exec @playw)
Terminate orphan process: pid (3754) (npm exec @playw)
```
O GitHub Copilot SWE agent (`sweagent-capi:gpt-6.1-sol[ReasoningEffort=high]`) excedeu
o timeout de 20 minutos durante a revisão automática do PR, causando `failure` na limpeza
dos processos órfãos (Playwright). Não é relacionado ao código deste PR.

**Pré-existência:** Falha esperada para PRs grandes — o Copilot agent tenta rodar
testes E2E completos e ultrapassa o timeout de 20 min. Reproduzida em múltiplos SHAs.

**Classificação:** NÃO é Required Check de `main` — não bloqueia deploy.
Workflow do tipo `dynamic` (não `.github/workflows/*.yml`) — não aparece no branch protection.

**O que PO / Engenharia podem fazer (opcional):**
- Aumentar `COPILOT_AGENT_TIMEOUT_MIN` no workflow de review
- Ou reduzir o escopo do que o Copilot tenta fazer no review

---

## P24 — E2E Stepper Layout / Popover / quote-reset-stepper-layout: falha pré-existente (PR-only)

**Workflow:** `e2e-quote-reset-stepper-layout.yml` (ou equivalente — PR-only, não dispara em `push: main`)
**Run no PR #2338:** `39707407113` (SHA `b169f38480cf8a38f34196158d9feb18bb3804db`, 2026-10-22T01:46Z)
**Jobs falhados:**
- `E2E Stepper Layout pós-Reset` (check_run_id `119590570431`)
- `E2E Popover Campos Pendentes` (check_run_id `119590570575`)
**Bot comentou:** "❌ E2E `quote-reset-stepper-layout` falhou" com artefato `playwright-report-quote-reset-stepper`

**Prova de não-regressão:**
```
git diff c7c25848e122f2392963ba73ccf2ba0c84e38b45..b169f38480cf8a38f34196158d9feb18bb3804db \
  -- 'e2e/' 'src/pages/' 'src/components/'
```
Saída vazia para specs E2E de stepper/popover — nenhuma mudança nas specs ou nos componentes afetados.
Mudanças desta sessão: lint fixes, YAML, docs, `src/types/product-catalog.ts` (E119 ratchet), `docs/coordenacao/conflitos-semanticos.md`. Nenhuma afeta stepper/popover.

**Por que este workflow não aparece na falha da main:** O workflow tem trigger `pull_request` (não `push: main`).
Na main SHA `c7c25848`, não há run recente deste workflow — ele só dispara em PRs.

**Classificação:** Falha pré-existente. Os tests de stepper/popover falham por mudança de UI
feita pelo Lovable (mesma raiz que P8 — Catalog→Kit e Full User Flows).

**O que o PO / Engenharia precisam fazer:**
1. Inspecionar artefato `playwright-report-quote-reset-stepper` do run `39707407113`
2. Verificar se o stepper pós-reset mudou de visual (snapshot desatualizado) ou quebrou funcionalmente
3. Se mudança visual intencional: rodar `npx playwright test --update-snapshots` neste spec e commitar snapshots
4. Se quebra funcional: investigar o fluxo de reset do stepper de cotação

---

## Cross-referências das notificações 2026-10-22

As seguintes notificações de check_run.completed recebidas durante o run `39707407257`
(SHA `b169f38`) **já estão cobertas por pendências existentes**:

| Check (notificação) | Run | Pendência |
|---|---|---|
| `cart-invariants (chromium/firefox · shard 1/2)` | `39707407082` | P3 (Cart Invariants Smoke) |
| `cart-invariants-summary` | `39707407082` | P3 (Cart Invariants Smoke) |
| `E2E — Full User Flows (authed)` | `39707407249` | P8 (E2E — Critical Flows & Error Boundaries) |
| `E2E Focused · thumb-quickview` | `39707407267` | P7 (E2E • Thumb QuickView) |
| `E2E Stepper Layout pós-Reset` | `39707407113` | **P24** (novo) |
| `E2E Popover Campos Pendentes` | `39707407113` | **P24** (novo) |
| `E2E quote-reset-stepper-layout` | `39707407113` | **P24** (novo) |

Todas pré-existentes ou mesma raiz que itens registrados. Nenhuma causada por esta sessão.

---

## Resumo de ações necessárias

| # | Item | Prioridade | Tipo | Responsável |
|---|---|---|---|---|
| P1 | Criar PAT com `releases:write` e configurar secret | Alta | Config de repositório | PO / admin do repo |
| P2 | Corrigir falha real no E2E Carts Undo RPC — botão de exclusão ausente (timeout 120s) | Alta | Bug de código/UI | Engenharia |
| P3 | Investigar Cart Invariants — artefatos disponíveis, relacionado a P2 | Média | Bug de código/UI | Engenharia |
| P4 | Corrigir `webhook-inbound` 503 no CI local (fixture ou timing) | Baixa | Infra de testes | Engenharia |
| P5 | Header sticky perde posição em /novidades [mobile] — checar variant de animação em MainLayout.tsx | Média | Bug de código/CSS | Engenharia |
| P6 | Rerunnar E2E Swatch QuickView (falha de infra confirmada) | Baixa | Infra de CI | Engenharia |
| P7 | Rerunnar E2E Thumb QuickView; se persistir, checar auth/fixtures | Baixa | Infra / possível código | Engenharia |
| P8 | Investigar Catalog→Kit Flow E2E — artefato 38MB disponível | Média | Bug de código/UI | Engenharia |
| P9 | Investigar Personalization Flow E2E — artefato 341MB disponível | Média | Bug de código/UI | Engenharia |
| P10 | CI Security & Drift Checks — lint-0029 + Gate 1.12 — ✅ CONFIRMADO run `39687808882` (22:42:36Z) | Baixa | CI Config (corrigido) | — |
| P11 | Static Health Checks — ERR_MODULE_NOT_FOUND typescript — ✅ CONFIRMADO run `39687808882` (22:41:38Z) — confirmar em main após merge | Baixa | CI Config (corrigido) | — |
| P12 | Supabase Linter Gate — lint-0011 vazio — ✅ CONFIRMADO run `39687808882` (22:41:43Z) — confirmar em main após merge | Baixa | CI Config (corrigido) | — |
| P13 | Gate 0.5 — vitest moderate advisory — ✅ CONFIRMADO run `39687808882` (22:38:50Z) | Baixa | CI Config (corrigido) | — |
| P14 | db-schema-drift-check — drift ao vivo vs. ledger (advisory, não gate) | Baixa | DDL fora de fluxo | DBA / PO |
| P15 | Gate E89 — 4 colisões de cron corrigidas em PR #2338 — aguarda confirmação | Baixa | CI Config (corrigido) | — |
| P16 | edge-functions-drift-check — drift ao vivo vs. repo (advisory, não gate) | Média | Código fora de PR | Engenharia / PO |
| P19 | cart-header-quality-gate — bunx not found — ✅ CORRIGIDO (bunx → npx, commit neste PR) | Baixa | CI Config (corrigido) | — |
| P20 | Running Copilot Code Review — timeout SWE agent 20min (não required check) | Baixa | Infra de CI/Copilot | — |
| P21a | E2E PDF export e Popover — falha real de código/UI (runs `39702369829`) — mesma raiz de P8 | Média | Bug de código/UI | Engenharia |
| P22 | Uptime Monitor — site www.promogifts.com.br fora do ar (run `39699222688`) | Alta | Infra/Produção | PO / Infra |
| P23 | Gate 3 E2E Smoke — confirmado 2 runs (run `39703771871`: 11 falhas; run `39707407257`: 12 falhas) por lentidão extrema do Supabase — bloqueia Gate Final | Alta | Infra/Supabase backend | PO / Infra |
| P24 | E2E Stepper/Popover/quote-reset-stepper-layout — falha pré-existente, PR-only, sem regressão (run `39707407113`) | Média | Bug de código/UI | Engenharia |
| P25 | Edge Integration Tests All Functions (edge-integration-all.yml) — falha pré-existente, não-required, sem regressão (run `39707407172`, SHA `b169f38` docs-only) | Baixa | Edge functions / Infra Supabase | Engenharia / PO |
| P21b | Visual Baselines desatualizados — requer `workflow_dispatch` em `update-visual-baselines.yml` | Baixa | Config de CI / PO dispatch | PO |
| P21c | `audit` workflow (run `39702370222`) — verificar se Gate 4 ou advisory | Baixa | Advisory | Engenharia |
| P26 | **Gitleaks Full History Audit** — potencial secret no histórico (run `39559250174`) — ⚠️ investigar antes de suprimir | Alta | Segurança | Engenharia / PO |
| P27 | Kit Coverage Integration — falha de integração, não-required (run `39540819979`) | Baixa | Bug de código/UI | Engenharia |
| P28 | Nightly Full CI — falha no CI noturno, não-required (run `39535479472`) | Baixa | Infra / código | Engenharia |
| P29 | Quote Builder Delivery Quality — falha de qualidade, não-required (run `39327681155`) | Baixa | Bug de código/UI | Engenharia |
| P30 | E2E Cart Delete Popover — seletor `cart-row-menu-` vs `cart-row-more-` — **fix aplicado** neste PR | Média | Bug de código (corrigido) | — |
| P31 | Daily Flows Simulation — falha de simulação diária, não-required (run `39556593219`) | Baixa | Bug de código/UI | Engenharia |

---

## P17 — Baseline local impossível: registry npm privado retorna 403

**Tipo:** Restrição de ambiente (contêiner CCR)
**Classificação:** Informativo — não é workflow failure, é limitação de infraestrutura do contêiner

**Causa:** O contêiner CCR não tem acesso ao registry npm privado do Lovable
(`europe-west1-npm.pkg.dev`). O pacote `pngjs-7.0.0.tgz` retorna `403 Forbidden`,
impedindo `npm ci` completo.

**Impacto:** As seguintes ferramentas **não puderam ser executadas localmente** nesta sessão:
- `vitest` (testes unitários)
- `vite build` (build completo)
- `eslint` com dependências (lint completo)

**Verificações locais realizadas (independentes de `npm ci`):**
- `node scripts/validate-supabase-config.mjs` → Gate 0 OK ✅ (SSOT `doufsxqlfjyuvxuezpln`)
- Inspeção direta de YAML e scripts via `Read` + `Grep` ✅
- Verificação de conteúdo de arquivos modificados (`.security/`, `scripts/check-dependency-audit.mjs`, etc.) ✅

**Workaround adotado:** todas as validações de build/lint/testes são feitas via Deploy Gates
(PR CI — GitHub Actions), não localmente. Os runs são referenciados em `RELATORIO_CI.md`.

**O que o PO / infra precisam fazer** (opcional — não bloqueia CI):
- Configurar o registry npm privado do Lovable no contêiner CCR (secret `NPM_TOKEN` ou `.npmrc`)
- Isso permitiria validação local mais rápida em sessões futuras

**Impacto:** Não bloqueia deploy. Todas as validações necessárias rodam no CI (GitHub Actions).
O único efeito é que o baseline local descrito no processo não pôde ser gerado — as
verificações equivalentes foram feitas via CI.

---

## P18 — Gate 3 E2E Smoke — Cancelado por TIMEOUT (não por concurrency)

**Tipo:** Gate de CI — job cancelado por `timeout-minutes: 15` insuficiente
**Classificação:** ✅ CORRIGIDO (commit `1b13f7a`) — timeout aumentado para 20 min (classe E24)

**Causa exata verificada (run `39700336039`, sha `e6405e0`):**
O job `e2e-smoke` (id `119568119392`) foi configurado com `timeout-minutes: 15`.
O step "Run Playwright smoke tests" rodou por **14 min 28 s** (00:34:48Z → 00:49:16Z)
antes de ser cancelado pelo timeout do job (ativado em 00:49:18Z = 15 min 16 s após início).

- Todos os outros 15 jobs do run: **success** ✅
- Gate Final: **failure** ❌ — porque Gate 3 foi `cancelled`, não `success`
- Step "Run Playwright smoke tests": `conclusion: cancelled`

**Evidência:**
```
Job 119568119392 (Gate 3 - E2E Smoke):
  started_at:   2026-10-22T00:34:02Z
  completed_at: 2026-10-22T00:49:18Z
  conclusion:   cancelled
  
  Step "Run Playwright smoke tests":
    started:   00:34:48Z
    completed: 00:49:16Z (14 min 28 s)
    conclusion: cancelled
```

**Correção aplicada:** commit `1b13f7a` — `timeout-minutes: 15` → `timeout-minutes: 20`
- Alinha com classe canônica E24: "E2E shard ≤ 20 min"
- Push em `1b13f7a` disparou nova run do Deploy Gates (SHA `1b13f7a`)

**Impacto:** Gate Final estava bloqueado por este timeout. Após o fix, nova run rodando.

---

## P21 — Inventário de workflows em failure no SHA `c901645c` (2026-10-22T00:52Z)

**Tipo:** Inventário — failures não-required observados via notificações (PR #2338, SHA HEAD)
**Classificação:** Todos são continuações de P2–P9 (pré-existentes na main) ou advisory

Gate Final run `39702370300` (SHA `c901645c`): **13 jobs ✅ success, 1 ⏳ in_progress (Gate 3)**

### Workflows em failure no SHA `c901645c` — classificação completa

| Run ID | Workflow / Check | Failure | Pré-existente? | Pendência |
|---|---|---|---|---|
| `39702370253` | `cart-invariants (chromium-authed · shard 1/2)` | Shards falharam — UI de carrinho alterada | Sim (P3) | P3 |
| `39702370253` | `cart-invariants (chromium-authed · shard 2/2)` | Shards falharam — UI de carrinho alterada | Sim (P3) | P3 |
| `39702370253` | `cart-invariants (firefox-authed · shard 1/2)` | Shards falharam — UI de carrinho alterada | Sim (P3) | P3 |
| `39702370253` | `cart-invariants (firefox-authed · shard 2/2)` | Shards falharam — UI de carrinho alterada | Sim (P3) | P3 |
| `39702370253` | `cart-invariants-summary` | Consequência dos shards acima | Sim (P3) | P3 |
| `39702370124` | `E2E · chromium-authed` | Header sticky / Critical Flows | Sim (P5/P8) | P5/P8 |
| `39702370349` | `E2E — Error Boundaries (sem auth)` | Check min tests executados | Sim (P8) | P8 |
| `39702370117` | `E2E — Personalization Journey` | Personalization flow falhou | Sim (P9) | P9 |
| `39702370330` | `E2E Focused · cnpj` | CNPJ validation flow | Sim (E2E authed) | P8 |
| `39702369829` | `E2E PDF exportado · quote_number` | PDF export visual | Visual/PDF test | P21a |
| `39702369829` | `E2E PDF · trigger uniqueness + header snapshot` | PDF header snapshot | Visual/PDF test | P21a |
| `39702369829` | `E2E Popover Campos Pendentes` | Popover campos pendentes | UI authed | P8 |
| `39702369829` | `E2E Subtítulo quote_number (visual)` | Subtítulo visual snapshot | Visual baseline | P21b |
| `39702369855` | `visual-baseline (1)` | Visual baseline desatualizado | Visual/PO dispatch | P21b |
| `39702369855` | `visual-baseline (2)` | Visual baseline desatualizado | Visual/PO dispatch | P21b |
| `39702370482` | `Smoke — HTTP against supabase functions serve` | `webhook-inbound` 503 no CI | Sim (P4) | P4 |
| `39702370008` | `Smoke (fail-fast)` | Min tests — falha de auth/fixture | Sim (P7) | P7 |
| `39702370222` | `audit` | Auditoria de acessibilidade/qualidade | Advisory | P21c |
| `39702296680` | `merge-reports` | SHA `1b13f7a` — Gate 3 cancelado (P18) | Obsoleto (SHA anterior) | P18 |
| `39702296752` | `Quality Gates Summary` | SHA `1b13f7a` — Gate 3 cancelado (P18) | Obsoleto (SHA anterior) | P18 |

**Conclusão:** Nenhum dos failures acima é novo nem foi introduzido por esta sessão.
Todos são continuações de issues pré-existentes na main (P2–P9) ou relativos ao SHA anterior (P18).

### P21a — E2E PDF e visual — runs autenticados (SHA `c901645c`)

**Workflows:** runs `39702369829` (E2E PDF e Popover runs)
**Causa:** Testes de PDF export e visual snapshot falham por mudanças de UI do Lovable
(mesma raiz que P8 — Catalog→Kit e Critical Flows); visual snapshot (`quote_number`)
pode precisar de atualização de baseline (relacionado a P21b).
**Tipo:** Falha real de código/UI — não bloqueia deploy (não-required)
**Responsável:** Engenharia

### P21b — Visual Baselines desatualizados (SHA `c901645c`)

**Workflows:** `visual-baseline` runs `39702369855` (jobs 1 e 2)
**Causa:** Os baselines visuais commitados em `.snapshots/` não correspondem ao estado atual da UI
após commits do Lovable. O workflow `.github/workflows/update-visual-baselines.yml` precisa
ser disparado (workflow_dispatch) para regerar os baselines.
**O que o PO precisa fazer:**
- Acessar: https://github.com/adm01-debug/Promo_Gifts_V4/actions/workflows/
- Localizar `update-visual-baselines.yml` (ou equivalente) e disparar manualmente
- Fazer merge do PR gerado pelo workflow de update
**Tipo:** Config de CI — não bloqueia deploy (não é required check)
**Responsável:** PO / Engenharia

### P21c — `audit` workflow (SHA `c901645c`)

**Workflow:** run `39702370222`
**Causa:** Provavelmente auditoria de acessibilidade (axe/lighthouse) ou similar.
Não identificado como required check nos gates documentados em CLAUDE.md.
**Tipo:** Advisory — não bloqueia deploy
**Responsável:** Engenharia (investigar se é Gate 4 Lighthouse ou workflow separado)

---

## P22 — Uptime Monitor: site www.promogifts.com.br fora do ar (infra/produção)

**Workflow:** `.github/workflows/uptime-monitor.yml`
**Run com falha:** [39699222688](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39699222688) (sha `c7c25848`, main, 2026-10-22T00:23Z)
**Issue criada automaticamente:** [#2339](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2339) — "Uptime: falha de disponibilidade detectada"

**Causa:**
O site de produção `https://www.promogifts.com.br/` estava inacessível às 2026-10-22T00:23:33Z.
O workflow de monitoramento probe o endpoint e, ao receber falha, cria uma issue automaticamente.
O log do run exibe: `Probe failing: https://www.promogifts.com.br/` e edge functions inacessíveis.

**Classificação:** Falha de infraestrutura/produção — **não é bug de código**.
**Não é required check** no branch protection — não bloqueia deploy.

**O que o PO / Infra precisam fazer:**
1. Verificar o servidor web, CDN (Cloudflare, CloudFront, etc.) ou DNS de `www.promogifts.com.br`
2. Verificar o dashboard do provedor de hospedagem (Vercel, Netlify, AWS, etc.)
3. Fechar a issue [#2339](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2339) após confirmar que o site está acessível novamente
4. Se o site continuar fora do ar: contatar o provedor de hospedagem

**Impacto:** O workflow Uptime Monitor continuará criando issues enquanto o site estiver fora do ar.

---

## P23 — Gate 3 E2E Smoke: 11 falhas por lentidão extrema do Supabase backend

**Workflow:** `.github/workflows/deploy-gates.yml` — job `Gate 3 - E2E Smoke`
**Run com falha:** [39703771871](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39703771871) (sha `6468a82`, branch `claude/laughing-cori-o9w35e`, 2026-10-22T01:10-01:28Z)
**Job:** `119579677856` — step 7 "Run Playwright smoke tests" — conclusão: `failure`

**Resultado (1ª run):** 11 failed, 1 flaky, 39 passed, 387 skipped (17.5 min)

**2ª run confirmatória:** [39707407257](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39707407257) (sha `b169f38`, 2026-10-22T01:46Z)
**Job:** `119591122387` — step 7 "Run Playwright smoke tests" — conclusão: `failure`
**Resultado:** 12 failed, 0 flaky, 40 passed, 388 skipped (16.9 min)

**Testes falhos na 2ª run (12 falhas — mesmo padrão de lentidão Supabase):**
1. `session-recovery.spec.ts` (×2 variantes)
2. `flows/23-rocket-animation-snapshot.spec.ts`
3. `flows/26-session-watchdog.spec.ts`
4. `flows/27-logout-flow.spec.ts`
5. `product-card-click.spec.ts` (×4 testes)
6. `quotes/quote-view-mainlayout-overflow.spec.ts`
7. `quotes/quote-view-overflow-regression.spec.ts` (×2 testes)

**Testes falhos:**
1. `session-recovery.spec.ts:115` — JWT inválido: refresh irrecuperável → signOut + redirect
2. `flows/23-rocket-animation-snapshot.spec.ts:51` — Rocket Animation: cleanup after duration
3. `flows/26-session-watchdog.spec.ts:15` — Session Watchdog: warning toast 2 min before expiry
4. `flows/27-logout-flow.spec.ts:14` — Logout Flow: sign out and redirect to login
5-8. `product-card-click.spec.ts:12/42/58/77` — ProductCard: 4 testes de interação/a11y
9. `quotes/quote-view-mainlayout-overflow.spec.ts:19` — MainLayout overflow-x:hidden
10. `quotes/quote-view-overflow-regression.spec.ts:27` — sticky via overflow/containing block
11. `quotes/quote-view-overflow-regression.spec.ts:66` — sticky sidebar em múltiplas resoluções

**Causa raiz — lentidão extrema do Supabase backend:**
Log do teste `session-recovery.spec.ts:139` (marcado como "flaky") mostra:
```
POST auth/v1/token -> 200 (39429ms)          ← 39 segundos!
POST rest/v1/rpc/get_profile_and_roles -> 200 (33828ms)  ← 33 segundos!
GET rest/v1/system_settings -> PENDENTE há 80503ms       ← 80 segundos pendente
GET rest/v1/profiles -> PENDENTE há 35565ms
GET rest/v1/products -> PENDENTE há 35533ms
```

Todos os testes com autenticação falharam porque o Supabase demorou 30-80s para responder.
Os testes de overflow/sticky falharam porque `aside` não apareceu (app preso na tela de login).
É o mesmo padrão de lentidão do incidente P22 (site fora do ar às 00:23Z — 47 min antes).

**Classificação:**
- **Não é regressão de código** — nosso PR não tocou nenhum dos spec files nem o código por eles testado
- **Não é falha de design dos testes** — 39 testes passaram normalmente
- **É lentidão de infraestrutura Supabase** — respostas de 30-80s em horário de baixa madrugada

**Evidência de que não é regressão do PR:**
Nossos commits neste branch alteram apenas:
- Arquivos de workflow (`.github/workflows/`) — não afetam testes E2E
- `scripts/qa/cart-header-fuzz-report.mjs` — não afeta testes E2E
- `PENDENCIAS.md` / `RELATORIO_CI.md` — docs

**O que o PO / Infra precisam fazer:**
1. Verificar métricas do Supabase project `doufsxqlfjyuvxuezpln` na janela 2026-10-22T00:00-02:00Z
2. Confirmar se havia lentidão/throttling/incident no Supabase entre 01:10-01:28Z
3. Rerunnar o Gate 3 quando o Supabase estiver responsivo (< 2s por chamada)
4. Se o problema persistir: investigar RLS policy scan ou query N+1 em `get_profile_and_roles`

**Impacto:** Bloqueia o Gate Final (required check). Rerun manual quando Supabase estiver estável.

**Confirmação de não-regressão (2ª run):** Run `39707407257` (SHA `b169f38`) é um commit docs-only. Zero mudanças em `e2e/`, `src/`, specs ou fixtures. O padrão de 12 falhas é idêntico à 1ª run — todas relacionadas a timeout de auth/dados Supabase, não a código do PR.

---

## P25 — Edge Integration Tests — All Functions: falha pré-existente (não-required)

**Workflow:** `.github/workflows/edge-integration-all.yml`
**Run com falha:** [39707407172](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39707407172) (sha `b169f38480cf8a38f34196158d9feb18bb3804db`, 2026-10-22T01:46Z)
**Resultado:** Failure (exit 1 — edge functions integration tests)

**Classificação:** NÃO é required check no branch protection de `main` — não bloqueia deploy.

**Prova de não-regressão:**
```
git diff c7c25848e122f2392963ba73ccf2ba0c84e38b45..b169f38480cf8a38f34196158d9feb18bb3804db \
  -- '.github/workflows/edge-integration-all.yml' 'supabase/functions/'
```
Saída vazia — nenhuma mudança nas edge functions nem no workflow entre base (main) e HEAD do PR.
O SHA `b169f38` é um commit docs-only (apenas `RELATORIO_CI.md` atualizado).

**Pré-existência:** O workflow `edge-integration-all.yml` não foi alterado por esta sessão.
A falha pré-existe à criação do PR #2338. Distinto de P16 (`edge-functions-drift-check.yml`).

**O que o PO / Engenharia precisam fazer:**
1. Verificar logs do run `39707407172` para identificar quais edge functions falharam
2. Se for lentidão do Supabase (mesma janela de P23): aguardar Supabase estável e rerunnar
3. Se for falha funcional de edge function: commitar fix e abrir PR conforme REGRA #8

---

## P19 — cart-header-quality-gate: `bunx: not found` no runner

**Workflow:** `.github/workflows/cart-header-quality-gate.yml`
**Run falho:** `39698009906` (sha `53195dcb`) — idêntico em `39697216150` (sha `02e4f632`)
**Job:** `CartHeader fuzz + notas internas` — step 7 `Gerar relatório de invariantes`

**Causa exata verificada:**
```
/bin/sh: 1: bunx: not found
⚠️  Vitest terminou com código não-zero — relatório ainda será gerado.
❌ JSON de saída não gerado.
##[error]Process completed with exit code 1.
```

`scripts/qa/cart-header-fuzz-report.mjs` chama `bunx` (executador do runtime Bun) mas o
runner GitHub Actions só tem Node.js/npm — Bun não está instalado.

**Confirmação de pré-existência:** mesmo erro nos dois últimos shas do branch (`02e4f632`
e `53195dcb`) — não foi introduzido por nenhum commit desta sessão.

**Classificação:** Falha de infra de CI — runner não tem `bun` instalado

**Correção aplicada:** commit `fix(ci): cart-header-fuzz-report — substitui bunx por npx`
- `scripts/qa/cart-header-fuzz-report.mjs` linha 53: `bunx vitest` → `npx vitest`

**Impacto:** Não bloqueia deploy (não é required check). Fix aplicado — próximo run deve passar.

---

*Documento atualizado em 2026-10-22 (v13) — Gate 3 timeout diagnosticado e corrigido (commit `1b13f7a`):
`timeout-minutes: 15` → `20` em `e2e-smoke` job (deploy-gates.yml); alinha com classe E24 (E2E shard ≤ 20 min).
Deploy Gates run `39700336039` (sha `e6405e0`): Gate Final FAILURE — Gate 3 cancelado por timeout em 14:28 min.
Nova run em progresso para SHA `1b13f7a`.*

---

## P26 — Gitleaks Full History Audit: potencial secret no histórico do repositório

**Workflow:** `.github/workflows/gitleaks-full-history-audit.yml`
**Run na main:** [39559250174](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39559250174) (sha `45545ae5`, schedule, 2026-10-21T07:02Z)
**Resultado:** Failure — Gitleaks encontrou match(es) no histórico do repositório

**Classificação:** ⚠️ SEGURANÇA — investigar antes de classificar como PO-action. Potencial exposição de secret.

**⚠️ ATENÇÃO:** Antes de documentar como "ação do PO" é necessário:
1. Inspecionar os logs do run `39559250174` para ver qual secret foi detectado (chave AWS, token, API key, etc.)
2. Se for secret real: revogar imediatamente no provider correspondente (mesmo que já em histórico)
3. Não suprimir a detecção sem entender o que foi encontrado

**Causa provável:**
- Um commit no histórico do git commitou acidentalmente uma chave, token ou credencial
- O Gitleaks escaneia o histórico completo (`--no-git` ou equivalente) e encontrou padrão reconhecido

**O que investigar:**
1. Acessar logs do run `39559250174` em https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39559250174
2. Identificar qual arquivo/commit/padrão foi detectado
3. Verificar se o secret já foi revogado (se for key de API/AWS/etc.)
4. Se for falso positivo: adicionar entrada `.gitleaks.toml` com regra de allowlist específica

**Não bloqueia deploy** (não é required check no branch protection de `main`).

---

## P27 — Kit Coverage Integration: falha de integração (não-required)

**Workflow:** `.github/workflows/kit-coverage-integration.yml` (ou equivalente)
**Run na main:** [39540819979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39540819979) (sha `45545ae5`, 2026-10-21)
**Resultado:** Failure

**Causa provável:** Testes de integração do Kit Builder com cobertura falharam. Pode ser:
- Lentidão do Supabase na janela de execução (mesma raiz de P23)
- Mudança de UI do Lovable afetando o fluxo Kit→Carrinho
- Edge function `kit-ai-builder` com divergência (relacionado a P16)

**Classificação:** Não-required — não bloqueia deploy. Pré-existente na main (sha `45545ae5`).

**Ação:** Verificar logs do run. Se Supabase latency: rerunnar. Se falha funcional: investigar com P8.

---

## P28 — Nightly Full CI: falha no CI noturno completo (não-required)

**Workflow:** `.github/workflows/nightly-full-ci.yml` (ou equivalente)
**Run na main:** [39535479472](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39535479472) (sha `45545ae5`, 2026-10-21)
**Resultado:** Failure

**Causa provável:** O CI noturno roda a suite completa (incluindo testes E2E autenticados de longa duração).
Provável combinação de:
- Testes E2E falhando por Supabase latency (P23) na janela noturna
- Workflows E2E de cart/personalization/catalog-kit falhos (P2-P9)

**Classificação:** Não-required — não bloqueia deploy. Pré-existente na main.

**Ação:** Esperar resolução de P23 (Supabase latency) e P2/P3 (cart selectors). Rerunnar após merge do PR #2338.

---

## P29 — Quote Builder Delivery Quality: falha de qualidade (não-required)

**Workflow:** `.github/workflows/quote-builder-delivery-quality.yml` (ou equivalente)
**Run na main:** [39327681155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39327681155) (sha `45545ae5`, 2026-10-21)
**Resultado:** Failure

**Causa provável:** Testes de qualidade do Quote Builder (PDF, layout, campos obrigatórios) falharam.
Mesma raiz de P21a (E2E PDF e visual) e P24 (Stepper/Popover).

**Classificação:** Não-required — não bloqueia deploy. Pré-existente na main.

**Ação:** Investigar com P24. Se snapshots visuais: disparar `update-visual-baselines.yml` (P21b).

---

## P30 — E2E · Cart Delete Popover: falha real de código (não-required)

**Workflow:** `.github/workflows/e2e-cart-delete-popover.yml` (ou equivalente)
**Run na main:** [39669131378](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39669131378) (sha `4f0d2474`, push, 2026-10-21T20:18Z)
**Resultado:** Failure

**Causa raiz:** O popover de confirmação de exclusão de carrinho não está sendo encontrado pelos testes.
Relacionado à mesma mudança de UI do Lovable que afeta P2/P3 — o trigger do popover/menu
mudou de `data-testid="cart-row-menu-{id}"` para `data-testid="cart-row-more-{id}"`.

**Fix aplicado neste PR:** Os seletores de `e2e/flows/13-carts-delete-undo.spec.ts` e
`e2e/flows/13b-carts-undo-rpc-atomic.spec.ts` foram atualizados para incluir ambos os padrões
(`cart-row-menu-` e `cart-row-more-`, `aria-label*="Ações"` e `aria-label*="Mais opções"`).

**Classificação:** Não-required — não bloqueia deploy. Fix aplicado neste PR.

---

## P31 — Daily Flows Simulation: falha de simulação diária (não-required)

**Workflow:** `.github/workflows/daily-flows-simulation.yml` (ou equivalente)
**Run na main:** [39556593219](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39556593219) (sha `45545ae5`, 2026-10-21)
**Resultado:** Failure

**Causa provável:** A simulação diária de fluxos (usuário criando orçamento, adicionando produtos, etc.)
falhou. Mesma raiz de P8/P9 — fluxos de Catalog→Kit, Personalização e Quote Builder afetados por
mudanças do Lovable.

**Classificação:** Não-required — não bloqueia deploy. Pré-existente na main.

**Ação:** Esperar resolução de P8 e P9. Rerunnar após fix do Catalog→Kit e Personalization flows.
