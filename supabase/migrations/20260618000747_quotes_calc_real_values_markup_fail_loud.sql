-- Melhoria #1: markup fail-loud.
-- Antes: o trigger sobrescrevia NEW.negotiation_markup_percent com o valor clampado em
-- [0,50], mascarando o CHECK valid_negotiation_markup_range e tornando markup fora de faixa
-- um clamp SILENCIOSO (inconsistente com o frontend, que lança erro acima de 50).
-- Agora: o valor cru chega ao CHECK e é REJEITADO se fora de [0,50]. Para dados válidos o
-- comportamento é idêntico (a cópia local clampada continua sendo usada só como divisor
-- defensivo do real_subtotal; para markup em [0,50] equivale ao próprio valor).
CREATE OR REPLACE FUNCTION public.fn_quotes_calc_real_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_markup numeric;
BEGIN
  -- Cópia local clampada usada APENAS como divisor defensivo (não regrava a coluna).
  -- A faixa válida é garantida pelo CHECK valid_negotiation_markup_range ([0,50]):
  -- valores fora de faixa são rejeitados pelo constraint (fail-loud), não silenciados.
  v_markup := LEAST(50, GREATEST(0, COALESCE(NEW.negotiation_markup_percent, 0)));

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
$function$;;
