-- BUG P1: o CHECK valid_quote_status rejeitava 'pending_approval' e 'viewed',
-- ambos presentes no tipo canônico QuoteStatus (src/types/quote.ts) e usados
-- em todo o frontend (fluxo de aprovação de desconto, timeline, kanban, filtros).
-- Qualquer save/update para esses status falhava com SQLSTATE 23514.
-- Correção: alinhar a constraint à união canônica de 9 status do aplicativo.
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS valid_quote_status;
ALTER TABLE public.quotes ADD CONSTRAINT valid_quote_status
  CHECK (status = ANY (ARRAY[
    'draft','pending','pending_approval','sent','viewed',
    'approved','converted','rejected','expired'
  ]::text[]));;
