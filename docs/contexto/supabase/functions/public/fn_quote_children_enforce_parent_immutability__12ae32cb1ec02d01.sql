CREATE OR REPLACE FUNCTION public.fn_quote_children_enforce_parent_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _parent_quote_id uuid;
  _parent_status text;
  _msg text;
BEGIN
  -- fix_version=2026-07-09-quote-children-immutability-bypass ANTI-REGRESSÃO
  -- Bypass para service_role via JWT claim (PostgREST com JWT token)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- NOVO: Bypass para contexto sem usuário autenticado (service_role sem JWT,
  -- edge functions com service_role_key, execute_sql, migrations, crons).
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'quote_items' THEN
    _parent_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  ELSIF TG_TABLE_NAME = 'quote_item_personalizations' THEN
    SELECT qi.quote_id INTO _parent_quote_id
    FROM public.quote_items qi
    WHERE qi.id = COALESCE(NEW.quote_item_id, OLD.quote_item_id);
  END IF;

  IF _parent_quote_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO _parent_status
  FROM public.quotes WHERE id = _parent_quote_id;

  IF _parent_status IN ('approved', 'converted') THEN
    _msg := 'Nao e possivel alterar itens de orcamento ja aprovado/convertido (status ' ||
            _parent_status || '). Crie um novo orcamento.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
