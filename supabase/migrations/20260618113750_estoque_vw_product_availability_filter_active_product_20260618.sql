
-- vw_product_availability reportava disponibilidade de variantes sob produtos
-- DESPUBLICADOS (is_active=false). Disponibilidade só faz sentido para produto
-- ativo. Adiciona JOIN+filtro de produto ativo. (Os 103 componentes/refis
-- despublicados permanecem ATIVOS — inventário legítimo — apenas deixam de
-- aparecer como "disponíveis".)
CREATE OR REPLACE VIEW public.vw_product_availability AS
SELECT pv.id AS variant_id,
    pv.product_id,
    pv.sku,
    pv.stock_quantity,
    pv.next_quantity_1,
    pv.next_date_1,
    pv.next_quantity_2,
    pv.next_date_2,
    pv.next_quantity_3,
    pv.next_date_3,
    CASE
        WHEN pv.stock_quantity > 0 THEN 'in_stock'::text
        WHEN pv.stock_quantity = 0 AND pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE THEN 'out_of_stock_with_restock'::text
        ELSE 'out_of_stock'::text
    END AS availability_status,
    pv.stock_quantity = 0 AND pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE AS has_incoming_stock,
    pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE AS has_upcoming_restock,
    pv.last_sync_at
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.is_active = true
  AND p.is_active = true;

NOTIFY pgrst, 'reload schema';
;
