# Regras de Negócio — Promo Brindes V4
> Extraído de: `src/types/`, `supabase/migrations/`, `docs/`, `tests/`, CLAUDE.md
> Data: 2026-10-30 | main SHA: 6e38d14a9

## 1. Produto e Catálogo

- **Product type obrigatório**: `price: number`, `sale_price?: number`, `shortDescription: string`, `category_id?: string`, `category_name?: string` (REGRA #2).
- Produto inativo não pode entrar em orçamento nem Kit Builder.
- Preço de venda (`sale_price`) tem precedência sobre `price` na exibição.

## 2. Kit Builder

- Revalidação de preço obrigatória antes de gerar orçamento (PR #2768).
- Produto com preço alterado ou status inativo bloqueia a criação do orçamento.

## 3. Orçamento (Quote)

- Fluxo: rascunho → enviado → aprovado/recusado.
- Estado "rascunho" nunca dispara e-mail.
- RPC `restore_seller_cart` presente e testada no banco canônico (Gate 5.5).

## 4. Magazine

- Tabelas: `magazines`, `magazine_items`, `magazine_templates` — protegidas em REGRA #4.

## 5. Segurança

- Projeto canônico: `doufsxqlfjyuvxuezpln` (REGRA #1). Nunca referenciar `pqpdolkaeqlyzpdpbizo`.
- RLS habilitado em todas as tabelas sensíveis; zero policies = deny-all (Gate 1.13.1).
- Rate guard anon em 7 tabelas com INSERT anônimo (Gate 1.13.2).
- DDL só via workflow `db-apply-migration.yml` (REGRA #8/E015).

## 6. CI / Governança

- Gate Final ("Gate Final - Deploy Ready") é o único check required em `main`.
- Workflows em `.github/workflows/` e migrations em `supabase/migrations/` exigem revisão humana (REGRA #8).

## 7. Acessibilidade (a11y)

- Todos os componentes interativos devem ter foco visível (ring substitute).

## 8. Versão e Release

- Release gerenciado pelo bot `release-please` via PR `chore(main): release X.Y.Z`.
- Merge de release PR é decisão do PO.
