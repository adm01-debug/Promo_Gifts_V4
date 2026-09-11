
-- Refinamento: o check constraint dar_valid_until_required_when_approved já garante
-- que status='approved' implica valid_until IS NOT NULL. Portanto a retrocompat
-- "NULL = sem vencimento" é desnecessária para novos registros.
-- Mantemos (valid_until IS NULL OR valid_until > now()) para registros legados
-- (criados antes do constraint existir) e como defesa em profundidade.
-- A lógica do trigger permanece correta como está após a migration anterior.
-- Esta migration documenta o constraint descoberto e não altera código.
COMMENT ON CONSTRAINT dar_valid_until_required_when_approved
  ON public.discount_approval_requests
  IS 'Garante que aprovações sempre têm vencimento explícito. '
     'O trigger fn_quotes_validate_discount verifica valid_until > now() '
     '(ou IS NULL como retrocompat para registros legados). '
     'O hook respondToApproval define valid_until = now() + 30 days ao aprovar.';
;
