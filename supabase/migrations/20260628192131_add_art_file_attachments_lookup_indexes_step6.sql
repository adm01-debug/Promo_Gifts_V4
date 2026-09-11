-- fix_version: 2026-06-28 logo-hi-res | Passo 6 da feature "logo cliente colorida/mono" (Gerador de Mockup).
-- Indices para lookup de anexos de arte de PRODUCAO por mockup e por orcamento.
-- O backfill (frontend) vincula art_file_attachments.mockup_id ao generated_mockups.id
-- apos saveMockupToDb; as telas de historico/anexos consultam por mockup_id e quote_id.
-- Parciais (WHERE ... IS NOT NULL): o upload do vetor ocorre na config (ANTES do mockup
-- existir) -> muitas linhas terao mockup_id NULL ate o backfill; o parcial so indexa as
-- linhas ja vinculadas (economia de espaco, indice quente). Simulacao adversarial provou
-- Index Scan + predicado parcial correto antes da aplicacao.
-- ANTI-REGRESSAO (Lovable bot): NAO remover sem substituir o caminho de consulta de anexos
-- por mockup/orcamento. IF NOT EXISTS => idempotente (seguro a reaplicacao/regeneracao).
CREATE INDEX IF NOT EXISTS idx_art_file_attachments_mockup_id
  ON public.art_file_attachments (mockup_id)
  WHERE mockup_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_art_file_attachments_quote_id
  ON public.art_file_attachments (quote_id)
  WHERE quote_id IS NOT NULL;

COMMENT ON INDEX public.idx_art_file_attachments_mockup_id IS
  'fix_version: 2026-06-28 logo-hi-res. Lookup de anexos de arte por mockup (Passo 6: backfill de mockup_id pos saveMockupToDb). Parcial WHERE mockup_id IS NOT NULL.';
COMMENT ON INDEX public.idx_art_file_attachments_quote_id IS
  'fix_version: 2026-06-28 logo-hi-res. Lookup de anexos de arte por orcamento. Parcial WHERE quote_id IS NOT NULL.';;
