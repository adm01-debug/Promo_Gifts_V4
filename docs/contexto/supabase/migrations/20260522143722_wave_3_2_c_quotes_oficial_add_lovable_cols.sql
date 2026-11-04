-- ============================================================================
-- Wave 3.2.C · Oficial · quotes adicionar colunas do Lovable
-- ============================================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS parent_quote_id   uuid,
  ADD COLUMN IF NOT EXISTS is_latest_version boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS payment_method    text,
  ADD COLUMN IF NOT EXISTS sent_at           timestamptz;

-- FK auto-referente para versionamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='quotes_parent_quote_id_fkey'
      AND conrelid='public.quotes'::regclass
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_parent_quote_id_fkey
      FOREIGN KEY (parent_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;
  END IF;
END$$;

COMMENT ON COLUMN public.quotes.parent_quote_id IS
  'Wave 3.2.C 2026-05-22: versionamento de orcamento, FK auto-referente.';
COMMENT ON COLUMN public.quotes.is_latest_version IS
  'Wave 3.2.C 2026-05-22: marca a versao mais recente para queries (paridade Lovable).';
