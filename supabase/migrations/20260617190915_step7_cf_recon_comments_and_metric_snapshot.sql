
-- ============================================================================
-- STEP 7: COMMENTs em todas as tabelas cf_recon + metric_snapshot atualizado
-- ============================================================================

-- ── 1. COMMENTs nos schemas e tabelas cf_recon ─────────────────────────────
COMMENT ON SCHEMA cf_recon IS
'Schema de reconciliação Cloudflare Images × DB. Criado 2026-06-16 durante auditoria forense.
Contém: cf_image (mirror CF), crawl_run (histórico de crawls), cf_ghost_check_queue (IDs suspeitos),
action_log (log imutável de decisões), remediation (plano de remediações), metric_snapshot (KPIs).';

COMMENT ON TABLE cf_recon.cf_image IS
'Mirror completo do Cloudflare Images. 72.079 rows (= public._cf_images_audit).
PK = image_id (CF Image ID). Rastreia first_seen_at e last_seen_at por crawl.
NOTA: public._cf_images_audit é o espelho em public para JOIN direto em queries operacionais.
Sincronização bidirecional realizada em 2026-06-17.';

COMMENT ON TABLE cf_recon.crawl_run IS
'Histórico de crawls à API CF. 1 crawl parcial realizado (2026-06-16 23:44 UTC).
cf_total_reported=72.086. Crawl completo (~721 páginas) deve rodar periodicamente.';

COMMENT ON TABLE cf_recon.cf_ghost_check_queue IS
'Fila de verificação de IDs CF suspeitos. 17.834 checked_dead (infer. estatística 325 amostras),
7 false_positive (xbz-15465p-* uploadados APÓS o ghost check).
Nenhum ghost_dead tem produto ativo no DB — pure histórico de IDs deletados do CF.';

COMMENT ON TABLE cf_recon.action_log IS
'Log permanente e imutável de todas as decisões tomadas sobre imagens CF.
actor default = claude. Não fazer DELETE nesta tabela — é evidência de auditoria.';

COMMENT ON TABLE cf_recon.metric_snapshot IS
'Snapshots periódicos de métricas de reconciliação CF×DB.
Inserir via INSERT ON CONFLICT DO UPDATE por taken_at (aproximado ao dia).';

COMMENT ON TABLE cf_recon.remediation IS
'Plano de remediações pendentes. status: open|in_progress|done|cancelled.
Linkar às entradas de action_log quando executado.';

-- ── 2. Metric snapshot do estado atual (pós-cleanup de 2026-06-17) ─────────
INSERT INTO cf_recon.metric_snapshot (taken_at, metrics)
VALUES (
  now(),
  jsonb_build_object(
    'date', '2026-06-17',
    'session', 'phd_db_forensics_gap_resolution',

    -- Volumes principais
    'cf_api_total', 72173,
    'audit_table_total', 72079,
    'cf_recon_cf_image_total', 72079,
    'product_images_active', 72079,
    'product_images_inactive', 0,

    -- Reconciliação
    'audit_intersect_product_images', 72079,
    'audit_orphans_sem_pi', 0,
    'pi_ativas_sem_audit', 0,
    'delta_cf_vs_audit', 94,   -- CF(72173) - audit(72079): ~94 in-transit/pipeline

    -- Ghost queue
    'ghost_checked_dead', 17827,
    'ghost_false_positive', 7,
    'ghost_total', 17834,

    -- Qualidade (mv_product_images_audit)
    'mv_score_avg', 99.97,
    'mv_score_min', 85.7,
    'mv_priority_ok', 71928,
    'mv_priority_p0', 0,
    'mv_priority_p1', 0,
    'mv_priority_p2', 0,
    'mv_inativas', 0,

    -- Gaps resolvidos
    'gaps_resolved', jsonb_build_array(
      'GAP-4: RLS cleanup + policies + comments',
      'GAP-3: 7 false_positives corrigidos (ghost_queue)',
      'GAP-2: 11 ASIA phantoms deletados (nao_em_CF + nao_em_PI)',
      'GAP-1: 33 imagens pos-crawl sincronizadas audit+cf_recon',
      'STRUCT: 5 indexes em _cf_images_audit',
      'STRUCT: REFRESH mv_product_images_audit',
      'STRUCT: COMMENTs em todos os objetos'
    ),

    -- Cloudflare
    'cf_plan_limit', 100000,
    'cf_usage_pct', 72.2,
    'cf_delivery_hash', 'vKMs9Ow8bA_enuhLXZ2HAw'
  )
);
;
