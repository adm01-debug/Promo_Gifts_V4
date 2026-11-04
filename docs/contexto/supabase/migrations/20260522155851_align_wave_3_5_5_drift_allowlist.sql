-- Wave 3.5.5: Allowlist auditável de drift aceitável

CREATE TABLE IF NOT EXISTS public.schema_drift_allowlist (
  table_name    text PRIMARY KEY,
  reason        text NOT NULL,
  added_by      text NOT NULL,
  added_at      timestamp with time zone NOT NULL DEFAULT now(),
  metadata      jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.schema_drift_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage drift allowlist"
  ON public.schema_drift_allowlist
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.schema_drift_allowlist IS 
  'Tabelas onde divergência de schema entre Lovable interno e Oficial é aceitável por design (cache, infra, legacy).';

-- Popular com as 2 tabelas de divergência aceitável
INSERT INTO public.schema_drift_allowlist (table_name, reason, added_by, metadata) VALUES
  ('bot_detection_log',
   'Implementação independente no Lovable Cloud (infra própria do Lovable, não consumida pelo app de produção). 6 colunas divergentes.',
   'wave_3_5_5_redeploy',
   '{"qty_only_oficial":3,"qty_only_lovable":3,"category":"infra_independente"}'::jsonb),
  ('products',
   'No Lovable é um cache denormalizado do catálogo oficial (com synced_at, external_id, category_name flat, supplier_name flat, images/materials como ARRAY em vez de jsonb). Diferença por design - alinhar quebraria o cache.',
   'wave_3_5_5_redeploy',
   '{"qty_only_oficial":133,"qty_only_lovable":15,"qty_type_diff":2,"category":"cache_denormalizado"}'::jsonb)
ON CONFLICT (table_name) DO UPDATE
  SET reason = EXCLUDED.reason, 
      added_at = now(),
      metadata = EXCLUDED.metadata;

-- Atualizar fn_compute_and_record_drift para considerar allowlist
CREATE OR REPLACE FUNCTION public.fn_compute_and_record_drift(p_lovable_signatures jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_oficial_sigs  jsonb;
  v_only_oficial  text[];
  v_only_lovable  text[];
  v_diff          jsonb := '{}'::jsonb;
  v_has_drift     boolean;
  v_tab_oficial   int;
  v_tab_lovable   int;
  v_log_payload   jsonb;
  v_allowed       text[];
BEGIN
  -- Carregar allowlist
  SELECT array_agg(table_name) INTO v_allowed FROM public.schema_drift_allowlist;
  v_allowed := COALESCE(v_allowed, ARRAY[]::text[]);

  -- Signatures do oficial
  v_oficial_sigs := public.get_public_schema_signatures();

  -- Tabelas só no oficial (excluindo allowlist)
  SELECT array_agg(k ORDER BY k) INTO v_only_oficial
    FROM jsonb_object_keys(v_oficial_sigs) k
   WHERE NOT (p_lovable_signatures ? k)
     AND k != ALL(v_allowed);

  -- Tabelas só no Lovable (excluindo allowlist)
  SELECT array_agg(k ORDER BY k) INTO v_only_lovable
    FROM jsonb_object_keys(p_lovable_signatures) k
   WHERE NOT (v_oficial_sigs ? k)
     AND k != ALL(v_allowed);

  -- Schema diff por tabela presente em ambos com signature diferente (excluindo allowlist)
  SELECT jsonb_object_agg(
           k,
           jsonb_build_object(
             'oficial', v_oficial_sigs -> k,
             'lovable', p_lovable_signatures -> k
           )
         ) INTO v_diff
    FROM jsonb_object_keys(v_oficial_sigs) k
   WHERE p_lovable_signatures ? k
     AND (v_oficial_sigs -> k) <> (p_lovable_signatures -> k)
     AND k != ALL(v_allowed);

  v_diff := COALESCE(v_diff, '{}'::jsonb);

  v_tab_oficial := (SELECT COUNT(*) FROM jsonb_object_keys(v_oficial_sigs));
  v_tab_lovable := (SELECT COUNT(*) FROM jsonb_object_keys(p_lovable_signatures));

  v_has_drift := (COALESCE(array_length(v_only_oficial, 1), 0) > 0
                  OR COALESCE(array_length(v_only_lovable, 1), 0) > 0
                  OR (SELECT COUNT(*) FROM jsonb_object_keys(v_diff)) > 0);

  v_log_payload := jsonb_build_object(
    'has_drift', v_has_drift,
    'tables_oficial', v_tab_oficial,
    'tables_lovable', v_tab_lovable,
    'only_oficial', COALESCE(to_jsonb(v_only_oficial), '[]'::jsonb),
    'only_lovable', COALESCE(to_jsonb(v_only_lovable), '[]'::jsonb),
    'schema_diff', v_diff,
    'allowlist_applied', to_jsonb(v_allowed)
  );

  RETURN public.record_schema_drift_result(v_log_payload);
END;
$$;
