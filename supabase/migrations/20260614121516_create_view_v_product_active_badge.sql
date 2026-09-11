
-- ============================================================
-- FIX P1-B: VIEW v_product_active_badge
-- Hierarquia canônica de badge por produto:
--   1. stockout   — produto indisponível (prioridade máxima)
--   2. new        — novidade (30 dias)
--   3. bestseller — mais vendido
--   4. featured   — destaque curado
--   5. on_sale    — promoção
--   6. gift_box   — embalagem comercial
--   7. none       — sem badge
-- Uso: SELECT * FROM v_product_active_badge WHERE product_id = $1
-- ============================================================
DROP VIEW IF EXISTS public.v_product_active_badge;

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
  -- Badge canônica (prioridade definida aqui, não no frontend)
  CASE
    WHEN p.is_stockout   THEN 'stockout'
    WHEN p.is_new        THEN 'new'
    WHEN p.is_bestseller THEN 'bestseller'
    WHEN p.is_featured   THEN 'featured'
    WHEN p.is_on_sale    THEN 'on_sale'
    WHEN p.has_gift_box  THEN 'gift_box'
    ELSE                      'none'
  END                 AS active_badge,
  -- Label de exibição em PT-BR (pronto para o frontend)
  CASE
    WHEN p.is_stockout   THEN 'Fora de estoque'
    WHEN p.is_new        THEN 'Novidade'
    WHEN p.is_bestseller THEN 'Mais vendido'
    WHEN p.is_featured   THEN 'Destaque'
    WHEN p.is_on_sale    THEN 'Promoção'
    WHEN p.has_gift_box  THEN 'Embalagem especial'
    ELSE                      NULL
  END                 AS active_badge_label,
  -- Cor CSS para o badge (tailwind class ou hex)
  CASE
    WHEN p.is_stockout   THEN 'red'
    WHEN p.is_new        THEN 'blue'
    WHEN p.is_bestseller THEN 'amber'
    WHEN p.is_featured   THEN 'purple'
    WHEN p.is_on_sale    THEN 'green'
    WHEN p.has_gift_box  THEN 'teal'
    ELSE                      NULL
  END                 AS active_badge_color,
  -- Quantos badges secundários existem (para debug/analytics)
  (
    (p.is_stockout::int)   +
    (p.is_new::int)        +
    (p.is_bestseller::int) +
    (p.is_featured::int)   +
    (p.is_on_sale::int)    +
    (p.has_gift_box::int)
  )                   AS total_badges_ativos,
  -- Expiração da novidade (útil para cache-busting no frontend)
  p.novelty_expires_at,
  p.supplier_id,
  p.updated_at
FROM public.products p;

-- Garantir que a view é visível para o role anon/authenticated
GRANT SELECT ON public.v_product_active_badge TO anon, authenticated;

COMMENT ON VIEW public.v_product_active_badge IS
'Hierarquia canônica de badges por produto. Prioridade: stockout > new > bestseller > featured > on_sale > gift_box. Use active_badge para exibição no catálogo — nunca calcule a prioridade no frontend.';
;
