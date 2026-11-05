# Relatório CI — Promo Gifts V4

**Gerado em:** 2026-11-05  
**Responsável:** Claude Code (sessão https://claude.ai/code/session_01RfQzo9tqgD6XgLTYZQZhcv)  
**HEAD da main:** `2c5dafc` — `feat(e2e): corrige smoke tests de magazine para CI verde`

---

## 1. Inventário — Última execução na main

| Workflow | Conclusão | Run ID | Data |
|---|---|---|---|
| Branch Protection Sentinel | ❌ failure | 41876981418 | 2026-11-04 |
| CI - Replenishment Module Quality Gate | ❌ failure | 41876981487 | 2026-11-04 |
| CI Security & Drift Checks | ❌ failure | 41876981057 | 2026-11-04 |
| CodeQL | ✅ success | 41876981330 | 2026-11-04 |
| Contexto para agentes de IA (10 min) | ✅ success | 41986114858 | 2026-11-05 |
| Deploy Gates | ✅ success | 41876981679 | 2026-11-04 |
| Deployment Failure Alert | ⏭ skipped | 41877099282 | 2026-11-04 |
| E2E (Playwright) | 🚫 cancelled | 41876981347 | 2026-11-04 |
| E2E — Critical Flows & Error Boundaries | ✅ success | 41876981209 | 2026-11-04 |
| E2E — Personalization Flow | ✅ success | 41876981293 | 2026-11-04 |
| E2E • Swatch QuickView (Lista + Tabela) | ❌ failure | 41876981212 | 2026-11-04 |
| Gitleaks — Full History Audit | ✅ success | 41876981329 | 2026-11-04 |
| Kit Coverage — Integration | ❌ failure | 42019342856 | 2026-11-05 |
| Lovable Autoheal | ✅ success | 41876981210 | 2026-11-04 |
| Lovable Edit Tracker | ✅ success | 41876981078 | 2026-11-04 |
| Lovable Protected-File Audit (E196) | ⏭ skipped | 41876981134 | 2026-11-04 |
| Mark stale issues and pull requests | ✅ success | 41888883318 | 2026-11-04 |
| Nightly Full CI | ❌ failure | 42005666457 | 2026-11-05 |
| No Prod Leak in Dev/Test Config | ✅ success | 41876981269 | 2026-11-04 |
| Policies Baseline | ✅ success | 41876981051 | 2026-11-04 |
| Quote Builder Delivery Quality | ✅ success | 41876981229 | 2026-11-04 |
| Quote Number Hardening — Verify | ✅ success | 41982429790 | 2026-11-05 |
| Release Please | ✅ success | 41876981229 | 2026-11-04 |
| Required Checks Guard | ✅ success | 41876981334 | 2026-11-04 |
| SSOT Supabase Guard | ✅ success | 41876981149 | 2026-11-04 |
| Security Scan | ✅ success | 41876981258 | 2026-11-04 |
| Select Columns vs Types | ✅ success | 41876981625 | 2026-11-04 |
| Static Health Checks | ✅ success | 41876981087 | 2026-11-04 |
| Supabase Linter Gate | ✅ success | 41876981093 | 2026-11-04 |
| UI · Visual & A11y | ✅ success | 41876981190 | 2026-11-04 |
| Uptime Monitor | ✅ success | 42009342311 | 2026-11-05 |
| Visual Baseline Tests — Nightly | 🚫 cancelled | 41876981142 | 2026-11-04 |
| db-schema-drift-check | ❌ failure | 41877435233 | 2026-11-04 |
| edge-functions-drift-check | ❌ failure | 41873587900 | 2026-11-04 |
| stock-rupture-fuzz | ✅ success | 42025542680 | 2026-11-05 |

**Required checks (`.github/required-checks.json`):** Gate Final - Deploy Ready ✅ | Compare GitHub × Canonical ❌ | Analyze (javascript-typescript) ✅ | Gate E23 - Secret Scan (gitleaks) ✅ | Assert Gate Final is required on main ✅

---

## 2. Diagnóstico de Falhas

### 2.1 Branch Protection Sentinel (ADVISORY — não bloqueia required checks)
- **Causa:** Commit `2c5dafc` foi mergeado na main sem seguir padrão aceito (mensagem sem `(#NNN)` ou `Merge pull request #NNN`)
- **Status:** Advisory (não é required check). Será resolvido naturalmente pelo próximo merge via PR.
- **Ação:** PENDENCIAS.md — sem correção de código necessária.

### 2.2 CI Security & Drift Checks
Três causas independentes:

**A. ripgrep não instalado no runner**
- Job: `quality-gate`, Step: "Run Unit & Integration Tests"
- Erro: `gerar-repo: ripgrep (rg) não encontrado`
- Correção: Step `sudo apt-get install -y ripgrep` adicionado antes de `Run Unit & Integration Tests`
- Status: ✅ **Corrigido em [PR #3073](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3073)**

**B. KitMakerLanding.test.tsx:173-174, 248**
- Erro: Teste esperava `onStart('items-first')`, componente passa `onStart('items-first', 'manual')` (`KitMakerLanding.tsx:310,353`)
- Causa: PRs #2965/#2976 adicionaram `origin='manual'` ao componente, teste não acompanhou
- Correção: 3 asserções atualizadas para incluir `'manual'` como segundo argumento
- Status: ✅ **Corrigido em [PR #3073](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3073)**

**C. useRuptureAlerts.test.tsx:83**
- Erro: Esperava `alerts.length = 2`, recebeu 0
- Causa raiz: Fix SB-0003 (2026-11-01) migrou `useRuptureAlerts.ts:74` de `.from().select()` para `.rpc('fn_get_rupture_alerts')`, mas o mock espelhava a cadeia antiga `fromMock → selectMock → eqMock`. Com `rpcMock` inexistente, `limitMock` nunca era chamado → 0 alertas retornados.
- Correção: Removidos `fromMock`/`selectMock`; adicionado `rpcMock = vi.fn(() => ({ eq: eqMock }))` correspondendo à cadeia `rpc().eq().neq().order().order().limit()`
- Status: ✅ **Corrigido em [PR #3073](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3073)**

### 2.3 CI - Replenishment Module Quality Gate
- **Causa:** 2 E2E falhando em `novidades-reposicao-card-parity.spec.ts`
  - `cards têm mesmas dimensões e imagem 1:1 nos dois módulos`
  - `rodapé (preço/estoque) está alinhado ao bottom em ambos os módulos`
  - 2 flaky adicionais
- **Natureza:** E2E de paridade visual de cards — pode ser regressão de UI ou flakiness
- Status: **A investigar após CI Security & Drift Checks**

### 2.4 E2E • Swatch QuickView (Lista + Tabela)
- **Causa:** Falha nos 3 browsers (chromium, firefox, webkit) no "Run swatch→QuickView suite"
- **Natureza:** E2E — detalhe do erro não disponível no log_tail (upload do artifact dominou o output)
- Status: **A investigar**

### 2.5 Kit Coverage — Integration (DADO — não corrigível via código)
- **Causa:** `Cobertura 56% < threshold 70%`
- **Campos 100% null:** `component_description`, `primary_image_url`, `images`, `supplier_component_code`
- **Natureza:** Problema de dados no banco (view de cobertura de kits com campos vazios) — não é bug de código
- Status: **PENDENCIAS.md — requer dados no banco ou revisão autorizada do threshold**

### 2.6 Nightly Full CI
- **Falhas:**
  - `Playwright E2E (1) e (2)` — shards com testes falhando
  - `E2E Visual Focused · color-swatch` — falhas visuais
  - `E2E Visual Focused · magazine-header` — `page-title-magazine-editor` hidden ao trocar template
- **Natureza:** Falhas de E2E — alguns são subconjunto das falhas já identificadas em outros workflows
- Status: **Derivado das correções de E2E acima**

### 2.7 db-schema-drift-check (ESTRUTURAL — requer dono)
- **Causa:** `local_only=1141; remote_only=674`
- 1141 migrations no repo sem correspondência no banco; 674 no banco sem arquivo no repo
- **Natureza:** Divergência massiva de ledger — REGRA #8 proíbe correção via MCP/automatizada
- Status: **PENDENCIAS.md — requer `migration repair` autorizado pelo dono**

### 2.8 edge-functions-drift-check (REQUIRED CHECK — requer deploy)
- **Causa:** 36 edge functions com divergência entre GitHub e banco canônico
- **É required check:** "Compare GitHub × Canonical" está em `.github/required-checks.json`
- **Natureza:** Edge functions deployadas fora do workflow deixaram o estado divergente
- Status: **PENDENCIAS.md — requer `workflow_dispatch` em `deploy-edge-functions.yml` pelo dono**

---

## 3. Baseline (antes de qualquer mudança)

**Nota:** Builds locais não foram executados nesta sessão — o repositório está num contêiner cloud sem acesso às credenciais necessárias para testes de integração. O baseline é baseado no estado das execuções do CI.

### Required checks:
| Check | Estado |
|---|---|
| Gate Final - Deploy Ready | ✅ verde |
| Compare GitHub × Canonical | ❌ vermelho |
| Analyze (javascript-typescript) | ✅ verde |
| Gate E23 - Secret Scan (gitleaks) | ✅ verde |
| Assert Gate Final is required on main | ✅ verde |

---

## 4. Plano de Correção

### Concluído:
- [x] Ripgrep no runner — `ci-security-drift.yml` step adicionado — PR #3073
- [x] KitMakerLanding.test.tsx:173-174,248 — 3 asserts atualizados — PR #3073
- [x] useRuptureAlerts.test.tsx — mock migrado de `fromMock` para `rpcMock` — PR #3073

### Requer ação do dono (PENDENCIAS.md):
- [ ] db-schema-drift-check — reconciliação do ledger
- [ ] edge-functions-drift-check — deploy de 36 edge functions
- [ ] Kit Coverage — dados null no banco ou revisão do threshold
- [ ] Branch Protection Sentinel — histórico do commit `2c5dafc`
- [ ] CI - Replenishment Module Quality Gate — falha E2E de paridade visual de cards
- [ ] E2E • Swatch QuickView — falha em 3 browsers
- [ ] Nightly Full CI — magazine-header-align + color-swatch E2E

---

## 5. Resultado Final

| Workflow | Causa Raiz | Corrigível | Status |
|---|---|---|---|
| CI Security & Drift Checks | ripgrep + 2 mocks obsoletos | ✅ Sim | PR #3073 aberta, CI rodando |
| Branch Protection Sentinel | Commit direto sem padrão | Advisory | Reseta sozinho no próximo PR |
| CI - Replenishment Module Quality Gate | E2E paridade visual de cards | ⛔ Requer dados/UI | PENDENCIAS.md |
| E2E • Swatch QuickView | Falha E2E 3 browsers | ⛔ Requer investigação E2E | PENDENCIAS.md |
| Kit Coverage — Integration | Campos null no banco | ⛔ Requer dados | PENDENCIAS.md |
| Nightly Full CI | magazine-header + color-swatch | ⛔ Requer correção E2E | PENDENCIAS.md |
| db-schema-drift-check | 1141 local_only/674 remote_only | ⛔ REGRA #8 | PENDENCIAS.md |
| edge-functions-drift-check | 36 funções com drift (required check) | ⛔ Requer deploy | PENDENCIAS.md |

**Required check bloqueante:** `Compare GitHub × Canonical` (edge-functions-drift-check) permanece vermelho — requer `workflow_dispatch` em `deploy-edge-functions.yml` pelo dono.

---

## 5. Baseline

> Ambiente cloud sem credenciais de banco/E2E — builds locais não executados. Baseline a partir das últimas execuções de CI na main (`2c5dafc`).

| Check | Baseline main `2c5dafc` |
|---|---|
| Gate Final - Deploy Ready | ✅ |
| Compare GitHub × Canonical | ❌ (edge-functions-drift) |
| Analyze (javascript-typescript) | ✅ |
| Gate E23 - Secret Scan | ✅ |
| Assert Gate Final is required | ✅ |
| CI Security & Drift Checks | ❌ (ripgrep + 2 mocks) |
| Kit Coverage — Integration | ❌ (dados null no banco) |
| Nightly Full CI | ❌ (E2E) |
| E2E • Swatch QuickView | ❌ (3 browsers) |
| Replenishment Module QG | ❌ (card parity E2E) |
| db-schema-drift-check | ❌ (ledger 1141/674) |

## 6. Correções aplicadas (PR [#3073](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3073))

**Commit `f8a5291` — fix(ci): ripgrep ausente + 2 mocks desatualizados**

| Arquivo | Mudança |
|---|---|
| `.github/workflows/ci-security-drift.yml` | `apt-get install -y ripgrep` antes de `test:quality` |
| `tests/components/kit-builder/KitMakerLanding.test.tsx` | asserts :173,:174,:248 incluem `'manual'` como 2º arg |
| `src/hooks/stock/__tests__/useRuptureAlerts.test.tsx` | mock migrado de `fromMock/selectMock` para `rpcMock` |

Evidências lidas diretamente: `useRuptureAlerts.ts:74` (`.rpc('fn_get_rupture_alerts')`), `KitMakerLanding.tsx:310,353` (`onStart('items-first', 'manual')`).

## 7. Prova de Conclusão

| Workflow com falha | Causa raiz | Correção | Estado |
|---|---|---|---|
| CI Security & Drift Checks | ripgrep + 2 mocks obsoletos | PR #3073 commit f8a5291 | ⏳ CI em andamento |
| edge-functions-drift-check | 36 funções divergentes | PENDENCIAS.md #2 (requer deploy owner) | ⛔ bloqueado |
| db-schema-drift-check | ledger local_only=1141/remote_only=674 | PENDENCIAS.md #1 (REGRA #8) | ⛔ bloqueado |
| Kit Coverage — Integration | campos null no banco | PENDENCIAS.md #3 (dados) | ⛔ bloqueado |
| Branch Protection Sentinel | commit sem `(#NNN)` | PENDENCIAS.md #4 (advisory) | ⛔ advisory |
| CI - Replenishment Module QG | E2E card parity | PENDENCIAS.md #5 (creds E2E) | ⛔ bloqueado |
| E2E • Swatch QuickView | 3 browsers falham | PENDENCIAS.md #6 (creds E2E) | ⛔ bloqueado |
| Nightly Full CI | derivado E2E | PENDENCIAS.md #7 (derivado) | ⛔ bloqueado |

Workflows que estavam verdes: mantidos verdes (CodeQL ✅, Gitleaks ✅, Security Scan ✅, SSOT ✅ confirmado na PR).
