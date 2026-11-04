-- frontend_telemetry: tabela usada pelo src/services/telemetryService.ts
-- App registra eventos de erro, performance, ux_action, api_fail.
-- Sem ela o app dispara POST /rest/v1/frontend_telemetry 404 várias vezes
-- por sessão, gerando ruído nos logs e disparando ErrorBoundary em partes
-- da UI (sidebar/header não renderizavam).

CREATE TABLE IF NOT EXISTS public.frontend_telemetry (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  name        text NOT NULL,
  duration_ms numeric,
  metadata    jsonb DEFAULT '{}'::jsonb,
  url         text,
  user_agent  text,
  session_id  text,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis pra consulta de eventos (admin/telemetry dashboards)
CREATE INDEX IF NOT EXISTS frontend_telemetry_created_at_idx
  ON public.frontend_telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS frontend_telemetry_event_type_idx
  ON public.frontend_telemetry (event_type);
CREATE INDEX IF NOT EXISTS frontend_telemetry_user_id_idx
  ON public.frontend_telemetry (user_id) WHERE user_id IS NOT NULL;

-- RLS: qualquer usuário autenticado pode inserir o próprio evento;
-- leitura é restrita (admin via service_role tem acesso total por padrão).
ALTER TABLE public.frontend_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY frontend_telemetry_insert_authenticated
  ON public.frontend_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY frontend_telemetry_insert_anon
  ON public.frontend_telemetry
  FOR INSERT
  TO anon
  WITH CHECK (true);
