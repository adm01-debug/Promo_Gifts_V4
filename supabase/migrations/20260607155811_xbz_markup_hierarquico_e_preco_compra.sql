
-- Correção field mapping PrecoVenda → cost_price (era suggested_price)
UPDATE supplier_field_mappings SET target_field='cost_price', updated_at=now()
WHERE id = 'ecd01dd4-b9c0-451c-a2bf-1e56d23b8181';

-- Regra de markup XBZ no nível de fornecedor (115%)
INSERT INTO markup_configurations (supplier_id, markup_percent, description, is_active)
SELECT 'd6718a29-e954-4c1b-bd84-03ea24884900', 115.0,
       'XBZ Brindes — markup padrão fornecedor (115% sobre custo)', true
WHERE NOT EXISTS (
    SELECT 1 FROM markup_configurations
    WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'
      AND category_id IS NULL AND product_id IS NULL AND is_active = true
);
;
