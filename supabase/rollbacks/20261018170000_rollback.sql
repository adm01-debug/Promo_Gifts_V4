-- Rollback de E069: recria o índice prefix removido.
CREATE INDEX IF NOT EXISTS idx_user_organizations_user
  ON public.user_organizations(user_id);
