
-- ============================================================================
-- GAP-4: Security hardening das tabelas de auditoria CF
-- Remove grants indevidos a anon/authenticated + documenta intent via policy
-- Autor: Claude (PhD DB forensics) · 2026-06-17
-- Impacto: ZERO — grants eram inacessíveis por RLS desde criação
-- ============================================================================

-- ── 1. REVOGAR grants enganosos de anon/authenticated ──────────────────────
REVOKE ALL PRIVILEGES ON public._cf_images_audit      FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public._img_divergence_audit FROM anon, authenticated;

-- ── 2. Garantir acesso correto ao service_role (explícito) ─────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public._cf_images_audit      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public._img_divergence_audit TO service_role;

-- ── 3. Policy RESTRICTIVE explícita: documenta intent de acesso negado ─────
-- service_role e postgres têm BYPASSRLS = nunca afetados por policies
-- anon/authenticated: bloqueados por esta policy + ausência de grant
DROP POLICY IF EXISTS "audit_internal_deny_public" ON public._cf_images_audit;
CREATE POLICY "audit_internal_deny_public"
  ON public._cf_images_audit
  AS RESTRICTIVE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "audit_internal_deny_public" ON public._img_divergence_audit;
CREATE POLICY "audit_internal_deny_public"
  ON public._img_divergence_audit
  AS RESTRICTIVE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ── 4. COMMENTs que documentam propósito + acesso ──────────────────────────
COMMENT ON TABLE public._cf_images_audit IS
'Mirror local do Cloudflare Images (conta cd0f4eee). 72k+ rows. PK=cf_id.
Populada via fn_cf_audit_ingest(p_rows jsonb) com dados da API CF paginada.
Bidirecionalmente sincronizada com cf_recon.cf_image.
ACESSO: service_role + postgres apenas (BYPASSRLS). anon/authenticated: BLOQUEADO por design.
Criada: 2026-06-16. Última sincronização: 2026-06-17.';

COMMENT ON TABLE public._img_divergence_audit IS
'Log de decisões de remediação durante auditoria CF×DB de 2026-06-16.
Classes: D1_ASIA_COR2 (1.025 rows), D2_KEY (607 rows). Todos executed=true.
Referenciada por fn_asia_reactivate_done_colors e fn_img_remediation_rollback.
ACESSO: service_role + postgres apenas. anon/authenticated: BLOQUEADO por design.';

COMMENT ON FUNCTION public.fn_cf_audit_ingest(jsonb) IS
'Ingest paginado da API Cloudflare Images → _cf_images_audit.
Recebe array JSONB (response CF /images/v1), faz UPSERT por cf_id.
Retorna INTEGER = nº de rows afetadas.
SECURITY DEFINER (roda como postgres, bypassa RLS).
VOLATILE (correto — escreve no DB a cada chamada).
Chamada por: n8n workflow de crawl CF ou script VPS xbz_video_import.js.';
;
