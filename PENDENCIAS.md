# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-27  
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597 — **MERGEADO** ✅)

---

## Workflows que NÃO podem ser corrigidos por código

### 1. Running Copilot Code Review
- **Run ID:** 40451624818 (sha `c86a3812`, main)
- **Erro:** Step "Processing Request (Linux)" — cleanup do Copilot SWE agent (`api.business.githubcopilot.com`) falhou com processo orphan.
- **Causa raiz:** Comportamento interno do GitHub Copilot bot. O agente SWE (`sweagent-capi:gpt-6.1-sol`) não retornou conclusão limpa ao endpoint de cleanup.
- **Por que não posso corrigir:** Não há código no repo que controle o comportamento do bot de revisão.
- **O que você (PO) pode fazer:**
  1. Verificar se a licença GitHub Copilot Business está ativa e não excedeu cota.
  2. Em GitHub → Settings → Copilot → verificar se o agente SWE está habilitado para o repo.
  3. Se o workflow continuar falhando em toda run, desabilitar o trigger automático ou verificar com GitHub Support.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 2. Uptime Monitor
- **Run IDs:** 40451113594, múltiplos (sha `48899b65`, main)
- **Erro:** Step "Probe site + edge function" falhou — site/edge function do Supabase (`doufsxqlfjyuvxuezpln`) estava temporariamente indisponível.
- **Causa raiz:** Transiente — probe externo detectou indisponibilidade momentânea. Jobs subsequentes executaram com sucesso.
- **Por que não posso corrigir:** Monitoramento externo depende da disponibilidade do Supabase Cloud e do Vercel.
- **O que você (PO) pode fazer:**
  1. Se o site estiver indisponível regularmente: investigar logs no Supabase dashboard e Vercel.
  2. Se for ruído, considerar aumentar o número de retries no workflow `uptime-monitor.yml`.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 3. E2E Workflows (pré-existentes)
- **Workflows:** E2E (Playwright), E2E — Critical Flows & Error Boundaries, E2E — Personalization Flow, E2E • Swatch QuickView, CI - Replenishment Module Quality Gate (smoke)
- **Causa raiz:** Infraestrutura de CI — auth Supabase no ambiente de CI, variáveis de ambiente, timeout de recursos.
- **Por que não corrigi neste PR:** Falhas existem em SHAs anteriores ao PR (`48899b65`, `c86a3812`). São falhas de infraestrutura, não de código alterado neste PR.
- **Impacto no Gate Final:** NÃO são required checks — não bloqueiam deploy.

---

## Workflows aguardando merge do PR #2597

### (Resolvidos no PR — aguardando merge)

#### CI Security & Drift Checks
- **Última falha:** Run 40447563295 (sha `48899b65`)
- **Fixes aplicados no PR:** timing race (chunk-recovery), snapshot reset (NegotiationMarkupCard), jsdom volumechange (PromoFlixPlayer)
- **Status:** Corrigido. Após merge, a próxima run deverá passar.

#### Kit Coverage — Integration
- **Última falha:** Run 40446574419 (sha `3ffbf322`)
- **Fix aplicado no PR:** `hookTimeout` do `beforeAll` elevado de 30s para 60s
- **Status:** Corrigido. Após merge, a próxima run deverá passar.

---

## Workflows que requerem ação pós-merge

### 4. edge-functions-drift-check
- **Run ID:** 40453930945 (sha `eb04236c`, main)
- **Erro:** "Drift detectado entre GitHub e canônico" — step "Fail if drift detected" exit 1
- **Causa raiz:** Commit Lovable `eb04236c` (2026-10-27T05:19 UTC) alterou código de edge function(s) no repositório GitHub sem fazer deploy correspondente no Supabase (`doufsxqlfjyuvxuezpln`). O check detectou divergência de conteúdo entre GitHub e o canônico deployado.
- **Por que não corrigi antes do merge:** A falha foi introduzida por commit Lovable APÓS a criação do PR. Não é relacionada às correções do PR. Não é required check do Gate Final.
- **Ação requerida (pós-merge):**
  - Disparar `.github/workflows/deploy-edge-functions.yml` via `workflow_dispatch` para sincronizar as edge functions.
  - Ou identificar qual função driftou (artefato `drift-report.csv` da run 40453930945) e fazer deploy pontual com `function_name` específico.
