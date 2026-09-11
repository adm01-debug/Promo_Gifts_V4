CREATE INDEX IF NOT EXISTS idx_quotes_discount_approval_status
  ON public.quotes (discount_approval_status)
  WHERE discount_approval_status IS NOT NULL;;
