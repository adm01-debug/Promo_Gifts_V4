-- ============================================================
-- CNPJ hardening: backfill dígitos-only + CHECK constraints
-- Escopo: public.suppliers.cnpj, public.supplier_branches.cnpj
-- (products NÃO tem coluna cnpj; quotes.client_cnpj fora por decisão de negócio)
-- Nomes de constraint alinhados ao contrato de src/utils/cnpj-errors.ts
-- ============================================================

-- 0) Auditoria reversível: snapshot before/after de toda linha tocada
CREATE TABLE IF NOT EXISTS public.cnpj_backfill_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  executed_at timestamptz NOT NULL DEFAULT now(),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  cnpj_before text,
  cnpj_after text,
  action text NOT NULL -- 'normalized' | 'nulled_invalid'
);

-- 1) Backfill suppliers (só linhas que mudam)
WITH upd AS (
  UPDATE public.suppliers s
  SET cnpj = regexp_replace(s.cnpj, '\D', '', 'g')
  WHERE s.cnpj IS NOT NULL
    AND s.cnpj <> regexp_replace(s.cnpj, '\D', '', 'g')
  RETURNING s.id, s.cnpj AS after_v
)
INSERT INTO public.cnpj_backfill_audit (table_name, row_id, cnpj_before, cnpj_after, action)
SELECT 'suppliers', u.id, NULL, u.after_v, 'normalized' FROM upd u;

-- 1b) Backfill supplier_branches
WITH upd AS (
  UPDATE public.supplier_branches b
  SET cnpj = regexp_replace(b.cnpj, '\D', '', 'g')
  WHERE b.cnpj IS NOT NULL
    AND b.cnpj <> regexp_replace(b.cnpj, '\D', '', 'g')
  RETURNING b.id, b.cnpj AS after_v
)
INSERT INTO public.cnpj_backfill_audit (table_name, row_id, cnpj_before, cnpj_after, action)
SELECT 'supplier_branches', u.id, NULL, u.after_v, 'normalized' FROM upd u;

-- 2) NULL-out de irrecuperáveis (auditoria hoje = 0 linhas; guard de idempotência)
WITH upd AS (
  UPDATE public.suppliers s
  SET cnpj = NULL
  WHERE s.cnpj IS NOT NULL AND length(s.cnpj) <> 14
  RETURNING s.id, s.cnpj AS before_v
)
INSERT INTO public.cnpj_backfill_audit (table_name, row_id, cnpj_before, cnpj_after, action)
SELECT 'suppliers', u.id, u.before_v, NULL, 'nulled_invalid' FROM upd u;

WITH upd AS (
  UPDATE public.supplier_branches b
  SET cnpj = NULL
  WHERE b.cnpj IS NOT NULL AND length(b.cnpj) <> 14
  RETURNING b.id, b.cnpj AS before_v
)
INSERT INTO public.cnpj_backfill_audit (table_name, row_id, cnpj_before, cnpj_after, action)
SELECT 'supplier_branches', u.id, u.before_v, NULL, 'nulled_invalid' FROM upd u;

-- 3) Constraints — nomes casam com mapCnpjError():
--    *_cnpj_length_chk  -> branch 'cnpj_length_invalid'
--    *_cnpj_digits_only_chk -> branch 'cnpj_dv_invalid'
ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_cnpj_length_chk
  CHECK (cnpj IS NULL OR length(cnpj) = 14);

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_cnpj_digits_only_chk
  CHECK (cnpj IS NULL OR cnpj ~ '^\d+$');

ALTER TABLE public.supplier_branches
  ADD CONSTRAINT supplier_branches_cnpj_length_chk
  CHECK (cnpj IS NULL OR length(cnpj) = 14);

ALTER TABLE public.supplier_branches
  ADD CONSTRAINT supplier_branches_cnpj_digits_only_chk
  CHECK (cnpj IS NULL OR cnpj ~ '^\d+$');;
