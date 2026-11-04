CREATE OR REPLACE FUNCTION public.calculate_mockup_job_estimated_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  base_cost       numeric(10,4);
  color_count     integer;
  area_count      integer;
  tech_multiplier numeric(4,2);
BEGIN
  IF NEW.ai_model = 'pro' THEN base_cost := 0.60;
  ELSE base_cost := 0.10;
  END IF;
  
  color_count := jsonb_array_length(NEW.product_colors);
  area_count  := jsonb_array_length(NEW.areas_config);
  
  SELECT COALESCE(base_cost_multiplier, 1.0) INTO tech_multiplier
  FROM public.personalization_techniques WHERE id = NEW.technique_id;
  
  NEW.total_mockups   := color_count * area_count;
  NEW.estimated_cost  := base_cost * color_count * area_count * COALESCE(tech_multiplier, 1.0);
  RETURN NEW;
END $function$
