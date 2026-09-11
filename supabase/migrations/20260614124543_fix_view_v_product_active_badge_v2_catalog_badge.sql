
-- Drop e recrear com nova estrutura de colunas
DROP VIEW IF EXISTS public.v_product_active_badge CASCADE;

CREATE VIEW public.v_product_active_badge AS
SELECT
  p.id                AS product_id,
  p.sku,
  p.name,
  p.is_active,
  p.is_stockout,
  p.is_new,
  p.is_bestseller,
  p.is_featured,
  p.is_on_sale,
  p.has_gift_box,
  -- Badge técnico (admin/debug — sempre calculado independente de is_active)
  CASE
    WHEN p.is_stockout   THEN 'stockout'
    WHEN p.is_new        THEN 'new'
    WHEN p.is_bestseller THEN 'bestseller'
    WHEN p.is_featured   THEN 'featured'
    WHEN p.is_on_sale    THEN 'on_sale'
    WHEN p.has_gift_box  THEN 'gift_box'
    ELSE                      'none'
  END                 AS active_badge,
  -- Badge do catálogo (USAR NO FRONTEND — NULL quando produto inativo)
  CASE
    WHEN NOT p.is_active THEN NULL
    WHEN p.is_stockout   THEN 'stockout'
    WHEN p.is_new        THEN 'new'
    WHEN p.is_bestseller THEN 'bestseller'
    WHEN p.is_featured   THEN 'featured'
    WHEN p.is_on_sale    THEN 'on_sale'
    WHEN p.has_gift_box  THEN 'gift_box'
    ELSE                      'none'
  END                 AS catalog_badge,
  -- Label PT-BR (NULL se inativo)
  CASE
    WHEN NOT p.is_active THEN NULL
    WHEN p.is_stockout   THEN 'Fora de estoque'
    WHEN p.is_new        THEN 'Novidade'
    WHEN p.is_bestseller THEN 'Mais vendido'
    WHEN p.is_featured   THEN 'Destaque'
    WHEN p.is_on_sale    THEN 'Promoção'
    WHEN p.has_gift_box  THEN 'Embalagem especial'
    ELSE                      NULL
  END                 AS active_badge_label,
  -- Cor CSS (NULL se inativo)
  CASE
    WHEN NOT p.is_active THEN NULL
    WHEN p.is_stockout   THEN 'red'
    WHEN p.is_new        THEN 'blue'
    WHEN p.is_bestseller THEN 'amber'
    WHEN p.is_featured   THEN 'purple'
    WHEN p.is_on_sale    THEN 'green'
    WHEN p.has_gift_box  THEN 'teal'
    ELSE                      NULL
  END                 AS active_badge_color,
  (
    (p.is_stockout::int)   +
    (p.is_new::int)        +
    (p.is_bestseller::int) +
    (p.is_featured::int)   +
    (p.is_on_sale::int)    +
    (p.has_gift_box::int)
  )                   AS total_badges_ativos,
  p.novelty_expires_at,
  p.supplier_id,
  p.updated_at
FROM public.products p;

GRANT SELECT ON public.v_product_active_badge TO anon, authenticated;
;
