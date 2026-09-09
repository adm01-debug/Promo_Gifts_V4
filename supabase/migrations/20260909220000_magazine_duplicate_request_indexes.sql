-- Cobertura das FKs internas usadas pela idempotência de duplicação Magazine.
-- Forward-only, aditiva e segura para repetição.

CREATE INDEX IF NOT EXISTS idx_magazine_duplicate_requests_source_magazine_id
  ON public.magazine_duplicate_requests (source_magazine_id);

CREATE INDEX IF NOT EXISTS idx_magazine_duplicate_requests_magazine_id
  ON public.magazine_duplicate_requests (magazine_id);

COMMENT ON INDEX public.idx_magazine_duplicate_requests_source_magazine_id IS
  'Acelera integridade referencial/remoção da revista de origem da duplicação idempotente.';

COMMENT ON INDEX public.idx_magazine_duplicate_requests_magazine_id IS
  'Acelera integridade referencial/remoção da revista criada por duplicação idempotente.';
