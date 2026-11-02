# Regras de Negócio — Promo Brindes V4

> Gerado em 2026-11-02 · SHA main `a25070630788f77b297431665878319ad74bb587`
> Sessão `01Ss1tXZ4cAbxBvdmu95uNPz`
> Fontes: `docs/`, `src/types/`, `src/integrations/supabase/types.ts`, migrations, policies

---

## 1. Multi-tenancy

- Toda tabela em `public` tem RLS habilitado (gate CI 1.13 bloqueia regressão).
- Isolamento via `organization_id`; funções helper: `user_is_org_member(org_id)`, `is_org_admin(org_id)`.
- **Roles de organização** (`org_role` enum): `owner | admin | member`.
- **Roles de app** (`app_role` enum): `dev | admin | seller | viewer` (+ outros conforme `types.ts`).
- Usuário pertence a N organizações; dados de org diferente são invisíveis via RLS.
- Fonte: `docs/04_EXPLICACAO_DAS_POLICIES.md`, `docs/03_ARQUITETURA_DO_SISTEMA.md`, `src/integrations/supabase/types.ts`

---

## 2. Orçamentos (Quotes)

- **10 status válidos** (SSOT: `src/types/quote.ts:10-20`, CHECK `valid_quote_status` no banco, verificado 2026-06-25):
  `approved | cancelled | converted | draft | expired | pending | pending_approval | rejected | sent | viewed`
- Número de orçamento: formato `"ORC-YYYY-NNNN"`.
- Campo `seller_id` FK → `profiles.id`; `contact_id` FK externa (CRM, sem FK DB).
- Resposta do cliente: `approved | changes_requested | rejected` (`src/types/quote.ts:32`).
- Gate CI 1.16 bloqueia regressão em invariantes da listagem de orçamentos.
- Fonte: `src/types/quote.ts`, `src/lib/quote-status-config.ts`

---

## 3. Markup e Preços

- `markup_percent` armazenado em `markup_configurations` (por categoria, `organization_id`).
- Preço apresentado ao cliente = preço real × (1 + markup_percent/100).
- `NegotiationMarkupCard`: slider 0–50%, visível apenas internamente (badge "Uso interno").
- `markup_pct` em `MarkupInfo` é a % aplicada (ex: 115 = +15%).
- `custo_unitario` = custo ANTES do markup; `preco_unitario` = preço de VENDA (com markup).
- Fonte: `src/types/customization.ts:112-159`, `src/integrations/supabase/types.ts:12609`

---

## 4. Autenticação e Senhas

- Tamanho mínimo de senha: **8 caracteres** (regra vigente no main).
  - Evidência: `src/components/auth/PasswordStrengthIndicator.tsx:46` — `password.length >= 8`
  - Evidência: `src/components/admin/users/useUserManagement.ts:115` — `form.password.length < 8`
- PR #2973 propunha aumentar de 6→8; a regra já estava em 8 antes dessa PR (a PR é redundante).
- Recuperação de senha via Supabase Auth email.

---

## 5. Banco de Dados

- **Projeto canônico (Gold)**: `doufsxqlfjyuvxuezpln` (REGRA #1 — imutável).
- **SINGU (READ-ONLY)**: `pqpdolkaeqlyzpdpbizo` — nenhuma escrita permitida.
- Arquitetura Medallion: Bronze → Silver → Gold.
- 3.000+ migrations; ~388 tabelas; ~3,6M linhas em `stock_snapshots`.
- Tabelas críticas: `products`, `product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`, `personalization_techniques`.
- DDL só via `.github/workflows/db-apply-migration.yml` (REGRA #8/E056).
- Migrations devem ser: aditivas, não-destrutivas (sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa), idempotentes.

---

## 6. Edge Functions

- Deploy exclusivo via `.github/workflows/deploy-edge-functions.yml`.
- Toda edge function deve ter testes passando e não afrouxar autenticação.
- Drift check "Compare GitHub × Canonical" detecta edge functions deployadas fora do fluxo.
- Fonte: `CLAUDE.md §REGRA #8`

---

## 7. RLS / Permissões

- 100% das tabelas em `public` têm RLS habilitado (662+ policies, 269 tabelas).
- Tabelas com INSERT anônimo têm trigger de rate guard (Gate CI 1.13.2).
- Tabelas com RLS habilitado e zero policies geram "deny-all silencioso" — Gate 1.13.1 bloqueia.
- Nenhuma PR pode ampliar acesso anônimo sem aprovação explícita.
- Fonte: `docs/04_EXPLICACAO_DAS_POLICIES.md`, Gates 1.13–1.13.3

---

## 8. CI e Gates

- Gate Final `"Gate Final - Deploy Ready"` é o único required check em `main`.
- Gates bloqueantes numerados: Gate 0 (SSOT), Gate 1 (lint+TS), Gate 2 (unit tests), Gate 3 (E2E smoke), Gate 5 (SEO), Gate 6 (build).
- Baseline de erros TS em main (SHA `a25070630788f77b297431665878319ad74bb587`): **10 erros** (todos `initialFocus` no `react-day-picker` v9 + `calendar.tsx` ClassNames).
- Qualquer PR deve ser medida contra esses 10 erros — novo erro = regressão.

---

## 9. Segredos

- Segredos nunca entram em código, commit ou resposta.
- SSOT de segredos: `docs/ci/SEGREDOS.md`.
- Gate E23 bloqueia referências a segredos não declarados.
- Fonte: `CLAUDE.md`, `docs/ci/SEGREDOS.md`

---

## 10. Produto e Catálogo

- Tipo `Product` deve conter: `price: number`, `sale_price?: number`, `shortDescription: string`, `category_id?: string`, `category_name?: string` (REGRA #2).
- Catálogo B2B; produto principal em `products`; variantes em `product_variants`.
- Personalização em `personalization_techniques`; kits em views `v_kit_with_components`.
- Fonte: `CLAUDE.md §REGRA #2`, `src/types/product-catalog.ts`
