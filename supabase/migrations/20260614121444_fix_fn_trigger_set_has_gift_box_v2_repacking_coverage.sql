
-- ============================================================
-- FIX P1-A: fn_trigger_set_has_gift_box v2
-- MUDANÇA vs v1: cobre repacking_classification='commercial'
-- (os 8 produtos Spot tinham repacking='commercial' mas
--  packing_classification=NULL → gift_box ficava FALSE)
-- Nova regra: has_gift_box=TRUE se QUALQUER classificação=commercial
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_trigger_set_has_gift_box()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.packing_classification = 'commercial'
     OR NEW.repacking_classification = 'commercial'
  THEN
    NEW.has_gift_box             := TRUE;
    NEW.has_commercial_packaging := TRUE;
  ELSE
    NEW.has_gift_box             := FALSE;
    NEW.has_commercial_packaging := FALSE;
  END IF;
  RETURN NEW;
END;
$$;
;
