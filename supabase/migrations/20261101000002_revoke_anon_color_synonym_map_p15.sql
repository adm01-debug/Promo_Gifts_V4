-- Migration: 20261101000002_revoke_anon_color_synonym_map_p15.sql
-- FASE B — P15: Revogar acesso anon irrestrito em color_synonym_map (SEG-003)
-- Aprovado pelo PO (PR #2443 mergeada 2026-10-26 + autorização 2026-11-01)
-- Evidência: color_synonym_map não usado no frontend (apenas types.ts) — grep 2026-11-01
-- Dado interno: mapeamento supplier_id × canonical_color (confidence, notes = interno)
-- ROLLBACK: CREATE POLICY "rls_anon_read_color_synonym_map" ON public.color_synonym_map
--           FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "rls_anon_read_color_synonym_map" ON public.color_synonym_map;
