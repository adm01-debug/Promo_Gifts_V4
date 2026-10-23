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
