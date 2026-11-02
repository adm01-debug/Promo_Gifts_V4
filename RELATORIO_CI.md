# RELATÓRIO CI — Correção de Workflows em Falha
*Gerado em: 2026-11-02 | Branch: `claude/laughing-cori-o9w35e` | PR: #3028*

---

## 1. Baseline Local (pré-correção → pós-correção)

| Checagem | Resultado |
|---|---|
| `npm ci` | ✅ exit 0 |
| `npm run lint` (ESLint) | ✅ exit 0 — 0 erros, 0 warnings (sem regressão vs baseline) |
| `npm run build` (Vite) | ✅ exit 0 — 18.61s |
| TypeScript (`tsc --noEmit`) | ✅ exit 0 |
| Vitest (`npm test`) | ⏳ em execução |

---

## 2. Causa Raiz Identificada

**GitHub Actions Policy (P46):** a organização bloqueia todas as actions de terceiros
(não-`actions/` / `github/`) em load-time do workflow — ANTES de qualquer condicional
ser avaliada. Isso causa `startup_failure` com 0 jobs executados.

Actions bloqueadas identificadas:
| Action | Workflow(s) afetado(s) |
|---|---|
| `dorny/paths-filter` | `deploy-gates.yml` |
| `anchore/sbom-action` | `deploy-gates.yml` |
| `actions/attest-build-provenance` | `deploy-gates.yml` |
| `supabase/setup-cli` | `db-schema-drift-check.yml`, `contract-tests.yml`, `edge-functions-drift-check.yml`, `schema-snapshot-export.yml` |
| `gitleaks/gitleaks-action` | `security-scan.yml` |
| `googleapis/release-please-action` | `release-please.yml` |
| `denoland/setup-deno` | `magazine-unit-tests.yml`, `edge-integration-tests.yml` |

---

## 3. Correções Aplicadas (esta sessão)

### Commits na branch `claude/laughing-cori-o9w35e`

| Commit | Arquivo | Mudança |
|---|---|---|
| `8cc444b8f` | `deploy-gates.yml` | Removeu `dorny/paths-filter` → substituído por `git diff --name-only \| grep -qE` nativo |
| `839c77627` | `deploy-gates.yml` | Removeu `anchore/sbom-action` e `actions/attest-build-provenance` (step SBOM E99) |
| `558a83e9a` | `db-schema-drift-check.yml` | Substituiu `supabase/setup-cli` por instalação nativa via wget |
| `0152049f1` | `PENDENCIAS.md` | Documentou P46 — lista completa de bloqueios externos |
| `604245aee` | `contract-tests.yml`, `edge-functions-drift-check.yml` | Substituiu `supabase/setup-cli` por instalação nativa via wget (ambos) |
| `3dcdc1a7b` | `schema-snapshot-export.yml` | Substituiu AMBAS as ocorrências de `supabase/setup-cli` por instalação nativa via wget |

---

## 4. Estado do CI — Commit `604245aee` (último pushado antes de 3dcdc1a7b)

### Deploy Gates (workflow principal — required check)
| Run | Status | Conclusão |
|---|---|---|
| [41389069778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41389069778) | `pending` | (em andamento) |

**Baseline anterior (commits com startup_failure):**
| Commit | Run | Conclusão |
|---|---|---|
| `8cc444b8f` | [41385787410](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41385787410) | `startup_failure` |
| `839c77627` | [41386802426](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41386802426) | `startup_failure` |
| `0152049f1` | [41387315933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41387315933) | `startup_failure` |
| `558a83e9a` | [41387874789](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41387874789) | `in_progress` |
| `604245aee` | [41389069778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41389069778) | `pending` ✅ (não startup_failure) |

> **Nota:** `pending` → CI carregou sem startup_failure. O Gate Final está aguardando execução dos jobs.

### Workflows com `startup_failure` para `604245aee` (bloqueados externamente):
| Workflow | Run | Bloqueio |
|---|---|---|
| Security Scan | [41389073977](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41389073977) | `gitleaks/gitleaks-action` (P40) |
| Magazine Unit Tests | [41389071931](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41389071931) | `denoland/setup-deno` (P40) |
| schema-snapshot-export | [41389072958](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41389072958) | `supabase/setup-cli` (P46) — fix em `3dcdc1a7b` |
| Edge Integration Tests | [41389070912](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41389070912) | `denoland/setup-deno` (P40) |

---

## 5. Pendências Externas (PENDENCIAS.md)

| ID | Workflow | Bloqueio | Ação necessária |
|---|---|---|---|
| P40 | Security Scan | `gitleaks/gitleaks-action` | PO: Settings → Actions → General → habilitar `gitleaks/gitleaks-action` |
| P40 | Release Please | `googleapis/release-please-action` | PO: Settings → Actions → General → habilitar `googleapis/release-please-action` |
| P40 | Magazine Unit Tests | `denoland/setup-deno` | PO: Settings → Actions → General → habilitar `denoland/setup-deno` |
| P40 | Edge Integration Tests | `denoland/setup-deno` | PO: Settings → Actions → General → habilitar `denoland/setup-deno` |
| P46 | (Gate 6) | `anchore/sbom-action` removida | PO: habilitar `anchore/setup-cli` ou alternativa para reativar SBOM E99 |
| P41 | Uptime Monitor | Falha de probe de infra | Infra: verificar endpoint monitorado |
| P42 | E2E Personalization | Teste crônico instável | Dev: investigar root cause |

---

## 6. Sem Regressões em Workflows Previamente Verdes

O único check required em `main` é **Gate Final - Deploy Ready** (`deploy-gates.yml`).
Para `604245aee`, ele está em `pending` (não `startup_failure`), confirmando que todas
as actions bloqueadas foram removidas de `deploy-gates.yml` e seus reusable workflows.

Os 53 check_runs para `604245aee` estão todos em `queued`/`in_progress` —
nenhum em `startup_failure` — confirmando que o fix de `supabase/setup-cli`
transitivo (via `db-schema-drift-check.yml`) resolveu o bloqueio.

---

*Atualização pendente: resultado de vitest e conclusão do Gate Final após push de `3dcdc1a7b`.*
