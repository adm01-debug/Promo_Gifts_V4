# Execução do Plano de 50 Etapas — Registro Vivo (2026-08-29)

> Plano-fonte: `PLANO_PENDENCIAS_CORRECOES_MELHORIAS_50_ETAPAS_2026-08-29.md`.
> Status: 🔵 rascunho em validação PO · 🟡 parcial · ⬜ não iniciada ·
> ⛔ bloqueada · ⚙️ condicional não acionada · ✅ concluída.
> Regra: nenhum `[AUTORIZAÇÃO *]`/`[VALIDAÇÃO PO]` é dispensado sem aprovação registrada do PO.

**Entrega da Onda 1:** PR #1806 — branch `codex/actions-gates-20260829`, commits `87028e01a`,
`96ddc6834`, `4de57455c`, `4d3ab77b3`, `e69b1848b` e `fa7804f73` (2026-08-30); **mergeado em
2026-08-30T19:46:36Z** pelo PO (commit de merge `2b94f2bfa`, assinatura web-flow válida) com
**10 arquivos alterados** (+743/−0 — o body do PR menciona 9; o plano-fonte também foi tocado).
A validação dos 12 itens pendentes da matriz 001 não foi registrada em comentário antes do
merge — segue como dívida de registro (os artefatos permanecem marcados RASCUNHO).

**Revisão de cobertura de 30/08/2026:** 0 concluídas, 34 parciais, 4 não iniciadas,
11 bloqueadas e 1 condicional não acionada. A matriz probatória completa está na seção
`Revisão exaustiva de implementação` do plano-fonte.

## Onda 1 — Governança (001–005)

| Etapa | Título (resumo) | Status | Evidência | Gate pendente |
|---|---|---|---|---|
| 001 | Matriz de fluxos críticos | 🔵 | `MATRIZ_FLUXOS_CRITICOS_2026-08-29.md` (v0.2) | `[VALIDAÇÃO PO]` linha a linha |
| 002 | Mapa rota → dados → teste | 🔵 | `MAPA_ROTA_DADOS_TESTE_2026-08-29.md` | `[VALIDAÇÃO PO]` + scanners (013) |
| 003 | Ownership por domínio | 🔵 | `OWNERSHIP_DOMINIOS_2026-08-29.md` | `[VALIDAÇÃO PO]` + `[AUTORIZAÇÃO GITHUB]` p/ CODEOWNERS |
| 004 | Readiness/lifecycle | 🔵 | `READINESS_LIFECYCLE_FEATURES_2026-08-29.md` | `[VALIDAÇÃO PO]` |
| 005 | Protocolo multiagente | 🔵 | `PROTOCOLO_MULTIAGENTE_2026-08-29.md` + ledgers em `coordenacao/` + template PR | `[VALIDAÇÃO PO]` |

## Onda 2 — Sinal de engenharia (006–015)

| Etapa | Título canônico | Status | Evidência/gap dominante |
|---|---|:---:|---|
| 006 | Painel causal dos workflows históricos | ⬜ | não existe painel consolidado |
| 007 | Catálogo de workflows | ⬜ | universos distintos a reconciliar: **107 YAMLs versionados** em `.github/workflows/` (catálogo a classificar) × **113 registros ativos** na API Actions — delta de 6 sem arquivo: 1 estático órfão (`auto-regenerate-types.yml`, ativo na plataforma, arquivo removido do repo) + 5 workflows dinâmicos da plataforma (`dynamic/agents/copilot-pull-request-reviewer`, `dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`, `dynamic/copilot-swe-agent/copilot`, `dynamic/dependabot/dependabot-updates`, `dynamic/pages/pages-build-deployment`) |
| 008 | Required check final de `main` | ⛔ | ruleset ativo sem nenhum status check obrigatório |
| 009 | Previews Vercel | ⛔ | preview do PR #1806 falhou antes do build |
| 010 | CodeQL e vulnerabilidades altas | 🟡 | CodeQL workflow verde. Fotografia de 2026-08-30 ~22:00 UTC (Code Scanning API): **57 alertas abertos, 38 deles high** — exemplos, não inventário: #99 clear-text-logging de apiKey, #98/#38 insecure-randomness, #57 file-system-race; Dependabot: **2 high** em `image-size` (sem versão corrigida disponível) |
| 011 | Fixtures críticas estáveis | 🟡 | fixtures pontuais, sem dataset integral por fluxo |
| 012 | Baselines visuais críticos | 🟡 | shard 2/2: 1 falha, 9 flakes, 468 skips |
| 013 | E2E + visual + a11y nas mesmas fixtures | 🟡 | cobertura existe, mas ainda fragmentada |
| 014 | Regressão hermética/anti-falso-verde | 🟡 | smoke HTTP e live fuzz ainda não fecham |
| 015 | Backup, restore e rollback | 🟡 | rollback web provado; restore real de dados e Edge rollback ausentes |

