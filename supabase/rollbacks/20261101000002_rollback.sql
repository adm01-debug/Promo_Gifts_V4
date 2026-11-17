-- Rollback de 20261101000002_revoke_anon_color_synonym_map_p15.sql.
-- Recria a policy de leitura de anon e devolve os GRANTs de escrita.
-- ATENÇÃO: isto reabre a leitura de public.color_synonym_map para anon (mapeamento
-- interno supplier_id × canonical_color, com confidence e notes) e devolve privilégios
-- de escrita que hoje estão mortos. Aplicar só se a revogação quebrar algo em produção.

DO $rollback$
BEGIN
  IF to_regclass('public.color_synonym_map') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'color_synonym_map'
      AND policyname = 'rls_anon_read_color_synonym_map'
  ) THEN
    CREATE POLICY "rls_anon_read_color_synonym_map"
      ON public.color_synonym_map FOR SELECT TO anon USING (true);
  END IF;
  GRANT INSERT, UPDATE, DELETE ON public.color_synonym_map TO anon;
END
$rollback$;
