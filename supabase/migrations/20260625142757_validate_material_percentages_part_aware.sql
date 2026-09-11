-- MELHORIA 3: validacao de % era global por produto, incompativel com composicao por
-- parte (corpo 100% + tampa 100% estouraria 200%). Agora soma por (produto, parte) NULL-safe.
-- Dados atuais (part constante 'corpo') => comportamento inalterado; desbloqueia parte real.
CREATE OR REPLACE FUNCTION public.validate_material_percentages()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE total_percentage DECIMAL; current_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(percentage),0) INTO total_percentage
  FROM product_materials
  WHERE product_id = NEW.product_id
    AND organization_id = NEW.organization_id
    AND part IS NOT DISTINCT FROM NEW.part
    AND is_active = true
    AND (TG_OP = 'INSERT' OR id <> NEW.id);
  current_total := total_percentage + COALESCE(NEW.percentage, 0);
  IF current_total > 100 THEN
    RAISE EXCEPTION 'Total de percentuais da parte "%" excede 100%% (atual: %, novo: %)',
      COALESCE(NEW.part,'(sem parte)'), total_percentage, NEW.percentage;
  END IF;
  RETURN NEW;
END;
$fn$;;
