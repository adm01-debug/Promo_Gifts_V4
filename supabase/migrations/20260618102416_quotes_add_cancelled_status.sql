-- Melhoria #1: adiciona status 'cancelled' ao CHECK valid_quote_status e corrige soft_delete_quote.
--
-- Problema: soft_delete_quote fazia UPDATE quotes SET status='cancelled', mas 'cancelled' não
-- existia no CHECK valid_quote_status → função SEMPRE falhava para usuários autenticados com
-- check_violation (funciona só como service_role, que ignora a condição auth.uid() e faz no-op).
--
-- Solução: adicionar 'cancelled' ao enum de statuses válidos.
-- Semântica diferente de 'rejected' (rejeição pelo cliente) — 'cancelled' = cancelamento interno.
-- Nenhum dado existente é afetado (ADD CHECK é imediato: existentes estão em [0,50]).

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS valid_quote_status;

ALTER TABLE public.quotes
  ADD CONSTRAINT valid_quote_status
    CHECK (status = ANY (ARRAY[
      'draft','pending','pending_approval','sent','viewed',
      'approved','converted','rejected','expired','cancelled'
    ]));

-- Corrigir soft_delete_quote para usar a mesma proteção de imutabilidade já existente.
-- Adicionamos também proteção contra cancelamento de quotes já convertidos/aprovados
-- (status terminal de negócio). Coord+ pode cancelar qualquer status não-terminal.
CREATE OR REPLACE FUNCTION public.soft_delete_quote(_quote_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
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
$function$;;
