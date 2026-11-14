# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `75030fabf1` · branch `main` · 2026-11-14 04:18 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `_asia_api_staging` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `_backup_stock_daily_summary_20260618` | _(sem COMMENT ON TABLE — significado não documentado)_ | 23 colunas | migration |
| `_deprecated_silver_images_queue_20260606` | Camada Silver — fila de imagens.  | 23 colunas | migration |
| `_deprecated_silver_print_areas_20260606` | Camada Silver — área de gravação normalizada.  | 26 colunas | migration |
| `_deprecated_silver_products_20260606` | Camada Silver — produto normalizado por fornecedor.  | 54 colunas | migration |
| `_deprecated_silver_variants_20260606` | Camada Silver — variante normalizada por fornecedor.  | 42 colunas | migration |
| `_qa_pct_results` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `access_blocked_log` | Log de acessos bloqueados pelo sistema de segurança (geo/IP blocking).  STATUS: Tabela pronta e estruturada — aguarda implementação do escritor (edge function). ⚠️ NENHUMA função ou trigger escreve aqui ainda. 0 registros em jun/2026.  PROPÓSITO:   Registrar toda tentativa de acesso bloqueada pelas regras de segurança:   bloqueio por IP, geolocalização, país não permitido, cidade bloqueada, etc.   Serve como auditoria forense e base para alertas de segurança.  ESCRITOR PENDENTE (a implementar):   Edge function 'geo-access-control' deve inserir aqui ao bloquear um acesso.    🔑 OBRIGATÓRIO: a edge function DEVE usar a chave service_role (não anon).      A policy de INSERT exige authenticated + is_admin_or_above().      Requisições bloqueadas são anônimas — só service_role bypassa a RLS.      Se usar anon key, o INSERT falha silenciosamente e o log fica vazio.    Exemplo de chamada via supabaseAdmin (service_role):     const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);     await supabaseAdmin.from('access_blocked_log').insert({       ip_address: req.ip,       block_reason: 'country_not_allowed',       email: user?.email ?? null,       city, state, country,       user_agent: req.headers['user-agent']     });    Razões válidas para block_reason:     - 'ip_blocked'          → IP na lista negra (ip_access_control)     - 'country_not_allowed'  → país fora de geo_allowed_countries     - 'city_blocked'         → cidade na blacklist (city_whitelist)     - 'rate_limit'           → muitas tentativas em curto período     - 'suspicious_pattern'   → comportamento anômalo detectado  RLS POLICIES (2 ativas):   - INSERT: authenticated + is_admin_or_above() → inserção manual por admin   - SELECT: authenticated + is_admin_or_above() → leitura de auditoria por admin   - UPDATE: sem policy → log imutável (append-only por design)   - DELETE: sem policy → auditoria preservada permanentemente   ⚠️ Edge function não usa estas policies — usa service_role que bypassa RLS.  ÍNDICES (criados em 2026-06-15):   - idx_access_blocked_log_created_at (created_at DESC) → queries de auditoria por período   - idx_access_blocked_log_ip (ip_address) → busca de IP específico bloqueado  TABELAS DO MESMO ECOSSISTEMA DE SEGURANÇA:   - ip_access_control      → define IPs bloqueados/permitidos (1 regra ativa)   - login_attempts         → log de tentativas de login (1.240 registros ativos)   - ip_whitelist           → IPs sempre permitidos (vazia — a preencher)   - city_whitelist         → cidades permitidas/bloqueadas (vazia — a preencher)   - geo_allowed_countries  → países permitidos (vazia — a preencher)   - user_allowed_ips       → IPs liberados por usuário (vazia — a preencher)  CAMPOS:   - id           → uuid gerado automaticamente   - email        → conta que tentou acessar (nullable — pode ser anônimo)   - ip_address   → IP de origem (obrigatório, NOT NULL)   - city/state/country → geolocalização do IP (via serviço externo)   - block_reason → motivo do bloqueio (obrigatório, NOT NULL)   - user_agent   → browser/dispositivo de origem   - created_at   → timestamp automático (now()) | 9 colunas | migration |
| `access_security_settings` | Singleton de configuracao de seguranca do sistema (sempre 1 linha). Criada em 2026-05-24, provavelmente pelo Lovable ao montar o painel admin de seguranca.  PROPOSITO: armazenar os parametros globais que controlam:   • bloqueio por IP (ip_whitelist_enabled + tabela ip_whitelist)   • bloqueio por cidade (city_whitelist_enabled + tabela city_whitelist)   • bloqueio de localizacoes desconhecidas (block_unknown_locations)   • lockout por tentativas falhas (max_failed_attempts + lockout_duration_minutes)   • modo strict (strict_access_mode)  ESTADO ATUAL (2026-06-15): FEATURE INCOMPLETA   • Frontend consegue ler e gravar esta tabela via RLS (admin/dev).   • NENHUMA funcao Postgres le esses flags e age sobre eles.   • Ou seja: mesmo que ip_whitelist_enabled = true, NADA e bloqueado.   • A tabela e um cockpit sem motor.  ECOSSISTEMA RELACIONADO (tabelas irmas):   • ip_whitelist             (0 linhas) — lista de IPs permitidos   • city_whitelist           (0 linhas) — lista de cidades permitidas   • access_blocked_log       (0 linhas) — log de acessos bloqueados   • login_attempts           (1.240 linhas) — UNICA tabela ativa do ecosistema   • auth_login_attempts      (0 linhas) — duplicata inativa de login_attempts   • ip_access_control        (1 linha)  — controle adicional de IP   • device_login_notifications (0 linhas)   • security_settings        (0 linhas) — alternativa key-value, vazia   • mcp_access_violations    (0 linhas)  PROXIMO PASSO: implementar fn_enforce_security_settings() e fn_check_login_allowed(p_ip, p_user_id, p_city) que leiam esta tabela e apliquem os bloqueios. Ver comentario de roadmap nas colunas abaixo.  NAO ARQUIVAR / NAO DROPAR — tabela de feature incompleta, nao abandonada. | 9 colunas | migration |
| `achievements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `admin_audit_log` | LIVRO DE OCORRÊNCIAS ADMINISTRATIVAS — trilha imutável de ações de alto risco executadas por admins.  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ O QUE É ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Equivalente ao livro de ocorrências de segurança de um datacenter. Registra SOMENTE eventos administrativos de alto risco: logouts forçados, cutover de banco, hardening de segurança, bloqueio de rotas, revogação de chaves MCP. NÃO é lugar para erros de frontend — esses vão para frontend_telemetry.  Estado atual (2026-06-15): ~40 linhas. Normal. Saudável. Tamanho: 88 KB (limite operacional esperado: < 5 MB).  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ QUEM ESCREVE AQUI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Funções de backend autorizadas (todas SECURITY DEFINER):   • log_audit(action, resource_type, resource_id, details)  → chamada genérica   • log_user_logout(user_id)                               → logout forçado   • log_access_denied(...)                                 → rota bloqueada   • log_mcp_key_changes / audit_mcp_key_insert / _revoke   → ciclo de vida de chaves MCP   • audit_mcp_api_keys_changes                             → trigger em mcp_sessions   • audit_user_role_changes                                → trigger em user_roles   • auto_block_extreme_offenders                           → bloqueio automático de IPs   • force_user_logout                                      → admin expulsa sessão   • record_dev_route_telemetry                             → acesso a rotas de dev   • execute_role_migration_batch                           → migração de papéis em lote  NUNCA escrever diretamente via supabase.from('admin_audit_log').insert() no frontend — RLS bloqueará se o usuário não for is_admin_or_above().  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RLS (ROW LEVEL SECURITY) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ INSERT → authenticated + is_admin_or_above(uid) + user_id = auth.uid() SELECT → authenticated + can_view_audit_logs(uid) UPDATE → BLOQUEADO (não existe policy) DELETE → BLOQUEADO (não existe policy) anon   → ZERO acesso  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ VALORES ESPERADOS EM `action` ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   user.logout         → admin ou sistema expirou uma sessão   user.login          → login administrativo registrado   cutover             → troca de ambiente / migração crítica   hardening           → operação de segurança aplicada   route.access_denied → tentativa de acesso a rota restrita   route.ux_event      → evento de UX em rota administrativa   mcp_key_insert      → nova chave MCP criada   mcp_key_revoke      → chave MCP revogada   role_change         → papel de usuário alterado   force_logout        → sessão encerrada à força por admin   access_denied       → acesso negado (genérico)  SE APARECER `client_error` → BUG NO FRONTEND. Ver seção HISTÓRICO abaixo.  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ COM QUEM CONVIVE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   frontend_telemetry  → AQUI vão os erros de frontend (React/JS).                         Tem RLS para anon + authenticated.                         Retenção: 30 dias via fn_cleanup_log_tables.    mcp_sessions        → trigger audit_mcp_api_keys_changes escreve aqui                         quando uma sessão MCP é criada/revogada.    user_roles          → trigger audit_user_role_changes escreve aqui                         quando um papel é alterado.    login_attempts      → tabela irmã para tentativas de login (não aqui).    bot_detection_log   → tabela irmã para detecção de bots (não aqui).  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RETENÇÃO E CLEANUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Gerenciada por DUAS funções (redundância intencional):    fn_cleanup_log_tables()      → roda TODO DOMINGO 03:00 (cron job 50)     • action != 'client_error' → deleta rows com created_at > 90 dias     • action = 'client_error'  → deleta rows com created_at > 7 dias    cleanup_security_logs()      → roda TODO DIA 03:30 (cron job 21)     • Mesma lógica 90d / 7d (belt + suspenders)    clean_old_audit_logs(days)   → função manual para admins (parâmetro livre)  Esperado: < 500 rows em produção normal. Se > 5.000 rows → investigar se o frontend está escrevendo client_error nesta tabela por engano.  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ COMO RECUPERAR QUANDO TRAVA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SINTOMA 1 — Tabela com > 10.000 rows de 'client_error':   O frontend voltou a escrever aqui por engano (regressão em error-reporter.ts).   SOLUÇÃO:     DELETE FROM admin_audit_log WHERE action = 'client_error';     VACUUM FULL admin_audit_log;   E corrigir src/lib/error-reporter.ts → .from('frontend_telemetry')  SINTOMA 2 — INSERT falhando com "new row violates row-level security":   O código chamante não é admin ou está passando user_id errado.   SOLUÇÃO: chamar via SECURITY DEFINER function (log_audit), nunca direto.  SINTOMA 3 — Tabela ocupando > 500 MB:   Cleanup não está rodando. Verificar:     SELECT * FROM cron.job WHERE jobname IN ('cleanup-security-logs','cleanup-log-tables-weekly');   Se inactive → SELECT cron.alter_job(job_id, active := true);  SINTOMA 4 — VACUUM FULL necessário (bloat > 20%):   VACUUM FULL public.admin_audit_log;  -- requer lock breve (~40 rows = < 1s)  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HISTÓRICO DE CORREÇÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2026-06-15 — CORREÇÃO CRÍTICA (PR #774, commit b75607d):   PROBLEMA: src/lib/error-reporter.ts enviava TODOS os erros React/JS para   esta tabela com action='client_error'. Resultado: 42.946 linhas de ruído   de desenvolvimento acumuladas (60 MB em uma tabela de auditoria).   CAUSA RAIZ: erro de design — a tabela de audit foi usada como sink de   telemetria de frontend porque era a mais acessível para usuários autenticados.   SOLUÇÃO:     1. DELETE 42.946 rows (action='client_error')     2. VACUUM FULL → 60 MB → 88 KB     3. error-reporter.ts redirecionado para frontend_telemetry     4. Belt+suspenders: cleanup automático de client_error com 7 dias     5. Retention de audit real harmonizada para 90 dias em ambas as funções        (era 365 dias em cleanup_security_logs — conflito com fn_cleanup_log_tables) | 10 colunas | migration |
| `admin_audit_log_y2025m12` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_audit_log_y2026m01` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_audit_log_y2026m02` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_audit_log_y2026m03` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_audit_log_y2026m04` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_audit_log_y2026m05` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_audit_log_y2026m06` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `admin_settings` | Key-value store de configurações globais do painel admin. Padrão: 1 linha por configuração, chave única, valor em JSONB livre. Criada em 20260514 (migration t39_create_missing_tables_part3).  PROPÓSITO:   Persistir preferências e parâmetros configuráveis pelo admin   que precisam ser compartilhados entre máquinas sem necessidade   de deploy. Todos os admins leem/escrevem o mesmo valor.  CONSUMIDORES (frontend — src/hooks/admin/):   useRetestCooldownSetting.ts     chave: retest_cooldown \| valor: { ms: number }     uso  : cooldown em ms do botão Testar novamente nos cards de            conexão de fornecedores. Default: 3000. Presets: [3000,10000,30000,60000].    useIntelligenceBadgeSettings.ts     chave: intelligence_badges     valor: { hotItem:{enabled:bool}, bestSeller:{enabled:bool, minAvgDailyDepletion7d:number} }     uso  : liga/desliga badges Hot Item e Best-seller no ProductCard.            Default: hotItem enabled=true, bestSeller enabled=true threshold=15.  PADRÃO DE ACESSO (ambos os hooks):   Leitura : supabase.from(admin_settings).select(value).eq(key,KEY).maybeSingle()   Gravação: supabase.from(admin_settings).upsert({key,value},{onConflict:key})   Cache module-level + broadcast pattern — fetch único por sessão por chave.  RLS:   SELECT/INSERT/UPDATE → authenticated com has_role(uid, admin)   DELETE               → sem policy (bloqueado implicitamente pelo RLS)   anon                 → sem GRANT  INFRAESTRUTURA:   Trigger: update_admin_settings_updated_at → BEFORE UPDATE → update_updated_at_column()   FK em updated_by: pendente (melhoria #3)   Nenhuma função Postgres acessa esta tabela — só frontend.   Nenhuma view depende desta tabela.  ESTADO: 0 linhas (2026-06-15) — admins usando defaults do frontend. NÃO ARQUIVAR / NÃO DROPAR — tabela ativa com consumidores no frontend. | 6 colunas | migration |
| `ai_enrichment_queue` | Fila de enriquecimento AI (DeepSeek). Registros pendentes são consumidos pelo n8n e resultados salvos via fn_save_ai_enrichment_results. | 15 colunas | migration |
| `ai_function_routing` | Function → model routing. The primary is tried first, then fallbacks in order. required_capabilities filters out invalid fallbacks at runtime. | 11 colunas | migration |
| `ai_models` | Models offered by each provider. capabilities JSON: {chat,vision_in,image_out,streaming,tools,json_mode,reasoning,multilingual}. Costs in USD/1M tokens (editable). | 14 colunas | migration |
| `ai_providers` | AI provider catalog (Lovable, OpenAI, Anthropic, Google, DeepSeek, custom). Managed via /admin/conexoes. | 21 colunas | migration |
| `ai_routing_decisions` | Per-call audit of router decisions. attempted_outcomes is an array of {model_id, status, error_kind, latency_ms} mirroring attempted_models order. | 14 colunas | migration |
| `ai_usage_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `ai_usage_logs` | Per-call AI usage events. Inserted as status=pending by acquire_ai_quota, then UPDATEd to success/error after the call completes. Read by useAiUsage hook for dashboards. | 14 colunas | migration |
| `ai_usage_quotas` | Per-role monthly AI request limits. Looked up by check_ai_quota using user primary role. Editable by admin/dev via UI. | 6 colunas | migration |
| `analytics_events` | [Etapa 7] RLS corrigido: SELECT escopado a self+supervisor (era USING true vazando). INSERT permite anon (tracking público) sem atribuir a user. DELETE só dev. | 3 colunas | migration |
| `anon_catalog_grant_audit_log` | RLS deny-all intencional (E19, 2026-09-16): RLS ligada, zero policies — só  | 3 colunas | migration |
| `anon_insert_rate` | Contadores (tabela\|ip\|minuto) do guard fn_anon_insert_rate_guard. Só o trigger (SECURITY DEFINER) escreve; purga via cron anon-insert-rate-purge. | 3 colunas | migration |
| `app_vitals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `archive._cleanup_manifest` | Audit log of the database faxina (cleanup). One row per object moved public->archive, with evidence, enabling precise one-command rollback. | 10 colunas | migration |
| `art_file_attachments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `asia_image_import_queue` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `asia_legacy_upload_queue` | Upload CF Images para 382 produtos ASIA/XBZ com primary_image_url não-CF. Criado em 2026-06-10. | 13 colunas | migration |
| `asia_upload_mapping` | Rastreia requisições pg_net para upload de imagens Asia Import ao Cloudflare Images | 8 colunas | migration |
| `attribute_definitions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `attribute_equivalences` | De-para entre valores de atributos de fornecedores e atributos padronizados do catálogo Promo Brindes.  | 19 colunas | migration |
| `attribute_groups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `audit_log` | Trilha de auditoria generica por entidade (application-level), escrita por useAuditLog.logAction (INSERT/UPDATE/DELETE) e lida por fetchAuditHistory/fetchAllAuditLogs. Imutavel; leitura dev-only (can_view_audit_logs); embed profiles:user_id via FK. fix_version 2026-06-26. NAO adicionar triggers (duplicaria escritas da app). | 10 colunas | migration |
| `audit_log_gravacao` | Audit log de mudanças em tabela_preco_gravacao_oficial e _faixa. RLS ativada em 2026-05-09 (Etapa 1 plano unificação). Triggers SECDEF bypassam RLS p/ INSERT. | 10 colunas | migration |
| `audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `audit_trail` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `auth.users` | Auth: Stores user login data within a secure schema. | 3 colunas | migration |
| `auth_login_attempts` | Versao mais recente de login_attempts (com metadata). Atualmente vazia. login_attempts e a tabela populada (203 registros). Consolidacao pendente. | 7 colunas | migration |
| `auto_tag_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `b2b_collection_products` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `b2b_collections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `binding_colors` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `binding_types` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `bitrix_clients` | Cache local de clientes do CRM (Bitrix). Consumida por QuotesKanbanPage e useSimulation. | 5 colunas | migration |
| `bitrix_deals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `bitrix_sync_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `bot_detection_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `cache_entries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `cart_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `catalog_analytics` | Analytics de eventos do catálogo. event_type válidos: sort, search, click, filter, view, add_to_quote. Expandido 2026-06-12. | 5 colunas | migration |
| `categories` | Árvore hierárquica de categorias (max 6 níveis, auto-referenciada via parent_id). CAMPOS CANÔNICOS: is_active (status), path (materialized path /uuid1/uuid2/), products_count (cache PCA). LEGADOS: active (= is_active), slug (UNIQUE). Dois tipos de raiz: taxonomia canônica (Bar\|Cozinha etc.) e coleções endomarketing (Brindes\|Unimed etc.). | 16 colunas | migration |
| `category_accessory_categories` | Vincula categorias de produtos a categorias de acessórios/embalagens disponíveis. | 11 colunas | migration |
| `category_ancestors` | Closure table (pre-computed ancestor-descendant pairs) derivada do parent_id. FKs: ON DELETE CASCADE (rows auto-removidas ao deletar categoria). Rebuild manual: SELECT * FROM fn_rebuild_category_ancestors(). Corrigido em: 2026-06-23 — FKs NO ACTION → CASCADE. | 3 colunas | migration |
| `category_attributes` | Atributos customizados por categoria (ex: material_permitido, tamanho_minimo) | 9 colunas | migration |
| `category_colors` | Vínculo N:N entre categorias cliente e grupos de cores | 8 colunas | migration |
| `category_commemorative_dates` | Vincula categorias de produtos às datas comemorativas relevantes. | 10 colunas | migration |
| `category_copywriting_config` | Configuração de copywriting por categoria para geração de descrições com IA | 20 colunas | migration |
| `category_icons` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `category_relationships` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `category_target_audiences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `category_variation_types` | Vincula tipos de variação às categorias. Subcategorias herdam da categoria pai. | 9 colunas | migration |
| `cf_recon.action_log` | Log permanente e imutável de todas as decisões tomadas sobre imagens CF. actor default = claude. Não fazer DELETE nesta tabela — é evidência de auditoria. | 11 colunas | migration |
| `cf_recon.cf_ghost_check_queue` | Fila de verificação de IDs CF suspeitos. 17.834 checked_dead (infer. estatística 325 amostras), 7 false_positive (xbz-15465p-* uploadados APÓS o ghost check). Nenhum ghost_dead tem produto ativo no DB — pure histórico de IDs deletados do CF. | 7 colunas | migration |
| `cf_recon.cf_image` | Mirror completo do Cloudflare Images. 72.079 rows (= public._cf_images_audit). PK = image_id (CF Image ID). Rastreia first_seen_at e last_seen_at por crawl. NOTA: public._cf_images_audit é o espelho em public para JOIN direto em queries operacionais. Sincronização bidirecional realizada em 2026-06-17. | 7 colunas | migration |
| `cf_recon.crawl_run` | Histórico de crawls à API CF. 1 crawl parcial realizado (2026-06-16 23:44 UTC). cf_total_reported=72.086. Crawl completo (~721 páginas) deve rodar periodicamente. | 8 colunas | migration |
| `cf_recon.metric_snapshot` | Snapshots periódicos de métricas de reconciliação CF×DB. Inserir via INSERT ON CONFLICT DO UPDATE por taken_at (aproximado ao dia). | 3 colunas | migration |
| `cf_recon.remediation` | Plano de remediações pendentes. status: open\|in_progress\|done\|cancelled. Linkar às entradas de action_log quando executado. | 8 colunas | migration |
| `cf_recon_inflight` | Mapa request_id->image_id das sondas pg_net em voo (reconciliação CF). | 3 colunas | migration |
| `city_whitelist` | Lista de cidades autorizadas para acesso ao sistema. Consumida por fn_check_login_allowed() quando access_security_settings.city_whitelist_enabled = true.  DEPENDENCIA: requer resolucao de IP -> cidade antes de chamar fn_check_login_allowed (p_city). Sem servico de geolocalizacao (ex: ip-api.com), este controle fica inativo mesmo com city_whitelist_enabled = true.  REGRA: tabela vazia + flag ativo = FAIL OPEN (nao bloqueia). Comparacao case-insensitive: upper(city_name) = upper(p_city).  UNIQUE em (city_name, state, country_code) — ja existia. Indice parcial: idx_city_whitelist_active_city. | 7 colunas | migration |
| `classification_audit.category_suggestions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `classify_functions_registry` | Registro de funções de classificação automática de produtos. Adicionar nova função = INSERT nesta tabela. O trigger lê dinamicamente. Criada em 31/01/2026. | 8 colunas | migration |
| `client_contacts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `client_notes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `collection_item_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `collection_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `collection_items_trash` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `collection_products` | Bridge migration F1 (2026-05-15): tabela necessária para compat com hook useExternalCollections.ts. Em fase posterior decidir se mantém ou consolida com b2b_collection_products (que tem 4433 linhas). | 5 colunas | migration |
| `collections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `color_analysis_staging` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `color_equivalences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `color_groups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `color_nuances` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `color_synonym_map` | Mapeamento de nomes de cores do fornecedor para color_variations canônico. Usado para corrigir discrepâncias entre como o fornecedor nomeia as cores nas imagens vs como o pipeline de variantes as padroniza. Exemplos: Fumê (XBZ) → Preto, Cinza Claro (XBZ) → Cinza. Alimentado por fn_link_images_to_variants_by_synonym() para backfill do variant_id. | 9 colunas | migration |
| `color_variations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `commemorative_date_colors` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `commemorative_date_exclusions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `commemorative_dates` | Cadastro de datas comemorativas para associar produtos | 24 colunas | migration |
| `companies` | Branding white-label por cliente. Consumida por src/lib/pdf/whitelabel-comparison.ts. | 6 colunas | migration |
| `company_addresses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `company_contacts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `company_email_patterns` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `comparison_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `component_media` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `connection_test_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `contact_emails` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `contact_phones` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `content_articles` | SEO M5 (2026-06-27): Artigos de blog para Topical Authority. Documentada em DOC_MODULO_SEO_COMPLETO.md como "content_articles" mas nunca criada. fix_version: seo_content_articles_v1_20260627 Lovable bot: NÃO alterar constraints de status nem remover RLS policies. | 20 colunas | migration |
| `conversation_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `conversation_delivery_status` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `conversation_event_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `cotacao_eventos` | Histórico completo de eventos de tracking por cotação. Imutável. | 8 colunas | migration |
| `cotacoes` | Cotações de frete realizadas via painel log.atomicabr.com.br. Auditoria — não deletar. | 19 colunas | migration |
| `cover_finishes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `cover_materials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `cover_types` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `crm_callback_events` | Auditoria + chave de idempotência dos callbacks recebidos do CRM Promo Champions V2 via edge function receive-crm-callback. | 10 colunas | migration |
| `cron_job_timeout_map` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `cron_watchdog_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `custom_kits` | Wave 3.3.A 2026-05-22: removidos 19 campos legacy. Schema consolidado. | 19 colunas | migration |
| `dashboard_insights_cache` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `db_connection_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `device_login_notifications` | Notificações de login em novo dispositivo/IP. Escrita: edge detect-new-device (service_role). Leitura: dono via RLS. Consumida em realtime por usePushNotifications. | 8 colunas | migration |
| `discount_approval_audit` | Trilha de auditoria de aprovações de desconto. Reconciliada em 2026-06-25  | 13 colunas | migration |
| `discount_approval_requests` | Workflow de aprovação de desconto acima do limite. Vendedor solicita, supervisor+ aprova/rejeita. Schema oficial extraído de useDiscountApproval.ts. | 6 colunas | migration |
| `e2e_cleanup_audit` | created_by=20261108001500_reconcile_e2e_cleanup_audit; append-only Edge cleanup audit | 15 colunas | migration |
| `e2e_cleanup_rate_limit` | Rate limit interno do edge e2e-cleanup. Acesso exclusivo via service_role / RPC SECURITY DEFINER. Policies explícitas negam anon/authenticated por defesa em profundidade. | 4 colunas | migration |
| `eco_material_config` | Lista de materiais considerados ecológicos para auto-link com categoria Ecologia e Dia do Meio Ambiente | 5 colunas | migration |
| `edge_function_invocations` | Logs de invocações de edge functions. Edges escrevem via service_role. NÃO inserir secrets/auth headers em request_metadata. Cleanup periódico via purge_edge_invocations_old() ou cron job. | 11 colunas | migration |
| `edge_rate_limits` | Migrado do Lovable em 2026-05-22 (Lote B). Rate limit transitório (chave -> contador + reset_at). Dados NÃO migrados (transitórios). | 5 colunas | migration |
| `enriched_contacts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 38 colunas | migration |
| `enrichment_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `entity_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `expert_conversations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `expert_messages` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `external_connections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `external_connections_sync_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `favorite_item_reactions` | Migrado do Lovable em 2026-05-22 (Lote C). Reações públicas em listas de favoritos compartilhadas. | 8 colunas | migration |
| `favorite_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `favorite_items_trash` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `favorite_lists` | Listas de favoritos por usuário. Cada user tem 1 lista default automática (criada via ensure_default_favorite_list). Suporta compartilhamento via shared_token com TTL. | 15 colunas | migration |
| `feature_flags` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `feminine_color_config` | Lista de grupos de cores consideradas femininas para auto-link com target_audience e datas comemorativas | 5 colunas | migration |
| `file_scan_logs` | Auditoria de scans VirusTotal em uploads. user_id obrigatório (manifest edge secure-upload). | 8 colunas | migration |
| `follow_up_reminders` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `frontend_telemetry` | ATENCAO: Auditoria 20260602 - user_id = NULL em 100% dos registros. Bug de instrumentacao no frontend. | 10 colunas | migration |
| `future_stock_entries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `generated_mockups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `geo_allowed_countries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `hardening_health_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `image_backfill_queue` | Fila de backfill de metadados (blurhash, hash, dims, file_size, reupload). 2026-06-17 — Claude. | 14 colunas | migration |
| `image_types` | Vocabulário oficial de tipos semânticos de imagem da Promo Brindes. Esta tabela é o DICIONÁRIO que classifica cada foto em product_images. Pense nela como um enum gerenciável: em vez de hardcodar 'main', 'gallery' etc. no app, cada tipo é um registro com metadados que controlam comportamento no frontend e no pipeline.  ━━━ O QUE É ━━━ 18 tipos cadastrados (jun/2026). Exemplos:   main     → foto principal/capa do produto na cor selecionada   gallery  → ângulos extras (d2, d3...) sem cor específica   set      → foto mostrando todas as cores disponíveis juntas   location → foto indicando ONDE no produto a gravação vai   area     → diagrama técnico da área de gravação com dimensões   component→ peça isolada do produto (ex: tampa de caneta)   logo     → produto COM logotipo do cliente já aplicado  ━━━ COMO FUNCIONA ━━━ 1. Cada registro define metadados que controlam exibição e pipeline:      display_priority → ordem na galeria (10=main vai primeiro, 99=other vai por último)      show_in_gallery  → FALSE para tipos internos (mockup, thumbnail) — não aparecem no front      is_color_specific→ TRUE = imagem varia por cor; FALSE = é genérica (mesma para todas as cores)      is_primary_candidate→ TRUE = pode ser is_primary=true em product_images  2. A coluna code é a chave funcional — é o que o pipeline, triggers e funções usam.    O id UUID é usado como FK em product_images.image_type_id e supplier_image_suffix_mappings.image_type_id.  3. A tabela é relativamente estática. Novos tipos são raros e exigem:    a) INSERT em image_types    b) UPDATE do CHECK CONSTRAINT em product_images.image_type (alerta via trg_image_types_check_reminder)    c) Atualizar fn_image_types_check_constraint_reminder com o novo code na lista  ━━━ COM QUEM CONVIVE ━━━   product_images              → image_type_id FK, image_type varchar (dual-column, sempre em sync)   supplier_image_suffix_mappings → image_type_id FK (DE-PARA: sufixo do supplier → tipo interno)   vw_image_type_coherence     → monitor de divergência entre os dois campos   vw_image_type_dropblockers  → lista tudo que bloqueia DROP COLUMN de image_type   fn_auto_classify_product_image → hardcoda os UUIDs desta tabela no código   fn_sync_image_type_code     → consulta esta tabela para sincronizar os dois campos  ━━━ COMO RECUPERAR QUANDO TRAVA ━━━   -- Checar divergências entre image_type varchar e image_type_id FK:   SELECT * FROM vw_image_type_coherence;    -- Reconstruir sincronização manual de toda a tabela product_images:   UPDATE product_images pi   SET image_type = it.code   FROM image_types it WHERE it.id = pi.image_type_id   AND pi.image_type != it.code;    -- Ver quem usa este vocabulary além do DB:   SELECT * FROM vw_image_type_dropblockers;  ━━━ O QUE FOI CORRIGIDO ━━━   2026-06-17: Adicionado trigger trg_image_types_check_reminder (AFTER INSERT/UPDATE OF code)   → emite RAISE WARNING quando novo tipo é inserido mas não está no CHECK CONSTRAINT   de product_images.image_type — previne silenciosamente a divergência CHECK vs FK. | 21 colunas | migration |
| `import_pipeline_steps` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `import_staging_images` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `inbound_webhook_endpoints` | Wave 3.3.C.2 2026-05-22: unificado HMAC+api-key. 2 endpoints migrados do Lovable (created_by NULL, original guardado em metadata). | 7 colunas | migration |
| `inbound_webhook_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `included_packaging_print_areas` | Áreas de gravação das embalagens ORIGINAIS/inclusas (product_included_packagings). Dimensões de área em MM (padrão de gravação). Análogo a kit_component_print_areas. | 15 colunas | migration |
| `included_packaging_techniques` | Técnicas de personalização permitidas em embalagens ORIGINAIS/inclusas, com custos. FK opcional para personalization_techniques. | 16 colunas | migration |
| `ingestion_run_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `integration_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `ip_access_control` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `ip_whitelist` | Lista de IPs autorizados para acesso ao sistema. Consumida por fn_check_login_allowed() quando access_security_settings.ip_whitelist_enabled = true.  REGRA: se esta tabela estiver VAZIA e o flag estiver ativo, fn_check_login_allowed aplica FAIL OPEN (nao bloqueia ninguem) para evitar lockout acidental de todos os usuarios.  Populate com os IPs fixos dos usuarios admin/dev antes de ativar ip_whitelist_enabled = true na tabela access_security_settings.  Indice parcial: idx_ip_whitelist_active_ip (is_active=true). UNIQUE constraint em ip_address (ja existia). | 6 colunas | migration |
| `kill_switch_hits` | Telemetria de hits do kill-switch (front-end e back-end). Sem PII. Permite decidir quando é seguro desligar definitivamente uma função descontinuada. Rotação semanal via cron — ver kill_switch_hits_purge_weekly. | 8 colunas | migration |
| `kit_collaborators` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `kit_comments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `kit_component_enrichment_raw` | BRONZE: Recebe dados brutos de dimensões físicas de componentes de kits.    Qualquer fonte deposita aqui sem validação prévia.    Processado por fn_standardize_kit_component() → kit_component_padronizacao. | 22 colunas | migration |
| `kit_component_ficha_staging` | Staging do parse da ficha tecnica (PDF XBZ). O job de ingestao (n8n/edge) insere 1 linha por peca; fn_promote_kit_ficha_staging casa cada peca ao componente e grava medida REAL respeitando procedencia. | 20 colunas | migration |
| `kit_component_padronizacao` | PRATA: Dimensões físicas padronizadas de componentes de kits.    Alimentada a partir de kit_component_enrichment_raw via fn_standardize_kit_component().    Requer aprovação (padronizacao_status=approved) antes de promover ao gold.    Campos length/width/height/diameter/circumference = dimensões do ITEM.    Campos pkg_* = dimensões da EMBALAGEM (quando is_packaging=TRUE). | 41 colunas | migration |
| `kit_component_types` | Tipos padronizados de componentes para kits (faca, garfo, tábua, estojo, etc) | 18 colunas | migration |
| `kit_component_variant_skus` | Identidade materializada de cada componente POR VARIANTE de kit. component_sku = SKU_variante-slot (ex.: 18891A-PRE-K1).  | 16 colunas | migration |
| `kit_ficha_session_log` | Auditoria da sessao de decomposicao/criacao de kits via ficha tecnica XBZ (medidas reais buscadas do Postgres). Base para revert reversivel. | 8 colunas | migration |
| `kit_quote_requests` | Idempotency ledger for authenticated Kit Maker quote submissions. | 5 colunas | migration |
| `kit_save_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `kit_share_tokens` | Migrado do Lovable em 2026-05-22 (Lote C). Tokens públicos de compartilhamento de kits customizados. | 11 colunas | migration |
| `kit_templates` | Templates curados de kits. Vendedor clona via increment_kit_template_usage RPC. Schema extraído de useKitTemplates.ts. | 18 colunas | migration |
| `kit_typical_dims` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `kit_variants` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `login_attempts` | Tabela legada com 203 registros. auth_login_attempts e a versao mais nova (campo metadata adicional) mas esta vazia. Consolidacao pendente. | 9 colunas | migration |
| `magazine_duplicate_requests` | RLS deny-all intencional (E19, 2026-09-16): RLS ligada, zero policies — só  | 8 colunas | migration |
| `magazine_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `magazine_public_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `magazine_public_view_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2026_07` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2026_08` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2026_09` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2026_10` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2026_11` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2026_12` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_2027_01` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_public_view_events_default` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `magazine_reader_state` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `magazine_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `magazine_templates_catalog` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `magazine_view_rollup_watermark` | Singleton. Marca d'água do rollup de view_count. Garante exactly-once entre o cron horário e o nightly. | 2 colunas | migration |
| `magazines` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `magic_up_brand_kits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `magic_up_campaigns` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `magic_up_comments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `magic_up_generations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `magic_up_public_shares` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `magic_up_reactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `markup_configurations` | Configurações de markup por nível hierárquico (SKU > Produto > Categoria > Fornecedor > Geral) | 13 colunas | migration |
| `material_equivalences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `material_groups` | Grupos de materiais para categorização (Metais, Plásticos, Tecidos, etc). Suporta multi-tenancy via organization_id. | 11 colunas | migration |
| `material_types` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `material_variations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `mcp_access_violations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `mcp_api_keys` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `mcp_full_grantors` | Whitelist explícita de admins autorizados a emitir/escalar chaves MCP com escopo "*" (Full Access). | 4 colunas | migration |
| `mcp_key_auto_revocations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `mcp_kv` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `mcp_sessions` | Sessoes de portais externos usadas por MCPs (cookie + auto-refresh). | 6 colunas | migration |
| `medallion_coverage_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `mockup_approval_links` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `mockup_credit_transactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `mockup_credits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `mockup_drafts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `mockup_generation_jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 27 colunas | migration |
| `mockup_prompt_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `mockup_prompt_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `mockup_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `navigation_analytics` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `ncm_codes` | Tabela de referência NCM (Nomenclatura Comum do Mercosul) - códigos fiscais válidos com descrição e hierarquia | 18 colunas | migration |
| `notebook_features` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `notification_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `notification_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 25 colunas | migration |
| `ops.pgss_history` | PLANO_DBA E40 — snapshot semanal de extensions.pg_stat_statements (filtrado a  | 8 colunas | migration |
| `ops.table_size_history` | PLANO_DBA E30 — série histórica diária de pg_total_relation_size()/reltuples por  | 5 colunas | migration |
| `ops.wraparound_monitor_log` | PLANO_DBA E33 — snapshot diário de risco de wraparound de XID/multixact,  | 8 colunas | migration |
| `ops_grant_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `optimization_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `optimization_queue` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `optimization_queue_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `order_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `order_item_personalizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `order_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `orders` | _(sem COMMENT ON TABLE — significado não documentado)_ | 24 colunas | migration |
| `organization_members` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | migration |
| `organizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `outbound_webhooks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `ownership_audit_reports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `ownership_repair_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `packaging_compatibility_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `packaging_types` | Tipos/categorias de embalagem (caixa papelão, estojo, etc.) | 10 colunas | migration |
| `packagings` | Cadastro de embalagens com dimensões e características | 22 colunas | migration |
| `paper_colors` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `paper_formats` | Formatos ISO/B de papel para cadernos e blocos | 10 colunas | migration |
| `paper_rulings` | Tipo de pauta do papel interno do caderno | 8 colunas | migration |
| `paper_weights` | Gramatura em g/m² do papel dos cadernos | 8 colunas | migration |
| `password_reset_requests` | Migrado do Lovable em 2026-05-22 (Lote A). Reset de senha aprovado manualmente. | 8 colunas | migration |
| `permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `personalization_locations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `personalization_simulations` | Simulações de personalização salvas por vendedor. Consumida por src/hooks/simulation/useSimulation.ts. | 13 colunas | migration |
| `personalization_sizes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `personalization_technique_mappings` | Ponte entre personalization_techniques (geração de mockup) e tecnicas_gravacao (precificação).  | 7 colunas | migration |
| `personalization_techniques` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `pipeline_control` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `pipeline_health_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `pipeline_known_issues` | Registro centralizado de bugs, gaps e anomalias conhecidos no pipeline de dados. Serve como rastreabilidade para auditoria e priorização de correções. | 16 colunas | migration |
| `pipeline_run_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `point_transactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `price_history` | Histórico de todas as alterações de preço/custo para auditoria | 5 colunas | migration |
| `print_area_techniques` | FONTE UNICA de verdade para áreas de gravação por produto. Dados da técnica (nome, código, max_cores, custo_setup) vêm via JOIN com tabela_preco_gravacao_oficial usando tabela_preco_id. Campos como technique_name e setup_cost NÃO são armazenados aqui - são resolvidos via FK. | 16 colunas | migration |
| `prod_audit.category_keywords` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `prod_audit.category_suggestions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `prod_audit.classification_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `prod_audit.product_features` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `prod_audit.test_results` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `product_ai_content` | [fix_version:satellite_ai_20260627] Satélite 1:1 de conteúdo gerado por AI.  Colunas: ai_title, ai_description, ai_summary, ai_version, ai_model, ai_generated_at.  Colunas extras para roadmap: key_benefits[], use_cases[], ai_keywords[].  Sincronizado por trg_sync_product_ai_content. | 13 colunas | migration |
| `product_ai_history` | Histórico de todas as gerações AI por produto. Inclui: ai_title, ai_description, ai_summary, schema_json, tokens, tempo, provedor. | 18 colunas | migration |
| `product_attributes` | Atributos estruturados por produto Gold — material, capacidade, BPA free, etc.  | 16 colunas | migration |
| `product_badge_definitions` | Registro canonico de governanca das badges de PRODUTOS (nome, cores, icones, onde/como usar, regra de negocio, prioridade, config). Aditivo: nao altera o calculo/render existente. fix_version=pbd_v1_20260627. ANTI-REGRESSAO: nao remover RLS; manter SET search_path nas fns fn_pbd_*; badge_key e imutavel; badges is_system nao sao deletaveis. | 28 colunas | migration |
| `product_category_assignments` | Bug RLS corrigido na Etapa 6: removida product_category_assignments_public_read que anulava _select_org. | 6 colunas | migration |
| `product_commemorative_dates` | Vincula produtos às datas comemorativas. Pode ser herdado da categoria ou manual. | 12 colunas | migration |
| `product_comparisons` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `product_component_location_techniques` | Personalization techniques available for each product-component location. | 9 colunas | migration |
| `product_component_locations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `product_components` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `product_customization_prices` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `product_deactivation_requests` | Solicitações de desativação de produtos — requerem aprovação de usuário credenciado (admin+). Regra: produto NUNCA é desativado automaticamente pelo pipeline. | 22 colunas | migration |
| `product_deactivation_tokens` | Tokens de autorização one-shot para desativação de produtos.  PROPÓSITO: Mecanismo de segurança que garante a regra de negócio central: "Nenhum produto é desativado sem aprovação explícita de admin+".  FLUXO COMPLETO:   1. Admin aprova via fn_approve_product_deactivation()      → cria token { product_id, request_id, authorized_by, used=false, expires_at }   2. A função executa UPDATE products SET is_active=false   3. Trigger fn_block_unauthorized_product_deactivation() intercepta o UPDATE      → verifica se existe token válido (used=false AND expires_at > now())      → SIM: permite desativação + marca used=true      → NÃO: reverte is_active e bloqueia silenciosamente   4. Token é deletado imediatamente após uso (auditoria fica nos registros used=true)  FUNÇÕES DEPENDENTES:   - fn_approve_product_deactivation()             → cria token + dispara UPDATE   - fn_block_unauthorized_product_deactivation()  → trigger BEFORE UPDATE/INSERT em products   - soft_delete_product()                         → path de soft delete, também cria token one-shot  CONSTRAINT DE INTEGRIDADE:   - FK fk_auth_product_cascade: product_id → products.id (CASCADE)     → token só pode ser criado para produtos existentes     → se o produto for deletado, o token é removido em cascata  CAMPOS:   - product_id    → produto a ser desativado (FK → products.id)   - request_id    → FK product_deactivation_requests (rastreabilidade)   - authorized_by → UUID do admin que aprovou   - authorized_at → criação do token   - expires_at    → TTL curto (token não reutilizável após expirar)   - used          → true após consumo (linha mantida como auditoria)  HISTÓRICO: 397 registros de Jun/2026 = desativações aprovadas e executadas (todos used=true). RENOMEADA em 2026-06-15: era _deactivation_auth (prefixo _ era enganoso — tabela é ativa e crítica). | 7 colunas | migration |
| `product_faqs` | Perguntas frequentes para SEO (FAQ Schema) e citação por IAs. Podem ser por produto, categoria ou gerais. | 17 colunas | migration |
| `product_fiscal` | [fix_version:satellite_fiscal_20260627] Satélite 1:1 de dados fiscais/tributários.  Colunas migradas de products: ncm_id, ncm_code, ipi_rate, tax_reference_state.  Colunas novas (pipeline futuro): ean, gtin, warranty_months, cst_icms, cest.  Sincronizado por trg_sync_product_fiscal. | 13 colunas | migration |
| `product_group_components` | Product-group component templates inherited by products in the group. | 10 colunas | migration |
| `product_group_location_techniques` | Personalization techniques available for each product-group location. | 8 colunas | migration |
| `product_group_locations` | Product-group personalization locations inherited by group products. | 13 colunas | migration |
| `product_group_members` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `product_groups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `product_images` | Tabela-fato de mídia do catálogo (camada Gold). 1 linha = 1 imagem física de produto hospedada no Cloudflare Images. É a fonte da verdade de imagens; os campos desnormalizados em products (images, primary_image_url, og_image_url, set_image_url, primary_image_fallback_url) são MANTIDOS pelos triggers desta tabela. RLS ativo (leitura pública só de ativas; escrita restrita a org owner/admin). Fornecedores ativos: SPOT, XBZ, SOMARCAS, ASIA. 88BRINDES: piloto descontinuado (14 imagens inativas, produto Chapéu ecoflex arquivado). | 7 colunas | migration |
| `product_included_packagings` | Embalagens ORIGINAIS que já vêm com o produto. SEM SKU próprio, SEM preço separado. | 28 colunas | migration |
| `product_kit_components` | Componentes de kits-produtos (catálogo). RLS via organization membership. Bug corrigido na Etapa 4: removida policy public_read que sobrepunha restrição. | 2 colunas | migration |
| `product_materials` | Tabela de relacionamento N:N entre produtos e materiais. Permite especificar parte do produto (corpo, tampa) e percentual de cada material. | 13 colunas | migration |
| `product_notebook_features` | Features e acessórios dos cadernos (N:N). Cada linha = 1 feature confirmada para 1 produto. | 6 colunas | migration |
| `product_notebook_specs` | Especificações técnicas de produtos de material gráfico (cadernos, blocos, agendas). 1 linha por produto. FK → products (Gold). | 18 colunas | migration |
| `product_novelties` | Controla o ciclo de vida do selo "NOVO" nos produtos.  | 14 colunas | migration |
| `product_packaging` | [ARQ 2026-06-26] Fonte SILVER de embalagem. LIDA por fn_promote_packaging_to_gold para  | 27 colunas | migration |
| `product_packaging_compatibility` | Compatibilidade entre produtos e embalagens vendidas SEPARADAMENTE (COM SKU próprio) | 26 colunas | migration |
| `product_packagings` | Relação entre produtos e embalagens disponíveis | 11 colunas | migration |
| `product_physical` | [ARQ 2026-06-26] Satélite physical (buffer WRITE-ONLY; não lido por view/função/FK).  | 21 colunas | migration |
| `product_price_freshness_overrides` | Override local da janela de validade de preço por produto (30/60/90 dias). Sobrescreve o valor padrão de 60 dias e tem precedência sobre qualquer valor que venha a ser exposto pelo BD externo no futuro. | 6 colunas | migration |
| `product_print_positions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `product_properties` | Relacionamento entre produtos e suas propriedades | 9 colunas | migration |
| `product_qa_image_alerts` | Tabela de qualidade: rastreia produtos ativos que foram ativados ou encontrados sem imagem. Regra de negócio violada: "nenhum produto ativo pode existir sem ao menos uma imagem".  ━━━ CICLO DE VIDA DE UM ALERTA ━━━ ABERTO    → is_resolved=false, resolved_at=NULL RESOLVIDO → is_resolved=true,  resolved_at=timestamp, resolution_notes=motivo  ━━━ FONTES DE CRIAÇÃO (2 caminhos) ━━━ 1. Trigger em tempo real  — products: BEFORE UPDATE    Função: fn_qa_alert_on_activate_without_image()    Gatilho: qualquer UPDATE que mude is_active de false/NULL → true    Efeito: além do alerta, seta products.sync_status = 'activated_no_image' (18 chars, MAX varchar(20))     2. Varredura periódica — pg_cron 'qa-imageless-products' (a cada 30 minutos)    Função: fn_qa_scan_imageless_products()    Detecta produtos que escaparam do trigger (ex.: criados diretamente em pipeline mode)    Também auto-resolve alertas de produtos que já sanaram a situação  ━━━ AUTO-RESOLUÇÃO (fn_qa_scan_imageless_products) ━━━ Um alerta aberto é marcado is_resolved=true automaticamente quando:   • O produto recebeu uma imagem  (row ativa em product_images, primary_image_url, ou images JSONB)   • O produto foi desativado      (is_active=false)   • O produto foi deletado        (is_deleted=true) Para forçar uma varredura manual: SELECT * FROM fn_qa_scan_imageless_products();  ━━━ RELACIONAMENTOS ━━━ • products (FK product_id, ON DELETE CASCADE) — produto monitorado • supplier_id, sku_promo, product_name        — denormalizados no momento do alerta   (para leitura rápida sem JOIN, mesmo se o produto for deletado depois)  ━━━ QUEM ALIMENTA / CONSOME ━━━ Escreve:  trigger fn_qa_alert_on_activate_without_image() \| fn_qa_scan_imageless_products() Lê:       dashboards de qualidade \| rotinas de re-ativação pós-imagem \| n8n workflows de alerta NÃO deve ser editado manualmente — gerenciado exclusivamente pelas funções acima.  ━━━ ÍNDICES ━━━ • idx_pqia_product_id   — busca por produto • idx_pqia_is_resolved  — WHERE is_resolved=false (alertas abertos) • idx_pqia_detected_at  — ordenação por data de detecção  | 11 colunas | migration |
| … +486 linhas — lista completa em `context.json` | | | |

## Dados de referência (seed — planos, categorias, perfis fixos)

| Tabela | Colunas | Valores | Origem |
|---|---|---|---|
| `categories` | `name, slug, description, display_order, is_active` | `('Canecas', 'canecas', 'Canecas personalizadas de diversos materiais', 1, true), ('Camisetas', 'camisetas', 'Camisetas e vestuário personalizado', 2, true), ('Bonés', 'bones', 'Bonés e chapéus personalizados', 3, true), ('Squeezes', 'squeezes', 'Garrafas e squeezes personalizados', 4, true), ('Pen Drives', 'pen-drives', 'Pen drives e dispositivos USB personalizados', 5, true), ('Cadernos', 'cadern …` | `supabase/migrations/20250103030000_seed_final.sql` |
| `personalization_techniques` | `name, code, description, prompt_suffix, requires_color_count, base_cost_multiplier, is_active` | `( 'Bordado', 'embroidery', 'Técnica de bordado tradicional com fios coloridos', 'com bordado de alta qualidade, mostrando os detalhes das linhas e textura do bordado', true, 1.5, true ), ( 'Silk Screen', 'silk', 'Serigrafia tradicional, ideal para grandes volumes', 'com serigrafia nítida e uniforme, mostrando a qualidade da impressão', true, 1.0, true ), ( 'DTF (Direct to Film)', 'dtf', 'Impressão …` | `supabase/migrations/20250103030000_seed_final.sql` |
| `feature_flags` | `flag_name, is_enabled, description, rollout_percentage` | `('enable_ai_mockups', true, 'Habilita geração de mockups com IA', 100), ('enable_public_approval', true, 'Habilita aprovação pública de orçamentos', 100), ('enable_bitrix_sync', true, 'Habilita sincronização com Bitrix24', 100), ('enable_analytics', true, 'Habilita tracking de analytics', 100), ('enable_notifications', true, 'Habilita sistema de notificações', 100), ('enable_favorites', true, 'Hab …` | `supabase/migrations/20250103030000_seed_final.sql` |
| `system_settings` | `setting_key, setting_value, description, is_public` | `('company_name', '"Pink e Cerébro"', 'Nome da empresa', true), ('company_email', '"contato@pinkcerebro.com.br"', 'Email de contato', true), ('company_phone', '"+55 11 99999-9999"', 'Telefone de contato', true), ('max_quote_items', '50', 'Máximo de itens por orçamento', false), ('max_mockups_per_job', '20', 'Máximo de mockups por job', false), ('default_quote_validity_days', '30', 'Validade padrão …` | `supabase/migrations/20250103030000_seed_final.sql` |
| `notification_templates` | `code, name, subject, body_template, variables, is_active` | `( 'quote_approved', 'Orçamento Aprovado', 'Orçamento {{quote_number}} aprovado!', 'Parabéns! O cliente aprovou o orçamento {{quote_number}} no valor de {{total}}.', '["quote_number", "total", "client_name"]', true ), ( 'new_order', 'Novo Pedido', 'Novo pedido {{order_number}}', 'Um novo pedido {{order_number}} foi criado no valor de {{total}}.', '["order_number", "total", "client_name"]', true ), …` | `supabase/migrations/20250103030000_seed_final.sql` |
| `categories` | `name, slug, description, display_order, is_active` | `('Canecas', 'canecas', 'Canecas personalizadas de diversos materiais', 1, true), ('Camisetas', 'camisetas', 'Camisetas e vestuário personalizado', 2, true), ('Bonés', 'bones', 'Bonés e chapéus personalizados', 3, true), ('Squeezes', 'squeezes', 'Garrafas e squeezes personalizados', 4, true), ('Pen Drives', 'pen-drives', 'Pen drives e dispositivos USB personalizados', 5, true), ('Cadernos', 'cadern …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `personalization_techniques` | `name, code, description, prompt_suffix, requires_color_count, base_cost_multiplier, is_active` | `( 'Bordado', 'embroidery', 'Técnica de bordado tradicional com fios coloridos', 'com bordado de alta qualidade, mostrando os detalhes das linhas e textura do bordado', true, 1.5, true ), ( 'Silk Screen', 'silk', 'Serigrafia tradicional, ideal para grandes volumes', 'com serigrafia nítida e uniforme, mostrando a qualidade da impressão', true, 1.0, true ), ( 'DTF (Direct to Film)', 'dtf', 'Impressão …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `achievements` | `code, name, description, icon, points_reward, category, is_active` | `('first_sale', 'Primeira Venda', 'Fechou sua primeira venda!', '🎉', 100, 'sales', true), ('sales_10', '10 Vendas', 'Alcançou 10 vendas!', '🎯', 250, 'sales', true), ('sales_50', '50 Vendas', 'Alcançou 50 vendas!', '🌟', 500, 'sales', true), ('sales_100', '100 Vendas', 'Alcançou 100 vendas!', '🏆', 1000, 'sales', true), ('sales_10k', 'Venda 10k', 'Fechou uma venda acima de R$ 10.000!', '💰', 500, 'sale …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `rewards` | `name, description, points_cost, stock_quantity, is_active, category` | `('Vale Café', 'Vale para um café no Starbucks', 500, 100, true, 'food'), ('Vale Lanche', 'Vale para lanche no McDonald''s', 800, 100, true, 'food'), ('Chocolate Premium', 'Caixa de chocolates finos', 600, 50, true, 'food'), ('Fone Bluetooth', 'Fone de ouvido Bluetooth JBL', 3000, 20, true, 'tech'), ('Mouse Gamer', 'Mouse Gamer RGB', 2500, 20, true, 'tech'), ('Teclado Mecânico', 'Teclado Mecânico R …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `feature_flags` | `flag_name, is_enabled, description, rollout_percentage` | `('enable_ai_mockups', true, 'Habilita geração de mockups com IA', 100), ('enable_gamification', true, 'Habilita sistema de gamificação', 100), ('enable_public_approval', true, 'Habilita aprovação pública de orçamentos', 100), ('enable_bitrix_sync', true, 'Habilita sincronização com Bitrix24', 100), ('enable_analytics', true, 'Habilita tracking de analytics', 100), ('enable_notifications', true, 'H …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `system_settings` | `setting_key, setting_value, description, is_public` | `('company_name', '"Pink e Cerébro"', 'Nome da empresa', true), ('company_email', '"contato@pinkcerebro.com.br"', 'Email de contato', true), ('company_phone', '"+55 11 99999-9999"', 'Telefone de contato', true), ('max_quote_items', '50', 'Máximo de itens por orçamento', false), ('max_mockups_per_job', '20', 'Máximo de mockups por job', false), ('default_quote_validity_days', '30', 'Validade padrão …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `notification_templates` | `code, name, subject, body_template, variables, is_active` | `( 'quote_approved', 'Orçamento Aprovado', 'Orçamento {{quote_number}} aprovado!', 'Parabéns! O cliente aprovou o orçamento {{quote_number}} no valor de {{total}}.', '["quote_number", "total", "client_name"]', true ), ( 'new_order', 'Novo Pedido', 'Novo pedido {{order_number}}', 'Um novo pedido {{order_number}} foi criado no valor de {{total}}.', '["order_number", "total", "client_name"]', true ), …` | `supabase/migrations/20250103130000_seed_data.sql` |
| `categories` | `name, slug, description, display_order, is_active` | `('Canecas', 'canecas', 'Canecas personalizadas de diversos materiais', 1, true), ('Camisetas', 'camisetas', 'Camisetas e vestuário personalizado', 2, true), ('Bonés', 'bones', 'Bonés e chapéus personalizados', 3, true), ('Squeezes', 'squeezes', 'Garrafas e squeezes personalizados', 4, true), ('Pen Drives', 'pen-drives', 'Pen drives e dispositivos USB personalizados', 5, true), ('Cadernos', 'cadern …` | `supabase/migrations/20250103140000_seed_no_gamification.sql` |
| `personalization_techniques` | `name, code, description, prompt_suffix, requires_color_count, base_cost_multiplier, is_active` | `( 'Bordado', 'embroidery', 'Técnica de bordado tradicional com fios coloridos', 'com bordado de alta qualidade, mostrando os detalhes das linhas e textura do bordado', true, 1.5, true ), ( 'Silk Screen', 'silk', 'Serigrafia tradicional, ideal para grandes volumes', 'com serigrafia nítida e uniforme, mostrando a qualidade da impressão', true, 1.0, true ), ( 'DTF (Direct to Film)', 'dtf', 'Impressão …` | `supabase/migrations/20250103140000_seed_no_gamification.sql` |
| `feature_flags` | `flag_name, is_enabled, description, rollout_percentage` | `('enable_ai_mockups', true, 'Habilita geração de mockups com IA', 100), ('enable_public_approval', true, 'Habilita aprovação pública de orçamentos', 100), ('enable_bitrix_sync', true, 'Habilita sincronização com Bitrix24', 100), ('enable_analytics', true, 'Habilita tracking de analytics', 100), ('enable_notifications', true, 'Habilita sistema de notificações', 100), ('enable_favorites', true, 'Hab …` | `supabase/migrations/20250103140000_seed_no_gamification.sql` |
| `system_settings` | `setting_key, setting_value, description, is_public` | `('company_name', '"Pink e Cerébro"', 'Nome da empresa', true), ('company_email', '"contato@pinkcerebro.com.br"', 'Email de contato', true), ('company_phone', '"+55 11 99999-9999"', 'Telefone de contato', true), ('max_quote_items', '50', 'Máximo de itens por orçamento', false), ('max_mockups_per_job', '20', 'Máximo de mockups por job', false), ('default_quote_validity_days', '30', 'Validade padrão …` | `supabase/migrations/20250103140000_seed_no_gamification.sql` |
| `notification_templates` | `code, name, subject, body_template, variables, is_active` | `( 'quote_approved', 'Orçamento Aprovado', 'Orçamento {{quote_number}} aprovado!', 'Parabéns! O cliente aprovou o orçamento {{quote_number}} no valor de {{total}}.', '["quote_number", "total", "client_name"]', true ), ( 'new_order', 'Novo Pedido', 'Novo pedido {{order_number}}', 'Um novo pedido {{order_number}} foi criado no valor de {{total}}.', '["order_number", "total", "client_name"]', true ), …` | `supabase/migrations/20250103140000_seed_no_gamification.sql` |
| `categories` | `name, slug, description, display_order, is_active` | `('Canecas', 'canecas', 'Canecas personalizadas de diversos materiais', 1, true), ('Camisetas', 'camisetas', 'Camisetas e vestuário personalizado', 2, true), ('Bonés', 'bones', 'Bonés e chapéus personalizados', 3, true), ('Squeezes', 'squeezes', 'Garrafas e squeezes personalizados', 4, true), ('Pen Drives', 'pen-drives', 'Pen drives e dispositivos USB personalizados', 5, true), ('Cadernos', 'cadern …` | `supabase/migrations/20250103150000_seed_updated.sql` |
| `personalization_techniques` | `name, code, description, prompt_suffix, requires_color_count, base_cost_multiplier, is_active` | `( 'Bordado', 'embroidery', 'Técnica de bordado tradicional com fios coloridos', 'com bordado de alta qualidade, mostrando os detalhes das linhas e textura do bordado', true, 1.5, true ), ( 'Silk Screen', 'silk', 'Serigrafia tradicional, ideal para grandes volumes', 'com serigrafia nítida e uniforme, mostrando a qualidade da impressão', true, 1.0, true ), ( 'DTF (Direct to Film)', 'dtf', 'Impressão …` | `supabase/migrations/20250103150000_seed_updated.sql` |
| `feature_flags` | `flag_name, is_enabled, description, rollout_percentage` | `('enable_ai_mockups', true, 'Habilita geração de mockups com IA', 100), ('enable_public_approval', true, 'Habilita aprovação pública de orçamentos', 100), ('enable_bitrix_sync', true, 'Habilita sincronização com Bitrix24', 100), ('enable_analytics', true, 'Habilita tracking de analytics', 100), ('enable_notifications', true, 'Habilita sistema de notificações', 100), ('enable_favorites', true, 'Hab …` | `supabase/migrations/20250103150000_seed_updated.sql` |
| `system_settings` | `setting_key, setting_value, description, is_public` | `('company_name', '"Pink e Cerébro"', 'Nome da empresa', true), ('company_email', '"contato@pinkcerebro.com.br"', 'Email de contato', true), ('company_phone', '"+55 11 99999-9999"', 'Telefone de contato', true), ('max_quote_items', '50', 'Máximo de itens por orçamento', false), ('max_mockups_per_job', '20', 'Máximo de mockups por job', false), ('default_quote_validity_days', '30', 'Validade padrão …` | `supabase/migrations/20250103150000_seed_updated.sql` |
| `notification_templates` | `code, name, subject, body_template, variables, is_active` | `( 'quote_approved', 'Orçamento Aprovado', 'Orçamento {{quote_number}} aprovado!', 'Parabéns! O cliente aprovou o orçamento {{quote_number}} no valor de {{total}}.', '["quote_number", "total", "client_name"]', true ), ( 'new_order', 'Novo Pedido', 'Novo pedido {{order_number}}', 'Um novo pedido {{order_number}} foi criado no valor de {{total}}.', '["order_number", "total", "client_name"]', true ), …` | `supabase/migrations/20250103150000_seed_updated.sql` |
| `supplier_field_mappings` | `supplier_id, source_field, source_path, target_table, target_field, transform_type, transform_config, is_active, priority, created_at, updated_at` | `('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', '_ref', NULL, 'product_variants', 'sku', 'direct', NULL, true, 10, now(), now()), ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Sku', NULL, 'product_variants', 'supplier_sku', 'direct', NULL, true, 10, now(), now()), ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'ColorCode', NULL, 'product_variants', 'color_code', 'direct', NULL, true, 10, now(), now()), ('bcfc0d02- …` | `supabase/migrations/20260610120200_silver_depara_03_seed_variant_mappings.sql` |
| `orders` | `seller_id, organization_id, client_name, client_company, subtotal, discount_amount, shipping_cost, total, status, fulfillment_status, payment_status, payment_method, created_at, updated_at` | `( '75921d8b-611f-4413-9ce5-afccdb733d26', '5db5aee1-064b-4ef4-9193-345dcd8274ea', 'Maria Fernanda Costa', 'TechCorp Brasil LTDA', 11500.00, 500.00, 350.00, 11350.00, 'confirmed', 'processing', 'pending', 'boleto', now() - INTERVAL '5 days', now() - INTERVAL '5 days' ), ( '75921d8b-611f-4413-9ce5-afccdb733d26', '5db5aee1-064b-4ef4-9193-345dcd8274ea', 'Carlos Mendes', 'Grupo Alfa Comercial', 4200.00 …` | `supabase/migrations/20260612125828_fix_orders_trigger_and_seed_corrected.sql` |
| `order_items` | `order_id, product_id, product_sku, product_name, product_image_url, quantity, unit_price, subtotal, discount_amount, personalization_cost, created_at` | `('11308c8e-fc34-400a-8217-5b85cd57c0f7', 'e0ad65da-6812-404e-bf7e-debf68774d6c', '18904', 'Garrafa térmica inox 320ml', 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-18904-01/public', 50, 45.00, 2250.00, 0, 0, now()), ('11308c8e-fc34-400a-8217-5b85cd57c0f7', '818883b9-11ca-4408-8f97-d472b5e299fe', 'KT-9094Q', 'Kit para café - 5 pçs', 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/sm-kt- …` | `supabase/migrations/20260612130502_seed_order_items_correct_subtotals.sql` |
| `product_badge_definitions` | `badge_key,name,short_label,description,business_rule,category,source_kind,data_source,placements,surfaces,icon_lucide,icon_emoji,color_token,class_bg,class_text,class_border,priority,sort_order,config,supports_expiration,is_enabled` | `('stockout','Fora de estoque','Esgotado','Produto sem saldo disponível em estoque.','products.is_stockout = TRUE (equivale a stock_quantity menor ou igual a 0).','status_estoque','computed','products.is_stockout',ARRAY['card_header_right'],ARRAY['catalog','super_filter','product_detail','comparison'],'PackageX','❌','red',NULL,NULL,NULL,99,10,'{}'::jsonb,false,true), ('low_stock','Estoque baixo','B …` | `supabase/migrations/20260627140133_seed_product_badge_definitions_pbd_v1.sql` |

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `not_ready` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:api/ready.ts` |
| status | valor `ready` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/kit-builder/persistence.ts`<br>`escreve:api/ready.ts` |
| status | valor `number` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:recovery/src-legacy/src/components/admin/telemetry/BridgeCallDetailDrawer.tsx`<br>`compara:src/components/admin/connections/SecretsManagerHealthPanel.tsx`<br>`compara:src/components/admin/connections/TestAllConnectionsButton.tsx`<br>`compara:src/contexts/SellerCartContext.tsx` |
| status | valor `fulfilled` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/connections/CredentialsChangedBanner.tsx`<br>`compara:src/components/admin/connections/GlobalRefreshFromDbButton.tsx`<br>`compara:src/hooks/mockup/mockupGenerationService.ts`<br>`compara:src/hooks/mockup/mockupGeneratorModel.ts` |
| status | valor `step_up_error` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`compara:src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`compara:src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`compara:src/pages/admin/DevChallengeExamplesPage.tsx` |
| status | valor `Status` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/audit/AuditHistory.tsx` |
| status | valor `PASSED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/audit/AuditReport.tsx` |
| status | valor `aligned` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `client-only` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `gap` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/bi/ClientCategoryRadar.tsx`<br>`escreve:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `super` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `underindex` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/bi/ClientCategoryRadar.tsx` |
| status | valor `order` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/MyClientsWidget.tsx` |
| status | valor `SUBSCRIBED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| status | valor `CHANNEL_ERROR` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/MyDiscountRequestsWidget.tsx`<br>`compara:src/hooks/kit-builder/useCustomKitsRealtime.ts`<br>`compara:src/hooks/kit-builder/useKitCollaboration.ts`<br>`compara:src/hooks/quotes/useQuotes.ts` |
| status | valor `CLOSED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| status | valor `TIMED_OUT` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/MyDiscountRequestsWidget.tsx`<br>`compara:src/hooks/kit-builder/useCustomKitsRealtime.ts`<br>`compara:src/hooks/kit-builder/useKitCollaboration.ts`<br>`compara:src/hooks/quotes/useQuotes.ts` |
| status | valor `overstocked` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/inventory/StockDashboard.tsx`<br>`compara:src/hooks/products/useVariantStock.ts`<br>`compara:src/types/stock.ts` |
| status | valor `Concluído` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/kit-builder/PersonalizationConfig.tsx` |
| status | valor `Inválido` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/kit-builder/PersonalizationConfig.tsx` |
| status | valor `destructive` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/kit-builder/VolumeIndicator.tsx`<br>`compara:src/pages/admin/AdminClientPerformancePage.tsx` |
| status | valor `dimension` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/pricing/calculator/QuantityComparisonTable.tsx`<br>`escreve:src/components/pricing/calculator/QuantityComparisonTable.tsx` |
| status | valor `violations` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/kit-builder/useKitBuilderQuote.ts`<br>`escreve:src/hooks/kit-builder/useKitFitsValidation.ts`<br>`escreve:src/hooks/kit-builder/useKitMinQuantityValidation.ts` |
| status | valor `changed` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/kit-builder/useKitBuilderQuote.ts`<br>`escreve:src/hooks/kit-builder/useKitPriceValidation.ts` |
| status | valor `unchanged` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/hooks/kit-builder/useKitPriceValidation.ts` |
| status | valor `APPLIED` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/theme-presets-css-vars-patch.ts` |
| status | valor `string` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/products/stock-status.ts` |
| status | valor `confirming` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/auth/SSOCallbackPage.tsx` |
| status | valor `already_applied` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/crm-callback-reprocess/index.ts` |
| status | valor `quote_not_found` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/crm-callback-reprocess/index.ts` |
| status | valor `reprocessed` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/crm-callback-reprocess/index.ts` |
| status | valor `pass` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/full-op-diagnostics/index.ts`<br>`escreve:supabase/functions/full-op-diagnostics/index.ts` |
| status | valor `unhealthy` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/health-check/index.ts`<br>`escreve:supabase/functions/health-check/index.ts` |
| status | valor `duplicate_ignored` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/receive-crm-callback/index.ts` |
| status | valor `skipped_claim_error` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook-dispatcher/index.ts` |
| status | valor `skipped_duplicate` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook-dispatcher/index.ts` |
| status | valor `request` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:recovery/src-legacy/src/hooks/useStepUpAuth.ts`<br>`escreve:src/hooks/auth/useStepUpAuth.ts`<br>`escreve:supabase/functions/step-up-verify/index.ts` |
| status | valor `verify_password` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:recovery/src-legacy/src/hooks/useStepUpAuth.ts`<br>`escreve:src/hooks/auth/useStepUpAuth.ts`<br>`escreve:supabase/functions/step-up-verify/index.ts` |
| status | valor `verify_otp` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:recovery/src-legacy/src/hooks/useStepUpAuth.ts`<br>`escreve:src/hooks/auth/useStepUpAuth.ts`<br>`escreve:supabase/functions/step-up-verify/index.ts` |
| status | valor `cancel` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/step-up-verify/index.ts`<br>`escreve:recovery/src-legacy/src/hooks/useStepUpAuth.ts`<br>`escreve:src/hooks/auth/useStepUpAuth.ts` |
| status | valor `password` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/auth/StepUpAuthDialog.tsx` |
| status | valor `otp` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/auth/StepUpAuthDialog.tsx` |
| status | valor `intro` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `qr` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `verify` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MfaEnrollmentDialog.tsx` |
| status | valor `specs` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/types/domain/simulator-wizard.ts`<br>`escreve:src/types/domain/simulator-wizard.ts` |
| status | valor `Criados` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts`<br>`escreve:src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `Enviados` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts`<br>`escreve:src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `Respondidos` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts`<br>`escreve:src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `Aprovados` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts`<br>`escreve:src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts` |
| status | valor `generating` para `stage` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/quotes/PdfGenerationDialog.tsx` |
| status | valor `ready` para `stage` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/quotes/PdfGenerationDialog.tsx` |
| status | valor `mixed` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/admin/connections/ConnectionRowSourceBadge.tsx` |
| status | valor `CLOSED` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/telemetry/BreakerStatusCard.tsx` |
| status | valor `OPEN` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/telemetry/BreakerStatusCard.tsx`<br>`compara:supabase/functions/_shared/circuit-breaker.ts` |
| status | valor `HALF_OPEN` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/telemetry/BreakerStatusCard.tsx`<br>`compara:supabase/functions/_shared/circuit-breaker.ts` |
| status | valor `in-window` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/intelligence/GoldSyncBadge.tsx` |
| status | valor `alert` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/kit-builder/kit-summary/KitValidationChecklist.tsx` |
| status | valor `collapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/sidebar.tsx`<br>`escreve:src/components/ui/sidebar.tsx` |
| status | valor `object` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/quotes/useQuoteBuilderState.ts` |
| status | valor `closed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/voice/feedbackSounds.ts` |
| status | valor `suspended` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/voice/feedbackSounds.ts` |
| status | valor `installed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/sw-register.ts` |
| status | valor `selected` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/__visual/DatePickerFieldHarness.tsx` |
| status | valor `uploaded` para `cf_sync_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/AdminCloudflareImagesPage.tsx` |
| status | valor `orphaned` para `cf_sync_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/AdminCloudflareImagesPage.tsx` |
| status | valor `ready` para `cloudflare_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/external-db/products-detail.ts` |
| status | valor `synced` para `sync_status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/product-webhook/index.ts` |
| coluna | coluna `admin_notes` usada no código não existe no schema de `discount_approval_requests` |  |
| coluna | coluna `created_at` usada no código não existe no schema de `discount_approval_requests` |  |
| coluna | coluna `max_allowed_percent` usada no código não existe no schema de `discount_approval_requests` |  |
| coluna | coluna `responded_at` usada no código não existe no schema de `discount_approval_requests` |  |
| coluna | coluna `seller_id` usada no código não existe no schema de `discount_approval_requests` |  |
| coluna | coluna `artwork_urls` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `created_at` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `has_personalization` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `mockup_urls` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `personalization_config` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `product_description` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `product_variant_id` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `selected_packaging_id` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `selected_packaging_name` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `selected_packaging_unit_cost` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `updated_at` usada no código não existe no schema de `quote_items` |  |
| coluna | coluna `is_public` usada no código não existe no schema de `collections` |  |
| coluna | coluna `share_expires_at` usada no código não existe no schema de `collections` |  |
| coluna | coluna `share_token` usada no código não existe no schema de `collections` |  |
| coluna | coluna `total` usada no código não existe no schema de `orders` |  |
| coluna | coluna `bitrix_deal_id` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `bitrix_quote_id` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `client_response` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `client_response_at` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `client_response_notes` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `created_at` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `discount_approval_status` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `discount_approved_at` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `is_latest_version` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `parent_quote_id` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `real_subtotal` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `sent_at` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `synced_at` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `synced_to_bitrix` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `updated_at` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `version` usada no código não existe no schema de `quotes` |  |
| coluna | coluna `filter_states` usada no código não existe no schema de `user_preferences` |  |
| coluna | coluna `env_key` usada no código não existe no schema de `external_connections` |  |
| coluna | coluna `is_pinned` usada no código não existe no schema de `custom_kits` |  |
| coluna | coluna `avatar_url` usada no código não existe no schema de `profiles` |  |
| coluna | coluna `bitrix_id` usada no código não existe no schema de `profiles` |  |
| coluna | coluna `count` usada no código não existe no schema de `profiles` |  |
| coluna | coluna `aspect_ratio` usada no código não existe no schema de `magic_up_generations` |  |
| coluna | coluna `channel` usada no código não existe no schema de `magic_up_generations` |  |
| coluna | coluna `copy_pack` usada no código não existe no schema de `magic_up_generations` |  |
| coluna | coluna `metadata` usada no código não existe no schema de `magic_up_generations` |  |
| coluna | coluna `quality_score` usada no código não existe no schema de `magic_up_generations` |  |
| coluna | coluna `status` usada no código não existe no schema de `magic_up_generations` |  |
| coluna | coluna `ai_description` usada no código não existe no schema de `products` |  |
| coluna | coluna `ai_generated_at` usada no código não existe no schema de `products` |  |
| coluna | coluna `ai_summary` usada no código não existe no schema de `products` |  |
| coluna | coluna `ai_title` usada no código não existe no schema de `products` |  |
| coluna | coluna `ai_version` usada no código não existe no schema de `products` |  |
| coluna | coluna `category_id` usada no código não existe no schema de `products` |  |
| coluna | coluna `category_name` usada no código não existe no schema de `products` |  |
| coluna | coluna `images` usada no código não existe no schema de `products` |  |
| coluna | coluna `is_deleted` usada no código não existe no schema de `products` |  |
| coluna | coluna `locked_fields` usada no código não existe no schema de `products` |  |
| coluna | coluna `nome` usada no código não existe no schema de `products` |  |
| coluna | coluna `primary_image_url` usada no código não existe no schema de `products` |  |
| coluna | coluna `sale_price` usada no código não existe no schema de `products` |  |
| coluna | coluna `sku` usada no código não existe no schema de `products` |  |
| coluna | coluna `stock_quantity` usada no código não existe no schema de `products` |  |
| coluna | coluna `supplier_id` usada no código não existe no schema de `products` |  |
| coluna | coluna `tags` usada no código não existe no schema de `products` |  |
| coluna | coluna `view_count` usada no código não existe no schema de `products` |  |
| coluna | coluna `created_at` usada no código não existe no schema de `quote_item_personalizations` |  |
| coluna | coluna `updated_at` usada no código não existe no schema de `quote_item_personalizations` |  |
| coluna | coluna `permission_id` usada no código não existe no schema de `role_permissions` |  |
| coluna | coluna `id` usada no código não existe no schema de `seller_discount_limits` |  |
| coluna | coluna `notes` usada no código não existe no schema de `seller_discount_limits` |  |
| coluna | coluna `user_id` usada no código não existe no schema de `generated_mockups` |  |
| coluna | coluna `component_name` usada no código não existe no schema de `product_kit_components` |  |
| coluna | coluna `component_type_code` usada no código não existe no schema de `product_kit_components` |  |
| coluna | coluna `enrichment_status` usada no código não existe no schema de `product_kit_components` |  |
| coluna | coluna `dns_ms` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `download_ms` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `request_url` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `response_body` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `response_headers` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `tcp_ms` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `tls_ms` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `triggered_by_user_id` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `ttfb_ms` usada no código não existe no schema de `connection_test_history` |  |
| coluna | coluna `connection_id` usada no código não existe no schema de `external_connections_sync_log` |  |
| coluna | coluna `connection_name` usada no código não existe no schema de `external_connections_sync_log` |  |
| coluna | coluna `records_failed` usada no código não existe no schema de `external_connections_sync_log` |  |
| coluna | coluna `records_processed` usada no código não existe no schema de `external_connections_sync_log` |  |
| coluna | coluna `started_at` usada no código não existe no schema de `external_connections_sync_log` |  |
| coluna | coluna `sync_type` usada no código não existe no schema de `external_connections_sync_log` |  |
| coluna | coluna `created_at` usada no código não existe no schema de `inbound_webhook_events` |  |
| coluna | coluna `error_message` usada no código não existe no schema de `inbound_webhook_events` |  |
| coluna | coluna `ip_address` usada no código não existe no schema de `inbound_webhook_events` |  |
| coluna | coluna `name` usada no código não existe no schema de `inbound_webhook_endpoints` |  |
| coluna | coluna `auto_disabled_at` usada no código não existe no schema de `outbound_webhooks` |  |
| coluna | coluna `auto_disabled_reason` usada no código não existe no schema de `outbound_webhooks` |  |
| coluna | coluna `duration_ms` usada no código não existe no schema de `admin_audit_log` |  |
| coluna | coluna `finished_at` usada no código não existe no schema de `admin_audit_log` |  |
| coluna | coluna `payload_summary` usada no código não existe no schema de `admin_audit_log` |  |
| coluna | coluna `source` usada no código não existe no schema de `admin_audit_log` |  |
| coluna | coluna `started_at` usada no código não existe no schema de `admin_audit_log` |  |
| coluna | coluna `status` usada no código não existe no schema de `admin_audit_log` |  |
| coluna | coluna `changed_at` usada no código não existe no schema de `price_history` |  |
| coluna | coluna `new_values` usada no código não existe no schema de `price_history` |  |
| coluna | coluna `category` usada no código não existe no schema de `saved_filters` |  |
| coluna | coluna `received_at` usada no código não existe no schema de `crm_callback_events` |  |
| coluna | coluna `color_code` usada no código não existe no schema de `product_variants` |  |
| coluna | coluna `color_hex` usada no código não existe no schema de `product_variants` |  |
| coluna | coluna `color_name` usada no código não existe no schema de `product_variants` |  |
| coluna | coluna `selected_thumbnail` usada no código não existe no schema de `product_variants` |  |
| coluna | coluna `size_code` usada no código não existe no schema de `product_variants` |  |
| coluna | coluna `area_maxima_texto` usada no código não existe no schema de `tabela_preco_gravacao_oficial` |  |
| coluna | coluna `ativo` usada no código não existe no schema de `tabela_preco_gravacao_oficial` |  |
| coluna | coluna `cobra_por_cor` usada no código não existe no schema de `tabela_preco_gravacao_oficial` |  |
| coluna | coluna `codigo_tabela` usada no código não existe no schema de `tabela_preco_gravacao_oficial` |  |
| coluna | coluna `id` usada no código não existe no schema de `tabela_preco_gravacao_oficial` |  |
| coluna | coluna `max_cores` usada no código não existe no schema de `tabela_preco_gravacao_oficial` |  |
| coluna | coluna `cidade` usada no código não existe no schema de `companies` |  |
| coluna | coluna `cnpj` usada no código não existe no schema de `companies` |  |
| coluna | coluna `estado` usada no código não existe no schema de `companies` |  |
| coluna | coluna `instagram` usada no código não existe no schema de `companies` |  |
| coluna | coluna `is_customer` usada no código não existe no schema de `companies` |  |
| coluna | coluna `is_supplier` usada no código não existe no schema de `companies` |  |
| coluna | coluna `logo_url` usada no código não existe no schema de `companies` |  |
| coluna | coluna `nome_fantasia` usada no código não existe no schema de `companies` |  |
| coluna | coluna `ramo_atividade` usada no código não existe no schema de `companies` |  |
| coluna | coluna `razao_social` usada no código não existe no schema de `companies` |  |
| coluna | coluna `title` usada no código não existe no schema de `companies` |  |
| coluna | coluna `website` usada no código não existe no schema de `companies` |  |
| coluna | coluna `is_active` usada no código não existe no schema de `integration_credentials` |  |
| coluna | coluna `cache_hit` usada no código não existe no schema de `query_telemetry` |  |
| coluna | coluna `deleted_at` usada no código não existe no schema de `product_images` |  |
| coluna | coluna `format` usada no código não existe no schema de `product_images` |  |
| coluna | coluna `id` usada no código não existe no schema de `product_images` |  |
| coluna | coluna `is_active` usada no código não existe no schema de `product_images` |  |
| coluna | coluna `product_id` usada no código não existe no schema de `product_images` |  |
| coluna | coluna `url_cdn` usada no código não existe no schema de `product_images` |  |
| coluna | coluna `width_px` usada no código não existe no schema de `product_images` |  |
| tabela | tabela `...` usada no código não existe nas migrations/types do repo | `src/lib/supabase-untyped.ts`<br>`supabase/migrations/20260621235500_faxina_restore_18_frontend_referenced_tables_APLICADO.sql` |
| tabela | tabela `a` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs`<br>`scripts/check-select-columns.mjs` |
| tabela | tabela `avatars` usada no código não existe nas migrations/types do repo | `src/components/admin/users/useUserManagement.ts` |
| tabela | tabela `b` usada no código não existe nas migrations/types do repo | `scripts/check-select-columns.mjs` |
| tabela | tabela `clients` usada no código não existe nas migrations/types do repo | `tests/scripts/check-cnpj-render.test.mjs` |
| tabela | tabela `contacts` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs`<br>`supabase/functions/expert-chat/index.ts` |
| tabela | tabela `customers` usada no código não existe nas migrations/types do repo | `supabase/functions/expert-chat/index.ts` |
| tabela | tabela `customization_price_tables` usada no código não existe nas migrations/types do repo | `tests/scripts/check-supabase-reference-catalog.test.mjs` |
| tabela | tabela `dashboard_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `emails` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `fantasma` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `fixture_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `foreign_quotes` usada no código não existe nas migrations/types do repo | `tests/scripts/check-supabase-reference-catalog.test.mjs` |
| tabela | tabela `ghost_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `literal` usada no código não existe nas migrations/types do repo | `scripts/check-select-columns.mjs` |
| tabela | tabela `messages` usada no código não existe nas migrations/types do repo | `recovery/RealtimeMessagesExample.tsx` |
| tabela | tabela `payments` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `pg_class` usada no código não existe nas migrations/types do repo | `tests/security/rls-validation.test.ts` |
| tabela | tabela `produtos` usada no código não existe nas migrations/types do repo | `tests/scripts/audit-db-frontend-coverage.test.mjs`<br>`tests/scripts/inventario-banco.test.mjs` |
| tabela | tabela `quote_comments` usada no código não existe nas migrations/types do repo | `recovery/src-legacy/src/hooks/useQuoteComments.ts` |
| tabela | tabela `runtime_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `so_teste` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `some_table` usada no código não existe nas migrations/types do repo | `src/lib/intelligence/degradation.ts` |
| tabela | tabela `sync_logs` usada no código não existe nas migrations/types do repo | `supabase/functions/bitrix-sync/index.ts` |
| tabela | tabela `t` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs`<br>`scripts/inventario/gerar-banco.mjs`<br>`scripts/inventario/gerar-rotas.mjs`<br>`src/lib/supabase/empty-in-guard.ts` |
| tabela | tabela `t1` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `tabela_antiga` usada no código não existe nas migrations/types do repo | `tests/scripts/inventario-rotas.test.mjs` |
| tabela | tabela `tools_runtime` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `tpgo` usada no código não existe nas migrations/types do repo | `src/hooks/gravacao/useTecnicasGravacao.ts` |
| tabela | tabela `tpgo_faixa` usada no código não existe nas migrations/types do repo | `src/hooks/gravacao/useTecnicasGravacao.ts` |
| tabela | tabela `tx` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `x` usada no código não existe nas migrations/types do repo | `scripts/inventario/gerar-banco.mjs`<br>`supabase/migrations/20260627130450_reconcile_unarchive_7_live_tables_faxina20260620.sql` |
| tabela | tabela `xbz_image_import_staging` usada no código não existe nas migrations/types do repo | `supabase/functions/xbz-image-uploader/index.ts` |
| rls | `audit_log`: front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useAuditLog.ts` |
| rls | `bitrix_deals`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `collection_items`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `collection_items`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `collection_items`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `collection_items`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `collections`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `collections`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/components/collections/ShareCollectionDialog.tsx`<br>`recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `collections`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| rls | `e2e_cleanup_rate_limit`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `edge_function_invocations`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `expert_conversations`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useExpertConversations.tsx`<br>`src/hooks/intelligence/useExpertConversations.tsx` |
| rls | `expert_messages`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useExpertConversations.tsx`<br>`src/hooks/intelligence/useExpertConversations.tsx` |
| rls | `external_connections_sync_log`: RLS ligado sem nenhuma política → só service_role acessa | `src/components/admin/connections/ExternalConnectionsSyncLogPanel.tsx`<br>`src/components/admin/connections/LastSyncRunPanel.tsx` |
| rls | `file_scan_logs`: RLS ligado sem nenhuma política → só service_role acessa | `src/components/admin/security/SecureUploadManager.tsx` |
| rls | `geo_allowed_countries`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| rls | `geo_allowed_countries`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| rls | `geo_allowed_countries`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| rls | `integration_credentials`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `magic_up_generations`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useMagicUpGeneration.ts`<br>`recovery/src-legacy/src/hooks/useMagicUpState.ts`<br>`src/components/search/useGlobalSearch.ts`<br>`src/hooks/intelligence/useMagicUpGeneration.ts` |
| rls | `mockup_drafts`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useMockupDraft.ts`<br>`src/hooks/mockup/useMockupDraft.ts` |
| rls | `product_materials`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `product_price_freshness_overrides`: front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useProductFreshnessOverride.ts`<br>`src/hooks/products/useProductFreshnessOverride.ts` |
| rls | `role_migration_batches`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useRoleMigration.ts`<br>`src/hooks/admin/useRoleMigration.ts` |
| rls | `role_migration_items`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useRoleMigration.ts`<br>`src/hooks/admin/useRoleMigration.ts` |
| rls | `security_settings`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| rls | `seller_cart_items`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useSellerCarts.ts`<br>`src/hooks/products/useSellerCarts.helpers.ts`<br>`src/hooks/products/useSellerCarts.ts` |
| rls | `seller_carts`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useSellerCarts.ts`<br>`src/hooks/products/useSellerCarts.helpers.ts`<br>`src/hooks/products/useSellerCarts.ts` |
| rls | `supplier_products_raw`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `tabela_preco_gravacao_oficial`: RLS ligado sem nenhuma política → só service_role acessa | `src/lib/external-db/rpc-native.ts` |
| rls | `user_comparisons`: RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx`<br>`recovery/src-legacy/src/hooks/useComparisonSync.ts`<br>`src/hooks/comparison/useComparisonSync.ts` |
| rls | `user_onboarding`: front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useOnboarding.ts`<br>`src/hooks/ui/useOnboarding.ts` |
| rls | `user_onboarding`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useOnboarding.ts`<br>`src/hooks/ui/useOnboarding.ts` |
| rls | `user_onboarding`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useOnboarding.ts`<br>`src/hooks/ui/useOnboarding.ts` |
| dinheiro | `ops.pgss_history.total_exec_time` guarda dinheiro em `double precision NOT NULL` (ponto flutuante) — arredondamento imprevisível; padrão é numeric |  |
| edge | edge function `a` invocada mas não existe em supabase/functions/ | `scripts/__tests__/check-invoke-direct-calls.test.mjs` |
| edge | edge function `b` invocada mas não existe em supabase/functions/ | `scripts/__tests__/check-invoke-direct-calls.test.mjs` |
| edge | edge function `chamada-literal` invocada mas não existe em supabase/functions/ | `tests/scripts/inventario-repo.test.mjs` |
| edge | edge function `chamada-ok` invocada mas não existe em supabase/functions/ | `tests/scripts/inventario-repo.test.mjs` |
| edge | edge function `chamada-por-outra-edge` invocada mas não existe em supabase/functions/ | `tests/scripts/inventario-repo.test.mjs` |
| edge | edge function `dashboard-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `e` invocada mas não existe em supabase/functions/ | `src/integrations/supabase/__tests__/edge-request-id.test.ts` |
| edge | edge function `e1` invocada mas não existe em supabase/functions/ | `src/integrations/supabase/__tests__/edge-request-id.test.ts` |
| edge | edge function `e2` invocada mas não existe em supabase/functions/ | `src/integrations/supabase/__tests__/edge-request-id.test.ts` |
| edge | edge function `fixture-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `fn` invocada mas não existe em supabase/functions/ | `tests/scripts/gate-baseline-absence.test.mjs` |
| edge | edge function `ghost-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `inexistente` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `minha-func` invocada mas não existe em supabase/functions/ | `tests/scripts/gen-edges-readme.test.mjs` |
| edge | edge function `no` invocada mas não existe em supabase/functions/ | `scripts/__tests__/check-invoke-direct-calls.test.mjs` |
| edge | edge function `nome` invocada mas não existe em supabase/functions/ | `scripts/gen-edges-readme.mjs` |
| edge | edge function `orphan-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `other` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `qualquer-edge` invocada mas não existe em supabase/functions/ | `src/integrations/supabase/__tests__/edge-request-id.test.ts` |
| edge | edge function `runtime-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `runtime-missing` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `send-email` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs`<br>`tests/scripts/inventario-rotas.test.mjs` |
| edge | edge function `so-chamada-em-teste` invocada mas não existe em supabase/functions/ | `tests/scripts/inventario-repo.test.mjs` |
| edge | edge function `ssot-ignored` invocada mas não existe em supabase/functions/ | `scripts/__tests__/check-invoke-direct-calls.test.mjs` |
| edge | edge function `t` invocada mas não existe em supabase/functions/ | `scripts/__tests__/check-invoke-direct-calls.test.mjs` |
| edge | edge function `tem-chamador` invocada mas não existe em supabase/functions/ | `tests/scripts/inventario-repo.test.mjs` |
| … +210 linhas — lista completa em `context.json` | | |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- `optimization_queue.guardrail_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `quotes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `magazines.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `discount_approval_requests.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `custom_kits.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `quotes_inbound.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_inbound_log.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2025m12.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026m01.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026m02.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026m03.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026m04.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026m05.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admin_audit_log_y2026m06.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ai_usage_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `conversation_audit_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `conversation_delivery_status.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `external_connections_sync_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `magic_up_campaigns.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `magic_up_public_shares.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `optimization_queue_runs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `optimization_queue_runs.guardrail_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `orders.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `orders.fulfillment_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `product_sync_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `simulator_wizard_drafts.wizard_step` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `user_onboarding.current_step` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_delivery_metrics.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_delivery_metrics_y2026m05.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_delivery_metrics_y2026m06.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `variant_supplier_sources.sync_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `variant_supplier_sources.supplier_availability_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cf_recon.action_log.old_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cf_recon.action_log.new_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `access_blocked_log.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ai_enrichment_queue.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `asia_upload_mapping.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `city_whitelist.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `import_pipeline_steps.fase` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `import_pipeline_steps.etapa` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `import_pipeline_steps.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `mockup_generation_jobs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `notifications.delivery_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `pipeline_run_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `product_fiscal.tax_reference_state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `product_supply.sync_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `product_videos.cloudflare_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sm_site_url_map.search_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sm_worker_partitions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `video_validation_log.validation_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_dispatcher_log.quote_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_dispatcher_log.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `video_import_queue.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `video_sim_results.queue_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `xbz_upload_mapping.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `supplier_stricker.sync_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `product_images.cf_sync_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `reward_redemptions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sync_jobs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `bitrix_deals.stage` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `bitrix_sync_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `company_addresses.estado` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `simulation_runs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `quote_approval_tokens.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `kit_share_tokens.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `_deprecated_silver_images_queue_20260606.img_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 268/495 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `optimization_queue`, `quotes`, `magazines`, `material_types`, `quotes_inbound`, `webhook_inbound_dedupe`, `webhook_inbound_log`, `magazine_items`, `magazine_reader_state`, `magazine_templates`, `admin_audit_log_y2025m12`, `admin_audit_log_y2026m01` …
- Há tabelas usadas no código sem migration no repo — o schema real pode ter sido alterado pelo painel.

## Regras manuais presentes

- `manual/regras.md`
