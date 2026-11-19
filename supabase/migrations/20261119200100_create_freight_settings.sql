-- Migration: cria public.freight_settings — parâmetros globais do cálculo de frete
--
-- Bloco C, etapa 23 do plano de frete de 19/11/2026. Linha única: os fatores do
-- motor (src/lib/freight) e o CEP de origem moram aqui, nunca no código.
--
-- soft-delete-exempt: tabela de configuração de linha única — não há registro
-- de negócio a excluir, e apagar a linha deixaria o motor sem parâmetros.
-- (Sem ponto-e-vírgula neste comentário de propósito: o gate de soft-delete
-- procura o marcador a partir do último ponto-e-vírgula antes do CREATE TABLE.)
CREATE TABLE IF NOT EXISTS public.freight_settings (
  -- Chave booleana travada em TRUE: a PK impede uma segunda linha e o CHECK
  -- impede que a única seja FALSE. É o padrão de singleton sem trigger.
  id                         boolean PRIMARY KEY DEFAULT true CHECK (id),

  origin_cep                 text NOT NULL DEFAULT '03377-000'
                             CHECK (origin_cep ~ '^[0-9]{5}-[0-9]{3}$'),

  cubic_divisor_correios     integer NOT NULL DEFAULT 6000 CHECK (cubic_divisor_correios > 0),
  cubic_divisor_rodoviario   integer NOT NULL DEFAULT 3333 CHECK (cubic_divisor_rodoviario > 0),

  default_fill_factor        numeric(3,2) NOT NULL DEFAULT 0.90
                             CHECK (default_fill_factor BETWEEN 0.50 AND 1.00),

  internal_buffer_days       integer NOT NULL DEFAULT 0 CHECK (internal_buffer_days >= 0),

  multi_personalization_rule text NOT NULL DEFAULT 'max'
                             CHECK (multi_personalization_rule IN ('max', 'sum')),

  updated_at                 timestamptz NOT NULL DEFAULT now(),
  updated_by                 uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE OR REPLACE TRIGGER set_freight_settings_updated_at
  BEFORE UPDATE ON public.freight_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE  public.freight_settings IS
  'Parâmetros globais do cálculo de frete (linha única). Lidos pelo motor em src/lib/freight; alterados só por admin em /admin/frete.';
COMMENT ON COLUMN public.freight_settings.id IS 'Sempre TRUE. A PK booleana com CHECK garante que a tabela tem no máximo uma linha.';
COMMENT ON COLUMN public.freight_settings.origin_cep IS 'CEP de origem das remessas, formato 00000-000. Padrão: 03377-000 (Av. Renata, 249 – Vila Formosa, São Paulo/SP).';
COMMENT ON COLUMN public.freight_settings.cubic_divisor_correios IS 'Divisor de cubagem dos Correios em cm³/kg. Padrão 6000.';
COMMENT ON COLUMN public.freight_settings.cubic_divisor_rodoviario IS 'Divisor de cubagem do transporte rodoviário em cm³/kg. Padrão 3333.';
COMMENT ON COLUMN public.freight_settings.default_fill_factor IS 'Fator de aproveitamento usado quando a caixa não tem o próprio (0,50 a 1,00). Padrão 0,90.';
COMMENT ON COLUMN public.freight_settings.internal_buffer_days IS 'Folga interna em dias úteis somada ao prazo de produção. Padrão 0.';
COMMENT ON COLUMN public.freight_settings.multi_personalization_rule IS 'Como combinar os prazos de várias personalizações no mesmo item: max (a mais demorada) ou sum (soma). Padrão max.';
COMMENT ON COLUMN public.freight_settings.updated_at IS 'Última alteração, mantida pelo trigger set_freight_settings_updated_at.';
COMMENT ON COLUMN public.freight_settings.updated_by IS 'Usuário admin que fez a última alteração.';

-- A linha única nasce com os padrões confirmados pelo dono em 19/11/2026.
INSERT INTO public.freight_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Leitura para qualquer autenticado (o motor roda na tela do vendedor);
-- alteração só para admin. Sem policy de INSERT nem de DELETE: a linha única
-- nasce nesta migration e não deve ser recriada nem apagada pela aplicação.
ALTER TABLE public.freight_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS freight_settings_select_authenticated ON public.freight_settings;
CREATE POLICY freight_settings_select_authenticated
  ON public.freight_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS freight_settings_update_admin ON public.freight_settings;
CREATE POLICY freight_settings_update_admin
  ON public.freight_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, UPDATE ON public.freight_settings TO authenticated;
