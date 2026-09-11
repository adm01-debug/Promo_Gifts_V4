
-- ================================================================
-- MELHORIA-01: tecnicas_gravacao — adicionar id UUID
-- O wizard admin (useEngravingWizard) lê .id de ExternalTechnique,
-- mas tecnicas_gravacao não tem coluna id → undefined → FK inválida.
-- Solução: adicionar id UUID gerado (não PK, mantém codigo como PK).
-- ================================================================
ALTER TABLE public.tecnicas_gravacao
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

-- Índice único para o id
CREATE UNIQUE INDEX IF NOT EXISTS uq_tecnicas_gravacao_id
  ON public.tecnicas_gravacao(id);

-- Verificação
SELECT codigo, id FROM public.tecnicas_gravacao ORDER BY codigo LIMIT 5;
;
