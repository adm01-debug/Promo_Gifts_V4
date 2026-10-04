# Auditoria Técnica — 20 Dimensões

**Data:** 2026-10-02 · **Repo:** `adm01-debug/Promo_Gifts_V4` @ `c5970190b` · **Método:** 4 agentes independentes × 5 dimensões, evidência file:line obrigatória, nota 10 exige prova concreta.

**Score ponderado: 7.67 / 10**

Pesos: ×3 = Autenticação, Autorização, Data Integrity, Segurança · ×2 = Arquitetura, Banco, Tipagem, Validação, Testes · ×1 = demais.

## Scorecard

| # | Dimensão | Nota | Peso |
|---|---|---|---|
| 1 | Arquitetura | **7.5** | ×2 |
| 2 | Autenticação | **8** | ×3 |
| 3 | Autorização | **8.5** | ×3 |
| 4 | Banco de Dados | **7** | ×2 |
| 5 | CI/CD | **8.5** | ×1 |
| 6 | Data Integrity | **7.5** | ×3 |
| 7 | Documentação | **7** | ×1 |
| 8 | Infraestrutura / DevOps | **6.5** | ×1 |
| 9 | Logging / Monitoring | **7.5** | ×1 |
| 10 | Observabilidade | **7.5** | ×1 |
| 11 | Lógica de Negócio | **8.0** | ×1 |
| 12 | Manutenibilidade | **7.5** | ×1 |
| 13 | Operacionalidade | **7.5** | ×1 |
| 14 | Performance | **7.5** | ×1 |
| 15 | Qualidade de Código | **7.5** | ×1 |
| 16 | Segurança | **8.5** | ×3 |
| 17 | Testes | **7** | ×2 |
| 18 | Tipagem / Type Safety | **8** | ×2 |
| 19 | Validação | **6.5** | ×2 |
| 20 | Operações (Processos) | **8.5** | ×1 |

## 1. Arquitetura — 7.5/10

### Evidências
- Estrutura feature-based consistente: src/components/ tem 30+ diretórios por domínio (cart, catalog, quotes, kit-builder, mockup, intelligence...), src/pages/<dominio>/, src/hooks/<dominio>/, src/routes/ separado por domínio (admin-routes.tsx, client-routes.tsx, quote-routes.tsx, tools-routes.tsx, product-routes.tsx, public-routes.tsx + guards/); App.tsx tem apenas 129 linhas delegando a AppRoutes
- ADRs reais e numerados: docs/adr/0001 a 0009 + ADR-001-unificacao-medallion-silver-de-para.md + 7 docs/ADR_*.md (2026-08-26) + docs/DECISION-LOG-2026-05-21-v2.md; arquitetura Medallion Bronze→Silver→Gold documentada em docs/architecture/medallion-estado-certificado-2026-06-26.md e docs/03_ARQUITETURA_DO_SISTEMA.md
- Integrações isoladas: src/integrations/ (11 arquivos, client.ts com guard SSOT) e supabase/functions/_shared/ com infra compartilhada para 112 edge functions (circuit-breaker.ts, external-fetch.ts, credentials.ts, zod-validate.ts, edge-authz-manifest.ts) — ADR 0005 documenta o padrão circuit breaker
- Gate anti-ciclo no build: package.json 'build' executa scripts/check-chunk-cycles.mjs que detecta ciclos de import estático entre chunks de produção
- God files persistem (verificado em main@2026-10-02): src/components/quotes/QuoteBuilderSummaryColumn.tsx (1.697 linhas), src/components/products/gallery/PromoFlixPlayer.tsx (1.512), src/hooks/quotes/useQuoteBuilderState.ts (1.365 — cresceu desde a auditoria r3), src/hooks/products/useSellerCarts.ts (1.306)
- Camada de serviços fragmentada e dependência invertida: src/services/ tem só 11 arquivos vs src/lib/ (313), src/utils/ (54), src/logic/ (4); src/services/quoteService.ts importa de '@/hooks/quotes/quoteHelpers' — a camada de serviço depende do diretório de hooks
- Sem boundary de dados enforced: 345 arquivos em src/ importam 'integrations/supabase/client' diretamente, sendo 111 dentro de src/components/ — acesso a dados espalhado pela UI, DIP por convenção; eslint no-restricted-imports cobre apenas casos pontuais (eslint.config.js:1644), sem plugin de boundaries nem gate de ciclos de import em nível de módulo (o check existente opera só sobre chunks buildados)
- Artefatos estranhos na raiz de src/: src/app.tsx.patch e src/audit-debug.ts (script de diagnóstico DevTools commitado como código de produção)

### Gaps
- 3+ god files >1.300 linhas concentram múltiplas responsabilidades e impedem substituição isolada de módulos
- Conceito de camada de serviço inconsistente: services/ vs lib/ vs utils/ vs logic/ coexistem sem regra clara; service importa de hooks/ (direção invertida)
- Boundary de dados não enforced: 345 call-sites acessam o client Supabase diretamente, 111 em components/
- Sem enforcement sistemático de dependências entre módulos (só ciclos entre chunks buildados; import cycles em nível de arquivo não são verificados)
- Artefatos de debug/patch na raiz de src/ (app.tsx.patch, audit-debug.ts)
- 252 arquivos em docs/ sem boundary de documentação — sintoma já corrigido parcialmente (docs/runbooks fundido em docs/RUNBOOKS pós-r3) mas duplicidade estrutural segue possível

