BEGIN;

-- 1. fn_quotes_calc_real_values
CREATE OR REPLACE FUNCTION public.fn_quotes_calc_real_values()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_markup numeric;
BEGIN
  v_markup := LEAST(50, GREATEST(0, COALESCE(NEW.negotiation_markup_percent, 0)));
  NEW.negotiation_markup_percent := v_markup;

  IF v_markup > 0 THEN
    NEW.real_subtotal := ROUND(NEW.subtotal / (1 + v_markup / 100.0), 2);
  ELSE
    NEW.real_subtotal := NEW.subtotal;
  END IF;

  IF NEW.real_subtotal > 0 THEN
    NEW.real_discount_percent := ROUND(
      ((NEW.real_subtotal - (NEW.subtotal - COALESCE(NEW.discount_amount, 0))) / NEW.real_subtotal) * 100,
      2
    );
  ELSE
    NEW.real_discount_percent := 0;
  END IF;

  RETURN NEW;
END
$function$;

COMMENT ON FUNCTION public.fn_quotes_calc_real_values() IS
  'Onda 19 follow-up: registra em migrations função que existia só como drift. '
  'Calcula real_subtotal e real_discount_percent a partir do subtotal COM markup; '
  'clamp markup 0-50%. Usada pelo trigger trg_quotes_calc_real_values.';

-- 2. fn_kit_print_area_normalizar_eixos
CREATE OR REPLACE FUNCTION public.fn_kit_print_area_normalizar_eixos()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_temp numeric;
BEGIN
  IF NEW.max_width IS NOT NULL THEN
    NEW.max_width := ROUND(NEW.max_width::numeric, 2);
  END IF;
  IF NEW.max_height IS NOT NULL THEN
    NEW.max_height := ROUND(NEW.max_height::numeric, 2);
  END IF;

  IF NEW.max_height IS NOT NULL AND NEW.max_width IS NOT NULL
     AND NEW.max_height > NEW.max_width THEN
    v_temp        := NEW.max_width;
    NEW.max_width  := NEW.max_height;
    NEW.max_height := v_temp;
  END IF;

  RETURN NEW;
END
$function$;

COMMENT ON FUNCTION public.fn_kit_print_area_normalizar_eixos() IS
  'Onda 19 follow-up: registra em migrations função que existia só como drift. '
  'Arredonda max_width/max_height a 2 casas e normaliza eixos (largura >= altura). '
  'Usada pelo trigger trg_kit_print_area_normalizar_eixos.';

-- 3. Restaurar hardening de v_audit_paradoxos_gravacao
ALTER VIEW public.v_audit_paradoxos_gravacao SET (security_invoker = true);
REVOKE ALL ON public.v_audit_paradoxos_gravacao FROM anon;
REVOKE ALL ON public.v_audit_paradoxos_gravacao FROM authenticated;

COMMIT;
