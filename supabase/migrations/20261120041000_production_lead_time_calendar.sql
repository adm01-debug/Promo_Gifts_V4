-- Rollback: supabase/rollbacks/20261120041000_rollback.sql
--
-- Migration: prazo de produção em dias úteis — coluna por técnica, calendário de feriados
--
-- Bloco H, etapa 71 do plano de frete de 19/11/2026. O cálculo do prazo
-- (src/lib/lead-time) precisa de três dados que ainda não existem no banco:
--   (a) o prazo de personalização REGISTRADO por produto × local × técnica;
--   (b) a lista de feriados em que não se conta dia útil;
--   (c) a definição de products.lead_time_days como exceção do padrão do fornecedor.
--
-- Conferido por SELECT em produção (doufsxqlfjyuvxuezpln) em 2026-11-20:
--   print_area_techniques: 16 colunas, 25263 linhas, 10 MB, sem production_days.
--   Depende dela: 4 views (v_audit_paradoxos_gravacao, v_gravacao_cobertura,
--   v_print_area_techniques_public, v_super_filtro_options) e 12 funções. Nenhuma
--   é recriada: coluna nova não muda view já criada, e as funções citam colunas
--   pelo nome. Os grants são de TABELA (anon SELECT; authenticated SELECT/INSERT/
--   UPDATE/DELETE), então a coluna nova herda o acesso das demais; não há grant de
--   coluna a ajustar. public.business_calendar não existia.

-- ── (a) prazo de personalização por técnica ────────────────────────────────
ALTER TABLE public.print_area_techniques
  ADD COLUMN IF NOT EXISTS production_days integer;

-- ADD CONSTRAINT não tem IF NOT EXISTS: a guarda mantém a migration reexecutável.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.print_area_techniques'::regclass
       AND conname = 'print_area_techniques_production_days_check'
  ) THEN
    ALTER TABLE public.print_area_techniques
      ADD CONSTRAINT print_area_techniques_production_days_check
      CHECK (production_days IS NULL OR (production_days >= 0 AND production_days <= 365));
  END IF;
END $$;

COMMENT ON COLUMN public.print_area_techniques.production_days IS
  'Dias úteis de personalização para este produto × local × técnica. NULL = usa prazo_dias da faixa da tabela de preço';

-- ── (b) calendário de feriados ─────────────────────────────────────────────
-- soft-delete-exempt: feriado é dado de calendário sem histórico a preservar, e o admin remove a data errada de vez (DELETE físico é o contrato).
CREATE TABLE IF NOT EXISTS public.business_calendar (
  day         date PRIMARY KEY,
  description text NOT NULL
              CONSTRAINT business_calendar_description_check
              CHECK (description ~ '\S' AND length(description) <= 120),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.business_calendar IS
  'Feriados em que não se conta dia útil no prazo de produção (src/lib/lead-time). Uma linha por data. Sábado e domingo não entram: a biblioteca já os pula.';
COMMENT ON COLUMN public.business_calendar.day IS 'Data do feriado (AAAA-MM-DD). Chave primária: uma linha por dia.';
COMMENT ON COLUMN public.business_calendar.description IS 'Nome do feriado em português, até 120 caracteres.';
COMMENT ON COLUMN public.business_calendar.created_at IS 'Criação do registro.';
COMMENT ON COLUMN public.business_calendar.created_by IS 'Usuário que cadastrou. Nulo no seed e quando o usuário é removido.';

-- RLS: leitura para qualquer autenticado (o vendedor precisa dos feriados para
-- calcular o prazo no orçamento); escrita só para admin, pelo public.is_admin()
-- que as policies de shipping_boxes usam.
ALTER TABLE public.business_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_calendar_select_authenticated ON public.business_calendar;
CREATE POLICY business_calendar_select_authenticated
  ON public.business_calendar FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS business_calendar_insert_admin ON public.business_calendar;
CREATE POLICY business_calendar_insert_admin
  ON public.business_calendar FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS business_calendar_update_admin ON public.business_calendar;
CREATE POLICY business_calendar_update_admin
  ON public.business_calendar FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS business_calendar_delete_admin ON public.business_calendar;
CREATE POLICY business_calendar_delete_admin
  ON public.business_calendar FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- `authenticated` entra no REVOKE para perder REFERENCES/TRIGGER/MAINTAIN herdados
-- dos privilégios padrão; a concessão abaixo devolve só o que a tela usa.
REVOKE ALL ON public.business_calendar FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_calendar TO service_role;

-- ── (c) seed: feriados nacionais e pontos facultativos nacionais 2026 e 2027 ──
-- Carnaval (seg/ter) e Corpus Christi são ponto facultativo por lei federal, não
-- feriado; entram porque a produção para nesses dias (prazo mais conservador).
-- Fixos: 1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11, 25/12.
-- Móveis, a partir da Páscoa (algoritmo de Meeus/Gauss): 2026 = 05/04, 2027 = 28/03.
--   Carnaval segunda = Páscoa − 48 dias, terça = Páscoa − 47,
--   Sexta-feira Santa = Páscoa − 2, Corpus Christi = Páscoa + 60.
-- Feriado estadual e municipal fica de fora: o admin cadastra pela tela.
INSERT INTO public.business_calendar (day, description) VALUES
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-02-16', 'Carnaval (segunda-feira)'),
  ('2026-02-17', 'Carnaval (terça-feira)'),
  ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'),
  ('2026-06-04', 'Corpus Christi'),
  ('2026-09-07', 'Independência do Brasil'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Consciência Negra'),
  ('2026-12-25', 'Natal'),
  ('2027-01-01', 'Confraternização Universal'),
  ('2027-02-08', 'Carnaval (segunda-feira)'),
  ('2027-02-09', 'Carnaval (terça-feira)'),
  ('2027-03-26', 'Sexta-feira Santa'),
  ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do Trabalho'),
  ('2027-05-27', 'Corpus Christi'),
  ('2027-09-07', 'Independência do Brasil'),
  ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),
  ('2027-11-15', 'Proclamação da República'),
  ('2027-11-20', 'Consciência Negra'),
  ('2027-12-25', 'Natal')
ON CONFLICT (day) DO NOTHING;

-- ── (d) significado de products.lead_time_days ─────────────────────────────
-- Conferido em produção: a coluna existe (integer). O comentário anterior era
-- "Prazo de produção em dias úteis. 82% preenchido (NULL=herda fornecedor). Valores: 2 ou 3."
COMMENT ON COLUMN public.products.lead_time_days IS
  'Prazo de liberação do fornecedor em dias úteis. Igual ao padrão do fornecedor = herdado; diferente = exceção por produto.';
