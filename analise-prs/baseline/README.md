# Baseline de CI — main `8bafc7d5a0a1f0f6a06d88adc6577098f873dfcb`

**Data:** 2026-10-22
**SHA fixado:** `8bafc7d5a0a1f0f6a06d88adc6577098f873dfcb` (após merge PR #2356, sessão session_012WyySbh2tj8vhRQLBf3mHo)
**SHA anterior:** `8e8053b9ed85142e85809783cd3acf9a3077ecde` (sessão anterior)
**Fonte:** GitHub Actions check runs via API + `npx tsc --noEmit` rodado no container cloud

## Resultado do Gate Final

**Gate Final - Deploy Ready: `failure`** (pré-existente em main)

O main já estava vermelho antes de qualquer análise. Regressão é medida como:
> "qualquer check que passe em main e falhe após o merge" OU "qualquer novo check failure não presente neste baseline"

## Checks com failure em main (`8e8053b9`)

| Check | Conclusão |
|---|---|
| `Gate Final - Deploy Ready` | `failure` |
| `Gate 0.5 - Dependency Audit` | `failure` |
| `Gate 1 - Lint + TypeScript` | `failure` |
| `E2E — Error Boundaries (sem auth)` | `failure` |
| `E2E — Full User Flows (authed)` | `failure` |
| `E2E — Personalization Journey` | `failure` |
| `cart-invariants-summary` | `failure` |
| `cart-invariants (chromium-authed · shard 1/2)` | `failure` |
| `cart-invariants (chromium-authed · shard 2/2)` | `failure` |
| `cart-invariants (firefox-authed · shard 1/2)` | `failure` |
| `cart-invariants (firefox-authed · shard 2/2)` | `failure` |
| `Migrations x Canonical schema` | `failure` |
| `check` (×8 entradas) | `failure` |

## Checks com success em main (`8e8053b9`) — amostra relevante

| Check | Conclusão |
|---|---|
| `Gate 0 - SSOT Supabase (project ID canônico)` | `success` |
| `Gate 2 - Unit Tests` | `success` |
| `Gate 2.5 - PostgreSQL Transactional Integrity` | `success` |
| `Gate 4 - Lighthouse CI` | `success` |
| `Gate 5 - SEO Sanity Check` | `success` |
| `Gate 5.5 - RPC restore_seller_cart presente no canônico` | `success` |
| `Gate E23 - Secret Scan (gitleaks)` | `success` |
| `Assert Gate Final is required on main` | `success` |

## Checks cancelados em main (`8e8053b9`)

| Check | Conclusão |
|---|---|
| `E2E · chromium-authed` | `cancelled` |
| `E2E · firefox-authed` | `cancelled` |
| `E2E · webkit-authed` | `cancelled` |
| `Gate 3 - E2E Smoke` | `cancelled` |
| `Smoke (fail-fast)` | `cancelled` |
| `chromium • swatch→QV` | `cancelled` |
| `firefox • swatch→QV` | `cancelled` |

## Nota sobre CI local

`npm ci` retorna 403 no container cloud:
```
npm error code E403
npm error 403 Forbidden - GET https://europe-west1-npm.pkg.dev/...
```

O baseline é derivado exclusivamente dos check runs do GitHub Actions para o SHA `8e8053b9`.
