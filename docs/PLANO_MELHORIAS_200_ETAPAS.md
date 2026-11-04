# Plano de Melhorias e Correções — Promo Gifts V4 (200 Etapas)

> **Gerado em:** 2026-11-04 · **Commit base:** `385af81` (main)  
> **Metodologia:** Análise exaustiva dos últimos 500 commits + inventário do estado real da branch `contexto` + auditorias de CI/CD, segurança, banco, código e arquitetura.  
> **Instrução para o agente executor:** Execute cada etapa em ordem. Uma etapa = uma branch `claude/<tipo>-<slug>-<AAMMDD-HHMM>` + uma PR. Nunca pule etapas dependentes. Marque `[x]` ao concluir.

---

## BLOCO 1 — INFRAESTRUTURA DO CONTEXTO PARA AGENTES (Etapas 1–15)

> Objetivo: garantir que `docs/contexto/supabase/` seja gerado a cada ciclo de 10 min.

- [ ] **E001** `fix` — Verificar se o run de dispatch (ID 41826850333) concluiu com `supabase/` populado em `contexto`; se ainda `in_progress`, aguardar e confirmar presença de `docs/contexto/supabase/manifest.json` na branch.  
- [ ] **E002** `fix` — Se `supabase/` ainda ausente após conclusão do dispatch, ler o log do job "Produtor supabase/ (snapshot.py)" linha a linha e identificar o erro exato (timeout, auth, psycopg missing).  
- [ ] **E003** `fix` — Adicionar `psycopg[binary]` ao `requirements.txt` do `scripts/supabase_snapshot/` se ausente; verificar que o runner ubuntu-24.04 consegue instalar via `pip install psycopg[binary]` antes de executar `snapshot.py`.  
- [ ] **E004** `fix` — Corrigir o `if:` do job `banco` em `contexto.yml`: garantir que em dispatch (`event_name == 'workflow_dispatch'`) o job SEMPRE rode, independente do output do gate. Padrão: `if: needs.gate.result == 'success' && (needs.gate.outputs.banco == 'true' || github.event_name == 'workflow_dispatch')`.  
- [ ] **E005** `fix` — Adicionar step de smoke-test no job `publicar`: checar que `docs/contexto/supabase/manifest.json` existe antes do push; se ausente e banco foi skippado, logar aviso mas NÃO falhar o job.  
- [ ] **E006** `chore` — Atualizar `docs/contexto/00-INDEX.md` para refletir que `supabase/` só é gerado em dispatch/schedule, não em push (documentar a limitação de design intencional).  
- [ ] **E007** `fix` — Verificar que o cron de 10 min (`*/10 * * * *` ou lista de minutos) inclui minutos suficientes para garantir pelo menos uma execução completa por hora com banco.  
- [ ] **E008** `chore` — Adicionar `PGPORT` às secrets do repo (atualmente ausente; `snapshot.py` precisa da porta se diferente de 5432).  
- [ ] **E009** `chore` — Atualizar `docs/ci/SEGREDOS.md`: adicionar linhas para `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` (secrets criados em 2026-09-20, mas possivelmente não listados no inventário do Gate 1.14).  
- [ ] **E010** `fix` — Verificar que `scripts/supabase_snapshot/test_snapshot.py` passa no CI (`tests/scripts/contexto-produtores.test.mjs` suite "supabase_snapshot: conexão simulada") — confirmar exit 0.  
- [ ] **E011** `fix` — Verificar que `scripts/ai-context/gerar.unit.mjs` passa — confirmar exit 0 no CI.  
- [ ] **E012** `fix` — Verificar que `scripts/regras_negocio/test_generate.py` passa — confirmar exit 0 no CI.  
- [ ] **E013** `chore` — Validar que o manifesto de `regras/` em `contexto` tem `gerado_em` atualizado (< 15 min de defasagem da última run): `grep gerado_em docs/contexto/regras/manifest.json` via `github_get_file(ref=contexto)`.  
- [ ] **E014** `chore` — Validar que o manifesto de `codigo/` em `contexto` tem `gerado_em` atualizado: `grep gerado_em docs/contexto/codigo/manifest.json` via `github_get_file(ref=contexto)`.  
- [ ] **E015** `chore` — Criar `docs/contexto/regras/manual/regras.md` com as regras de negócio manuais do Promo Brindes: desconto por volume (5% ≥ 50 unid, 10% ≥ 100 unid), fluxo de aprovação de orçamento (rascunho → enviado → aprovado → produção → entregue), status de pedido, cálculo de preço de venda vs custo.

---

## BLOCO 2 — BANCO DE DADOS: MIGRATIONS, LEDGER E DDL (Etapas 16–35)

> Objetivo: garantir integridade do ledger de migrações e eliminar drift silencioso.

