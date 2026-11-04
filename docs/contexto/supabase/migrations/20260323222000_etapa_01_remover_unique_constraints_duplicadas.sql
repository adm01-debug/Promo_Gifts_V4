-- ETAPA 1: Remover UNIQUE constraints duplicadas
-- product_commemorative_dates: tem 3 constraints para (product_id, commemorative_date_id)
-- Manter apenas: uq_product_commemorative_date
ALTER TABLE public.product_commemorative_dates 
  DROP CONSTRAINT IF EXISTS product_commemorative_dates_unique;

ALTER TABLE public.product_commemorative_dates 
  DROP CONSTRAINT IF EXISTS uq_product_commemorative;

-- product_tags: tem 2 constraints para (product_id, tag_id)
-- Manter apenas: product_tags_product_id_tag_id_key
ALTER TABLE public.product_tags 
  DROP CONSTRAINT IF EXISTS product_tags_product_tag_unique;

-- supplier_field_mappings: tem 2 constraints para (supplier_id, source_field, target_table, target_field)
-- Manter apenas: uq_field_mapping
ALTER TABLE public.supplier_field_mappings 
  DROP CONSTRAINT IF EXISTS supplier_field_mappings_unique;
