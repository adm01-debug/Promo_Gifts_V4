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

### PRs mergeadas nesta sessão: 0 autônomas (todas bloqueadas por Rule 8, draft, orphan, ou REGRA #10)

### Regressions introduzidas: 0
- TypeScript: 0 erros (Gate 1 job #121135584154 ✅)
- ESLint: 0 erros/warnings (Gate 1 step 6 ✅)
- Testes unitários: 429 testes, 0 falhas (Gate 2 job #121135584178 ✅)
- Gate Final na sessão anterior: ✅ (SHA dcaa20da, run #40179146830)
- Única falha detectada: Gate 1.3 causada por dossiers que documentam migration paths
  → Corrigida via PR #2509 (`.migration-refs-baseline.json` +4 entradas)

### Entregas desta sessão
- 13 dossiers em `analise-prs/dossies/PR-NNNN.md` (todos com diff lido + test-merge)
- `analise-prs/regras-de-negocio.md` rev10 — 6 seções (docs, testes, enums, migrations, policies, UI)
- `analise-prs/baseline/typecheck.txt` atualizado com evidência CI desta sessão
- `analise-prs/baseline/lint.txt` criado nesta sessão
- `analise-prs/baseline/build.txt` criado nesta sessão
- PR #2509 (fix Gate 1.3) criado e subscribed
