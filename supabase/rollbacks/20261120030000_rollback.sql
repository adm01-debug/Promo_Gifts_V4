-- Rollback: 20261120030000_harden_freight_tables
--
-- Devolve public.shipping_boxes e public.freight_settings ao estado em que as
-- migrations 20261119213000 e 20261119213100 as deixaram: saem os CHECKs de
-- formato e de faixa e os dois triggers guard_*, volta a policy de DELETE do
-- admin, voltam os privilégios herdados do schema e os dois comentários
-- antigos. Nenhum dado é apagado nem alterado.
--
-- Efeito de reverter: o banco volta a aceitar código de caixa com espaço ou em
-- minúscula, medida NaN, divisor de cubagem fora de faixa, DELETE físico de
-- caixa pelo admin e updated_by enviado pelo cliente. Os dados gravados
-- enquanto a migration esteve aplicada continuam válidos.
--
-- Ordem, se for desfazer tudo: 20261120030100 → este → 20261119213100 →
-- 20261119213000. Rodado depois dos dois últimos (tabelas já removidas), este
-- arquivo só remove as duas funções guard_* e não dá erro.
--
-- Os privilégios voltam exatamente como eram (anon com REFERENCES e TRIGGER;
-- authenticated com SELECT, INSERT, UPDATE, DELETE, REFERENCES e TRIGGER; os
-- dois com MAINTAIN no PostgreSQL 17 ou mais novo), porque é o estado em que a
-- versão anterior do sistema foi validada. MAINTAIN não existe antes do 17,
-- por isso o GRANT dele é condicional. PUBLIC não tinha privilégio nenhum nas
-- duas tabelas antes da migration e continua sem.
--
-- Idempotente e seguro em transação única (psql -1).

DO $$
BEGIN
  IF to_regclass('public.shipping_boxes') IS NULL THEN
    RAISE NOTICE 'public.shipping_boxes não existe: nada a reverter nela.';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS guard_shipping_boxes_row ON public.shipping_boxes;

  ALTER TABLE public.shipping_boxes
    DROP CONSTRAINT IF EXISTS shipping_boxes_code_format,
    DROP CONSTRAINT IF EXISTS shipping_boxes_name_format,
    DROP CONSTRAINT IF EXISTS shipping_boxes_outer_height_cm_range,
    DROP CONSTRAINT IF EXISTS shipping_boxes_outer_width_cm_range,
    DROP CONSTRAINT IF EXISTS shipping_boxes_outer_length_cm_range,
    DROP CONSTRAINT IF EXISTS shipping_boxes_max_weight_g_ceiling;

  DROP POLICY IF EXISTS shipping_boxes_delete_admin ON public.shipping_boxes;
  CREATE POLICY shipping_boxes_delete_admin
    ON public.shipping_boxes FOR DELETE
    TO authenticated
    USING (public.is_admin());

  GRANT REFERENCES, TRIGGER ON public.shipping_boxes TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
    ON public.shipping_boxes TO authenticated;
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'GRANT MAINTAIN ON public.shipping_boxes TO anon, authenticated';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.freight_settings') IS NULL THEN
    RAISE NOTICE 'public.freight_settings não existe: nada a reverter nela.';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS guard_freight_settings_row ON public.freight_settings;

  ALTER TABLE public.freight_settings
    DROP CONSTRAINT IF EXISTS freight_settings_cubic_divisor_correios_range,
    DROP CONSTRAINT IF EXISTS freight_settings_cubic_divisor_rodoviario_range,
    DROP CONSTRAINT IF EXISTS freight_settings_internal_buffer_days_ceiling;

  GRANT REFERENCES, TRIGGER ON public.freight_settings TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
    ON public.freight_settings TO authenticated;
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'GRANT MAINTAIN ON public.freight_settings TO anon, authenticated';
  END IF;

  COMMENT ON COLUMN public.freight_settings.default_fill_factor IS
    'Fator de aproveitamento usado quando a caixa não tem o próprio (0,50 a 1,00). Padrão 0,90.';
  COMMENT ON COLUMN public.freight_settings.updated_by IS
    'Usuário admin que fez a última alteração.';
END $$;

DROP FUNCTION IF EXISTS public.guard_freight_settings_row();
DROP FUNCTION IF EXISTS public.guard_shipping_boxes_row();
