CREATE OR REPLACE FUNCTION public.fn_quotes_enforce_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _msg text;
BEGIN
  -- fix_version=2026-07-09-immutability-service-role-bypass ANTI-REGRESSÃO
  -- Bypass para service_role via JWT claim (PostgREST com JWT token)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- NOVO: Bypass para contexto sem usuário autenticado (service_role sem JWT,
  -- edge functions com service_role_key, execute_sql, migrations, crons).
  -- auth.uid() IS NULL = indicador robusto de service_role sem JWT.
  -- O bypass request.jwt.claim.role acima falha quando NULL (NULL='service_role'→FALSE).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status NOT IN ('approved', 'converted') THEN
    RETURN NEW;
  END IF;

  IF OLD.* IS NOT DISTINCT FROM NEW.* THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> NEW.status THEN
    IF (OLD.status = 'approved' AND NEW.status IN ('converted', 'expired'))
       OR (OLD.status = 'converted' AND NEW.status = 'expired') THEN
      IF (
        OLD.client_id IS DISTINCT FROM NEW.client_id OR
        OLD.client_name IS DISTINCT FROM NEW.client_name OR
        OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
        OLD.discount_percent IS DISTINCT FROM NEW.discount_percent OR
        OLD.discount_amount IS DISTINCT FROM NEW.discount_amount OR
        OLD.total IS DISTINCT FROM NEW.total OR
        OLD.negotiation_markup_percent IS DISTINCT FROM NEW.negotiation_markup_percent OR
        OLD.real_subtotal IS DISTINCT FROM NEW.real_subtotal OR
        OLD.real_discount_percent IS DISTINCT FROM NEW.real_discount_percent OR
        OLD.shipping_cost IS DISTINCT FROM NEW.shipping_cost OR
        OLD.tax_amount IS DISTINCT FROM NEW.tax_amount OR
        OLD.seller_id IS DISTINCT FROM NEW.seller_id OR
        OLD.created_by IS DISTINCT FROM NEW.created_by OR
        OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
      ) THEN
        _msg := 'Orcamento em status ' || OLD.status ||
                ' e imutavel. So a transicao de status e permitida; valores e atribuicoes nao podem mudar. Crie um novo orcamento.';
        RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    ELSE
      _msg := 'Transicao de status nao permitida: ' || OLD.status || ' para ' || NEW.status ||
              '. Orcamento em status ' || OLD.status || ' so pode ir para converted ou expired.';
      RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
    END IF;
  END IF;

  _msg := 'Orcamento em status ' || OLD.status ||
          ' e imutavel. Crie um novo orcamento para alterar valores.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$function$
