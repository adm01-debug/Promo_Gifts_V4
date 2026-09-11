DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid='public.quotes'::regclass
                   AND conname='chk_quotes_discount_approval_status') THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT chk_quotes_discount_approval_status
      CHECK (discount_approval_status IS NULL
             OR discount_approval_status IN ('pending','approved','rejected','expired'));
  END IF;
END $$;;