- [ ] **E016** `chore` — Verificar `supabase/MIGRATIONS_SYNC_LOG.md`: listar todas as migrations marcadas como "aplicadas fora do fluxo" (out-of-band) e confirmar que cada uma tem migration espelho em `supabase/migrations/`.  
- [ ] **E017** `fix` — Para cada DDL out-of-band detectado em `docs/ci/DDL_OUT_OF_BAND_REPORT.md` sem migration espelho: criar arquivo de migration espelho com timestamp real da aplicação + executar `supabase migration repair --status applied <version>` via workflow `db-apply-migration.yml`.  
- [ ] **E018** `fix` — Reconciliar os 8 `cron.alter_job` + `variant_stocks_select_org` aplicados via MCP em 2026-10-13 (citados no CLAUDE.md): confirmar presença de migrations espelho e recibo no log.  
- [ ] **E019** `fix` — Reconciliar `catalog_e24_zapp_catalog_stats` (2026-09-12) e `audit_r3_revoke_anon_mv_product_compositions` (2026-09-05): verificar ledger e criar espelhos se ausentes.  
- [ ] **E020** `chore` — Verificar paridade `ls supabase/migrations/*.sql | wc -l` vs `SELECT count(*) FROM supabase_migrations.schema_migrations` via MCP `SUPABASE - GESTÃO DE PRODUTOS`; documentar diferença no log.  
- [ ] **E021** `fix` — Atualizar `docs/SCHEMA_REFERENCE.md` se a data de medição for > 7 dias atrás: disparar `schema-snapshot-export.yml` via `workflow_dispatch` e aguardar conclusão.  
- [ ] **E022** `fix` — Verificar que todos os arquivos de migration têm `-- Rollback:` header e arquivo correspondente em `supabase/rollbacks/` (Gate 1.3 preflight); listar os que estão faltando e criar rollbacks stub com `-- TODO: implement rollback`.  
- [ ] **E023** `chore` — Verificar `supabase/baseline/` tem baseline atual; se `git rev-parse --short HEAD` difere do commit registrado no baseline, rodar `schema-snapshot-export.yml` com `force_rotate: true`.  
- [ ] **E024** `fix` — Verificar `supabase/baseline/drift-allowlist.txt`: remover entradas genéricas (`.*` ou `^create table`) que o script recusa; substituir por entradas específicas e justificadas.  
- [ ] **E025** `chore` — Checar se `restore_seller_cart` RPC existe no banco canônico (Gate 5.5): `SELECT proname FROM pg_proc WHERE proname = 'restore_seller_cart'` via MCP.  
- [ ] **E026** `fix` — Se `restore_seller_cart` ausente do banco: criar migration para restaurá-la; Gate 5.5 bloqueia deploy até ela existir.  
- [ ] **E027** `chore` — Auditar `cron.job` ativos: listar via `SELECT * FROM cron.job` via MCP; comparar com o que está documentado em `docs/SCHEMA_REFERENCE.md`.  
- [ ] **E028** `fix` — Para cada cron job ativo mas não documentado: criar migration espelho e recibo no log.  
- [ ] **E029** `chore` — Verificar que `Gate 2.5` (integridade transacional PostgreSQL) está verde: listar últimos runs de `deploy-gates.yml` e confirmar que `database-integrity` conclui com sucesso.  
- [ ] **E030** `fix` — Se Gate 2.5 vermelho: ler o log de `database-integrity`, identificar constraint ou trigger que falha, criar migration de fix e PR para o dono (envolve DDL → não mergear sem aprovação).

---

## BLOCO 3 — BANCO DE DADOS: RLS E SEGURANÇA DE ACESSO (Etapas 36–55)

> Objetivo: eliminar deny-all silencioso e garantir rate guards.

