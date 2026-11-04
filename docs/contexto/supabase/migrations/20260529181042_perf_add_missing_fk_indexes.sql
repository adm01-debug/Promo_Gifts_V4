-- Add covering indexes for foreign keys flagged by Supabase performance advisor.
-- Improves FK join/cascade performance. Both tables are currently empty, so the
-- build is instant. Idempotent.
CREATE INDEX IF NOT EXISTS idx_personalization_simulations_product_id
  ON public.personalization_simulations (product_id);
CREATE INDEX IF NOT EXISTS idx_user_allowed_ips_created_by
  ON public.user_allowed_ips (created_by);
