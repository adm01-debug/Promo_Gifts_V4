
-- FIX #8C + #3: Atualizar v_product_active_badge com:
-- (a) is_low_stock: badge #8 baseado no threshold do fornecedor
-- (b) novelty_days_remaining: badge #2 countdown
-- (c) badge_subtype: distingue #2 (countdown) de #3 (fallback)
-- (d) Adicionar is_low_stock na hierarquia de active_badge

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
  p.has_commercial_packaging,
  -- Badge #8: Estoque Baixo (computado vs threshold do fornecedor)
  (p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold) AS is_low_stock,
  -- Dias restantes de novidade (para countdown #2)
  CASE
    WHEN p.is_new AND p.novelty_expires_at IS NOT NULL AND p.novelty_expires_at > NOW()
    THEN GREATEST(0, EXTRACT(DAY FROM (p.novelty_expires_at - NOW()))::integer)
    ELSE NULL
  END                 AS novelty_days_remaining,
  -- Subtipo do badge de novidade: 'countdown' (#2) ou 'fallback' (#3)
  CASE
    WHEN p.is_new AND p.novelty_expires_at IS NOT NULL AND p.novelty_expires_at > NOW()
    THEN 'countdown'
    WHEN p.is_new
    THEN 'fallback'
    ELSE NULL
  END                 AS novelty_badge_subtype,
  -- Badge ativo canônico — hierarquia completa (agora inclui low_stock)
  -- LEFT BADGES (sup. esq.): featured > new > bestseller > on_sale > gift_box
  -- RIGHT BADGES (sup. dir.): stockout > low_stock
  CASE
    WHEN p.is_stockout                                               THEN 'stockout'
    WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'low_stock'
    WHEN p.is_new                                                    THEN 'new'
    WHEN p.is_bestseller                                             THEN 'bestseller'
    WHEN p.is_featured                                               THEN 'featured'
    WHEN p.is_on_sale                                                THEN 'on_sale'
    WHEN p.has_gift_box                                              THEN 'gift_box'
    ELSE                                                                  'none'
  END                 AS active_badge,
  -- Badge do catálogo (NULL para inativos = não exibir)
  CASE
    WHEN NOT p.is_active                                             THEN NULL
    WHEN p.is_stockout                                               THEN 'stockout'
    WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'low_stock'
    WHEN p.is_new                                                    THEN 'new'
    WHEN p.is_bestseller                                             THEN 'bestseller'
    WHEN p.is_featured                                               THEN 'featured'
    WHEN p.is_on_sale                                                THEN 'on_sale'
    WHEN p.has_gift_box                                              THEN 'gift_box'
    ELSE                                                                  'none'
  END                 AS catalog_badge,
  -- Label PT-BR (NULL para inativos)
  CASE
    WHEN NOT p.is_active                                             THEN NULL
    WHEN p.is_stockout                                               THEN 'Fora de estoque'
    WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'Estoque baixo'
    WHEN p.is_new AND p.novelty_expires_at > NOW()                   THEN 'Novidade'
    WHEN p.is_new                                                    THEN 'Novo'
    WHEN p.is_bestseller                                             THEN 'Mais vendido'
    WHEN p.is_featured                                               THEN 'Destaque'
    WHEN p.is_on_sale                                                THEN 'Promoção'
    WHEN p.has_gift_box                                              THEN 'Embalagem especial'
    ELSE                                                                  NULL
  END                 AS active_badge_label,
  -- Cor (NULL para inativos)
  CASE
    WHEN NOT p.is_active                                             THEN NULL
    WHEN p.is_stockout                                               THEN 'red'
    WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'orange'
    WHEN p.is_new                                                    THEN 'blue'
    WHEN p.is_bestseller                                             THEN 'amber'
    WHEN p.is_featured                                               THEN 'purple'
    WHEN p.is_on_sale                                                THEN 'green'
    WHEN p.has_gift_box                                              THEN 'teal'
    ELSE                                                                  NULL
  END                 AS active_badge_color,
  -- Total de badges ativos
  (p.is_stockout::int + p.is_new::int + p.is_bestseller::int +
   p.is_featured::int + p.is_on_sale::int + p.has_gift_box::int +
   CASE WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 1 ELSE 0 END
  )                   AS total_badges_ativos,
  p.novelty_expires_at,
  p.novelty_detected_at,
  p.supplier_id,
  s.low_stock_threshold,
  p.updated_at
FROM public.products p
JOIN public.suppliers s ON s.id = p.supplier_id;

GRANT SELECT ON public.v_product_active_badge TO anon, authenticated;

COMMENT ON VIEW public.v_product_active_badge IS
'v2 — Hierarquia canônica de badges. Inclui: is_low_stock (threshold por fornecedor), novelty_days_remaining (countdown #2), novelty_badge_subtype (countdown vs fallback). Badges direita: stockout > low_stock. Badges esquerda: new > bestseller > featured > on_sale > gift_box.';
;
