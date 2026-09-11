
-- MELHORIA 13: Dropar 5 índices genuinamente nunca usados (0 scans com 7.4M PK scans de baseline)
-- Critério: 0 scans + funcionalidade muito específica/niche

-- Sub-brand features (0 scans — feature não ativa em produção)
DROP INDEX IF EXISTS public.idx_products_sub_brand;
DROP INDEX IF EXISTS public.idx_products_sub_brand_id;

-- Filtros de nicho nunca consultados via índice
DROP INDEX IF EXISTS public.idx_products_gender_active;     -- gender queries usam idx_products_active + seq scan
DROP INDEX IF EXISTS public.idx_products_is_textil;         -- textil flag niche
DROP INDEX IF EXISTS public.idx_products_is_thermal;        -- thermal flag niche

-- Manter os demais (tags_gin, novelties, cost_stock, etc.) — podem ser usados em queries menos frequentes
;