- [ ] **E031** `fix` — Executar Gate 1.13.1 (`check-rls-no-policy-drift.mjs --gate`): listar tabelas com RLS habilitada e zero policies (deny-all silencioso); documentar em issue para aprovação do dono antes de qualquer alteração de política.  
- [ ] **E032** `fix` — Para cada tabela com RLS habilitada e zero policies: criar migration que adiciona policy mínima (`SELECT` para `authenticated`) ou desabilita RLS se a tabela é interna; PR com aprovação do dono.  
- [ ] **E033** `chore` — Verificar Gate 1.13.2 (anon-insert rate guards): confirmar que as 7 tabelas com INSERT anônimo têm triggers de rate guard ativos (`SELECT tgname FROM pg_trigger WHERE tgname LIKE '%rate%'`).  
- [ ] **E034** `fix` — Para cada tabela com INSERT anônimo sem rate guard: criar migration com trigger de rate guard (mesmo padrão das outras 7 tabelas); PR para dono (DDL em produção).  
- [ ] **E035** `chore` — Verificar Gate 1.13.3 (migration receipts): listar migrations sem recibo há >24h em `supabase/MIGRATIONS_SYNC_LOG.md`; atualizar o log para cada uma.  
- [ ] **E036** `chore` — Auditar policies de RLS da tabela `products`: confirmar que `anon` não pode INSERT/UPDATE/DELETE; confirmar que `authenticated` tem SELECT com filtro de `org_id`.  
- [ ] **E037** `chore` — Auditar policies de RLS de `product_variants`: mesmo padrão de E036.  
- [ ] **E038** `chore` — Auditar policies de RLS de `supplier_products_raw`: confirmar que fornecedores não acessam dados de outros.  
- [ ] **E039** `chore` — Auditar policies de RLS de `magazines` e `magazine_items`: confirmar presença no banco (foram removidas pelo Lovable em `7716ae9`); se ausentes, criar migration de restauração.  
- [ ] **E040** `chore` — Auditar policies de RLS de `personalization_techniques`: confirmar presença no banco (removida em `158c142`); se ausente, criar migration de restauração.  
- [ ] **E041** `fix` — Verificar `src/integrations/supabase/types.ts`: confirmar presença de `personalization_techniques`, `magazines`, `magazine_items`, `magazine_templates` (Gate 1.2); se ausentes, regenerar types e criar PR com drift check verde.  
- [ ] **E042** `fix` — Se types foram removidas: adicionar entradas necessárias em `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` com `reason`, `approvedBy` e `date`; ou restaurar as tabelas no banco.  
- [ ] **E043** `chore` — Verificar Gate 1.13 (RLS policies baseline): `docs/ci/rls-baseline.json` ou equivalente; confirmar que não há divergência com `pg_policies` ao vivo (requer `DATABASE_URL` no CI).  
- [ ] **E044** `chore` — Verificar `gitleaks.toml`: confirmar version pin (8.21.2), allowlist adequada; confirmar que nenhuma chave real está em allowlist genérica.  
- [ ] **E045** `chore` — Executar `npm audit --audit-level high` (Gate 0.5) localmente no repo; listar CVEs high/critical; para cada uma, verificar se está em `package.json` como dependência direta ou transitiva.  
- [ ] **E046** `fix` — Para cada CVE high/critical: fazer bump da dependência afetada para versão corrigida; PR com Gate 0.5 verde.  
- [ ] **E047** `chore` — Verificar Gate 0.6 (Dependency Review): confirmar que o workflow roda em PRs e bloqueia deps com severity ≥ high.  
- [ ] **E048** `chore` — Revisar `.lovableignore`: confirmar que `src/integrations/supabase/client.ts`, `scripts/validate-supabase-config.mjs`, `.env.example`, `.github/CODEOWNERS`, `scripts/sentinel-check.sh`, `.github/workflows/deploy-gates.yml`, `.vercel/project.json`, `docs/SCHEMA_REFERENCE.md` estão todos listados.  
- [ ] **E049** `fix` — Se algum arquivo protegido (REGRA #1-#8, lista em CLAUDE.md) estiver faltando no `.lovableignore`: adicionar e criar PR.  
- [ ] **E050** `chore` — Verificar `lovable-protected-audit.yml`: confirmar que audita alterações do bot nos arquivos protegidos e gera alerta.

---

## BLOCO 4 — TYPES TYPESCRIPT E DRIFT ESTRUTURAL (Etapas 56–70)

> Objetivo: garantir que `types.ts` reflete o schema real e nenhuma tabela crítica foi removida.

- [ ] **E051** `fix` — Executar `npm run check:types-inventory -- src/integrations/supabase/types.ts` e comparar com inventário salvo em HEAD~1; documentar diferenças.  
- [ ] **E052** `fix` — Regenerar `src/integrations/supabase/types.ts` via workflow `types-sync` (se existir) ou manualmente via MCP `generate_typescript_types`; confirmar que Gate 1.2 fica verde.  
- [ ] **E053** `fix` — Verificar `export interface Product` em `src/types/product-catalog.ts` (Gate 1.1): confirmar presença de `price: number`, `sale_price?: number`, `shortDescription: string`, `category_id?: string`, `category_name?: string`.  
- [ ] **E054** `fix` — Se algum campo obrigatório ausente do tipo `Product`: restaurar campo e corrigir todos os usos no código.  
- [ ] **E055** `chore` — Verificar `src/integrations/supabase/client.ts`: `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` presente; guarda do Gate 0 não removida; `pqpdolkaeqlyzpdpbizo` ausente em qualquer forma.  
- [ ] **E056** `fix` — Se `client.ts` foi revertido pelo Lovable (padrão recorrente — incidente 401 em 2026-06-11): restaurar ID correto e adicionar ao `.lovableignore` se ausente.  
- [ ] **E057** `chore` — Verificar `scripts/validate-supabase-config.mjs` (Gate 0): confirmar que valida `CURRENT_PROJECT_ID == 'doufsxqlfjyuvxuezpln'` e rejeita `pqpdolkaeqlyzpdpbizo`.  
- [ ] **E058** `chore` — Verificar `.vercel/project.json`: confirmar `projectId == 'prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ'` (Regra #11); confirmar arquivo versionado e não removido.  
- [ ] **E059** `chore` — Verificar que projeto Vercel duplicado `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) NÃO está gerando builds desnecessários; se ativo, desabilitar via MCP Vercel.  
- [ ] **E060** `fix` — Verificar se há drift entre `supabase/migrations/` e o ledger `supabase_migrations.schema_migrations`; se a paridade de arquivos×registros estiver errada, reconciliar com `migration repair --status applied` para cada migration faltante no ledger.  
- [ ] **E061** `chore` — Verificar Gate 1.4 (visual baselines commitados): confirmar que snapshots de Playwright estão no repo para todos os componentes críticos.  
- [ ] **E062** `chore` — Verificar Gate 1.5 (sem "Salvar Alterações" em fluxos de rascunho): buscar no código por `"Salvar Alterações"` em componentes de formulário de rascunho; corrigir se encontrado.  
- [ ] **E063** `chore` — Verificar Gate 1.6 (bundle size): ler o limite atual em `scripts/check-bundle-size.mjs` ou equivalente; comparar com tamanho do build atual.  
- [ ] **E064** `fix` — Se bundle > limite: identificar o maior import e lazy-load ou tree-shake; PR com Gate 1.6 verde.  
- [ ] **E065** `chore` — Verificar Gate 1.8 (texto base64 acidental): listar arquivos com alta proporção de caracteres base64 que não deveriam ser encodados.

---

## BLOCO 5 — CI/CD: GATES E WORKFLOWS (Etapas 71–95)

> Objetivo: todos os 5 required checks verdes; E2E desbloqueado.

- [ ] **E066** `fix` — Verificar os últimos 10 runs de `deploy-gates.yml` em `main`: contar % de verde; documentar os gates que falham com maior frequência.  
- [ ] **E067** `fix` — Corrigir Gate E23 (Secret Scan / gitleaks) se vermelho: verificar log de gitleaks, remover ou adicionar à allowlist qualquer falso-positivo.  
- [ ] **E068** `fix` — Corrigir Gate 1.11 (workflow contracts): verificar output de `check-workflow-contracts --gate` para todos os 19 workflows; listar contratos violados (R1–R20/C10–C28).  
- [ ] **E069** `fix` — Para cada violação de contrato detectada em E068: criar PR específico para correção (máx. 3 workflows por PR para manter diff legível).  
- [ ] **E070** `fix` — Verificar que `assert-gate-final-is-required.yml` (5º required check) passa: confirmar que `Gate Final - Deploy Ready` está em `.github/required-checks.json` e que o job `Assert Gate Final is required on main` está no workflow `required-checks-guard.yml`.  
- [ ] **E071** `fix` — Verificar `workflow-lint.yml` (actionlint + shellcheck): listar todos os warnings/erros atuais; corrigir os blockers.  
- [ ] **E072** `chore` — Verificar que todos os 19 workflows listados em CLAUDE.md ainda existem em `.github/workflows/`: `auto-update-pr-branch`, `contexto`, `codeql`, `db-apply-migration`, `ddl-out-of-band-detector`, `deploy-edge-functions`, `deploy-gates`, `edge-functions-drift-check`, `lighthouse`, `lovable-protected-audit`, `required-checks-guard`, `schema-snapshot-export`, `seo-sanity`, `unit-tests`, `uptime-monitor`, `workflow-lint`.  
- [ ] **E073** `fix` — Para cada workflow listado em CLAUDE.md mas ausente no repo: criar o arquivo; para cada arquivo presente mas não listado: adicionar ao inventário.  
- [ ] **E074** `chore` — Verificar que `actions/checkout` em todos os workflows usa `persist-credentials: false` quando o token tem escrita (R9).  
- [ ] **E075** `chore` — Verificar que todos os workflows com `run:` têm `defaults.run.shell: bash` (R10).  
- [ ] **E076** `chore` — Verificar que `timeout-minutes:` está presente em todos os jobs (R3); classes: estático ≤ 5, unitário ≤ 10, E2E shard ≤ 20.  
- [ ] **E077** `chore` — Verificar que `node-version-file: .nvmrc` é usado em todos os steps de setup Node (R4); nunca versão literal.  
- [ ] **E078** `chore` — Verificar que `concurrency:` com `cancel-in-progress: true` está em todos os workflows PR; `false` em push/schedule (R2/R17).  
- [ ] **E079** `chore` — Verificar `retention-days:` em todos os `upload-artifact` steps (R6/R20): 14 padrão, 30 relatórios semanais, 90 auditoria.  
- [ ] **E080** `chore` — Verificar que nenhum workflow referencia `pqpdolkaeqlyzpdpbizo` (R19 — REGRA #1 do banco).  
- [ ] **E081** `chore` — Verificar que todas as actions de terceiros são da lista permitida (8 liberadas): `dorny/paths-filter`, `anchore/sbom-action`, `supabase/setup-cli`, `gitleaks/gitleaks-action`, `denoland/setup-deno`, `oven-sh/setup-bun`, `googleapis/release-please-action`, `crazy-max/ghaction-github-labeler`.  
- [ ] **E082** `fix` — Para qualquer action de terceiro fora da lista: (a) verificar se é essencial, (b) ou substituir por alternativa dentro da lista, (c) ou adicionar à lista em Settings → Actions E ao CLAUDE.md no mesmo PR.  
- [ ] **E083** `chore` — Verificar que todas as actions de terceiros estão pinadas por SHA de 40 caracteres (R15).  
- [ ] **E084** `fix` — Destravar E2E (`e2e.yml` ou `Gate 3`): causa raiz é 3,096 testes × 4 shards × 2 workers × ~9.5s/test ≈ 60min > 30min timeout. Solução: aumentar `timeout-minutes` do job E2E shard para 45, ou reduzir paralelismo para 1 worker/shard, ou particionar em smoke vs full.  
- [ ] **E085** `fix` — Garantir que `Gate 3` (E2E Smoke, `chromium`) usa um subset mínimo de testes (smoke) com timeout ≤ 20min; E2E completo pode ficar como job opcional.  
- [ ] **E086** `chore` — Verificar Gate 4 (Lighthouse): confirmar que a pontuação de performance está dentro do target; se abaixo, registrar no issue tracker.  
- [ ] **E087** `chore` — Verificar Gate 5 (SEO sanity): confirmar que o check passa; listar as URLs testadas.  
- [ ] **E088** `chore` — Verificar Gate 6 (Build Vite + SBOM): confirmar que o build não tem erros de TypeScript; confirmar que SBOM SPDX-JSON é gerado.  
- [ ] **E089** `chore` — Verificar `codeql.yml` (Gate `Analyze (javascript-typescript)`): ver o último scan completo; listar alertas de alta severidade abertos.  
- [ ] **E090** `fix` — Para cada alerta CodeQL de alta severidade: criar issue + PR de fix.  
- [ ] **E091** `chore` — Verificar Gate 1.17 (CODEOWNERS coverage de gate files): confirmar que arquivos críticos (`deploy-gates.yml`, `client.ts`, `validate-supabase-config.mjs`, `sentinel-check.sh`) têm dono em `.github/CODEOWNERS`.  
- [ ] **E092** `fix` — Para cada arquivo de gate sem dono em CODEOWNERS: adicionar linha; PR com Gate 1.17 verde.  
- [ ] **E093** `chore` — Verificar Gate 1.18 (ledger de conflitos semânticos E188): confirmar que `docs/coordenacao/conflitos-semanticos.md` existe e está atualizado.  
- [ ] **E094** `chore` — Verificar `scripts/sentinel-check.sh`: confirmar que recusa merge commit entre branches de agentes diferentes (`claude/*` ↔ `codex/*` ↔ `devin/*`).  
- [ ] **E095** `chore` — Verificar `edge-functions-drift-check.yml` ("Compare GitHub × Canonical"): confirmar que o último run verde; se vermelho, identificar a edge function com divergência.

---

## BLOCO 6 — EDGE FUNCTIONS (Etapas 96–115)

> Objetivo: edge functions em produção = código no GitHub (sem drift).

- [ ] **E096** `fix` — Para cada edge function com divergência detectada por `edge-functions-drift-check.yml`: criar PR com o código correto e deployar via `deploy-edge-functions.yml` workflow_dispatch.  
- [ ] **E097** `chore` — Verificar `kit-ai-builder`: foi deployada fora do workflow em 2026-09-23 devido a timeout só em produção. Confirmar que a versão atual no GitHub é a mesma que está publicada (via MCP `get_edge_function`).  
- [ ] **E098** `chore` — Verificar `magazine-reader-state-read`: deployada antes da revisão em 2026-09-24. Confirmar sincronização.  
- [ ] **E099** `chore` — Verificar `crm-db-bridge` (`src/lib/crm-db.ts`): confirmar que a edge function acessa apenas `pgxfvjmuubtbowutlide` (Gestão de Clientes) e nunca faz write no banco de produção.  
- [ ] **E100** `chore` — Listar todas as edge functions via MCP `list_edge_functions` (projeto `doufsxqlfjyuvxuezpln`) e comparar com `supabase/functions/` no repo; documentar divergências.  
- [ ] **E101** `fix` — Para cada edge function no banco mas sem código no repo (ou vice-versa): criar migration espelho ou PR de sincronização.  
- [ ] **E102** `chore` — Verificar que `deploy-edge-functions.yml` aceita `function_name` para deploy pontual e que o environment `producao-edge-functions` restringe a branch (`main` only).  
- [ ] **E103** `chore` — Verificar que MCP `deploy_edge_function` NÃO é chamado por nenhum script ou workflow (criaria divergência sem ledger).  
- [ ] **E104** `chore` — Verificar `supabase/functions/_shared/cors-origins.ts`: confirmar que domínios de produção (`promobrindes.com.br`, Vercel URL) estão na lista de CORS.  
- [ ] **E105** `fix` — Se algum domínio de produção ausente do CORS: adicionar e criar PR.  
- [ ] **E106** `chore` — Verificar que todas as edge functions têm secrets necessários via `supabase secrets list` (MCP); confirmar que não há secrets hardcodados no código.  
- [ ] **E107** `fix` — Para cada edge function com secret ausente: adicionar via `create_edge_function_secret` (MCP) ou `workflow_dispatch` de secrets rotation.  
- [ ] **E108** `chore` — Verificar timeout padrão das edge functions: Deno tem timeout de 2s por padrão em produção; confirmar que `kit-ai-builder` e funções de AI têm `--max-duration` adequado.  
- [ ] **E109** `chore` — Verificar que o workflow `deploy-edge-functions.yml` gera um recibo no MIGRATIONS_SYNC_LOG.md (ou equivalente) para cada deploy bem-sucedido.  
- [ ] **E110** `fix` — Se workflow de deploy não gera recibo: adicionar step de log no mesmo arquivo.

---

## BLOCO 7 — QUALIDADE DE CÓDIGO: RATCHETS E DÍVIDA TÉCNICA (Etapas 116–140)

> Objetivo: nenhum ratchet aumenta; reduzir dívida medida nos baselines.

- [ ] **E111** `chore` — Verificar `scripts/ratchets/tsc-errors-baseline.json`: ler valor atual de erros TypeScript; confirmar que não aumentou vs. commit anterior (Gate 1.7).  
- [ ] **E112** `fix` — Se TSC errors aumentaram: identificar os erros novos (via `npx tsc --noEmit 2>&1 | grep "error TS"`); corrigir os introduzidos nos últimos 20 commits.  
- [ ] **E113** `chore` — Verificar `scripts/ratchets/console-baseline.json` (Gate 1.9.1): ler contagem atual de `console.*`; listar os arquivos com maior número.  
- [ ] **E114** `fix` — Remover `console.log` desnecessários nos 5 arquivos com maior contagem; substituir por logger estruturado onde há logging legítimo.  
- [ ] **E115** `chore` — Verificar `scripts/ratchets/as-any-baseline.json` (Gate 1.9): ler contagem de `as any`; listar os 10 piores arquivos.  
- [ ] **E116** `fix` — Substituir os 5 `as any` mais perigosos (aqueles em dados de usuário ou API responses) por tipos explícitos ou `unknown` + type guard.  
- [ ] **E117** `chore` — Verificar `scripts/ratchets/todo-fixme-baseline.json` (Gate 1.9): listar TODOs/FIXMEs com > 30 dias de idade (baseado em `git log -S "TODO"`).  
- [ ] **E118** `fix` — Para cada TODO/FIXME com > 30 dias e impacto em produção: converter em issue GitHub ou corrigir.  
- [ ] **E119** `chore` — Verificar `scripts/ratchets/indexed-access-baseline.json` (Gate 1.10): listar arquivos com `object[key]` indexado dinamicamente.  
- [ ] **E120** `fix` — Substituir os 5 indexed accesses mais perigosos por acesso tipado com optional chaining ou type guard.  
- [ ] **E121** `chore` — Verificar Gate 1.9.2 (boundary cross-domain): confirmar que não há imports entre `src/pages/*` de domínios diferentes (ex.: página de catálogo importando de página de orçamentos).  
- [ ] **E122** `fix` — Para cada violação de boundary: extrair código compartilhado para `src/shared/` ou `src/components/` e atualizar imports.  
- [ ] **E123** `chore` — Verificar Gate 1.15 (`overflow-x-clip` em MainLayout): confirmar que `src/layouts/MainLayout.tsx` ou equivalente tem `overflow-x: clip` para evitar scroll horizontal.  
- [ ] **E124** `fix` — Se `overflow-x-clip` ausente: adicionar à classe do MainLayout.  
- [ ] **E125** `chore` — Verificar Gate 1.16 (quotes list invariants): confirmar que a listagem de orçamentos nunca retorna lista vazia quando há orçamentos, e que paginação funciona.  
- [ ] **E126** `chore` — Verificar `src/hooks/` por hooks sem estado de loading/error/empty (funcionalidade incompleta); listar os que faltam tratamento.  
- [ ] **E127** `fix` — Para os 5 hooks críticos de UI sem estado de erro: adicionar estado de erro com mensagem adequada ao usuário.  
- [ ] **E128** `chore` — Verificar `src/pages/` por rotas registradas em `App.tsx` mas sem componente real (retornam `null` ou `<div />`).  
- [ ] **E129** `fix` — Para cada rota "fantasma": implementar componente mínimo com loading state ou redirecionar para a rota correta.  
- [ ] **E130** `chore` — Verificar forms de criação/edição: confirmar que todos têm submit handler real (não apenas `console.log`) e feedback de sucesso/erro ao usuário.  
- [ ] **E131** `fix` — Para cada form sem submit handler real: implementar mutação Supabase + toast de feedback.  
- [ ] **E132** `chore` — Verificar que o componente de orçamento (`quotes`) tem os fluxos: criar → editar → enviar → aprovar → cancelar. Confirmar que cada ação tem handler.  
- [ ] **E133** `fix` — Para cada ação do fluxo de orçamento sem handler: implementar endpoint + UI.  
- [ ] **E134** `chore` — Verificar que `MagazineEditorPage` (citada no CLAUDE.md com bug React #310 reintroduzido pelo Lovable em 2026-07-16) está funcionando: renderiza sem erro de React.  
- [ ] **E135** `fix` — Se `MagazineEditorPage` tem bug React (ex.: hooks fora de ordem, useEffect sem deps corretas): corrigir o bug original identificado em #310.  
- [ ] **E136** `chore` — Verificar que a listagem de produtos (`products`) carrega em < 2s com 1000+ registros (benchmark de performance de UI).  
- [ ] **E137** `fix` — Se listagem lenta: adicionar paginação com `range()` do Supabase ou virtualização de lista.  
- [ ] **E138** `chore` — Verificar que imagens de produto têm loading lazy (`loading="lazy"` ou `React.lazy`).  
- [ ] **E139** `fix` — Para imagens sem lazy loading: adicionar atributo `loading="lazy"` e confirmar Lighthouse gate ainda verde.  
- [ ] **E140** `chore` — Verificar `src/hooks/` por race conditions: hooks que fazem múltiplas queries sem `AbortController` podem vazar memória ao desmontar componente.

---

## BLOCO 8 — VERCEL E DEPLOY FRONT-END (Etapas 141–155)

> Objetivo: deploy limpo, sem projetos duplicados, vars corretas.

- [ ] **E141** `chore` — Verificar deployment mais recente do Vercel (projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`): confirmar status `READY`; ler build logs para warnings.  
- [ ] **E142** `fix` — Se último deploy não é de `main` (ex.: de branch de Lovable): confirmar que o deploy de `main` está ativo como produção.  
- [ ] **E143** `chore` — Verificar variáveis de ambiente no Vercel: confirmar que apenas as vars em `scripts/ci/vercel-env-baseline.json` estão configuradas; listar vars extras.  
- [ ] **E144** `fix` — Remover vars de integração mortas, chaves de servidor (`OPENAI`, `ANTHROPIC`, `GROQ`, `EVOLUTION`) e `VITE_*` não lidas do Vercel (mencionadas no CLAUDE.md §5).  
- [ ] **E145** `chore` — Verificar que projeto legado `zapp-web` (`prj_OsErjUqsrMbwwC7S1LVfawmNgEce`) NÃO está gerando builds (já listado em 2026-11-01 como ainda existente).  
- [ ] **E146** `fix` — Pausar/deletar projeto legado Vercel `prj_OsErjUqsrMbwwC7S1LVfawmNgEce` via MCP Vercel para parar builds duplicados.  
- [ ] **E147** `chore` — Verificar que `ignore-build.sh` está correto: o script deve retornar exit 0 (build) só para mudanças em `src/`, `public/`, `package.json`, `vite.config.*`, `index.html`.  
- [ ] **E148** `chore` — Verificar que `VITE_SUPABASE_PROJECT_ID` aponta para `doufsxqlfjyuvxuezpln` no Vercel (nunca o legado `pqpdolkaeqlyzpdpbizo`).  
- [ ] **E149** `fix` — Se `VITE_SUPABASE_PROJECT_ID` errado: corrigir no Vercel e forçar redeploy.  
- [ ] **E150** `chore` — Verificar que `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` apontam para o projeto correto.  
- [ ] **E151** `chore` — Verificar CORS do Supabase (projeto `doufsxqlfjyuvxuezpln`): confirmar que a URL do Vercel e o domínio custom estão na lista de URLs permitidas.  
- [ ] **E152** `fix` — Se URL de produção ausente no CORS: adicionar via dashboard do Supabase (mudança de config, não migration).  
- [ ] **E153** `chore` — Verificar que o Supabase App NÃO está conectado ao GitHub (branching automático desligado — CLAUDE.md §4).  
- [ ] **E154** `chore` — Verificar que `lovable-protected-audit.yml` foi disparado no último commit do Lovable e não detectou alterações em arquivos protegidos.  
- [ ] **E155** `fix` — Se Lovable alterou arquivo protegido e o audit não alertou: corrigir o workflow de audit para garantir que alerta via issue.

---

## BLOCO 9 — MONITORAMENTO E OBSERVABILIDADE (Etapas 156–165)

> Objetivo: alertas funcionando, uptime monitorado, contexto sempre fresco.

- [ ] **E156** `chore` — Verificar `uptime-monitor.yml` (schedule 30 min): ver último run; confirmar que a URL de produção retorna 200.  
- [ ] **E157** `fix` — Se uptime monitor vermelho: verificar se é falso-positivo (timeout do runner) ou problema real de produção.  
- [ ] **E158** `chore` — Verificar `notifica-falha-main.yml` (se existir): confirmar que falhas em `main` geram notificação (Slack, email ou issue).  
- [ ] **E159** `chore` — Verificar que `docs/SCHEMA_REFERENCE.md` tem timestamp < 7 dias; se defasado, disparar `schema-snapshot-export.yml`.  
- [ ] **E160** `chore` — Verificar frescor do `contexto`: `git show origin/contexto:docs/contexto/00-INDEX.md` deve ter `gerado_em` < 15 min; se defasado, verificar se o cron está ativo.  
- [ ] **E161** `fix` — Se cron de `contexto.yml` não está disparando: verificar se o workflow foi desabilitado acidentalmente; reabilitar via GitHub Settings → Actions.  
- [ ] **E162** `chore` — Verificar `ddl-out-of-band-detector.yml` (semanal): ver último relatório em `docs/ci/DDL_OUT_OF_BAND_REPORT.md`; listar objetos detectados sem migration.  
- [ ] **E163** `chore` — Verificar `branch-hygiene-audit.yml` (semanal): listar branches obsoletas (> 30 dias sem commit, sem PR aberta); proposta de deleção ao dono.  
- [ ] **E164** `chore` — Verificar `settings-guard.yml` (diário): confirmar que `github-settings-baseline.json` está atualizado e nenhum campo divergiu.  
- [ ] **E165** `fix` — Se `settings-guard` detectou divergência: corrigir o campo divergido (branch protection, squash config, etc.) e atualizar o baseline.

---

## BLOCO 10 — GOVERNANÇA E DOCUMENTAÇÃO (Etapas 166–185)

> Objetivo: CLAUDE.md, AGENTS.md, SEGREDOS.md e CODEOWNERS sempre corretos.

- [ ] **E166** `chore` — Verificar `docs/ci/SEGREDOS.md`: confirmar que todo `secrets.*` e `vars.*` usado em `.github/workflows/*.yml` está listado com dono, escopo e rotação.  
- [ ] **E167** `fix` — Adicionar ao SEGREDOS.md as secrets `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` com dono `adm01-debug`, escopo `contexto.yml`, rotação "anual ou ao trocar banco".  
- [ ] **E168** `chore` — Verificar `docs/ci/PADRAO_WORKFLOW.md`: confirmar que está atualizado com os contratos R1–R20 e C10–C28 vigentes.  
- [ ] **E169** `chore` — Verificar `docs/db/POLITICA_DDL.md`: confirmar que a política proíbe `execute_sql` para escrita e exige o caminho migration → PR → merge → workflow.  
- [ ] **E170** `chore` — Verificar `supabase/MIGRATIONS_SYNC_LOG.md`: confirmar que todas as migrations dos últimos 90 dias têm recibo; se faltando, criar recibo retrospectivo.  
- [ ] **E171** `chore` — Verificar `docs/coordenacao/conflitos-semanticos.md` (Gate 1.18): listar todos os conflitos registrados; confirmar que nenhum está em aberto sem resolução.  
- [ ] **E172** `chore` — Verificar `.github/required-checks.json`: confirmar que lista exatamente os 5 checks: "Gate Final - Deploy Ready", "Compare GitHub × Canonical", "Analyze (javascript-typescript)", "Gate E23 - Secret Scan (gitleaks)", "Assert Gate Final is required on main".  
- [ ] **E173** `fix` — Se a lista em `.github/required-checks.json` diverge dos required checks reais no branch protection do GitHub: atualizar o JSON e abrir issue para o dono corrigir o Settings (branch protection não pode ser alterado por Actions com token padrão).  
- [ ] **E174** `chore` — Verificar CLAUDE.md: confirmar que a seção "Estado real gerado" aponta para `inventario/estado/` e que o `gerado_em` do último inventário é recente (< 7 dias).  
- [ ] **E175** `chore` — Verificar CLAUDE.md seção Vercel: confirmar que `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` ainda é o projeto correto (via MCP Vercel `get_project`).  
- [ ] **E176** `chore` — Verificar CLAUDE.md seção Supabase: confirmar que projeto `doufsxqlfjyuvxuezpln` ainda existe e está ativo; confirmar que `pgxfvjmuubtbowutlide` é o CRM (somente leitura).  
- [ ] **E177** `chore` — Verificar `inventario/estado/` (banco.json, rotas.json, edges.json): confirmar `gerado_em` < 7 dias; se defasado, disparar `gerar-banco.mjs`, `gerar-rotas.mjs`, `gerar-repo.mjs` via script ou workflow.  
- [ ] **E178** `chore` — Verificar `graphify-out/GRAPH_REPORT.md`: comparar `Built from commit` com `git rev-parse --short HEAD`; se diferir por > 50 commits, fazer `graphify update . --force` localmente (não pode ser feito via MCP).  
- [ ] **E179** `chore` — Verificar `graphify-out/manifest.json` (versionado): confirmar que está commitado na main após a última execução de `graphify update`.  
- [ ] **E180** `fix` — Se CLAUDE.md tem seção desatualizada (ex.: contagem de migrations, número de edge functions, projetos Supabase): corrigir no mesmo PR de qualquer outra mudança a CLAUDE.md.

---

## BLOCO 11 — FUNCIONALIDADES INCOMPLETAS (Etapas 186–195)

> Objetivo: fechar os 20% que faltam (identificados via `11-GLOSSARIO-E-LACUNAS.md`).

- [ ] **E181** `chore` — Ler `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md` da branch `contexto`; extrair lista de lacunas identificadas pelo gerador de regras.  
- [ ] **E182** `fix` — Implementar a primeira lacuna de maior impacto identificada em E181 (funcionalidade incompleta do catálogo de brindes): criar PR com funcionalidade completa (CRUD de ponta a ponta, sem mock ou TODO).  
- [ ] **E183** `fix` — Implementar a segunda lacuna de maior impacto: fluxo de aprovação de orçamento (se ausente ou incompleto).  
- [ ] **E184** `fix` — Implementar a terceira lacuna: variantes de produto (criação, edição, estoque) se o fluxo for parcial.  
- [ ] **E185** `chore` — Verificar `src/pages/` por páginas que renderizam dados do banco mas não têm estado de "sem resultados" (empty state); adicionar empty state com CTA adequado.  
- [ ] **E186** `fix` — Para o módulo de personalização (`personalization_techniques`): confirmar que a tabela existe no banco, tem RLS, e a UI de seleção de técnica de personalização funciona.  
- [ ] **E187** `fix` — Para o módulo de revistas/catálogos (`magazines`, `magazine_items`, `magazine_templates`): confirmar que as tabelas existem, têm RLS, e o editor funciona sem bug React #310.  
- [ ] **E188** `chore` — Verificar integração `crm-db-bridge`: confirmar que dados de cliente do CRM (`pgxfvjmuubtbowutlide`) são carregados corretamente no catálogo; testar com cliente real via edge function.  
- [ ] **E189** `fix` — Para fornecedores (`suppliers`, `supplier_products_raw`): confirmar que o fluxo de importação de produtos do fornecedor (Bronze layer) funciona; corrigir se quebrado.  
- [ ] **E190** `chore` — Ler `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`: listar as regras de desconto/preço que ainda NÃO estão implementadas no código (ex.: cálculo de preço por faixa de quantidade).

---

## BLOCO 12 — TESTES E COBERTURA (Etapas 196–200)

> Objetivo: cobertura mínima para os módulos críticos.

- [ ] **E191** `fix` — Verificar que `Gate 2` (vitest) está verde: último run de `unit-tests` concluído com sucesso.  
- [ ] **E192** `fix` — Para cada teste unitário que falha intermitentemente (flaky): adicionar retry ou corrigir a causa raiz.  
- [ ] **E193** `chore` — Verificar cobertura de testes para `src/hooks/` críticos: `useProducts`, `useQuotes`, `useOrders`; adicionar testes faltantes.  
- [ ] **E194** `chore` — Verificar que `tests/scripts/contexto-produtores.test.mjs` passa localmente (os 4 describes: suítes dos produtores, índice, invariantes do contexto.yml).  
- [ ] **E195** `fix` — Se qualquer teste de `contexto-produtores.test.mjs` falha: corrigir o produtor correspondente ou o invariante violado.  
- [ ] **E196** `chore` — Verificar que `playwright.config.ts` lista os 10 projetos documentados no CLAUDE.md: `setup`, `chromium-public`, `firefox-public`, `webkit-public`, `chromium-authed`, `firefox-authed`, `webkit-authed`, `mobile-chrome`, `mobile-safari`, `chromium-smoke`.  
- [ ] **E197** `fix` — Se algum projeto Playwright faltando ou com nome diferente: corrigir o config; atualizar o CLAUDE.md no mesmo PR.  
- [ ] **E198** `chore` — Verificar `scripts/db-audit/`: confirmar que `supabase-usage-guard.mjs`, `replay-local.sh`, `register-migration.mjs` estão com README atualizado.  
- [ ] **E199** `fix` — Para cada script em `scripts/db-audit/` sem README ou com README desatualizado: atualizar com instruções de execução, secrets necessários e exemplo de saída esperada.  
- [ ] **E200** `chore` — **Validação final:** executar todos os 5 required checks localmente (Gate 0 `validate-supabase-config.mjs`, Gate 1 lint + tsc, Gate 1.1 `check-product-type-fields.mjs`, Gate 2 vitest, Gate 3 E2E smoke); confirmar que todos passam; atualizar este documento com data de validação e SHA do commit validado.

---

## Apêndice — Prioridades Absolutas (Execute imediatamente, nesta ordem)

| # | Etapa | Risco se ignorar |
|---|-------|---------------|
| 1 | **E001–E004** | Supabase/ nunca gerado → agentes sem contexto de banco |
| 2 | **E084–E085** | E2E bloqueado desde 2026-10-02 → PR mergeada sem teste real |
| 3 | **E041–E042** | Types drift magazine/personalization → runtime errors em produção |
| 4 | **E031–E034** | RLS deny-all silencioso / sem rate guard → dados expostos ou abuso |
| 5 | **E055–E056** | client.ts revertido pelo Lovable → 401 em produção |
| 6 | **E045–E046** | CVEs high/critical → vulnerabilidade conhecida em produção |
| 7 | **E016–E019** | DDL out-of-band sem espelho → schema real diverge em silêncio |
| 8 | **E167** | SEGREDOS.md desatualizado → Gate 1.14 pode falhar em próxima PR |
| 9 | **E141–E146** | Projeto Vercel duplicado → builds desnecessários e custo |
| 10 | **E182–E184** | Lacunas de produto → funcionalidades prometidas ao cliente não entregues |

---

*Plano gerado por análise de 500 commits (`385af81` ← até ~2026-06-01) + estado real da branch `contexto` em 2026-11-04 + auditorias de CI/CD, banco, segurança, código e Lovable.*
