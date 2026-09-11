ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS discount_approval_status text,
  ADD COLUMN IF NOT EXISTS discount_approved_at timestamptz;;