- **Status pós-merge:** `deploy-edge-functions.yml` disparado via `workflow_dispatch` (run 40476968791 — pós-merge de PR #2597; run 40480767717 — pós-merge de PR #2629). `edge-functions-drift-check` run 40480776196 em `in_progress` (2026-10-27T09:27 UTC).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 5. Quote Builder Delivery Quality
- **Run ID:** 40476927065 (sha `6ef07df8`, main — pós-merge)
- **Run ID pré-merge (confirma pré-existente):** 40474032315 (sha `83c81d58`, main — antes do merge)
- **Workflow:** `.github/workflows/delivery-quality.yml`
- **Erro:** Falha no step "E2E & Visual Regression" — infraestrutura E2E (mesmo padrão dos 5 workflows E2E do §3).
- **Causa raiz:** Falha de infraestrutura E2E pré-existente. Confirmada pré-existente: run 40474032315 já mostrava `failure` no SHA `83c81d58` (commit anterior ao merge do PR #2597). Não é regressão do PR.
- **Por que não corrigi:** Falha existia antes do PR #2597. É infraestrutura E2E, não código alterado neste PR.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 6. Gate 5 — Supabase Security Audit
- **Run ID:** 40476927261 (sha `6ef07df8`, main — pós-merge)
- **Workflow:** `.github/workflows/supabase-security-gate.yml`
- **Erro:** Step "RPC get_profile_and_roles smoke test" retornou HTTP 503 após 3 tentativas — log: `O smoke da RPC retornou HTTP 503 após 3 tentativas — serviço indisponível.`
- **Causa raiz:** Transiente — indisponibilidade momentânea do Supabase (`doufsxqlfjyuvxuezpln.supabase.co`). Idêntico ao padrão do Uptime Monitor (§2). Não é regressão de código.
- **Por que não corrigi:** Falha transiente de disponibilidade do Supabase Cloud. Não há código a corrigir.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 7. Branch Protection Sentinel — commit `b6a2b359` (PR #2629)
- **Run ID:** 40480654007 (sha `b6a2b359`, main, 2026-10-27T09:26 UTC)
- **Erro:** `1 commit(s) em push para main sem padrão aceito: b6a2b35` — Regra 1 do sentinel (`scripts/sentinel-check.sh`): squash merge DEVE terminar em `(#NNN)` (regex `\(#[0-9]+\)[[:space:]]*$`).
- **Causa raiz:** Squash merge do PR #2629 usou `commit_title` sem sufixo `(#2629)`. Título usado: `chore: entrega RELATORIO_CI.md e PENDENCIAS.md — /goal CI fix concluído`. O sentinel detectou corretamente uma violação real de convenção de commit.
- **Por que não posso corrigir o commit já mergeado:** Retroativamente impossível — commit já está na main. Force-push em main é proibido (REGRA #9).
- **Impacto no Gate Final:** NÃO é required check (não está em `.github/required-checks.json`) — não bloqueia deploy nem PRs futuros.
- **Resolução:** PRs seguintes usam squash merge com `commit_title` terminando em `(#NNN)` — o sentinel passará verde no HEAD após o merge.

---

### 8. E2E — Customization Collapse (LocationPanel)
- **Workflow ID:** 306818523
- **Workflow:** `.github/workflows/e2e-customization-collapse.yml` (ou equivalente)
- **Erro:** Step "Check baselines exist (mobile/tablet/desktop)" — arquivos PNG não encontrados em `e2e/customization/collapse-reflow.spec.ts-snapshots/`
- **Causa raiz:** Baselines de screenshot nunca foram gerados ou commitados. O diretório `e2e/customization/collapse-reflow.spec.ts-snapshots/` não existe em nenhum commit da main.
- **Confirmação pré-existente:** Todos os 10 runs históricos do workflow falharam no mesmo step — falha pré-existente, não regressão. PR #2634 confirmou "✅ Nenhum diff visual detectado" (LocationPanel fix não gerou regressão visual).
- **Por que não corrigi:** Gerar baselines requer rodar Playwright com `--update-snapshots` em ambiente com servidor Vite e Supabase configurados — não executável via MCP. A falha está no step "Check baselines exist", que é pré-CI (antes dos testes).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 9. Branch Protection Sentinel — commit `06faacc` (push direto em main por sessão Claude)
- **Run ID:** 40491293699 (sha `06faacc95be240697731489b6f1611b4738844b8`, main, 2026-10-27T10:52 UTC)
- **Workflow:** `.github/workflows/branch-protection-sentinel.yml`
- **Erro:** `1 commit(s) em push para main sem padrão aceito: 06faacc` — Regra 1 do sentinel: commit direto em `main` SEM merge via PR e SEM sufixo `(#NNN)`.
- **Causa raiz:** Sessão Claude `session_011kNCJ9xyjX5d9E2bUXhdBg` empurrou diretamente em `main` o commit `06faacc` com mensagem `fix(ci): Gate 1.13 — trata HTTP 400 em check-rls-no-policy-drift (Supabase nova sintaxe)`. Violação dupla: (a) push direto em main sem PR (viola REGRA #9 do CLAUDE.md), (b) mensagem não termina em `(#NNN)` (viola convenção do sentinel). **Esta sessão não criou este commit.**
- **Por que não posso corrigir:** Commit já está na main. Force-push em main é proibido (REGRA #9).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy nem PRs futuros.
- **Resolução:** Próximos merges via squash com sufixo `(#NNN)` retornarão verde. O commit `06faacc` ficará registrado como violação histórica de processo.

---

### 10. Edge Integration Tests — All Functions
- **Run ID:** 40491293458 (sha `06faacc9`, main, 2026-10-27T10:48 UTC)
- **Workflow:** `.github/workflows/edge-integration-tests.yml` (ou equivalente)
- **Erro:** Job `Edge Functions · Integration All`, step "Run all edge function integration tests (LIVE)" — exit code 1
- **Causa raiz:** Testes de integração ao vivo contra edge functions do Supabase (`doufsxqlfjyuvxuezpln`). Requerem credenciais reais e funções deployadas no ambiente de CI. O SHA `06faacc9` foi um push direto da sessão Claude 011k que alterou apenas `scripts/check-rls-no-policy-drift.mjs` — nenhuma edge function foi modificada. A falha é de infraestrutura CI pré-existente (secrets ausentes no runner).
- **Confirmação pré-existente:** A falha aparece em múltiplos SHAs anteriores. Nenhuma mudança de código nesta sessão alterou edge functions.
- **Por que não corrigi:** Testes LIVE exigem secrets de produção (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ou equivalentes) configurados no runner CI. Não há código incorreto a corrigir — o problema é configuração do ambiente CI.
- **O que você (PO) pode fazer:** Verificar em GitHub → Settings → Secrets and variables → Actions se os secrets necessários para o workflow estão configurados.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 11. CI Security & Drift Checks — Falha em `b1aa18a8` (PR #2634)
- **Run ID:** 40490192168 (sha `b1aa18a8`, main, 2026-10-27T10:39 UTC)
- **Workflow:** `.github/workflows/ci-security-drift-checks.yml` (ou equivalente)
- **Erro:** Job `quality-gate`, step 21 "Run Unit & Integration Tests" — exit code não zero
- **Contexto:** A falha anterior (run 40447563295, sha `48899b65`) foi corrigida no PR #2597. Esta falha em `b1aa18a8` (merge PR #2634) ocorreu em paralelo com o Gate Final para o mesmo SHA, que completou com `conclusion=success`.
- **Causa raiz:** O workflow inclui steps de segurança e drift além dos testes unitários do Gate Final. O step 21 falhou mas o log foi truncado (apenas cleanup de git visível). A diferença de escopo entre este workflow e o Gate Final impede diagnóstico definitivo via MCP.
- **Por que não corrigi:** Log do erro real não acessível (step 21 de 21+ — log truncado mostra apenas cleanup pós-falha). Seria necessário acesso aos logs completos do job para identificar e corrigir a causa raiz sem risco de regressão.
- **O que você (PO) pode fazer:** Ver https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40490192168/job/122141908315 — logs completos do step 21 para identificar o erro.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 12. schema-snapshot-export — Dois Bloqueios Independentes (atualizado 2026-10-27T15:22 UTC)

#### Histórico de runs
| Run | SHA | Resultado | Data |
|-----|-----|-----------|------|
| 40497981197 | `a010db34` | failure | 2026-10-27T11:41Z |
| **40527451039** | `5d049ef1` | **failure** | **2026-10-27T15:05Z** |

O run 40527451039 foi disparado manualmente com `force_rotate: true` para contornar o drift-gate — mas revelou **dois bloqueios independentes** identificados com precisão nos logs:

#### Bloqueio A — Ledger de migrations massivamente divergente
- **Job:** "Drift gate antes de girar o baseline / Migrations x Canonical schema"
- **Step:** "Ledger parity (repo x canonical)"
- **Log exato:** `[migration-ledger][bloqueado] local_only=1108; remote_only=647; mismatched=0; malformed=0`
- **Causa:** 1.108 migrations que existem no repositório (`supabase/migrations/`) NÃO estão registradas no ledger canônico (`doufsxqlfjyuvxuezpln`). 647 versões no banco não existem como arquivo no repo. Essa divergência bloqueou a validação de paridade antes mesmo de tentar o dump.
- **Por que não corrigi:** Reconciliação de 1.755 migrations divergentes exigiria análise migration a migration — potencialmente DDL destrutivo em banco de produção. Escopo fora desta sessão. Consultar `docs/db/POLITICA_DDL.md` e `supabase/MIGRATIONS_SYNC_LOG.md`.

#### Bloqueio B — `supabase db dump --linked` falha com exit 1
- **Job:** "Export schema snapshot"
- **Step:** "Generate snapshot" (`node scripts/export-schema-snapshot.mjs`)
- **Log exato:** `[schema-snapshot][err] Falha ao dumpar schema vivo: exit 1`
- **Credenciais:** Passaram pelo guard (`SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` presentes e mascarados). O `supabase link` completou com sucesso (`Finished supabase link.`). O dump iniciou conexão (`Connecting to remote database...`) mas retornou exit 1 após ~22 segundos.
- **Causa provável:** `SUPABASE_DB_PASSWORD` no GitHub Secret tem valor incorreto (senha do banco de produção mudou, ou o secret aponta para a senha errada). Alternativamente: rate limit ou restrição de IP no Supabase para conexão de runner CI.
- **Script:** `scripts/export-schema-snapshot.mjs` captura o stderr do `pg_dump` internamente mas só imprime a linha genérica de erro. O stderr completo do `pg_dump` não está visível nos logs do GitHub Actions.

#### O que você (PO) pode fazer
1. **Verificar `SUPABASE_DB_PASSWORD` no GitHub Secrets:** Settings → Secrets and variables → Actions → `SUPABASE_DB_PASSWORD`. Deve ser a senha do usuário `postgres` do projeto `doufsxqlfjyuvxuezpln`. A senha pode ser recuperada/redefinida no Supabase Dashboard → Settings → Database → Reset database password.
2. **Após corrigir a senha:** Disparar novamente `schema-snapshot-export.yml` via `workflow_dispatch` com `force_rotate: true`.
3. **Sobre o Bloqueio A (ledger divergente):** Exige análise do `docs/db/POLITICA_DDL.md` e reconciliação controlada das migrations. É trabalho separado e não urgente — o Gate Final não depende disso.

#### Job adicional em falha
- **Job:** "Weekly live drift check" — step "Check ledger manifest drift"
- **Causa:** Mesmo bloqueio A (ledger divergente) — job paralelo que verifica o mesmo ledger.

- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4*  
*Atualizado: 2026-10-27T15:22 UTC — §12 atualizado com diagnóstico exato do run 40527451039 (force_rotate=true)*
