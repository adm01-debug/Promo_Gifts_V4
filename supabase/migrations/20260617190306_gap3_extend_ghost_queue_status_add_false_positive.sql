
-- ============================================================================
-- GAP-3: Adicionar status 'false_positive' ao CHECK constraint
-- Semântica: imagem marcada como morta mas confirmada viva (timing artifact)
-- Distinção importante de 'checked_alive' (verificação genuína de vitalidade)
-- ============================================================================

-- Drop e recria constraint com novo valor
ALTER TABLE cf_recon.cf_ghost_check_queue
  DROP CONSTRAINT cf_ghost_check_queue_status_check;

ALTER TABLE cf_recon.cf_ghost_check_queue
  ADD CONSTRAINT cf_ghost_check_queue_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'checked_alive'::text,
    'checked_dead'::text,
    'error'::text,
    'false_positive'::text  -- imagem ghost check prematuro: existia mas não havia sido uploadada ainda
  ]));

-- COMMENT no constraint para documentar o novo valor
COMMENT ON TABLE cf_recon.cf_ghost_check_queue IS
'Fila de verificação de imagens "fantasma" — CF IDs registrados que podem não existir mais.
status: pending=aguardando check | checked_alive=confirmado vivo | checked_dead=confirmado morto
        error=falha no check | false_positive=marcado morto mas imagem uploadada DEPOIS do check.
17.834 rows: 17.827 checked_dead (sem product_images), 7 false_positive (xbz-15465p-*).';
;