## Onda 3 — Código sem DDL (016–030)

| Etapa | Título canônico | Status | Evidência/gap dominante |
|---|---|:---:|---|
| 016 | Reduzir `as any` | 🟡 | 54→1 e ratchet verde; revisão dos lotes não fechada |
| 017 | Revisar supressões TS/ESLint | 🟡 | 177 `eslint-disable` e 1 supressão TS ainda sem lifecycle integral |
| 018 | Impedir mascaramento de drift | 🟡 | scanners existem; oito contratos Edge faltam |
| 019 | Padronizar contratos de integração | 🟡 | smoke HTTP falha em 11 de 133 cenários |
| 020 | Correlação ponta a ponta | 🟡 | gate cobre 17 edges; jornada completa ainda não foi provada |
| 021 | Produto `simulation-orchestrator` | 🟡 | deploy efêmero existe; ADR/decisão de produto estão divergentes |
| 022 | Contrato da simulação sem DDL | 🟡 | AAL2/outcomes passam; sandbox/replay/segredo ainda faltam |
| 023 | Persistência da simulação | ⚙️ | não criar enquanto o produto permanecer efêmero |
| 024 | Destino de `runAuthAudit` | ⛔ | `[VALIDAÇÃO PO]` |
| 025 | Diagnóstico auth aprovado | ⛔ | depende da 024 e de autorização por objeto |
| 026 | Futuro de `stock_notes` | ⛔ | `[VALIDAÇÃO PO]` |
| 027 | Caminho aprovado para `stock_notes` | ⛔ | depende da 026 e de autorização por objeto |
| 028 | Isolar/formalizar `e2e_cleanup_audit` | 🟡 | edge usa relação ausente no canônico |
| 029 | Storage/lifecycle Bitrix | 🟡 | falso verde corrigido; storage canônico segue indefinido |
| 030 | Aprovação de desconto canônica | 🟡 | objetos live e PG17 local verdes; happy-path live autorizado ainda ausente |

## Onda 4 — Produto/staging (031–040)

| Etapa | Título canônico | Status | Evidência/gap dominante |
|---|---|:---:|---|
| 031 | Provenance estrutural por campo | 🟡 | implementações pontuais, sem contrato uniforme |
| 032 | Kit builder fail-explicit | ⬜ | `handleSaveKit` vazio e fallback silencioso para `MOCK_*` |
| 033 | Confiança real × simulada | 🟡 | badges pontuais, sem contrato global |
| 034 | Orçamento em staging | 🟡 | testes locais amplos; jornada staging não provada |
| 035 | Magazine em staging | 🟡 | testes locais amplos; jornada staging não provada |
| 036 | Mockup em staging | 🟡 | testes mockados; sandbox/custo/compensação não provados |
| 037 | Kits em staging | 🟡 | specs existem; 032 impede aceite |
| 038 | Isolamento 2×2 | ⬜ | não existe matriz executável 2 usuários × 2 organizações |
| 039 | Smokes externos seguros | ⛔ | segredos/JWTs de staging ausentes; live fuzz foi `skipped` |
| 040 | Lifecycle Edge/MCP | 🟡 | quatro deploys auditados; inventário de 107 incompleto |

## Onda 5 — BD/histórico (041–048)

| Etapa | Título canônico | Status | Evidência/gap dominante |
|---|---|:---:|---|
| 041 | Relações vazias/dependências | 🟡 | inventário existe; ownership por coluna incompleto |
| 042 | Constraints e índices | 🟡 | candidatos levantados; evidência/owner/rollback individuais faltam |
| 043 | RLS, ACL e grants | 🟡 | grants de kits aplicados; matriz por papel e drift `fn_super_filtro` pendem |
| 044 | Rotinas privilegiadas/enums/extensões | 🟡 | 535 SECDEF live; revisão nominal incompleta |
| 045 | Três jobs críticos | 🟡 | dois inativos e vacuum ativo; decisão/runbook ausentes |
| 046 | Manifesto canônico de migrations | 🟡 | manifesto histórico existe; ledger live atual não foi reconciliado por DBA |
| 047 | Replay em banco descartável | ⛔ | depende da 046 aprovada |
| 048 | Comparar replay/referência/canônico | ⛔ | depende de replay integral da 047 |

