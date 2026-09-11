
-- COMMENTs nas colunas 0-registro de variant_supplier_sources
COMMENT ON COLUMN public.variant_supplier_sources.next_quantity_4 IS
'Restock slot 4. Hoje 0 registros. API Spot não retorna 4+ slots. DROP requer refatoração coordenada (5 funções + frontend).';
COMMENT ON COLUMN public.variant_supplier_sources.next_quantity_5 IS 'Restock slot 5. Hoje 0 registros. DROP requer refatoração coordenada.';
COMMENT ON COLUMN public.variant_supplier_sources.next_quantity_6 IS 'Restock slot 6. Hoje 0 registros. DROP requer refatoração coordenada.';
COMMENT ON COLUMN public.variant_supplier_sources.next_date_4 IS 'Data restock slot 4. Hoje 0 registros. DROP requer refatoração coordenada.';
COMMENT ON COLUMN public.variant_supplier_sources.next_date_5 IS 'Data restock slot 5. Hoje 0 registros.';
COMMENT ON COLUMN public.variant_supplier_sources.next_date_6 IS 'Data restock slot 6. Hoje 0 registros.';
COMMENT ON COLUMN public.variant_supplier_sources.csosn IS 'CSOSN fiscal. Hoje 0 registros. 7 refs frontend. DROP requer sprint fiscal dedicada.';
COMMENT ON TABLE public.variant_supplier_sources IS
'Fonte dados por variante x fornecedor. BACKLOG: cost_price_1..5+min_qty_1..5 → supplier_price_tiers; next_quantity/date_1..6 → variant_restock_schedule. Bloqueado por 24+ refs frontend.';
;
