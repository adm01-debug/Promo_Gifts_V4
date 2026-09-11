-- ============================================================
-- Identidade do componente: slot + código com CÓDIGO DA COR
-- Código qualificado = SKU da variante + slot  ->  18891A-PRE-K1
-- (usa o SKU da variante: limpo e idêntico ao que já roda nas variações)
-- ============================================================

-- 1) coluna de slot
ALTER TABLE public.product_kit_components
  ADD COLUMN IF NOT EXISTS slot_code varchar(6);

ALTER TABLE public.product_kit_components
  DROP CONSTRAINT IF EXISTS chk_pkc_slot_fmt;
ALTER TABLE public.product_kit_components
  ADD CONSTRAINT chk_pkc_slot_fmt CHECK (slot_code IS NULL OR slot_code ~ '^(K|E)[0-9]{1,3}$');

-- 2) gerar slot determinístico: itens=K{n}, embalagem=E{n}, por display_order
WITH n AS (
  SELECT id,
    (CASE WHEN is_packaging THEN 'E' ELSE 'K' END) ||
    row_number() OVER (PARTITION BY kit_product_id, is_packaging
                       ORDER BY display_order, component_type_code, id)::text AS slot
  FROM public.product_kit_components
  WHERE slot_code IS NULL
)
UPDATE public.product_kit_components c
SET slot_code = n.slot
FROM n WHERE c.id = n.id;

-- 3) código AGNÓSTICO à cor (espinha dorsal estável): PAI-SLOT  ->  18891A-K1
UPDATE public.product_kit_components c
SET component_code = p.sku || '-' || c.slot_code
FROM public.products p
WHERE p.id = c.kit_product_id
  AND c.slot_code IS NOT NULL
  AND (c.component_code IS NULL OR c.component_code <> p.sku || '-' || c.slot_code);

-- 4) VIEW com o código QUALIFICADO (com a cor): SKU_variante-SLOT -> 18891A-PRE-K1
CREATE OR REPLACE VIEW public.v_kit_component_skus AS
SELECT
  c.id                                   AS component_id,
  c.kit_product_id,
  v.id                                   AS variant_id,
  p.sku                                  AS parent_sku,
  v.sku                                  AS variant_sku,
  v.color_code                           AS variant_color_code,
  v.color_name                           AS variant_color_name,
  c.slot_code,
  c.component_name,
  c.component_type_code,
  c.is_packaging,
  c.color_id                             AS item_color_id,
  c.component_code                        AS component_code_agnostico,
  (v.sku || '-' || c.slot_code)          AS component_sku   -- ex.: 18891A-PRE-K1
FROM public.product_kit_components c
JOIN public.products p          ON p.id = c.kit_product_id
JOIN public.product_variants v  ON v.product_id = c.kit_product_id;

COMMENT ON VIEW public.v_kit_component_skus IS
  'Código qualificado de cada componente por variante: variant_sku || ''-'' || slot_code (ex.: 18891A-PRE-K1). '
  'Itens=K{n}, embalagem=E{n}. Nunca colide com SKU vendável (sufixo -K/-E tem colisão zero). '
  'BOM permanece 1 linha por componente; o código por variante é gerado aqui (sob demanda).';

NOTIFY pgrst, 'reload schema';;
