CREATE INDEX IF NOT EXISTS idx_generated_mockups_user_created
  ON public.generated_mockups (user_id, created_at DESC);;
