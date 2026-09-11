-- =====================================================================
-- Least-privilege na superfície de RPC (defense-in-depth)
-- fix_version: 20260626_rpc_lockdown_v1
-- Trava 19 funções SECURITY DEFINER que ESCREVEM e eram executáveis por
-- 'anon' (e 'authenticated') via PostgREST RPC. São funções 100% backend
-- (pipeline de vídeo/Cloudflare Stream, fila de AI-enrichment, MCP KV),
-- invocadas apenas por service_role (n8n/workers/edge word-magic) ou
-- cron (postgres/owner). Comprovado: 0 chamadas no frontend src/, único
-- caller fora do front é a edge function word-magic via SERVICE_ROLE_KEY.
-- Risco fechado: anon injetar AI falso em produtos, inundar fila (custo/DoS),
-- corromper a fila de vídeo. Estado final: EXECUTE só p/ service_role (+owner).
-- ANTI-REGRESSAO: se o daemon/Lovable recriar estas funções, reaplicar este
-- bloco (CREATE OR REPLACE reintroduz o GRANT EXECUTE TO PUBLIC default).
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.fn_asia_link_video FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_dequeue_ai_enrichment FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_enqueue_ai_enrichment FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_save_ai_enrichment_results FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sm_link_video FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_spot_enqueue_new_videos FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_spot_enqueue_vimeo_eu FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_spot_link_video FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_link_to_products FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_queue_next FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_queue_recover_stuck FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_queue_update FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_retry_errors FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_set_dimensions FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_video_sim_upsert FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_xbz_enqueue_videos FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_xbz_link_video FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_kv_set FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_kv_try_lock FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.fn_asia_link_video, public.fn_dequeue_ai_enrichment, public.fn_enqueue_ai_enrichment,
  public.fn_save_ai_enrichment_results, public.fn_sm_link_video, public.fn_spot_enqueue_new_videos,
  public.fn_spot_enqueue_vimeo_eu, public.fn_spot_link_video, public.fn_video_link_to_products,
  public.fn_video_queue_next, public.fn_video_queue_recover_stuck, public.fn_video_queue_update,
  public.fn_video_retry_errors, public.fn_video_set_dimensions, public.fn_video_sim_upsert,
  public.fn_xbz_enqueue_videos, public.fn_xbz_link_video, public.mcp_kv_set, public.mcp_kv_try_lock
  TO service_role;
NOTIFY pgrst, 'reload schema';;
