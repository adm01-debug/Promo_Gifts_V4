-- ============================================================================
-- LOTE A · MIGRATION 3/6 · password_reset_requests
-- Origem: Lovable Cloud (pqpdolkaeqlyzpdpbizo)
-- Propósito: fluxo manual de aprovação de reset de senha (plataforma fechada)
-- ============================================================================

CREATE TABLE public.password_reset_requests (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  email          text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'::text,
  requested_at   timestamptz NULL     DEFAULT now(),
  reviewed_at    timestamptz NULL,
  reviewed_by    uuid        NULL,
  reviewer_notes text        NULL,
  user_id        uuid        NULL,
  CONSTRAINT password_reset_requests_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id),
  CONSTRAINT password_reset_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT password_reset_requests_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);

CREATE INDEX idx_password_reset_requests_email
  ON public.password_reset_requests USING btree (email);

CREATE INDEX idx_password_reset_requests_status
  ON public.password_reset_requests USING btree (status);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a password reset"
  ON public.password_reset_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view password reset requests"
  ON public.password_reset_requests
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role])
    )
  );

CREATE POLICY "Admins can update password reset requests"
  ON public.password_reset_requests
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role])
    )
  );

COMMENT ON TABLE public.password_reset_requests IS
  'Migrado do Lovable em 2026-05-22 (Lote A). Reset de senha aprovado manualmente.';
