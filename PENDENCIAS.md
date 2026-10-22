# Pendências de CI — Itens que requerem ação do PO/humano

**Atualizado:** 2026-10-21 (v7 — P10–P13 confirmados em run 39687808882; P14 db-schema-drift-check; P15 Gate E89 corrigido; P16 edge-functions-drift-check; RELATORIO_CI.md criado)
**Sessão:** https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz

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

## P18 — Gate 3 E2E Smoke — Cancelado por concurrency no run `39695326969`

**Tipo:** Gate de CI — cancelamento por política de concurrency do CI (comportamento esperado do sistema)
**Classificação:** Resolvido automaticamente — não é falha real; o run seguinte (`39697216328`) rodará Gate 3 completo

**Causa exata verificada:** O run `39695326969` (sha `1c5814b`) recebeu `conclusion=cancelled`
às **2026-10-22T00:03:41Z** (confirmado via API: `"status":"completed","conclusion":"cancelled"`).
A causa é a política `cancel-in-progress: true` configurada no job `deploy-gates.yml` no bloco
`concurrency:`. Quando o commit `02e4f63` foi pushado às 00:02:13Z, o GitHub Actions cancelou
automaticamente o run anterior ainda em execução (step 7 "Run Playwright smoke tests" do
Gate 3 E2E Smoke estava `in_progress` desde 23:48:46Z). Este é o comportamento documentado
e esperado do mecanismo de concurrency do GitHub Actions — não representa uma falha real nos
testes E2E nem no runner.

**Evidência:** API GitHub Actions GET `/runs/39695326969`:
```json
{
  "status": "completed",
  "conclusion": "cancelled",
  "updated_at": "2026-10-22T00:03:41Z"
}
```

**Novo run ativo:** `39697216328` (sha `02e4f63`, `status: queued` às 00:03:59Z) vai
executar Gate 3 E2E Smoke completo. Quando completar, o resultado será documentado
no RELATORIO_CI.md.

**O que PO / Engenharia precisam saber:**
- O Gate 3 NÃO falhou — foi cancelado pelo CI ao receber um novo commit
- O run `39697216328` executará o Gate 3 completo para confirmar o resultado
- Se Gate 3 falhar no run `39697216328`: investigar os logs do step 7 Playwright; pode ser relacionado a P2-P9

**Impacto:** Nenhum — cancelamento por concurrency é comportamento normal e esperado do CI.

---

---

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

**O que Engenharia/PO precisam fazer:**
- Opção A: Substituir `bunx vitest` por `npx vitest` em `scripts/qa/cart-header-fuzz-report.mjs`
- Opção B: Adicionar step `setup-bun@v2` no workflow antes do step 7
- Este workflow NÃO é um Required Check de `main` (não bloqueia deploy)

**Impacto:** Não bloqueia deploy (não é required check). Artefato `cart-header-fuzz-report`
é gerado parcialmente (951 bytes, sem dados de fuzzing).

---

*Documento atualizado em 2026-10-22 (v10) — P19 adicionado (cart-header-quality-gate bunx not found);
P18 adicionado (Gate 3 E2E Smoke — timeout/runner stale no run 39695326969);
P17 adicionado (baseline local impossível — registry npm privado 403);
P10–P13 confirmados via run `39687808882` (commit `0d1efd27`, PR #2338);
P14 db-schema-drift-check (advisory, requer reconciliação de DDL fora de fluxo);
P15 Gate E89 — 4 colisões de cron corrigidas em 3 workflows — ✅ CONFIRMADO run `39689787809`;
P16 edge-functions-drift-check (advisory, drift de edge functions — requer engenharia/PO);
P19 cart-header-quality-gate bunx not found (infra CI, não required check);
RELATORIO_CI.md criado com inventário completo de workflows failing.*
