-- Melhoria #4: índices de performance em quotes.created_at e quotes.created_by.
--
-- Padrão de query mais comum da UI: list de orçamentos ordenados por data decrescente.
-- O índice composto existente (seller_id, organization_id, status) não cobre ORDER BY created_at,
-- causando sort em memória para listas grandes. Corretores de orçamentos alheios (coord+) e
-- buscas por criador também carecem de índice.
--
-- idx_quotes_created_at: para listagens por data (ORDER BY created_at DESC)
-- idx_quotes_created_by: para queries de coord que filtram por quem criou o orçamento

CREATE INDEX IF NOT EXISTS idx_quotes_created_at
  ON public.quotes (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_created_by
  ON public.quotes (created_by)
  WHERE created_by IS NOT NULL;

-- Complementar: índice em converted_at para relatórios de conversão
CREATE INDEX IF NOT EXISTS idx_quotes_converted_at
  ON public.quotes (converted_at DESC)
  WHERE converted_at IS NOT NULL;;
