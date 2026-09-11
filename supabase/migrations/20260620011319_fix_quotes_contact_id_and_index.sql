
-- Add contact_id column to quotes (CRM contact reference, no FK — external DB)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS contact_id UUID NULL;

COMMENT ON COLUMN public.quotes.contact_id IS
  'ID do contato no CRM externo (pgxfvjmuubtbowutlide). Sem FK — banco externo.';

-- Composite index for RLS + listing queries (seller_id is the RLS key)
CREATE INDEX IF NOT EXISTS idx_quotes_seller_org_status
  ON public.quotes(seller_id, organization_id, status);

-- Sparse index for contact lookups
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id
  ON public.quotes(contact_id)
  WHERE contact_id IS NOT NULL;
;
