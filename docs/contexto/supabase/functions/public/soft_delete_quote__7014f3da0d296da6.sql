CREATE OR REPLACE FUNCTION public.soft_delete_quote(_quote_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_status text;
BEGIN
  -- Lê o status atual respeitando RLS (só acessa quotes visíveis ao caller)
  SELECT status INTO _current_status FROM public.quotes WHERE id = _quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado ou sem permissão de acesso'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Proteção: não cancelar estados terminais de negócio
  IF _current_status IN ('converted', 'cancelled') THEN
    RAISE EXCEPTION 'Não é possível cancelar um orçamento com status "%". Apenas orçamentos ativos podem ser cancelados.',
      _current_status
      USING ERRCODE = '23514';
  END IF;

  -- Permite cancelar se o caller é dono ou coordenador+
  UPDATE public.quotes
  SET    status     = 'cancelled',
         updated_at = now()
  WHERE  id         = _quote_id
    AND  (seller_id = auth.uid()
          OR created_by  = auth.uid()
          OR public.is_coord_or_above(auth.uid()));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem permissão para cancelar este orçamento'
      USING ERRCODE = '42501';
  END IF;
END;
$function$
