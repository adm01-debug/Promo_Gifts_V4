
-- Adicionar unique constraint que falta
CREATE UNIQUE INDEX IF NOT EXISTS uq_ippa_packaging_area_code
    ON public.included_packaging_print_areas (packaging_id, area_code);

-- Para techniques também
CREATE UNIQUE INDEX IF NOT EXISTS uq_ipt_packaging_technique_code
    ON public.included_packaging_techniques (packaging_id, technique_code);
;
