CREATE OR REPLACE FUNCTION public.reset_mockup_credit_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.mockup_credits SET 
    current_month_spent = 0.00,
    last_reset_month    = CURRENT_DATE
  WHERE last_reset_month IS NULL OR last_reset_month < date_trunc('month', CURRENT_DATE)::date;
  
  UPDATE public.mockup_credits SET 
    current_day_spent = 0.00,
    last_reset_day    = CURRENT_DATE
  WHERE last_reset_day IS NULL OR last_reset_day < CURRENT_DATE;
END $function$
