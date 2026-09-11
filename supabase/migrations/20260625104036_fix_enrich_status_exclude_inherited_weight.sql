-- MELHORIA 3: enrichment_status não conta peso inherited_total como dado real
CREATE OR REPLACE FUNCTION public.fn_pkc_auto_enrich_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_has_dims       BOOLEAN;
  v_has_all        BOOLEAN;
  v_real_weight    BOOLEAN;  -- peso real: excluí inherited_total (copiado do total do produto-pai)
BEGIN
  -- circunferência a partir do diâmetro (lógica original preservada)
  IF NEW.shape_type = 'cylindrical' AND NEW.diameter_mm IS NOT NULL
     AND (NEW.circumference_mm IS NULL OR (TG_OP='UPDATE' AND OLD.diameter_mm IS DISTINCT FROM NEW.diameter_mm))
  THEN NEW.circumference_mm := ROUND(PI() * NEW.diameter_mm);
  END IF;

  -- peso "real" = preenchido E NÃO é herança do total do produto-pai
  v_real_weight := (NEW.weight_g IS NOT NULL
    AND coalesce(NEW.weight_source, 'estimated_heuristic') <> 'inherited_total');

  IF NEW.is_packaging = TRUE THEN
    v_has_all  := (NEW.pkg_ext_length_mm IS NOT NULL
                   AND NEW.pkg_ext_width_mm  IS NOT NULL
                   AND NEW.pkg_ext_height_mm IS NOT NULL
                   AND v_real_weight);
    v_has_dims := (NEW.pkg_ext_length_mm IS NOT NULL
                   AND NEW.pkg_ext_width_mm  IS NOT NULL
                   AND NEW.pkg_ext_height_mm IS NOT NULL)
               OR NEW.length_mm IS NOT NULL;
  ELSE
    CASE COALESCE(NEW.shape_type, 'rectangular')
      WHEN 'cylindrical' THEN
        v_has_all  := NEW.diameter_mm IS NOT NULL AND NEW.height_mm IS NOT NULL AND v_real_weight;
        v_has_dims := NEW.diameter_mm IS NOT NULL OR NEW.height_mm IS NOT NULL;
      WHEN 'flat' THEN
        v_has_all  := NEW.length_mm IS NOT NULL AND NEW.width_mm IS NOT NULL AND v_real_weight;
        v_has_dims := NEW.length_mm IS NOT NULL OR v_real_weight;
      WHEN 'spherical' THEN
        v_has_all  := NEW.diameter_mm IS NOT NULL AND v_real_weight;
        v_has_dims := NEW.diameter_mm IS NOT NULL;
      ELSE -- rectangular: weight não é requisito para 'complete' (exige 3 dims)
        v_has_all  := NEW.length_mm IS NOT NULL AND NEW.width_mm IS NOT NULL AND NEW.height_mm IS NOT NULL;
        v_has_dims := NEW.length_mm IS NOT NULL OR v_real_weight OR NEW.diameter_mm IS NOT NULL;
    END CASE;
  END IF;

  NEW.enrichment_status := CASE
    WHEN v_has_all  THEN 'complete'
    WHEN v_has_dims THEN 'partial'
    ELSE 'missing'
  END;
  RETURN NEW;
END;
$function$;;
