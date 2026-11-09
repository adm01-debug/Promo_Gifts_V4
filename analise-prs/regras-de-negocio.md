# Regras de Negócio — promo-gifts-v4

Analisado em: 2026-11-09  
Fonte: código-fonte, migrations, testes, CLAUDE.md

---

## RN-001 — SSOT Supabase canônico

**Arquivo:** `src/integrations/supabase/client.ts:24`  
**Regra:** `CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"` — imutável. Projeto `pqpdolkaeqlyzpdpbizo` é proibido em código executável.  
**Gate:** Gate 0 (`validate-supabase-config.mjs`) bloqueia CI se violado.

---

## RN-002 — Campos obrigatórios do tipo `Product`

**Arquivo:** `src/types/product-catalog.ts:30-36`  
```typescript
shortDescription: string;   // linha 30
price: number;              // linha 31
sale_price?: number;        // linha 32
category_id?: string | null; // linha 35
category_name?: string | null; // linha 36
```
**Gate:** Gate 1.1 bloqueia CI se campos removidos.

---

## RN-003 — Status de orçamento (QUOTE_STATUSES)

**Arquivo:** `src/types/quote.ts:10-22`  
**Valores:** `approved`, `cancelled`, `converted`, `draft`, `expired`, `pending`, `pending_approval`, `rejected`, `sent`, `viewed`  
**Gate:** `src/types/__tests__/quote-status-schema.test.ts` — testa invariantes do enum.

---

## RN-004 — Categorias de magazine (MAGAZINE_CATEGORIES)

**Arquivo:** `src/types/magazine.ts:32-48`  
**Valores:** `awards`, `bags`, `clocks`, `customized`, `drinkwares`, `general`, `giftsets`, `id`, `packaging`, `pins`, `signs`, `stationery`, `technology`, `wearables`

---

## RN-005 — Tabelas críticas do schema Gold

**Fonte:** CLAUDE.md REGRA #4  
Tabelas que NÃO podem ser removidas de `types.ts` sem entrada em allowlist:
- `personalization_techniques`, `products`, `product_variants`
- `suppliers`, `supplier_products_raw`
- `magazines`, `magazine_items`, `magazine_templates`

**Gate:** Gate 1.2 (`check:types-inventory-drift`) bloqueia CI se tabela sumir.

---

## RN-006 — Arquitetura Medallion Bronze → Silver → Gold

**Fonte:** CLAUDE.md CONTEXTO + `doufsxqlfjyuvxuezpln` = Gold  
Dados fluem Bronze (raw) → Silver (cleaned) → Gold (final, `doufsxqlfjyuvxuezpln`). Nenhum código de produção acessa Bronze/Silver diretamente.

---

## RN-007 — DDL em produção exige aprovação PO

**Fonte:** CLAUDE.md REGRA #8 / E056  
`execute_sql` com DDL (CREATE, ALTER, DROP, GRANT, REVOKE, CREATE POLICY, ALTER TABLE, CREATE INDEX, CREATE FUNCTION, `cron.alter_job`) é **proibido em sessão de agente Claude**. Único caminho autorizado: `.github/workflows/db-apply-migration.yml`.

---

## RN-008 — Fluxo de sortimento: sort options

**Arquivo:** `src/types/product-catalog.ts:264-265`  
Sort options suportados: `price-asc`, `price-desc` (e outros não listados neste trecho).

---

## RN-009 — Histórico de migrations

**Contagem:** 3009 migrations em `supabase/migrations/`  
**Última:** `20261027234500_reactivate_xbz_image_uploader_cron.sql`  
Cada migration é aditiva e idempotente; migrations destrutivas exigem aprovação PO.

---

## RN-010 — Merge = deploy em produção

**Fonte:** CLAUDE.md CONTEXTO  
Merge em `main` dispara deploy automático via Lovable/Vercel. Não existe staging intermediário para o fluxo principal.

---

*Nota: build local impossível (npm registry `europe-west1-npm.pkg.dev` retorna 403 nesta sessão). Typecheck/lint/build: NAO EXECUTADO LOCALMENTE — validado apenas via Gate Final CI no GitHub Actions.*
