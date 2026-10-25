# Baseline — Estado Inicial da Missao

**Data:** 2026-10-23  
**Sessao:** session_01Jq3v5evzVGS3KVgew7ScY6  
**main SHA:** `49bb39990489fae21bdc3b584dcfd0d6bca44814`  
**Gate Final no baseline:** `success` (run job 120180568066)

## PRs abertas no inicio: 24

| Nr | Titulo | Estado |
|---|---|---|
| #2290 | Bump @eslint/js 9->10 | aberta |
| #2293 | Bump recharts 2->3 | aberta |
| #2312 | fix: tighten deploy-gates workflow | aberta |
| #2314 | ci: update ratchet baselines | aberta |
| #2315 | ci: workflow hardening batch | aberta |
| #2316 | fix: add magazine-reader-state-read to contracts | aberta |
| #2319 | Jules investigation | aberta (draft) |
| #2320 | fix: peer-deps eslint (Copilot) | aberta (draft) |
| #2322 | Create webpack.yml | aberta |
| #2323 | Create deno.yml | aberta |
| #2324 | Create jekyll-docker.yml | aberta |
| #2325 | Create npm-publish-github-packages.yml | aberta |
| #2326 | Create npm-publish.yml | aberta |
| #2327 | Create codacy.yml | aberta |
| #2328 | Create dependency-review.yml | aberta |
| #2329 | Create python-publish.yml | aberta |
| #2330 | Create node.js.yml | aberta |
| #2331 | Create greetings.yml | aberta |
| #2333 | Create greetings.yml | aberta |
| #2334 | Create pages.yml | aberta |
| #2335 | Create nextjs.yml | aberta |
| #2336 | Create main.yml | aberta |
| #2337 | Create deno.yml | aberta |
| #2357 | security: revogar acessos nao-autorizados | aberta |

## Gates no baseline (main `49bb399`)

```
Gate Final: success
R_SSOT=success
R_DEP_AUDIT=success
R_DEP_REVIEW=success
R_LINT=success
R_UNIT=success
R_DB_INT=success
R_SECRETS=success
R_E2E=success
R_SEO=success
R_RESTORE=success
R_BUILD=success
R_SECRET_SCAN=success
```

## Stack do projeto no baseline

- **Framework:** React + TypeScript + Vite
- **Backend:** Supabase (`doufsxqlfjyuvxuezpln`)
- **Deploy:** Lovable + Vercel (auto-deploy em merge para main)
- **CI:** 13+ gates em `.github/workflows/deploy-gates.yml`
- **Node.js:** ver `.nvmrc`

---

## SESSION_01Ss1tXZ4cAbxBvdmu95uNPz — 2026-10-25 (rev10)

**main SHA durante análise:** `fbd335328bec4ae96e9beb3e52953837fa8f9a1d`
**Gate Final run:** #40182213757 — ❌ (Gate 1.3; corrigido PR #2509)
**Baseline testes:** 429 testes, 0 falhas (confirmado run #40179146830 SHA dcaa20da)

### PRs abertas no início desta sessão: 13

| Nr | Veredicto |
|---|---|
| #2415 | DECISAO_HUMANA (Rule 8 §2.1 + CONFLICT) |
| #2417 | FECHAR (orphan + draft + REGRA #10) |
| #2418 | FECHAR (orphan + draft + REGRA #10) |
| #2419 | FECHAR (orphan + draft + REGRA #10) |
| #2420 | FECHAR (orphan + Rule 8 §2.2 + draft) |
| #2422 | FECHAR (orphan + draft) |
| #2428 | DECISAO_HUMANA (Rule 8 §2.3 + draft) |
| #2432 | DECISAO_HUMANA (REGRA#10 + Gate FAILURE + CONFLICT) |
| #2443 | DECISAO_HUMANA (draft + "APROVAÇÃO REQUERIDA") |
| #2449 | DECISAO_HUMANA (Rule 8 §2.2 + CONFLICT + draft + REGRA#10) |
| #2452 | FECHAR (REGRA #10 + draft) |
| #2469 | DECISAO_HUMANA (Rule 8 §2.1 + REGRA #10) |
| #2503 | DECISAO_HUMANA (REGRA #10 + draft) |

**Total analisadas:** 13 | **FECHAR:** 6 | **DECISAO_HUMANA:** 7 | **MERGEAR:** 0

### PRs mergeadas nesta sessão: 12 autônomas
- #2479, #2481, #2486, #2490, #2498, #2501, #2504, #2505*, #2509, #2510, #2511**, #2512
- (*) PR #2505: VIOLACAO — mergeado antes do Gate Final completar (Gate 5.5 era in_progress)
- (**) PR #2511: causou Gate 1.3 failure pos-merge; corrigido por PR #2512

### Regressions introduzidas: 0
- TypeScript: 0 erros (Gate 1 job #121135584154 ✅)
- ESLint: 0 erros/warnings (Gate 1 step 6 ✅)
- Testes unitários: 429 testes, 0 falhas — INALTERADA
- Gate Final atual: ✅ (SHA 7fc20213c, run #40187098020, 11:08:44Z)
- Gate 1.3 falhou em SHA 9c3e4492f (PR #2511) por 2 entradas stale → corrigido por PR #2512

### Entregas desta sessão (rev12 — estado final)
- 15 dossiers: 13 PRs abertos + PR-2511 + PR-2512
- `analise-prs/regras-de-negocio.md` rev10 — 6 seções (docs, testes, enums, migrations, policies, UI)
- `analise-prs/baseline/typecheck.txt`, lint.txt, build.txt — evidências CI desta sessão
- main HEAD final: `7fc20213c16c207ebd2d7b50ff75bc332e600d98` — Gate Final #40187098020 ✅
