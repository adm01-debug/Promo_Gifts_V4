-- Reconciliação CF ↔ product_images (2026-06-17 — Claude)
-- 792 missing ativos: 787 não-críticos → soft-delete; 5 críticos (primary/last_active) → orphaned

-- Bloco A: marcar como orphaned as 5 imagens críticas (4 primaries + 1 ativa do mesmo produto)
UPDATE public.product_images
SET 
  cf_sync_status = 'orphaned',
  cf_last_error = COALESCE(cf_last_error, '') || ' | claude_recon_20260617: marked orphaned (primary or last active without verified alternative)',
  last_modified_source = 'claude',
  updated_at = now()
WHERE cf_sync_status = 'missing'
  AND deleted_at IS NULL
  AND (is_primary = true OR is_active = true);

-- Bloco B: soft-delete dos demais 787 missing (não-primary, não-ativos)
UPDATE public.product_images
SET 
  deleted_at = now(),
  deleted_reason = 'cf_recon_20260617_claude: missing in Cloudflare and not primary/active (787 batch)',
  cf_sync_status = 'orphaned',
  last_modified_source = 'claude',
  updated_at = now()
WHERE cf_sync_status = 'missing'
  AND deleted_at IS NULL
  AND is_primary = false
  AND is_active = false;