### Ações
- [codigo] Quebrar os god files em unidades <=400 linhas: QuoteBuilderSummaryColumn.tsx (extrair colunas/seções para components/quotes/summary/*), PromoFlixPlayer.tsx (extrair player/controles), useQuoteBuilderState.ts (extrair cálculo para src/logic/quotes/), useSellerCarts.ts — manter testes de contrato existentes como rede de segurança
- [codigo] Adicionar gate de ciclos de import em nível de módulo: rodar madge/dpdm ou eslint import/no-cycle em CI (novo script check:import-cycles + workflow ou step no ci.yml)
- [codigo] Definir boundaries por convenção enforced: eslint-plugin-boundaries ou regras no-restricted-imports impedindo components/ e pages/ de importar '@/integrations/supabase/client' diretamente — forçar passagem por hooks/services; migrar os 111 call-sites em components/ incrementalmente com baseline ratchet
- [codigo] Consolidar camadas: documentar em CLAUDE.md/ADR o papel de services/ (I/O), lib/ (domínio), utils/ (helpers puros), logic/ (regras puras) e migrar quoteHelpers.ts para src/logic/quotes/ eliminando a dependência services→hooks
- [codigo] Remover src/app.tsx.patch e src/audit-debug.ts da árvore de produção (mover audit-debug para scripts/ se ainda for usado)
- [doc] Criar ADR de boundaries de módulos formalizando o grafo permitido entre pages→components→hooks→services/lib→integrations

## 2. Autenticação — 8/10

### Evidências
- Supabase Auth (GoTrue/JWT): signInWithPassword + signOut({scope:'global'}) em src/services/authService.ts:16-22,178 — logout global server-side real.
- Refresh automático com buffer de 5min + toast de expiração + watchdog 8s + recovery de bad_jwt/kid rotacionado: src/contexts/AuthContext.tsx:286-341 e src/lib/auth/session-recovery.ts; race no refresh mitigada por fetchPromiseRef (AuthContext.tsx:120-123,184-253).
- MFA implementada em duas camadas: Supabase AAL (useAuthMFA + mfaRequired=isSupervisorOrAbove && aal!=aal2 em AuthContext.tsx:443; requireAal2 enforced server-side em supabase/functions/_shared/authorize.ts:134-146) e TOTP próprio via otpauth (src/hooks/auth/use2FA.ts) + edges step-up-verify e verify-2fa-token + useStepUpAuth + StepUpAuthDialog.
- Revogação server-side de sessão: tabela user_token_revocations + RPC revoke_all_user_tokens + edge force-global-logout + check isTokenRevoked em _shared/auth.ts:56 e _shared/authorize.ts:151 (cache 30s, fail-open documentado).
- Password policy forte no signup/reset: min 8 + maiúscula + minúscula + dígito + especial (src/lib/validations/authSchema.ts:19-25,39-45). Reset via resetPasswordForEmail + tabela password_reset_requests com policies admin-only.
- Proteção brute-force em 2 camadas: lockout client-side 5 tentativas/5min (src/lib/auth/rate-limit.ts) + telemetria/controle server-side via edges log-login-attempt, check-login (IP whitelist, city whitelist, blocked_until em access_security_settings), rate-limit-check, block-ip-temporarily, detect-new-device.
- Fuzzing de auth semanal em CI: .github/workflows/auth-fuzz-weekly.yml; wrappers safeAuthCall/safeMfaCall com timeout+retry+breaker (src/lib/auth/safeAuthCall.ts).
- Tokens de sessão persistidos em localStorage (src/integrations/supabase/client.ts:104-115) — exposição a XSS; mitigado por CSP forte mas não é HttpOnly cookie.
- NAO AUDITAVEL: config do GoTrue em produção (JWT expiry, confirmação de email obrigatória, rate limits do /auth/v1/token do Supabase) — exige acesso ao dashboard Supabase doufsxqlfjyuvxuezpln.

### Gaps
- JWT em localStorage (client.ts:104-115) — roubável por qualquer XSS; padrão Supabase SPA, mas é o vetor nº1 residual. Alternativa (cookie HttpOnly via SSR/proxy) inviável em SPA estático na Vercel sem backend.
- Lockout client-side (rate-limit.ts) é bypassável limpando sessionStorage; o bloqueio server-side (check-login/access_security_settings) existe mas AuthContext.signIn não o invoca no caminho de senha — depende do Supabase GoTrue rate limit, não configurável no repo.
- MFA obrigatório só para supervisor+ (mfaRequired); vendedores/agentes não exigem AAL2 em nenhum fluxo verificado.
- Sem CAPTCHA/prova-de-trabalho na tela de login (bot-protection.ts existe em _shared mas não é aplicado ao fluxo Auth.tsx verificado).
- Política de senha no login é só min(6) (authSchema.ts:9) — contas legadas com senha fraca não são forçadas a migrar.

### Ações
- [código] src/contexts/AuthContext.tsx signIn: invocar edge check-login antes de signInWithPassword e honrar blocked_until/allowed=false do access_security_settings, fechando o lockout server-side real (não só telemetria).
- [config/dashboard] Ativar no Supabase Auth: confirmação de email obrigatória, rate limit de /token (ou Cloudflare/WAF na frente), e revisar JWT expiry (atual ~1h implícito); documentar em docs/AUTH-GOOGLE-PROD-CHECKLIST.md.
- [código+migration] Estender mfaRequired para todos os usuários internos (user_roles qualquer role) com período de graça — usar requireAal2 já existente em _shared/authorize.ts nas edges sensíveis.
- [código] authSchema.ts: alinhar loginSchema a min(8) e adicionar fluxo de 'senha expirada/fraca → force reset' via password_reset_requests.
- [processo] Adicionar Turnstile/hCaptcha no Auth.tsx (site key pública + verificação via edge) para bloquear credential stuffing sem fricção.

## 3. Autorização — 8.5/10

### Evidências
- RBAC explícito: enum app_role (7 roles) + tabela user_roles + RPC has_role(); hierarquia dev>supervisor>vendedor em supabase/functions/_shared/authorize.ts:39-49 e _shared/auth.ts:77-128.
- Middleware server-side SSOT: _shared/authorize.ts (JWT via getUser + roles + requireAal2 + isTokenRevoked + enforceServerSide via has_role RPC) e _shared/auth.ts authenticateRequest/requireRole/requireDev.
- Gate de CI fail-closed: edge-authz-manifest.ts declara 108 funções em 6 categorias (public/authenticated/supervisor/dev/service/scoped); scripts/check-edge-authorization.mjs falha o build se edge nova não for declarada e se supervisor/dev não usarem authorize(); anti-regressão detecta remoção de authorize; tests/security/edge-authz-bypass.test.ts.
- RLS massiva: 309 tabelas com ENABLE ROW LEVEL SECURITY e 2013 CREATE POLICY em supabase/migrations/ (207 tabelas distintas com policy); migration 20260716000011_sec_rls_enabled_no_policy.sql corrigiu 42 tabelas flagged pelo lint 0008 (RLS on, zero policies); sweeps revoke_anon_* (20260524210352, 20260716185751, 20260716000040, 20260905033200).
- Anti privilege-escalation: policies guarded em user_roles ('Only admins can insert roles' + insert/update/delete guarded, 20260404163714; user_roles_self_read/supervisor_read); GRANT SELECT apenas.
- Testes de autorização: edge rls-audit executa cenários allow/deny SELECT/INSERT/UPDATE/DELETE com JWT real de vendedor; rls-integration-tests, rls-matrix-export, test-cart-rls; specs tests/security/notification-rls.spec.ts, apply-seller-scope.spec.ts, edge-authz-role-cases.spec.ts.
- Frontend guards: src/components/layout/ProtectedRoute.tsx (requiredRole/requireMfa/requireDev via checkAccess/access-policy) + src/lib/rbac/route-matrix.ts + apply-seller-scope.ts (escopo self por seller_id, defesa em profundidade sobre RLS) + gate check:seller-scope.
- Audit trail de ações sensíveis: admin_audit_log, step_up_audit_log, audit_log universal, ownership_audit_reports, log-login-attempt com IP/user_agent.
- Design consciente verify_jwt=false em todas as funções do config.toml (37 configs) — necessário para endpoints públicos; compensado pelo manifest+gate, mas enforcement é 100% in-function.
- NAO AUDITAVEL (parcial): pg_policies/GRANTs ao vivo no projeto doufsxqlfjyuvxuezpln — REGRA #8 exige pg_catalog; o clone mostra o DDL declarado mas não prova o estado aplicado (drift possível, mitigado por ddl-out-of-band-detector.yml e schema_signature_baseline).

### Gaps
- ~61 nomes criados via CREATE TABLE não têm ENABLE RLS explícito no DDL do repo (maioria _backup/_archive/staging e artefatos de parse, mas inclui user_organizations, user_sessions, webhook_configs, webhook_logs, webhook_delivery_locks, reward_redemptions, personalization_technique_mappings) — provavelmente cobertos por revoke_anon/policies em outras forms, mas exige confirmação via pg_catalog ao vivo.
- verify_jwt=false em 100% das funções configuradas: qualquer função nova que esquecer auth fica exposta até o gate CI rodar (gate existe, mas defesa é processual, não de plataforma).
- Autorização em nível de campo/coluna não é sistemática — feita indiretamente via revoke de anon em tabelas/MVs e views públicas (v_products_public), sem coluna-a-coluna por role.
- Audit trail universal cobre só 5 tabelas via audit_trigger_func (20251227180001); demais dependem de tabelas de auditoria específicas — cobertura não é uniforme.
- Scripts RLS de auditoria (scripts/audit-technical-rls.sql) existem mas não há evidência de execução agendada vs. baseline assinado de policies (schema_signature cobre objetos, não policies).

### Ações
- [migration+processo] Rodar auditoria pg_catalog ao vivo (scripts/audit-technical-rls.sql + queries de docs/SCHEMA_REFERENCE.md §8) e commitar baseline de policies; para as ~61 tabelas sem ENABLE RLS no DDL, adicionar migration explícita ENABLE ROW LEVEL SECURITY + policy deny-by-default ou justificar em allowlist.
- [código+CI] Criar job no CI que valida signature de policies (hash de pg_policies agregado) além do schema_signature_baseline, fechando drift de autorização não detectado hoje.
- [código] Estender audit_trigger_func para as tabelas críticas de negócio (quotes, orders, discount_approval_requests, user_roles, profiles) — hoje só 5 tabelas têm trigger universal.
- [config] Reavaliar verify_jwt=true para as funções da categoria 'service' e 'supervisor' do manifest (defesa em profundidade no gateway, antes do código da função).
- [doc] Publicar matriz role×recurso (docs/RBAC_MATRIX.md) derivada do edge-authz-manifest + policies, para revisão de menor privilégio por role.

## 4. Banco de Dados — 7/10

### Evidências
- 3.010 migrations versionadas em supabase/migrations/ com convenção documentada (YYYYMMDDHHMMSS) em supabase/MIGRATIONS_README.md e contrato de nomes testado em tests/scripts/check-migration-filename-contract.test.mjs
- Governança de drift: .github/workflows/db-schema-drift-check.yml (supabase db diff vs diretório), db-apply-migration.yml é o único caminho autorizado (preflight read-only → psql -1 transacional → repair → recibo em supabase/MIGRATIONS_SYNC_LOG.md), detector semanal ddl-out-of-band-detector.yml (advisory)
- Índices e constraints abundantes: 1.767 CREATE INDEX em 420 arquivos, 5.905 NOT NULL, 1.265 CHECK, 497 REFERENCES, ON DELETE explícito (243 CASCADE / 144 SET NULL / 9 RESTRICT), 51 PARTITION BY, 1.323 COMMENT ON
- Tipos de dinheiro majoritariamente NUMERIC/DECIMAL (363 colunas *price*); pooler Supabase em uso e documentado (docs/db/APLICACAO_SIGNUP_20260922170000.md: pooler aws-1-sa-east-1)
- Snapshot consolidado supabase/migrations-snapshot/ (ALL_IN_ONE.sql 11MB + SCHEMA_LIVE.sql 4,8MB + SNAPSHOT_META.json), regenerável via npm run schema:snapshot; triagem de dead objects documentada (docs/db/EMPTY_TABLES_2026-05-12.md — 130 tabelas vazias classificadas DROP/KEEP_FEATURE/KEEP_INFRA/TODO; UNUSED_INDEXES_TRIAGE_2026-05-12.md)
- NAO AUDITAVEL: backup real e PITR — docs/db/BACKUP_STATUS.md registra PITR como PENDENTE de confirmação humana no painel Supabase; só existe dump schema-only (BACKUP_SCHEMA_ONLY_2026-09-16.sql, 5MB, com SHA-256) + export do ledger — nenhum restore testado. Faltaria: status do PITR no painel e log de um restore de teste

### Gaps
- Backup/restore NÃO auditável — PITR nunca confirmado, nenhum restore teste documentado
- 31 prefixos de versão duplicados em supabase/migrations/ (ex.: 20260610120000 tem 2 arquivos; 20260611120000 tem 3) — colisões de ledger monitoradas mas não eliminadas
- 66 arquivos com nomes fora da convenção canônica (001_*.sql, fix_*.sql, verify_rls_policies.sql) — grandfathered, mas perpetuam inconsistência
- Sem seed.sql canônico para dev/test local (e2e usa scripts de fixture próprios)
- Ledger vs repo: 2.504 versões no banco (LEDGER_DATA_2026-09-16) vs 3.010 arquivos no repo — divergência detectável só por job advisory, não gate
- Resíduos de tipos subótimos: ~226 colunas *price* INTEGER, 6 REAL/DOUBLE, 6 TEXT
- Trigger chains (370 triggers, 2.076 functions) auditadas pontualmente (Gate 2.5 testa races específicos), sem inventário sistêmico de efeitos colaterais

### Ações
- [processo] docs/db/BACKUP_STATUS.md — PO confirmar PITR no painel Supabase e registrar janela de retenção + último backup; agendar restore teste trimestral com recibo em docs/db/
- [processo] Transformar ddl-out-of-band-detector.yml de advisory em gate, ou cron com alerta obrigatório, para convergir ledger↔repo
- [config] Criar supabase/seed.sql com dataset mínimo canônico (roles, 1 seller, 1 cliente, produtos de referência) referenciado pelo README §Setup
- [doc] Renomear/consolidar as 66 migrations não-canônicas via migration repair + registrar em MIGRATIONS_SYNC_LOG.md (ou formalizar exceção no contrato de nomes)
- [migration] Revisão de tipos: identificar colunas *price* INTEGER/REAL/TEXT e planejar conversão para NUMERIC(12,2) onde forem moeda (listar primeiro em docs/db/proposals/)
- [doc] Inventário de trigger chains em docs/db/ (tabela trigger→função→efeitos) para as 370 triggers, priorizando as que tocam quotes/orders

## 5. CI/CD — 8.5/10

### Evidências
- .github/workflows/: 121 workflows; deploy-gates.yml orquestra Gates 0–6 bloqueantes (SSOT, npm audit, lint+tsc, vitest, Playwright smoke, Lighthouse, SEO, build) agregados no job 'Gate Final - Deploy Ready' (linha 339), único required check de main
- ci.yml roda em push/PR: dependency-audit, lint:check, check-tsc-baseline, build + gates estáticos (iframe sandbox, banned phrases, quote-comments residue)
- Deploy: integração nativa Vercel (preview por PR confirmado em deployment-failure-alert.yml) + fallback manual deploy-vercel.yml com smoke /api/health + /api/ready (valida commit SHA) e rollback automático via `vercel rollback` (linha ~170)
- Notificações de falha: deployment-failure-alert.yml comenta no PR ou abre issue label 'deploy-failure'; uptime-monitor.yml abre issues 'uptime'; branch-protection-sentinel.yml suporta Slack opcional via SENTINEL_SLACK_WEBHOOK
- Cache de deps: .github/actions/setup-node-ci/action.yml (composite usado por ~90% dos workflows) usa setup-node cache:'npm'
- Security scans: codeql.yml, security.yml (gitleaks), gitleaks-history-audit.yml, check-dependency-audit.mjs (Gate 0.5, npm audit --audit-level high bloqueante)
- Dependabot configurado (.github/dependabot.yml: weekly, grupos minor/patch, majors ignoradas p/ revisão manual)
- Branch protection documentada em docs/BRANCH_PROTECTION.md + sentinel auditando pushes em main + required-checks-guard.yml
- CHANGELOG.md em formato Keep a Changelog, atualizado (última entrada 2026-09-05)

### Gaps
- Sem git tags nem GitHub Releases — CHANGELOG declara semver mas `git tag` retorna vazio; versão do package.json (2.0.0) não é sincronizada por release workflow
- Deploy de produção via integração nativa Vercel não tem approval gate no repo (apenas db-apply-migration.yml usa environment: production com required reviewers)
- Rollback automatizado só existe para o deploy web Vercel; edge functions e migrations não têm rollback automático (confirmado em docs/VALIDACAO_BACKUP_ROLLBACK_2026-08-26.md)
- Notificação de falha para GitHub Issues é o canal primário; Slack só existe no sentinel e é opcional (depende de secret não verificável)

### Ações
- [config] Adotar release workflow (release-please ou changesets) gerando tag+release+CHANGELOG automático; arquivos: .github/workflows/release.yml, package.json
- [processo] Ativar 'Required reviewers' no GitHub Environment 'production' e referenciá-lo no deploy-vercel.yml para approval gate explícito
- [código/config] Estender deploy-edge-functions.yml com step de snapshot de versão (supabase functions list) + job de rollback manual documentado; registrar versão deployada em supabase/EDGE_DEPLOY_LOG.md
- [config] Configurar secret SENTINEL_SLACK_WEBHOOK e replicar envio Slack em deployment-failure-alert.yml e uptime-monitor.yml para canal tempo-real

## 6. Data Integrity — 7.5/10

### Evidências
- Transações atômicas reais: RPCs plpgsql create_quote_transactional/update_quote_transactional e create/update_quote_with_discount_approval_transactional (supabase/migrations/20260829120000_*.sql) — orçamento+itens+aprovação na mesma transação; SECURITY INVOKER + REVOKE anon + GRANT authenticated apenas.
- Optimistic locking implementado: parâmetro _expected_version com check de versão e exceção em update_quote_transactional (20260620011051:144-174, log 'optimistic_lock_used').
- Idempotência verificada: webhook-inbound usa idempotency_key com detecção de conflito (index.ts:130,411,425,457); contratos zod por função em supabase/functions/_shared/contracts/schemas/ (webhook-inbound, sync-external-db, product-webhook, send-transactional-email, etc.).
- Consistência referencial: 633 cláusulas REFERENCES/FOREIGN KEY nas migrations; 419 com ON DELETE explícito (255 cascade, 147 set null, 12 restrict, 5 no action); lote de índices de FK em 20260512000005_t28b_fk_indexes_remaining.sql.
- Validação server-side: zod em edges (LoginAttemptSchema em log-login-attempt; _shared/zod-validate.ts; contracts/); inputs sanitizados — teste html-sanitizer-xss em tests/security/.
- Dedup de ingestão: UNIQUE constraints + ON CONFLICT em pipelines (uq_products_supplier_ref, supplier_id composto, cf_id, codigo_amigavel+d_number...) — 8+ migrations com upsert idempotente.
- Audit log: audit_log universal (INSERT/UPDATE/DELETE com old/new/changed_fields/user_id/ip, 20251227180001) + tabelas específicas (discount_approval_audit, admin_audit_log, step_up_audit_log, classification_audit, file_scan_logs, ownership_audit_reports).
- Soft delete presente: 113 arquivos de migration referenciam deleted_at.
- CI dedicado: Gate 2.5 'PostgreSQL Transactional Integrity' em .github/workflows/deploy-gates.yml:181 + teste transacional de import em magazine-unit-tests.yml:59; edges de teste test-cart-concurrency/test-cart-limit.
- NAO AUDITAVEL (parcial): estado aplicado das constraints no banco canônico e comportamento real sob concorrência — migrations documentam intenção; verificação live exige pg_catalog no doufsxqlfjyuvxuezpln.

### Gaps
- _expected_version é opcional (DEFAULT NULL) — callers podem ignorar optimistic locking; nem toda entidade tem coluna version (cobertura verificada só em quotes).
- Audit trigger universal cobre apenas 5 tabelas (CREATE TRIGGER count em 20251227180001); histórico de alterações LGPD-style não é uniforme nas tabelas críticas.
- Idempotência só confirmada em webhook-inbound e contratos; mutations via PostgREST direto do frontend (.insert/.update/.upsert em src/) não têm idempotency key nem retry-safe design uniforme.
- Soft delete: deleted_at existe mas há mix com arquivamento físico (_bkp_*, _archive_*) e hard deletes — política consistente não evidenciada.
- Escritas multi-tabela fora dos RPCs transacionais (frontend PostgREST direto) podem deixar estado parcial — cobertura parcial, depende de cada fluxo.
- Tratamento NULL/encoding documentado apenas implicitamente via zod/types; sem policy explícita por campo.

### Ações
- [migration] Tornar _expected_version obrigatório em update_quote_transactional (remover DEFAULT NULL) e propagar coluna version+check para orders/discount_approval_requests/seller_carts.
- [migration] Anexar audit_trigger_func às tabelas críticas restantes (quotes, quote_items, orders, user_roles, profiles, suppliers) ou criar tabela de auditoria por domínio com teste de cobertura.
- [código] Padronizar idempotency-key client→edge: gerar UUID por mutation em src/lib/edge/safeInvokeCall.ts e exigir nas edges de escrita via contrato zod.
- [processo+doc] Definir política soft-delete vs archive (docs/db/) e criar check:soft-delete-policy que falha se tabela de negócio nova nasce sem deleted_at ou justificativa.
- [código] Inventariar escritas multi-tabela diretas via PostgREST no frontend (grep .insert().*insert em sequência) e migrar para RPCs transacionais seguindo o padrão quote_transactional.

## 7. Documentação — 7/10

### Evidências
- README.md (38KB, 570+ linhas): sumário, setup local, variáveis de ambiente, módulos de negócio, RBAC/RLS, edge functions, deploy, troubleshooting, métricas
- CONTRIBUTING.md: fluxo PR obrigatório, conventional commits, prefixos de branch; CLAUDE.md/AGENTS.md (20KB): 9 regras operacionais + mapa de Gates 0-6 do CI; .github/PULL_REQUEST_TEMPLATE.md com checklist; docs/README.md como índice
- docs/ = 394 arquivos .md em 39 subdiretórios: docs/adr/ (10 ADRs), docs/RUNBOOKS/ (CREDENTIAL_ROTATION, CF_RECONCILIATION, EDGE_FUNCTIONS_BASE_URL), docs/INCIDENTS/, docs/contracts/MIGRATION_GUIDE.md, docs/db/POLITICA_DDL.md, docs/ci/SEGREDOS.md
- CHANGELOG.md no formato Keep a Changelog + SemVer, atualizado até 2026-09-05 (seção Unreleased com auditorias r1-r3)
- Catálogo de edge functions docs/EDGE_FUNCTIONS.md (tabela por função: Auth/CORS/Validação/RateLimit); dicionário de dados docs/DATA_DICTIONARY.md; retrato vivo do schema docs/SCHEMA_REFERENCE.md mantido por gate de drift (check-schema-reference-drift.test.mjs)
- Evidência de manutenção: docs de incidentes e pós-mortems reais (POSMORTEM_COMMITS_LOCAIS_2026-09-17.md), histórico de reconciliação de migrations em MIGRATIONS_README.md

### Gaps
- Stale docs críticos: EDGE_FUNCTIONS.md diz '81 funções ativas' (2026-05-22) mas o repo tem 110 dirs/108 index.ts — ~30 funções sem documentação; DATA_DICTIONARY.md diz '63 tabelas locais' (2026-04-17) vs ~300+ reais
- Sem especificação OpenAPI/Swagger para as 108 edge functions — só tabelas markdown; nenhum arquivo openapi.yaml encontrado
- Sprawl documental: 394 docs + 4 AUDIT_*.md soltos na raiz + audit/ + qa/ com sobreposição — risco de informação contraditória (ex.: contagens desatualizadas citadas como fatos)
- ADRs param em 0009/ADR-001 (numeração mista); decisões recentes (E90-E100, gates novos) vivem em docs/ pontuais, não no formato ADR
- Apenas 3 runbooks para 110 edge functions + 138 cron jobs + integrações (Bitrix/n8n/Evolution/Bling)
- Onboarding <4h não verificável — README é completo mas depende de secrets/Supabase externo sem runbook de acesso

### Ações
- [doc] Regenerar docs/EDGE_FUNCTIONS.md a partir dos 108 index.ts reais (script que lê config.toml + _shared) ou apontar para inventário gerado automaticamente; corrigir contagem 81→110
- [doc] Atualizar docs/DATA_DICTIONARY.md contra SCHEMA_REFERENCE.md (63→tabelas reais) ou marcar topo como snapshot histórico com data
- [doc] Gerar openapi.yaml mínimo para edge functions públicas/webhooks a partir de _shared/contracts/schemas (já são Zod → zod-to-openapi)
- [doc] Criar docs/INDEX.md curado (ou renovar docs/README.md) separando docs vivos de snapshots datados; mover AUDIT_*.md da raiz para docs/audits/
- [processo] Regra: nova decisão estrutural → ADR em docs/adr/ (continuar numeração 0010+); absorver decisões E96-E100 ainda soltas
- [doc] Expandir docs/RUNBOOKS/ com os 5 cenários mais prováveis (edge function fora, cron falhando, drift de schema, Bitrix/n8n down, rollback de deploy)

## 8. Infraestrutura / DevOps — 6.5/10

### Evidências
- vercel.json: headers de segurança completos (HSTS preload, X-Frame-Options DENY, CSP com report-uri report-uri.com, Permissions-Policy), Cache-Control por asset (assets/ immutable 1y, index no-store), rewrites SPA
- Ambientes isolados: GitHub Environments 'staging' e 'production' com secrets escopados (security-definer-acl-multi-env.yml linha 93, restore-seller-cart-rpc.yml linhas 48-52); docs/ENVIRONMENTS_PARITY.md documenta matriz
- Secrets: GitHub Secrets + Supabase secrets; gitleaks no CI + .gitleaks.toml + secret scanning push protection (CHANGELOG #1830); script audit:credentials com baseline .audit-credentials-baseline.json
- DB como código: 3010 migrations versionadas em supabase/migrations/; caminho único db-apply-migration.yml (preflight read-only → psql -1 gated por environment: production → migration repair → recibo em MIGRATIONS_SYNC_LOG.md)
- Health endpoints implementados: api/health.ts e api/ready.ts (probe de dependência Supabase com latência por check)
- CDN/SSL: Vercel gerencia CDN+TLS auto-renew; cloudflare-workers/og-meta-bot.js para edge custom
- Connection pooling documentado: docs/DB_CONNECTION_POOL.md (PostgREST pooler, max_connections=90 auditado)

### Gaps
- Sem IaC: nenhum Terraform/Pulumi; configuração de Vercel, DNS, e Supabase dashboard settings (auth, rate limits, backups) não é versionada — só vercel.json e supabase/config.toml parcialmente
- Backup/PITR do Supabase NÃO COMPROVADO: docs/VALIDACAO_BACKUP_ROLLBACK_2026-08-26.md classifica como 'não comprova backup geral, PITR, restore automatizado nem backups _backup_* existirem antes de mudanças destrutivas'
- Disaster recovery: sem runbook de DR testado; restore nunca exercitado (doc admite modo estritamente read-only)
- Edge functions sem rollback automatizado e sem canário (doc: 'não comprova rollback automatizado de Edge Functions, canário de tráfego real')
- Tabelas _backup_* pré-mudança destrutiva exigidas por política mas existência é caso a caso

### Ações
- [config/processo] Exportar e versionar configuração do projeto Supabase via `supabase config push`-compatible settings + snapshot das config de Auth/Storage; documentar em docs/SUPABASE_CONFIG.md
- [processo] Ativar PITR no Supabase Pro e agendar job trimestral de restore test (workflow_dispatch com script scripts/test-restore.mjs rodando pg_dump+restore em projeto efêmero)
- [doc] Criar docs/DISASTER_RECOVERY.md: RTO/RPO declarados, passo a passo de restore de DB, redeploy Vercel e edge functions, e checklist de validação pós-restore
- [config] Em db-apply-migration.yml, tornar obrigatória a criação de tabela _backup_<nome>_<data> para migrations marcadas 'destructive' no manifest, com gate falhando se ausente
- [doc/config] Automatizar rollback de edge function: registrar hash/versão deployada por run (já existe E42 hash) e script scripts/rollback-edge-function.sh <fn> <sha>

## 9. Logging / Monitoring — 7.5/10

### Evidências
- Logger estruturado client-side: src/lib/logger.ts — JSON com level/message/timestamp/data, redação de chaves sensíveis via SENSITIVE_KEY_RE (token|secret|password|jwt...), PROD só errors
- Logger estruturado edge: supabase/functions/_shared/structured-logger.ts — linha JSON única com fn, request_id, event, method, path, status, duration_ms (formato Logflare)
- Correlação: _shared/request-id.ts (getOrCreateRequestId, echo X-Request-Id), src/lib/telemetry/correlationId.ts; api/health.ts propaga x-request-id; docs/OBSERVABILITY.md §1 documenta request_id client→edge→DB→Sentry
- Gates de CI forçando adoção: scripts/check-edge-structured-logging.mjs + check:client-structured-logging.mjs com CRITICAL_MODULES congelada e LEGACY_ALLOWLIST que não pode crescer
- Uptime monitoring: uptime-monitor.yml a cada 15min probando site + health-check + check-login, abrindo/comentando issue label 'uptime' sem duplicar
- Dashboards internos: src/pages/admin/ObservabilityDashboard.tsx, AdminLoginAttemptsPage.tsx, RateLimitDashboardPage.tsx, páginas telemetry/*
- Alertas: deployment-failure-alert.yml, prod-health.yml pós-merge, bridgeAlertThresholds.ts

### Gaps
- Adoção parcial do structured logger nas edge functions: só 31/109 index.ts usam createStructuredLogger (~28%) — 78 funções sem log padronizado
- Alertas vão para GitHub Issues — não há push tempo-real comprovado para Slack/WhatsApp a partir do repo (sentinel tem Slack opcional; 'VPS Grafana/Prometheus/Loki + watchdogs WhatsApp' citado em docs/incident-response.md:22 mas NÃO AUDITÁVEL via repo — sem configs versionadas)
- Retenção/rotação de logs não documentada (depende do default Supabase Logflare)
- Sem dashboard de métricas de negócio central documentado (existem páginas admin esparsas)
- PII em logs: redação por regex de chaves no client logger, mas sem varredura de PII em edge logs

### Ações
- [código] Expandir CRITICAL_MODULES/allowlist enforcement: rodar check-edge-structured-logging.mjs para gerar backlog das 78 funções e migrar top-20 por tráfego primeiro; scripts/check-edge-structured-logging.mjs
- [config] Configurar alerta tempo-real: secret SENTINEL_SLACK_WEBHOOK + step de notificação Slack em uptime-monitor.yml e deployment-failure-alert.yml; alternativa: webhook para Evolution/WhatsApp já existente na VPS
- [doc] Documentar retenção real de logs (Supabase logs retention por plano) em docs/OBSERVABILITY.md §retenção e, se <7d, exportar via Logflare drain
- [código] Estender redação de PII para edge: reutilizar SENSITIVE_KEY_RE ou importar log-safety.ts (_shared/log-safety.ts já existe — auditar uso)
- [processo] Versionar dashboards Grafana da VPS em repo (provisioning JSON) para tornar a stack de monitoramento auditável

## 10. Observabilidade — 7.5/10

### Evidências
- Error tracking: @sentry/react 8.45 com init lazy (src/lib/sentry.ts) — browserTracingIntegration (tracesSampleRate 0.1 em prod), replay 100% on-error com maskAllText/Inputs/Media (LGPD), captureConsole de errors, beforeSend scrub de headers/params de recovery, release=SHA do deploy
- Três pilares parciais: logs estruturados (acima) + métricas (webhook_delivery_metrics com p95 por source/status via get_webhook_delivery_summary; bridgeCallMetrics; secretsManagerCallMetrics; magazineMetrics) + traces via Sentry browserTracing
- Correlação ponta-a-ponta: request_id client→edge→DB e tag request_id no Sentry (docs/OBSERVABILITY.md §1)
- SLOs declarados: scripts/pgss-slo-check.mjs com SLO_TARGETS_MS por RPC crítica e baseline em docs/E40_BASELINE_DESEMPENHO_SLO_2026-09-17.md (pg_stat_statements em extensions schema)
- Dashboards: /admin/observabilidade + suite telemetry/; ADR_OBSERVABILIDADE_EDGE_CONTRATOS_2026-08-26.md
- Feature flags server-side (system_kill_switches) e client-side (src/lib/feature-flags.ts) permitem debug/degradação sem deploy
- check:observability (scripts/observability-check.mjs) valida stack operacional

### Gaps
- SLO check sem agendamento: pgss-slo-report.yml tem schedule comentado (linhas 4-6) aguardando migration ops.pgss_history — SLOs existem mas não são monitorados continuamente
- Tracing distribuído cobre browser→edge parcialmente; não há propagação de trace para Bitrix24/n8n (só métricas de webhook) — cross-service externo NÃO AUDITÁVEL sem acesso n8n
- Runbooks não estão linkados automaticamente aos alertas (issues de uptime/deploy-failure não referenciam RUNBOOK.md)
- RED metrics completas por endpoint só existem para webhooks; REST/RPCs individuais dependem de pg_stat_statements (agregado, não por chamada)
- Profiling de produção (CPU/memória/heap) não evidenciado

### Ações
- [migration+config] Aplicar migration DBA-E40 (ops.pgss_history) via db-apply-migration.yml e descomentar schedule semanal em pgss-slo-report.yml — restaura monitoramento contínuo de SLO
- [código] Propagar request_id como header/correlation nos calls outbound para n8n/Bitrix (webhook-dispatcher já instrumentado — estender para sync jobs)
- [config] Adicionar campo 'runbook' nas issues geradas por uptime-monitor.yml e deployment-failure-alert.yml apontando para docs/RUNBOOK.md/incident-response.md
- [código] Habilitar Sentry profiling (profilingIntegration, profilesSampleRate baixo ~0.05) para CPU no browser em rotas críticas

## 11. Lógica de Negócio — 8.0/10

### Evidências
- Módulo de lógica pura com testes: src/logic/quotes/calculations.ts (round2 half-up documentado, applyMarkup com clamp [0,50], calculateDiscountAmount capado em 100%/subtotal) coberto por calculations.test.ts e calculations-clamp.test.ts
- State machine explícita: src/lib/quote-status-config.ts:120-137 define QUOTE_VALID_TRANSITIONS + isValidQuoteTransition; src/types/quote.ts:7-25 define QUOTE_STATUSES como zod enum alinhado ao CHECK valid_quote_status do banco (comentário verificado 2026-06-25) + type-guard isQuoteStatus
- Guard de transição SSOT para carrinhos: src/lib/carts/status-transition-guard.ts — evaluateCartStatusTransition com contrato documentado, normalização defensiva (NaN/negativo/não-inteiro→0), usado pela UI e pelo hook como defesa em profundidade
- Enforcement server-side: RPCs transacionais de quote (supabase/migrations/20260526103000_quote_update_transactional_rpc.sql, 20260617220042_create_quote_transactional_rpc.sql, 20260923114500_quote_rpc_lineage_atomicity.sql), fn_quotes_validate_discount_cross_user (20260828141200) — single source of truth no backend para mutations críticas
- Domínio de frete com testes em 5 níveis: tests/unit/freight-quest/, tests/integration/freight-quest/, tests/fuzz/freight-quest-fuzzer.test.ts, tests/regression/, scripts/freight-quest-load-test.mjs — todos rodando com TZ=America/Sao_Paulo (package.json scripts test:freight:*)
- Workflow de aprovação implementado: useDiscountApproval, DiscountApprovalQueue, DiscountApprovalAuditTrail (components/admin/) + migration de auditoria markup/discount (20260829115000)
- Concorrência tratada: optimistic locking em seller_carts.version com CartVersionConflictError (src/lib/carts/cart-version-conflict.ts + useSellerCarts.versionGuard.test.tsx)
- 629 arquivos de teste em src/ incluindo 27 fuzz tests (.fuzz.test.*) para invariantes de negócio (cart, quotes, undo)
- Dinheiro como float JS: round2 usa Number.EPSILON (src/logic/quotes/calculations.ts:15) — sem lib decimal; mitigado porque o banco usa NUMERIC como fonte final
- Regras hardcoded: teto de markup 50% e caps de desconto estão em código (applyMarkup), não configuráveis por DB/env
- Lógica de orçamento ainda presa em hook god: useQuoteBuilderState.ts (1.365 linhas) concentra estado + regras
- Sem diagrama da máquina de estados de quote em docs/ (verificado: nenhum mermaid/diagrama de QUOTE_VALID_TRANSITIONS)

### Gaps
- Cálculo monetário em float com epsilon — aceitável para valores B2B deste porte mas sem garantia decimal end-to-end (FE faz aritmética antes do NUMERIC do banco)
- Regras de negócio parametrizáveis estão hardcoded: teto de markup (50%), caps de desconto, thresholds — não versionáveis/configuráveis sem deploy
- Regras de orçamento ainda embutidas em hook de 1.365 linhas (useQuoteBuilderState.ts) em vez de camada de domínio pura
- Máquina de estados de quotes existe em código mas sem diagrama/documentação para não-devs
- Cobertura TZ parcial: freight testa com TZ=SP e lib/quotes/expiration.ts referencia São Paulo, mas não há convenção sistemática (date-fns sem plugin tz como padrão)
- Glossário/linguagem ubíqua parcial — nomes alinhados (quotes, carts, kits) mas sem dicionário de negócio↔código consolidado

### Ações
- [codigo] Extrair as regras de orçamento de useQuoteBuilderState.ts para src/logic/quotes/ (pricing, markup, desconto, validações) deixando o hook só com estado — critério: hook <400 linhas, regras testadas sem render
- [codigo] Criar módulo de config de regras (ex.: tabela business_rules ou src/config/business-rules.ts único) para markup cap, caps de desconto e thresholds — remove magic numbers de calculations.ts e permite ajuste sem redeploy (decidir DB vs config estática via ADR)
- [codigo] Avaliar dinheiro em centavos (integer) ou lib decimal nos cálculos FE de quote/freight; manter NUMERIC no DB como autoridade final — documentar decisão em ADR se optar por manter float+round2
- [doc] Adicionar diagrama da máquina de estados (mermaid) de QUOTE_VALID_TRANSITIONS em docs/adr/ ou docs/architecture/ + teste que falha se o enum e o diagrama divergirem
- [doc] Criar dicionário de dados negócio↔técnico consolidando DATA_DICTIONARY.md existente com os termos de domínio (orçamento, carrinho, kit, gravação, de-para)
- [codigo] Padronizar convenção de timezone (doc + helper único, ex.: src/lib/date-utils.ts como ponto único para datas de negócio com TZ America/Sao_Paulo)

## 12. Manutenibilidade — 7.5/10

### Evidências
- Débito técnico rastreado e enforced por ratchets: .any-type-baseline.json (apenas 1 'any' em produção, em useSellerCarts.ts), .eslint-baseline.json (0 erros), .tsc-baseline.json (0 erros), .tsc-ratchet-baseline (48.427 unused locals monitorados), bundle-size-baseline.json — CI falha em regressão, não exige zero
- Lint muito estrito com programa incremental documentado: eslint.config.js (1.659 linhas) com centenas de regras ativadas em 'Batches' anotados (no-warning-comments bloqueia FIXME/XXX, react/no-multi-comp, consistent-type-imports...); husky + lint-staged configurados (.husky/ + prepare script)
- 629 arquivos de teste em src/ + suites em tests/ (unit, integration, fuzz, regression, edge-functions) + 172 specs e2e/flows — base para refatoração existe
- TODO/FIXME baixo: 68 ocorrências de TODO|FIXME|HACK|XXX em 572K linhas; FIXME/XXX são bloqueados por lint no início de linha
- 156 arquivos >500 linhas e 892 >200 linhas em src/ — o critério '<200 linhas por arquivo' é violado em massa; god files listados na dimensão 1
- Duplicação concreta: round2 definido 3× (src/logic/quotes/calculations.ts:15, src/hooks/quotes/quoteHelpers.ts:17, src/lib/format.ts:44); funções de moeda paralelas em src/lib/format.ts (formatCurrency) vs src/utils/currency.ts (formatBRL/parseBRL) vs src/lib/format-utils.ts
- Dead/stray code verificado: src/app.tsx.patch, src/audit-debug.ts (script DevTools em produção), test-magazine-fix.mjs e test-hooks-safety.mjs na raiz, src/data/mock-match-products.ts (939 linhas de mock importado por src/pages/products/ProductMatchPage.tsx), tests/__deprecated__/
- Dois lockfiles: bun.lock (334KB) + package-lock.json (622KB) com packageManager declarado 'npm@10.9.7' — risco de drift de resolução
- Deps com majors atrasadas (dependabot ignora majors por política): date-fns 3.6.0→4.4.0, zod 3.22→4.6, zustand 4.5→5.0, tailwindcss 3.4→4.3, framer-motion 11→13.5, recharts 2.10→3.10
- tsconfig.app.json: strict:true mas noUnusedLocals:false, noUnusedParameters:false, skipLibCheck:true — divida de tipagem contornada via ratchet em vez de lint
- eslint.config.js monolítico de 1.659 linhas; ~200 scripts em package.json + 210 arquivos em scripts/ — discoverability ruim para novos devs

### Gaps
- Tamanho/complexidade de arquivos: 156 arquivos >500 linhas; os 3 god files não foram quebrados desde r3 (useQuoteBuilderState até cresceu)
- Duplicação de helpers monetários/formatação (round2×3, 3 módulos de currency/format)
- Dois lockfiles convivendo; política de majors ignoradas no dependabot deixa ~6 deps ≥1 major atrás
- eslint.config.js monolítico (1.659 linhas) — ele mesmo um god file de config
- tsconfig com noUnusedLocals/Parameters desligados e skipLibCheck — débito gerenciado por ratchet, não eliminado
- Artefatos mortos na raiz e em src/ (patch, debug scripts, mocks em src/data usados por página de produção)
- Sem campanha ativa de redução de débito (ratchet congela mas não reduz 48K unused locals)

### Ações
- [codigo] Remover bun.lock (packageManager é npm@10.9.7) ou formalizar bun — um lockfile só
- [codigo] Deduplicar helpers: consolidar round2 em src/lib/number.ts único e fundir format.ts/format-utils.ts/utils/currency.ts em um módulo de formatação; adicionar regra no-restricted-imports apontando para o canônico
- [codigo] Limpar artefatos mortos: deletar src/app.tsx.patch, src/audit-debug.ts (ou mover p/ scripts/), test-*.mjs da raiz, mover mock-match-products.ts para fixture de teste ou marcar página como dev-only
- [config] Fatiar eslint.config.js por domínio (eslint.d/*.config.ts) ou migrar regras 'Batch NNN' para presets comentados por tema
- [codigo] Ligar noUnusedLocals/Parameters incrementalmente por diretório (começar por src/logic e src/services) reduzindo o ratchet de 48.427 em cadência mensal (meta −20%/mês, já sugerida em r3 e não executada)
- [processo] Criar milestone/campanha de majors: upgrade planejado de zod 3→4, date-fns 3→4, zustand 4→5 (impacto menor) e avaliação tailwind 3→4 / framer-motion 11→13 / recharts 2→3
- [processo] Adicionar budget de tamanho de arquivo no CI (ex.: falhar em arquivos novos >500 linhas; ratchet descendente nos existentes)

## 13. Operacionalidade — 7.5/10

### Evidências
- Runbooks: docs/RUNBOOK.md (SEV P0-P3 com SLAs de resposta/resolução e escalonamento), docs/incident-response.md (SEV1-3 com exemplos reais e detectores existentes), docs/RUNBOOKS/ (CF_RECONCILIATION, CREDENTIAL_ROTATION, EDGE_FUNCTIONS_BASE_URL), docs/POSTMORTEM_TEMPLATE.md + postmortems reais em docs/incidents/ (2026-04-env-exposure, 2026-05-22-crm-db-bridge)
- Rollback: automático no deploy Vercel (deploy-vercel.yml ~linha 170, `vercel rollback` on smoke failure); política DB forward-only documentada com migrations compensatórias (VALIDACAO_BACKUP_ROLLBACK)
- Feature flags: src/lib/feature-flags.ts (magazineModule, crm_bridge_enabled, mfa...) + system_kill_switches server-side (src/lib/external-db/kill-switch-client.ts, AUDITORIA_KILL_SWITCH_MIGRATION_2026-06-01.md)
- Circuit breaker real: supabase/functions/_shared/circuit-breaker.ts (5 falhas/30s → OPEN 60s → HALF_OPEN probe) usado em edges de HTTP externo (CHANGELOG #1822 T17)
- Graceful degradation: flag crm_bridge_enabled documenta modo degradado do CRM bridge; kill switches por integração
- Deploy reproduzível: docs/DEPLOYMENT.md + gates; zero-downtime inerente ao modelo Vercel + edge deploys atômicos
- Rate limiter persistente: _shared/rate-limiter.ts com fail-closed configurável

### Gaps
- Rollback de edge functions e schema é manual/compensatório — sem botão de 'voltar versão' (<5min só para web)
- On-call = operação 1-dev (docs/incident-response.md admite 'o mesmo responsável detecta, mitiga e escreve post-mortem') — bus factor total
- Migrations sem down — política forward-only explícita exige migration compensatória escrita sob pressão
- Sem canário/percentual de tráfego para deploys (all-or-nothing)
- Runbooks para cenários específicos (DB lento, fila cheia, Bitrix fora) cobertos parcialmente (RUNBOOK_CONNECTIONS, E34/E39 docs)

### Ações
- [código/processo] Criar scripts/rollback-edge-function.sh usando hash registrado em E42 + rerun de deploy-edge-functions.yml com functions_json da versão anterior; documentar em docs/RUNBOOKS/
- [processo] Definir backup on-call mínimo (mesmo que outro Devin/automation) e doc de handoff — reduzir bus factor
- [processo] Manter para cada migration 'destructive' um arquivo docs/sql/<nome>-rollback.sql pronto (precedente: docs/sql/quote-number-hardening-rollback.sql) e tornar gate do manifest
- [config] Canário em edge functions: usar rollout_percentage já existente no kill-switch RPC (curto-circuito >=100) para lançamentos graduais

## 14. Performance — 7.5/10

### Evidências
- Lighthouse CI (Gate 4, deploy-gates.yml linha 229): perf≥75 /auth, ≥85 warn em /, a11y≥90, SEO≥95, 3 runs — .lighthouserc.json
- Bundle governance: bundle-size-baseline.json com maxChunkBytes=993KB, maxTotalBytes=13.7MB, ratchet de regressão 15%, check:bundle-size bloqueante (Gate 1.6) + report em PR (bundle-size-report.yml); ADR_BUNDLE_BASELINE_E_CHUNKS
- Code splitting: lazy() em rotas (AppRoutes.tsx lazyWithRetry), Sentry ~186KB adiado via dynamic import pós-idle (src/lib/sentry.ts:1-8), prefetch on-hover de chunks (usePrefetchOnHover + docs/PERF_OPTIMIZATIONS.md)
- Web Vitals RUM: navigationMetrics.ts coleta TTFB/CLS/TTI aprox/route_change via PerformanceObserver nativo → Sentry, 10% sample, kill-switch por browser
- Paginação server-side: CATALOG_PAGE_SIZE/batch com limit/offset (useCatalogPrefetch.ts:17-24); 25+ chamadas .range() em src/ incluindo stockFetcher, useNovelties, magazineService
- Debounce: useListUrlState debounceMs=250 (useQuotesListPage.ts:41), debounce em buscas de produtos/carrinhos
- Imagens: Cloudflare Images/imagedelivery.net (AdminCloudflareImagesPage, CSP img-src), 156 usos de loading="lazy"
- Cache: assets immutable 1y, icons SWR, index no-store (vercel.json); Supabase pooler documentado (DB_CONNECTION_POOL.md)
- Rate limiting: _shared/rate-limiter.ts + RateLimitDashboardPage; SLOs p95 por RPC (pgss-slo-check.mjs)

### Gaps
- Web Vitals coletados não cobrem LCP e INP diretamente (navigationMetrics mede ttfb/cls/tti_approx — INP requer Event Timing de interação; LCP requer largest-contentful-paint entry)
- Gate Lighthouse tem perf como 'warn' na home (≥85 warn) e obrigatório só ≥75 em /auth — margem abaixo do critério LCP<2.5s para 10/10
- Bundle total baseline 13.7MB raw é grande (limite por chunk 993KB; gzip real ~3-4MB — auditar compressão real por rota)
- Listagens como useQuotesListPage usam Fuse.js client-side — cotações carregadas em memória (ok na escala atual, mas sem cap server-side evidente)
- N+1 e top-20 queries indexadas NÃO AUDITÁVEIS sem EXPLAIN ao vivo (parcialmente coberto: docs/E34_RPCS_LENTAS identifica RPCs lentas; pgss-slo aguarda schedule)
- Sem cache de dados frequentes (TanStack Query staleTime existe mas sem Redis/memória server-side documentado)

### Ações
- [código] Estender navigationMetrics.ts com observers 'largest-contentful-paint' e 'event' (INP) — src/lib/telemetry/navigationMetrics.ts
- [config] Endurecer .lighthouserc.json: perf /auth e / como 'error' ≥80 após medir baseline atual; manter warn durante 2 semanas
- [código] Adicionar paginação server-side (range + count) a useQuotes/useQuotesListPage quando >500 cotações por seller; avaliar .limit() default
- [processo] Rodar pgss-slo-check com dados ao vivo após migration E40 e cruzar top-20 RPCs com índices (EXPLAIN via migration review)
- [doc] Documentar decisão de cache (TanStack Query staleTime por query key, Supabase Realtime invalidation) em docs/PERF_OPTIMIZATIONS.md

## 15. Qualidade de Código — 7.5/10

### Evidências
- ESLint strict com baseline a zero: .eslint-baseline.json totalErrors:0; lint:check = 'eslint src --max-warnings=0' (ci.yml quality-gate); deploy-gates Gate 1 roda lint:baseline; ratchet de regressão via scripts/check-eslint-baseline.mjs no lint-staged
- Prettier configurado (.prettierrc/.prettierignore) + lint-staged (prettier --write + baseline eslint) + .husky/pre-commit (parse do eslint config, lockfile sync, guards SSOT) e pre-push
- Conventional commits consistentes no histórico (30/30 commits recentes no formato tipo(escopo):, ex. 'fix(codeql): E96 batch5'); convenção documentada em AGENTS.md REGRA #6 e CONTRIBUTING.md
- Secrets: .gitleaks.toml + workflows gitleaks-history-audit.yml e _secrets-check.yml; .env.production commitado contém apenas flag pública (VITE_ENABLE_NAV_METRICS=true) com aviso explícito 'NUNCA colocar secrets'
- PULL_REQUEST_TEMPLATE.md com checklist de tipo/sistemas/issues + CODEOWNERS; dezenas de baselines de qualidade (bundle-size, any-type, tsc, outline-none, security-definer-acl) que impedem regressão
- Error handling centralizado: src/lib/logger usado em file-validation.ts etc.; arquivos grandes existem mas limitados (maior componente real: QuoteBuilderSummaryColumn.tsx 1.697 linhas)

### Gaps
- 726 ocorrências de TODO/FIXME/HACK em src/ sem tracking/baseline — débito técnico invisível
- 14 console.log em código de produção (regra no-console é 'warn' com allow warn/error — não bloqueia); no-console 'off' em alguns escopos
- ~2.030 asserções 'as Tipo' em src/ sem ratchet específico (só 'as any' tem baseline)
- Conventional commits não enforced por hook (sem commit-msg/commitlint) — depende de disciplina
- Sem check de God components: existem arquivos >1.500 linhas (PromoFlixPlayer 1.512, PersonalizationConfig 1.383) sem limite de complexidade no lint
- Dívida de lint documentada (eslint.config.js lista regras puladas: no-plusplus 360v, no-bitwise 191v, no-continue 111v) — ainda não zerada

### Ações
- [config] Adicionar check:todo-baseline (scripts/) congelando os 726 TODOs e falhando em crescimento — ou converter em issues linkadas (padrão já usado para other baselines)
- [código] Substituir os 14 console.log de produção por logger e elevar no-console a 'error' em src/
- [config] Ratchet de asserções: script contando 'as <Tipo>' por arquivo (como .any-type-baseline.json) com meta de redução
- [config] Adicionar commitlint + .husky/commit-msg para enforcement real de conventional commits
- [config] Regra de complexidade: eslint complexity max 15 e/ou max-lines-per-function com baseline nos 5 maiores arquivos
- [código] Sprint de eliminação das dívidas de lint já catalogadas no eslint.config.js (batches 133/134/168-169)

## 16. Segurança — 8.5/10

### Evidências
- Headers de segurança completos no frontend: vercel.json:78-104 — CSP com sha256 + strict-dynamic (sem unsafe-inline em script-src), HSTS max-age=31536000;includeSubDomains;preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, Reporting-Endpoints + report-uri ativo; gate check:headers-mirror mantém public/_headers espelhado; edges emitem os mesmos headers via _shared/cors.ts:60-72.
- CORS restritivo: allowlist exata + patterns em _shared/cors.ts:16-42, fallback para produção (não wildcard) em getBestAllowedOrigin; wildcard só via buildPublicCorsHeaders explícito; gates check:no-inline-cors e check:edge-cors + edge cors-audit.
- CVEs em gate bloqueante: Gate 0.5 dependency-audit (scripts/check-dependency-audit.mjs — npm audit high com allowlist revisada e deadline RISK_REVIEW_DEADLINE 2026-12-27); CodeQL com gate HIGH+CRITICAL via API (.github/workflows/codeql.yml, commit b100b3c); auth-fuzz-weekly.yml.
- Secret scanning: gitleaks em security.yml + gitleaks-history-audit.yml + .gitleaks.toml; edge functions leem segredos via cofre getCredential() (ex.: VIRUSTOTAL_API_KEY em secure-upload) e existe secrets-manager + mcp-keys-* (issue/revoke/rotate).
- Webhooks assinados: webhook-inbound verifica HMAC-SHA256 com timingSafeEqual, headers x-hub-signature-256/x-signature-256/x-webhook-signature, hmac_secret_ref por origem + allowed_events + allowed_ips (index.ts:22-162).
- Upload seguro: secure-upload exige auth, hash SHA-256, consulta VirusTotal, quarantine bucket p/ suspeitos, FAIL-CLOSED 403 se scan falha, auditoria file_scan_logs.
- Hardening DB histórico e contínuo: sweeps revoke_anon_* em dezenas de migrations, security-definer-acl gates (check:security-definer-acl/audit/hardening + workflow multi-env), supabase-security-gate.yml, .security-definer-acl-baseline.json, check:secdef-anon.
- Infra anti-abuso: bot-protection.ts, url-allowlist.ts + external-fetch.ts (SSRF), block-ip-temporarily, detect-new-device, token revocation server-side.
- XSS: React escaping + CSP strict-dynamic; tests/security/html-sanitizer-xss.test.ts; apenas 3 usos de dangerouslySetInnerHTML em src/; gate de iframe sandbox (.iframe-sandbox-allowlist.json).
- NAO AUDITAVEL: rotação real de secrets cadenciada, pentest/bug bounty, posture LGPD operacional (DPO, base legal, prazos de retenção), uptime/resposta a incidente real — dependem de processo/console fora do repo.

### Gaps
- JWT em localStorage (client.ts:104-115) — token theft via XSS segue como vetor residual (CSP forte mitiga mas não elimina).
- verify_jwt=false em todas as funções — bypass total se alguma função falhar em autenticar; dependência absoluta do manifest+gate.
- Upload não valida MIME/magic bytes nem tamanho máximo (secure-upload só faz hash+VT e repassa file.type) — arquivo novo (VT 404) entra como 'permitido'.
- Sem evidência de pentest externo ou security audit independente recente (há CodeQL+fuzz+gitleaks, mas não manual).
- LGPD: referências esparsas em docs; sem evidência de consent management, DSAR/forget flow ou DPO — módulo de anonimização não encontrado.
- img-src 'https:' amplo no CSP (necessário p/ CDN, mas amplia superfície de tracking/exfil por imagem).

### Ações
- [código] secure-upload/index.ts: adicionar allowlist de MIME por magic bytes (ex.: file-type) + MAX_SIZE (ex.: 10MB) antes do upload, e tratar VT 404 como 'pendente → quarentena' para buckets sensíveis.
- [código+migration] Implementar fluxo de direito ao esquecimento LGPD: edge anonymize-user + política de retenção em audit_log/login_attempts (retenção + purge job via cron).
- [processo] Contratar/executar pentest anual ou program de review externo; registrar escopo e relatório em docs/security/.
- [config] Definir rotação cadenciada de secrets (SERVICE_ROLE, VT, Bitrix, ElevenLabs) via edge secrets-manager + checklist trimestral; evidenciar em MIGRATIONS_SYNC_LOG/ops log.
- [config] Avaliar verify_jwt=true para categorias service/supervisor do manifest e restringir img-src do CSP aos hosts de CDN conhecidos (imagedelivery.net, videodelivery.net, supabase storage).

## 17. Testes — 7/10

### Evidências
- Volume: ~1.914 arquivos de teste (634 em src/, 712 em tests/, 568 specs E2E em e2e/); vitest.config.ts cita suíte de ~896 arquivos no runner; organização por camadas (tests/unit, tests/integration, tests/contracts, tests/security, tests/rls, tests/regression, tests/a11y, tests/edge-functions/{integration,live})
- CI multi-camada: deploy-gates.yml Gate 2 (test:deploy-gate + webhook-scenario-matrix), Gate 2.5 (integridade transacional PostgreSQL real — test-approved-plan-database.sh + test:quote-rpc:postgres em PG17 isolado), Gate 3 (e2e-smoke, 55 specs @smoke); ci.yml roda test:quality (suíte ampla) + hook tests; full-ci.yml roda coverage + stress/fuzz badges + Playwright E2E
- Testes de contrato: tests/contracts/ (17 arquivos — webhooks, idempotência, optimistic persistence); testes de RLS dedicados (tests/security/rls-*.test.ts, tests/rls/, tests/edge-functions/live/rls-*.test.ts)
- Testes de carga/stress existem como scripts Node (scripts/massive-load-test.mjs, freight-quest-load-test.mjs) e fuzz (tests/integration/massive-fuzzing.test.ts, test:fuzz, useIntelligenceBadgeSettings.fuzz.test.ts)
- Anti-flaky: playwright retries=1 no CI, smoke project com retries:0, scripts de flakiness (magazine-flakiness-report.mjs --runs=10 --strict); fixtures dedicadas (tests/fixtures/, e2e:generate-fixtures)
- Cobertura configurada: vitest v8 provider, thresholds lines/functions/statements 60, branches 50

### Gaps
- Gate required ('Gate Final - Deploy Ready') executa só ~4 arquivos de teste (test:deploy-gate = 3 arquivos + webhook matrix) — a suíte ampla roda em workflows NÃO-required; um PR pode quebrar test:quality e ainda mergear
- Métrica de cobertura scoped/enganosa: full-ci.yml valida cobertura via test:ci-core:coverage que cobre apenas 3 arquivos de teste com --coverage.include restrito a 2 arquivos-fonte (theme-presets.ts + ProductSparkline.tsx) e threshold >50% — a cobertura real da suíte de ~900 arquivos nunca é medida no CI
- Thresholds (60/50) abaixo do critério 70-80% e aplicados só quando alguém roda test:coverage manualmente — nenhum workflow chama 'npm run test:coverage' (suíte completa)
- Sem k6/Artillery — load tests são scripts ad-hoc sem assert de SLO
- Testes live de edge functions/RLS dependem de credenciais — E21 só emite warn quando ausentes (podem pular silenciosamente)
- CI <5min não verificável: Gate 2 tem timeout 45min, e2e-smoke 15min

### Ações
- [config] Tornar a suíte ampla required: promover 'quality-gate' (ci.yml) ou equivalente a required check em required-checks.json + branch protection, ou ampliar test:deploy-gate para o core suite
- [config] Cobertura real: novo job rodando 'npm run test:coverage' (suíte completa com thresholds do vitest.config) — nem que semanal/advisory — e publicar coverage-summary como badge/artifact
- [config] Renomear/declarar test:ci-core:coverage como 'badge de fumaça' para não passar por cobertura de projeto (documenta honestidade da métrica)
- [código] Adicionar k6 (ou autocannon) com thresholds de latência para os 3 endpoints mais quentes; referenciar em test:stress
- [config] Falhar (não warn) quando secrets E2E ausentes em PRs de autor interno — manter skip só para forks/dependabot
- [processo] Rodar magazine-flakiness-report --strict semanalmente e publicar top-flaky em docs/testing/

## 18. Tipagem / Type Safety — 8/10

### Evidências
- tsconfig.app.json: strict:true, noImplicitAny, noFallthroughCasesInSwitch, isolatedModules; typecheck no Gate 1 (npm run typecheck) + baseline estrutural .tsc-baseline.json com totalErrors:0 (check-tsc-baseline.mjs)
- any praticamente zerado em produção: .any-type-baseline.json registra productionAnyCount:1 com gate anti-regressão; grep próprio encontrou ~12 hits e quase todos são comentários JSDoc (ex.: src/lib/supabase-untyped.ts, src/types/browser.d.ts — arquivos que existem justamente para eliminar casts)
- DB types gerados: script types:generate:supabase (supabase gen types → src/integrations/supabase/types.ts, 2,2MB) + drift gate estrutural (check:types-inventory / types-inventory-drift, Gate 1.2 — compara Tables/Views/Functions/Enums objeto a objeto, com allowlist aprovada em docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json)
- Zod single-source pinado (_shared/contracts/_zod.ts com eslint no-restricted-imports); schemas de contrato tipados compartilhados com a suíte de testes via inline deps no vitest.config
- Non-null assertions quase inexistentes (1 ocorrência de '!.' em 572k linhas); enums/union types para status (verificado em types.ts e schemas Zod de contrato)
- Ratchets de tipagem adicionais: ts-unused-ratchet.sh (Gate 1.7), check:types-inventory, .tsc-ratchet-baseline

### Gaps
- ~2.030 asserções 'as Tipo' em src/ — sem baseline/ratchet; cada uma é um bypass potencial de type safety
- noUnusedLocals/noUnusedParameters: false no tsconfig (mitigado por ratchet separado, mas o flag ideal é ligado)
- noUncheckedIndexedAccess ausente — indexação sem bounds-check
- Edge functions (Deno) fora do tsconfig strict do app — verificação de tipos delas depende de testes/contratos, não de tsc
- Retorno explícito em funções públicas não enforced (sem regra eslint explicit-function-return-type)
- types.ts (2,2MB gerado) é validado por drift, mas o frontend ainda usa supabase-untyped.ts para queries fora do schema — perímetro untyped residual

### Ações
- [config] Criar .as-assertions-baseline.json (mesmo padrão do any-baseline) congelando as ~2.030 asserções; reduzir os top offenders primeiro
- [config] Ligar noUncheckedIndexedAccess (ou ao menos ratchet de regressão) e avaliar noUnusedLocals:true com a dívida atual baselined
- [config] Adicionar tsconfig estrito para supabase/functions/ (deno check) ou CI step 'deno check' por function alterada
- [config] @typescript-eslint/explicit-function-return-type em warn+baseline para src/services, src/lib, src/hooks
- [código] Migrar call-sites de supabase-untyped.ts para tipos gerados ou views tipadas — reduzir perímetro 'as any' centralizado
- [doc] Registrar política de 'as': quando aceitável (boundaries externas) vs proibido — em CONTRIBUTING.md ou eslint rule com allowlist

## 19. Validação — 6.5/10

### Evidências
- Zod como SSOT pinado: supabase/functions/_shared/contracts/_zod.ts (única URL esm.sh/zod@3.23.8 permitida, enforced por eslint no-restricted-imports); 18 schemas de contrato versionados em _shared/contracts/schemas/ + parse.ts/versioning.ts
- Adoção backend: 65/108 index.ts de edge functions contêm construtos de validação (contracts, safeParse, .parse, json-parser ou zod); verificação por amostragem confirma safeParse com fieldErrors claros (elevenlabs-tts:22-73, semantic-search:196+ via _shared/zod-validate.ts); funções cron sem body legitimamente sem validação
- Frontend: Zod em 16 arquivos + src/lib/validations/{authSchema,profileSchema,goalSchema,quoteSchema}.ts + react-hook-form/zodResolver em Auth, ResetPassword, ForgotPassword, ProductForm; 57+ arquivos com validação HTML5/manual adicional
- Formatos BR: CNPJ completo (normalize + 14 dígitos + dígitos verificadores — src/utils/cnpj-schema.ts, masks.ts validateCnpj) com suite de testes dedicada (e2e-cnpj.yml)
- Uploads: src/lib/security/file-validation.ts valida tamanho (default 5MB), extensão, MIME E magic bytes (ffd8ff/89504e47/52494646/25504446); sanitização com dompurify 3.4 + sanitize-message.ts/sanitize-error.ts
- Testes de contrato de webhook com matriz de cenários (tests/contracts/webhook-scenario-matrix.test.ts) validam payloads contra schemas Zod sem HTTP

### Gaps
- Adoção do contrato canônico baixa: só 18/108 funções importam _shared/contracts (~17%); o resto usa schemas inline ou manual — sem gate que exija contrato para função nova
- ~43 funções sem nenhum construto de validação detectado (parcialmente legítimo — crons/GETs — mas sem classificação documentada por função)
- Validadores BR incompletos: CNPJ completo, mas CPF/CEP/telefone ausentes (só pixMask); data/valor monetário dependem de schemas locais
- Sem schema compartilhado real front↔back em runtime: contratos são Deno-style (esm.sh) importados só pelo Vitest; frontend mantém zod paralelo (src/lib/validations) — risco de drift de regras
- Validação de transição de estado (status machine) não evidenciada — não há check 'status permite essa transição' nos contratos amostrados
- EDGE_FUNCTIONS.md documenta Validação=Zod para funções de mai/2026, mas a tabela está desatualizada (81 vs 110) — cobertura real por função não é auditável via doc

### Ações
- [código] Migrar funções HTTP-facing restantes para _shared/contracts (criar schema por função em contracts/schemas/); alvo incremental: 50% em sprint, enforcement depois
- [config] Gate 'nova edge function requer contrato': script check:* que falha se index.ts novo não importa contracts/parse.ts (mesmo padrão dos outros ratchets)
- [código] Criar validators BR completos em src/lib/validations/ (CPF com DV, CEP, telefone BR) com testes — espelhando cnpj-schema.ts
- [código] Extrair schemas compartilhados para pacote neutro (ex.: schemas/ compilável em Node+Deno) consumido por frontend e edge functions — elimina drift de regras duplicadas
- [doc/código] Classificar as ~43 funções sem validação (cron/GET/body) em edge-authz-manifest ou manifesto de validação; documentar a exceção por função
- [código] Adicionar validação de transição de estado nos contratos de quotes/orders (union de status + refine de transição permitida)

## 20. Operações (Processos) — 8.5/10

### Evidências
- Git flow documentado e enforced: CONTRIBUTING.md define prefixos de branch (feat/fix/chore/docs/refactor/hotfix), Conventional Commits, PR obrigatório em main, proibições (force-push, commit direto, secrets) — verificado que commits recentes seguem o padrão (fix(codeql):, chore(agents):...)
- Code review process real: CodeRabbit automático obrigatório (~3min) + CODEOWNERS (.github/CODEOWNERS) exigindo aprovação humana em arquivos críticos (client.ts, workflows/, baselines, SEGREDOS.md, edge functions sensíveis); .github/PULL_REQUEST_TEMPLATE.md + ISSUE_TEMPLATE (bug/feature/tracking)
- Branch protection como código: docs/BRANCH_PROTECTION.md (passo a passo), .github/workflows/branch-protection-sentinel.yml, .github/required-checks.json como SSOT validado por scripts/check-required-checks.mjs; delete_branch_on_merge=true verificado via API
- Processo de incidente maduro: docs/incident-response.md com tabela SEV1-3 (exemplos reais), sinais de detecção existentes (uptime 15min, deployment-failure-alert, smoke 38 testes 2×/dia, Sentry), passo a passo, post-mortem ≤48h, regras imutáveis, tabela de degradação graciosa; docs/POSTMORTEM_TEMPLATE.md + docs/INCIDENTS/ com 2 post-mortems reais (2026-04-env-exposure, 2026-05-22-crm-db-bridge)
- Deploy documentado: docs/DEPLOYMENT.md (pipeline duplo Vercel+edges, política 'nunca db push', 3 opções de aplicar migration, exceção storage.objects) + docs/deploy-flow.md com fluxo de hotfix (branch hotfix/ → PR → gates)
- Rotina de deps: .github/dependabot.yml semanal (segunda 06:00 America/Sao_Paulo) para npm + github-actions, agrupado, majors ignoradas por política documentada
- CHANGELOG.md no formato Keep a Changelog com seção Unreleased atualizada (referencia PRs #1819-#1830 e notas de auditoria)
- Processos auto-monitorados: workflows abrem issues automaticamente em falha (labels uptime, deploy-failure; issues #1940-44 abertas por falhas E2E do cron semanal em 2026-10-02), ci-metrics-weekly.yml mede saúde do próprio CI
- Runbooks operacionais: docs/RUNBOOKS/ (CF_RECONCILIATION, CREDENTIAL_ROTATION, EDGE_FUNCTIONS_BASE_URL), docs/operations/, SECURITY.md
- Dívida técnica visível: milestone 'Dívida técnica — Q4 2026' existe (mas com apenas 1 issue aberta) + STATUS.md convertido em índice de fontes vivas em vez de estado congelado
- Higiene de branches pendente: 51 branches remotos, 25 'claude/*' acumulados (delete_branch_on_merge só ativado recentemente)
- Issues abertas (17) são majoritariamente tickets automáticos de falha de E2E — sinal de triagem automática mas também de suite flaky gerando ruído
- NAO AUDITAVEL: configuração real do ruleset de branch protection no GitHub (required_approving_review_count, bypass actors) — requer acesso admin ao repo; evidência parcial via sentinel/required-checks.json e delete_branch_on_merge=true na API

### Gaps
- Sem SLA de review nem pool de revisores definido: processo depende de CodeRabbit + aprovação humana 'se não-trivial' — bus-factor de 1 dev (aceitável no contexto, mas não documentado como risco assumido)
- Triagem de débito técnico nominal: milestone 'Dívida técnica — Q4 2026' tem 1 issue e label tech-debt retorna 0 issues abertas — rastreio existe mas está vazio
- Backlog de branches: 25 branches claude/* acumulados (higiene não retroagiu)
- Sem automação de release/versionamento (release-please ou similar) — CHANGELOG manual, sem tags de versão visíveis
- Issues automáticas de E2E acumulam sem política de dedup/fechamento — risco de alarm fatigue
- Rotina de segurança depende de auditorias ad-hoc (muito frequentes, aliás) mas não há cadência formal documentada (ex.: trimestral)
- Ruleset real do GitHub não auditável sem acesso admin (counts de approval, bypass list)

### Ações
- [processo] Triagem do milestone 'Dívida técnica — Q4 2026': migrar os gaps desta e das auditorias anteriores (r1-r3) para issues com label tech-debt, priorizadas; meta: milestone refletir o backlog real
- [processo] Limpar branches acumulados: deletar os 25 'claude/*' já mergeados/stale (script gh api + git push --delete em lote) — delete_branch_on_merge já cobre os futuros
- [config] Adicionar dedup nas issues automáticas de CI (workflows que abrem issues devem reutilizar issue aberta com mesmo título/label em vez de criar nova) — hoje cada cron falho gera ticket novo
- [doc] Documentar bus-factor assumido: uma seção no CONTRIBUTING/incident-response declarando operação 1-dev, quem revisa o quê, e o que acontece se o CODEOWNER estiver indisponível
- [config] Adotar release-please ou changesets: tags semânticas automáticas + CHANGELOG gerado a partir de Conventional Commits (repo já segue a convenção)
- [processo] Formalizar cadência de segurança: auditoria de segurança trimestral agendada (já acontece ad-hoc com frequência — só formalizar no CONTRIBUTING ou em uma issue recorrente)
- [processo] Definir SLA interno de review mesmo que informal (ex.: 'PRs aguardam review humano ≤24h em mudanças não-triviais') e documentar em CONTRIBUTING.md

---

## Implementado nesta rodada (auditoria → ação)

Correções já entregues neste PR, por categoria:

| Área | O que foi feito |
|---|---|
| **Segurança** | `secure-upload`: allowlist de MIME por **magic bytes** + limite de 10MB + rejeição VT-404 marcada `pending_review` (quarentena lógica) — `supabase/functions/secure-upload/index.ts` |
| **Autenticação** | `AuthContext.signIn` agora invoca a edge `check-login` **antes** de `signInWithPassword` e honra `allowed=false`/`blocked_until` — lockout server-side real (gap ×3 de maior severidade) |
| **CI/Gates** | 4 novos gates bloqueantes no `quality-gate.yml`: Gate 2.3.1 TODO baseline (28 marcadores congelados), 2.3.2 `as <Tipo>` baseline (2.169), 2.3.3 file-size ratchet (137 arquivos >500 linhas), 2.3.4 `noUncheckedIndexedAccess` ratchet (889 erros congelados — ratchet descendente) |
| **Observabilidade** | `navigationMetrics.ts` agora coleta **LCP** e **INP** (aproximação via event timing) com thresholds Google (≤2.5s/≤200ms) — fecha o gap "Web Vitals incompletos" |
| **Limpeza** | Removido `src/app.tsx.patch` (artefato morto); `src/audit-debug.ts` movido p/ `scripts/` (diagnóstico DevTools, não pertence ao bundle) |
| **Docs** | Novos: `docs/RBAC_MATRIX.md` (108 fns do manifest), `docs/DISASTER_RECOVERY.md` (runbook DR), `docs/INDEX.md` (índice canônico). Banners de desatualização: `EDGE_FUNCTIONS.md` (81→108), `DATA_DICTIONARY.md` (63→383), `README.md`. `AUDIT_*.md` da raiz → `docs/audits/` |
| **Operações** | Issues de `uptime-monitor` e `deployment-failure-alert` agora linkam o runbook de DR |

## Top 10 ações por ROI

Ordenadas por (severidade do gap × facilidade) — as 3 primeiras **já entregues**:

1. ✅ **Gate `check-login` no signIn** — fecha o lockout server-side (vetor brute-force real). *Feito.*
2. ✅ **MIME/magic bytes + tamanho máx em secure-upload** — upload malicioso tipado. *Feito.*
3. ✅ **Ratchets de dívida (TODO/`as`/file-size/indexed-access)** — congela e inverte a erosão de qualidade. *Feito.*
4. 🔲 **Migration: `_expected_version` obrigatório + `version` em orders/discount_approval_requests/seller_carts** — optimistic locking real. *Requer aprovação PO (REGRA #8).*
5. 🔲 **Audit trigger nas tabelas críticas** (quotes, orders, user_roles, profiles, suppliers) — hoje só 5 tabelas cobertas. *Requer migration.*
6. 🔲 **PITR/backups no painel Supabase + cofre externo p/ secrets de edge** — hoje DR não tem rede de segurança conhecida. *Ato humano intransferível — checklist em `docs/db/BACKUP_STATUS.md`.*
7. 🔲 **verify_jwt=true nas categorias `service`/`supervisor`** do manifest — defesa em profundidade no gateway. *Requer teste de regressão por função.*
8. 🔲 **Idempotency-key client→edge padronizada** em `safeInvokeCall` + contrato zod nas edges de escrita.
9. 🔲 **Pentest externo anual** — nenhum registro de review independente; CodeQL+fuzz não cobrem lógica de negócio.
10. 🔲 **LGPD: fluxo de esquecimento** — edge `anonymize-user` + purge/retention em `login_attempts`/`audit_log`.

## Roadmap — 3 ondas

### Onda 1 — Quick Wins ✅ (esta PR)
Tudo acima em "Implementado nesta rodada". Custo já pago; zero dependência externa.

### Onda 2 — Sprint 1 (código + processo, sem aprovação de schema)
- Idempotency-key padronizada em `safeInvokeCall` (item 8)
- CSP `img-src` restrito aos hosts de CDN conhecidos
- Turnstile/hCaptcha no `Auth.tsx` (site key pública + edge de verificação)
- `loginSchema` min(8) + fluxo "senha fraca → force reset"
- Baseline assinado de policies (hash `pg_policies` no CI — complementa `schema_signature`)
- Política soft-delete vs archive + `check:soft-delete-policy`
- LCP/INP já coletados → conectar ao dashboard de métricas existente

### Onda 3 — Sprint 2 (requer PO / produção)
- Migrations: `_expected_version` obrigatório, audit trigger coverage, ENABLE RLS explícito nas ~61 tabelas do gap de Autorização (após auditoria `pg_catalog` ao vivo)
- MFA para todos os usuários internos com período de graça
- Pentest externo + programa de rotação cadenciada de secrets
- Load test k6 nas edges críticas (existe `load-test` dev — promover a cenário de regressão)
- LGPD: edge `anonymize-user` + purge jobs
- Deploy/rollout via release-please + changelog automático

> **Dependências do PO (não automatizáveis):** PITR/backups no painel Supabase, cofre externo de secrets de edge, aprovação das migrations da Onda 3 (REGRA #8 — workflow `db-apply-migration.yml`), e contratação do pentest.

---