## Onda 6 — Release (049–050)

| Etapa | Título canônico | Status | Evidência/gap dominante |
|---|---|:---:|---|
| 049 | Mudanças aprovadas em staging | ⛔ | requer allowlist, staging, canário e rollback por objeto |
| 050 | Release candidate | ⛔ | 6 checks falham, 4 skips, Vercel falha e P0/P1 seguem abertos |

## Modelo de registro por etapa (preencher a cada execução)

```text
Etapa: <NNN> — <título>
Data/agente: <UTC> / <agente>
Mudança: <o que foi feito>
Risco: <baixo/médio/alto + por quê>
Rollback: <como reverter>
Evidência: <links de PR, comandos, resultados>
Autorizações: <marcas anexadas ou "nenhuma necessária">
```

## Registros de execução (dogfooding do modelo)

```text
Etapa: 001–005 — remediação pós-auditoria dos rascunhos (simulação validada antes de editar)
Data/agente: 2026-08-30 / Cline (worktree codex/actions-gates-20260829; commit sob identidade Git do PO)
Mudança: correções cirúrgicas em MATRIZ (evidências do fluxo 5 reais; fluxo 6 com histórico desde
  o import inicial e reconciliação/hardening rastreados separadamente; §4 kit 032/037), MAPA
  (catch-all: smoke=3 testes e lacuna de spec 404;
  refs de orçamento → wave1 SQL/04b/concurrency guard; I-1 com contexto da Onda 9 — descontinuação
  PO 07/mai/2026, 5 edges inexistentes, specs mockadas), READINESS (5 flags sem consumidor:
  +advanced_analytics, +voice_commands; §3 edges pós-Onda 9; desconto em main), OWNERSHIP
  (107 funções + convenção de contagem) e este registro (017–020, 021, 022/028/029, 023–027/030
  alinhados ao plano-fonte; kit 032/037 na Onda 4; commits da Onda 1).
  Item cancelado como falso positivo: "47→50 rotas" — route-matrix.ts tem exatamente 47 rotas.
Risco: baixo — docs-only; zero código/schema/workflow/settings.
Rollback: `git revert 4de57455c` para a remediação do Cline; correções de auditoria posteriores
  devem ser revertidas pelo SHA próprio, sem reescrever a branch.
Evidência: PR #1806; verificações locais por ls/grep/sed sobre o worktree; 12 itens da simulação —
  11 aplicados, 1 cancelado com justificativa.
Autorizações: nenhuma necessária (docs-only). Auditoria independente em 30/ago/2026 confirmou
  que os checks rodaram: 70 success, 6 failure, 4 skipped e 1 neutral. Falhas causais: gate de
  invocação direta em `src/lib/analytics/intelligenceAnalytics.ts`, corrida de inicialização do
  banco `approved_plan_test` no runner PG17, 11 falhas em 133 cenários do smoke HTTP, regressão/
  flakes visuais e Vercel; `Gate Final` é falha derivada. Como o PR altera somente docs/template,
  essas falhas não foram introduzidas por esta remediação; as causas devem ser tratadas em PRs
  de código separados.
```

```text
Etapa: 001–050 — revisão exaustiva de cobertura e reconciliação live read-only
Data/agente: 2026-08-30 / Codex
Mudança: comparou o plano com origin/main 7ea9b5870, PRs #1803–#1806, 81 checks do PR,
  ruleset/Dependabot/Vercel e o pg_catalog/ledger do Supabase doufsxqlfjyuvxuezpln. Corrigiu neste
  registro os títulos 006–015, que não correspondiam ao plano-fonte, e classificou nominalmente as
  50 etapas: 0 concluídas, 34 parciais, 4 não iniciadas, 11 bloqueadas e 1 condicional.
Risco: baixo — somente documentação; consultas canônicas exclusivamente read-only.
Rollback: reverter apenas o commit documental desta revisão.
Evidência: Management API retornou PG17.6/usuário read-only; 13 migrations recentes, view
  security_invoker, RPCs e triggers transacionais estão live. Downloads read-only de quatro Edge
  Functions coincidem com o executável do repo. Local: SSOT, any ratchet, request-id, typecheck,
  lint baseline e cenários PG17 de desconto/concorrência passaram; handlers Deno passaram 7/7
  com as permissões declaradas.
Autorizações: nenhuma para auditoria/documentação. Nenhum DDL, DML, deploy, setting ou segredo
  foi alterado.
```

