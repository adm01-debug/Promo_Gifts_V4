
-- fn_xbz_enrich_from_site v2: cobre todos os 8 campos disponíveis em site_data
-- Trigger: BEFORE INSERT OR UPDATE em produtos_padronizacao (XBZ only)
-- Campos: weight_g, height_cm, width_cm, length_cm, capacity_ml,
--         dimensions_display, description, primary_image_url,
--         engraving_type, related_references
-- JOIN: raw_id (PK) + LIKE fallback para variantes multi-cor
-- ORDER: prioriza variante com gravação + relacionados + mais imagens
SELECT 1; -- DDL já aplicado via execute_sql
;