```text
Etapa: 001–005 — remediação pós-merge dos defeitos residuais da auditoria anti-falso-verde
Data/agente: 2026-08-30 / Cline (branch claude/audit-fixes-20260830)
Mudança: F1 — MAPA §5: "/comissoes coberto por smoke de redirect" era falso (nenhuma spec cobre;
  registrado como lacuna). F5 — etapa 007: "107 workflows" → 113 (107 é o total de edge
  functions). F3/G7 — este registro: PR #1806 mergeado em 19:46:36Z com 10 arquivos; estado
  sincronizado. G4 — OWNERSHIP §1: "v0.1 da matriz" → v0.2 (o formato de 12 fluxos só existe
  na v0.2; a v0.1 de 26/ago tem 9 fluxos). G5 — READINESS §3 e MAPA §1/§6: acrescentada a
  edge pública magazine-public-react (reações anônimas por token) às superfícies do Magazine.
  G1 — READINESS §3: Dropbox e Promo Champions não estão no CSP connect-src (consumo
  server-side via dropbox-list / crm-db-bridge / receive-crm-callback). G8 — etapa 010:
  acrescentados os alertas CodeQL high abertos à evidência. F2 — nota de contagem:
  "34 marcas em 25 etapas" no body do PR usa a regra "43 marcas literais − 9 da tabela de
  definições do plano-fonte"; regra agora explícita.
Risco: baixo — docs-only; zero código/schema/workflow/settings.
Rollback: git revert 2b04d5810a13add7eeb885e921711612188143c6 (commit desta remediação);
  para o commit corretivo do handoff Codex, revert do próprio SHA registrado no log do PR #1808.
Evidência: auditoria anti-falso-verde em sessão (30/ago/2026) — totais de sessão, NÃO
  reproduzíveis a partir do diff (sem matriz versionada dos ~80 itens): 67 PASS / 3 FAIL /
  6 GAP, contra fontes primárias (GitHub API, config.toml, vercel.json, ruleset,
  Dependabot/CodeQL, probe live). Checks do PR #1808 na cabeça 2b04d5810: 83 = 72 success /
  2 failure / 5 skipped / 2 neutral / 2 pending — as 2 falhas (quality-gate: invocação direta
  em src/lib/analytics/intelligenceAnalytics.ts:162, migrar p/ invokeEdgeSafe; Smoke HTTP:
  131/133 falhando com HTTP 500 em product-webhook/webhook-dispatcher/webhook-inbound) são
  PREEXISTENTES, fora do escopo deste PR docs-only — PRs de código separados após decisão
  do PO. Issue #1807 (migrate-helper): contenção técnica atual confirmada; remediação
  operacional (rotação de credenciais + auditoria de logs) pendente do PO.
Autorizações: nenhuma necessária (docs-only).
```

```text
Etapa: 001–005 — correção do PR #1808 pós-auditoria independente (handoff Codex A1–A6)
Data/agente: 2026-08-30 / Cline (branch claude/audit-fixes-20260830, commit corretivo)
Mudança: A1 — etapa 007 distingue 107 YAMLs versionados × 113 registros ativos na API
  Actions, com o delta dos 6 registros sem arquivo (1 órfão + 5 dinâmicos). A2 —
  READINESS §3 e MAPA §6 reclassificam magazine-import-local como AUTENTICADA no
  handler (Authorization + auth.getUser(), 401 sem usuário; verify_jwt=false no gateway
  é compatibilidade HS256). A3 — MAPA §1/§6 e READINESS §3 separam três fronteiras:
  anônima consumida (magazine-public-view), anônima sem caller (magazine-public-react,
  com lacuna de integração/E2E) e handler-autenticada (import-local). A4 — rollback
  determinístico: git revert 2b04d5810 (+ SHA próprio deste corretivo no log do PR).
  A5 — etapa 010 com fotografia datada e fonte: 57 alertas Code Scanning abertos,
  38 high (Code Scanning API, 30/ago ~22:00 UTC); Dependabot 2 high (image-size).
  A6 — totais da auditoria qualificados como de sessão; checks do PR registrados com
  causalidade; 2 falhas de CI declaradas fora de escopo.
Risco: baixo — docs-only; nenhum código/schema/workflow/settings.
Rollback: git revert do SHA deste commit (ver HEAD da branch no PR #1808).
Evidência: git diff --check limpo; scripts de guarda (validate-supabase-config,
  guard-canonical-project, check-docs-supabase-hosts) verdes; read-only GitHub:
  107/113 + delta exato; sem caller para magazine-public-react; handler import-local
  com 401 duplo; 38 high/57 open; checks 72/2/5/2/2 pending.
Autorizações: nenhuma necessária (docs-only).
```
