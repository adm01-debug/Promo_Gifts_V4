# Matriz consolidada dos três planos de 50 etapas — 2026-09

**Gerado em:** 2026-09-16 (E05 de `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`)
**Planos consolidados:**
- **[13]** `PLANO_MELHORIAS_CORRECOES_50_ETAPAS_2026-09-13.md` — CI/gates, cobertura, dependências, higiene Git
- **[15]** `PLANO_RECONCILIACAO_LOCAL_GITHUB_SUPABASE_50_ETAPAS_2026-09-15.md` — paridade Local × GitHub × Supabase
- **[16]** `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` — ledger, segurança, capacidade, desempenho (este)

**Método:** para cada etapa, estado medido nesta data quando barato de verificar (grep/wc/gh/npm/tsc/git —
todos read-only); caso contrário, `⚠️ não verificado nesta rodada` — não é chute. Não confundir
"não verificado" com "aberto": significa que ninguém confirmou nenhuma das duas coisas agora.

**Legenda de estado:** ✅ concluída · 🟡 parcial · ❌ aberta (confirmada) · 🔁 superseded (outra etapa resolve) ·
⚠️ não verificado nesta rodada

---

## Plano [13] — Melhorias e Correções (2026-09-13)

| # | Título | Estado | Evidência / referência cruzada |
|---|---|---|---|
| E01 | Destravar CI/CD Pipeline (finding 0029 órfão) | ✅ | `check-lint-0029-drift.mjs` hoje degrada para `static-pass`/`requireLive:false` em vez de falha muda; resolvido junto com #1861. |
| E02 | Restaurar cobertura do módulo de estoque ≥60% | ✅ | Commit `f73cffa7d` "restaura cobertura do módulo de estoque acima do threshold". |
| E03 | Fast-forward `main` + poda de branches `[gone]` | ✅ | `git branch -vv \| grep gone` → 0 hoje. |
| E04 | Triagem dos 2 stashes órfãos | ✅ | `git stash list` → vazio. |
| E05 | Ressincronizar grafo graphify | ❌ | `GRAPH_REPORT.md` ainda diz `Built from commit: 89292143`; `HEAD` atual é `bd555a41c`. **Ainda defasado.** |
| E06 | Fechar ciclo do PR #1860 | ✅ | `gh pr view 1860` → `MERGED` em 2026-09-14. |
| E07 | Corrigir baseline base64 do supabase-linter | ✅ | `.security/supabase-linter-baseline.json` parseia como JSON válido hoje. |
| E08 | Eliminar `catch {}` silencioso de `loadBaseline()` | 🟡 | `catch (err)` com parâmetro nas 2 ocorrências (não é mais `catch {}` bare) — não verifiquei o corpo completo do handler. |
| E09 | Supabase Linter Gate fail-closed no 404 | ✅ | Script hoje trata 404 explicitamente e usa `process.exit(2)` (falha), não `exit(0)`. |
| E10 | Auditar os 67 `reason` genéricos da allowlist 0029 | ❌ | Ainda **67** ocorrências do texto genérico em `.security/lint-0029-allowlist.json`. |
| E11 | Ratchet do baseline TypeScript 145→0 | ✅ | `.tsc-baseline.json` → `totalErrors: 0`. Commit `a71007fc` "reaperta baseline TypeScript de 145 para 0 erros". |
| E12 | Auditoria transversal de fail-open nos scripts de gate | ⚠️ | Não verificado nesta rodada. |
| E13 | Consolidar os 13 arquivos de baseline | ⚠️ | Não verificado — `ls` rápido mostra os arquivos ainda espalhados na raiz/`.security`/`.a11y`, não migrados para `quality-baselines/`. Provável **❌ aberta**, mas não confirmei a lista completa. |
| E14 | Meta-teste de integridade dos baselines | ⚠️ | Não verificado nesta rodada. |
| E15 | Restabelecer execução local da suíte (`--reporter=basic`) | ⚠️ | Não verificado nesta rodada. |
| E16 | Medir e publicar cobertura global real | ⚠️ | Não verificado nesta rodada. |
| E17 | Thresholds de cobertura por módulo | ⚠️ | Não verificado nesta rodada. |
| E18 | Cobrir as 112 edge functions | ⚠️ | Não verificado nesta rodada (109 diretórios de função medidos no plano [16] §1.5 — número mudou desde 09-13, não foi reclassificado por criticidade). |
| E19 | Caçar flakiness nos arquivos de teste | ⚠️ | Não verificado nesta rodada. |
| E20 | Separar fast lane de slow lane | ⚠️ | Não verificado nesta rodada. |
| E21 | Testes de contrato das RPCs do Kit Maker | 🟡 | PRs #1857–#1861 e #1859 ("conclui fluxos funcionais e revisão pós-plano") sugerem trabalho substancial no Kit Maker desde 09-13; não confirmei se testes de contrato específicos contra `pg_catalog` existem. |
| E22 | Resolver os 2 CVEs `high` | 🟡 | `npm audit --audit-level=high` ainda mostra 2 high (`image-size`, `pptxgenjs`). **Risco aceito e documentado** com validade até 2026-10-09 (PR #1864) — não é "ignorado", é exceção com prazo. Revisar antes dessa data. |
| E23 | Eliminar o lockfile duplo (`bun.lock` + `package-lock.json`) | ❌ | Ambos ainda existem no repo. |
| E24 | Consertar `tsconfig.json` raiz | ❌ | `tsc --noEmit` ainda falha com os mesmos `TS1003/TS1005/TS1128` em `@vitejs/plugin-react/dist/index.d.ts:62`. |
| E25 | TypeScript 5.4.5 → 5.9.x | ❌ | `npx tsc --version` → ainda `5.4.5`. Bloqueia E24, E26 (parcialmente), E27, E28, E33 (todos com `Dep.: E25`). |
| E26 | Vitest 4 → 5 | ⚠️ | Não verificado nesta rodada. |
| E27 | Tailwind 3.4.19 → 4.x | ⚠️ | Não verificado nesta rodada. |
| E28 | Zod 3.25.76 → 4.x | ⚠️ | Não verificado nesta rodada. |
| E29 | Demais majors em ondas temáticas | ⚠️ | Não verificado nesta rodada. |
| E30 | Inventário das migrations (classificar por tipo/autoria) | 🟡 | Contagem bruta refeita continuamente (2.983 → 2.985 → **2.988** hoje) mas a classificação por tipo/autoria pedida na etapa não foi produzida como artefato. Ver plano [16] E06/E07 (manifesto ledger↔arquivo), que cobre parte disso com outro objetivo. |
| E31 | Normalizar os 67 nomes fora do padrão | ❌ | Ainda **67** arquivos fora de `^[0-9]{14}_`. Mesma medição no plano [16] E10. 🔁 **Etapa canônica: plano [16] E10** (mesmo achado, ação equivalente — congelar em allowlist com hash, nunca renomear). |
| E32 | `[REQUER-PO]` Baseline/squash das migrations históricas | ⚠️ | Proposta, não decidida. Não verificado se foi apresentada ao PO. |
| E33 | Reduzir `types.ts` (64.637 linhas) | ❌ | `wc -l` hoje: ainda **64.637** linhas, inalterado. Paridade tabela-a-tabela confirmada 100% no plano [16] §1.5 (E04/auditoria) — a REGRA #4 está protegida mesmo sem redução de tamanho. |
| E34 | Reconciliar `.migration-refs-baseline.json` (34 refs quebradas) | ❌ | Ainda **34** entradas na baseline (confirmado repetidamente nos gates rodados nesta sessão: "34 entrada(s) legadas na baseline"). |
| E35 | Runbook de auditoria via `pg_catalog` (script versionado) | 🟡 | `docs/SCHEMA_REFERENCE.md` §8 tem as queries canônicas (regeneradas em 2026-09-16, plano [16] E04) mas não viraram `scripts/audit-schema-pgcatalog.mjs` executável como pedido aqui. |
| E36 | Triagem em massa das issues `autoheal` | ✅ | `gh issue list --state open` → **13** issues abertas hoje, **0** com label `autoheal`. Meta (`< 30`, sem ruído) batida com folga. |
| E37 | Desarmar/reconfigurar `lovable-autoheal.yml` | ⚠️ | Não verificado nesta rodada — mas o resultado do E36 sugere que algo mudou (0 autoheal aberta). |
| E38 | Priorizar as 12 issues reais | ⚠️ | Não verificado nesta rodada (13 issues hoje, não confirmei prioridade). |
| E39 | Rate-limit para criação automática de issues | ⚠️ | Não verificado nesta rodada. |
| E40 | Painel de saúde do repositório | ⚠️ | Não verificado nesta rodada. |
| E41 | Inventário dos 111 workflows | 🟡 | Contagem confirmada igual (**111** arquivos hoje), mas o inventário com dono/justificativa por workflow não foi produzido como artefato. |
| E42 | Consolidar workflows redundantes | ⚠️ | Não verificado nesta rodada. |
| E43 | Path filters nos workflows de PR | ⚠️ | Não verificado nesta rodada. |
| E44 | Definir required checks mínimos | ⚠️ | Não verificado nesta rodada. |
| E45 | Reduzir os 241 scripts npm | ❌ | `package.json` ainda declara **241** scripts, inalterado. |
| E46 | Quebrar arquivos gigantes (`QuoteBuilderSummaryColumn.tsx` etc.) | ⚠️ | Não verificado nesta rodada. |
| E47 | Resolver `INEFFECTIVE_DYNAMIC_IMPORT` | ⚠️ | Não verificado nesta rodada. |
| E48 | Orçamento de bundle por rota | ⚠️ | Não verificado nesta rodada. |
| E49 | Zerar baselines de acessibilidade (`clickable`, `outline-none`) | 🟡 | Reduzidas de 18/20 para **3/3** — progresso real, mas meta é 0. |
| E50 | Fortalecer/documentar guarda do SSOT | 🟡 | Guarda em si segue íntegra (verificado via `validate-supabase-config.mjs` em vários commits desta sessão) — não confirmei se o teste específico anti-remoção e a documentação unificada das 4 camadas foram criados. |

**Resumo [13]:** 11 ✅ · 8 🟡 · 8 ❌ · 23 ⚠️ não verificado.

---

## Plano [15] — Reconciliação Local × GitHub × Supabase (2026-09-15)

> Este plano já recebeu uma atualização de evidência em 2026-09-16 (§1.1 do próprio documento).
> Aqui só consolido o que essa atualização já cobriu + o que o trabalho do plano [16] resolveu depois.

| # | Título | Estado | Evidência / referência cruzada |
|---|---|---|---|
| E01 | Congelar linha de base da reconciliação | ✅ | Feito nesta sessão (múltiplas fotografias datadas, plano [16] §1). |
| E02 | Inventário de refs locais/remotas | 🟡 | Feito parcialmente durante a auditoria bidirecional (branches, ahead/behind) — não como artefato formal separado. |
| E03 | Preservar commits/objetos inalcançáveis | 🟡 | 59 commits dangling catalogados por data/branch (todos `WIP on...`, autostash) — não comparados individualmente contra o merge final (checklist da própria etapa pede isso). |
| E04 | Auditar stashes/checkpoints | ✅ | `git stash list` vazio; sem checkpoints Cline/Codex encontrados fora do reflog já mapeado em E03. |
| E05 | Ledger de decisões multiagente | ❌ | Não criado como artefato formal. Esta matriz cumpre parte do papel para as etapas cruzadas entre planos, mas não para decisões arquivo-a-arquivo dentro de PRs. |
| E06 | Atualizar refs remotas (`fetch`) | ✅ | `git fetch` rodado repetidamente ao longo desta sessão. |
| E07 | Publicar/descartar commit `7fbbcabe5` | 🟡 | Commit rebaseado (agora `aa47800ba` na branch) e **publicado** (`git push -u origin claude/audit-gaps-20260915`). PR ainda **não aberta**. |
| E08 | Sincronizar branch local `main` | ✅ | `main` local == `origin/main` (fast-forward feito nesta sessão, plano [16] E01). |
| E09 | Encerrar corretamente a PR #1863 | ✅ | Já marcado no próprio documento — PR mergeada com diff real. |
| E10 | Reconciliar branches locais sem remoto | ⚠️ | Não verificado nesta rodada. |
| E11 | Reconciliar branches remotas sem local | ⚠️ | Não verificado nesta rodada. |
| E12 | Revisar `rescue/local-main-20260909-1145` | ⚠️ | Não verificado nesta rodada. |
| E13 | Revisar branches históricas de estabilização | ⚠️ | Não verificado nesta rodada. |
| E14 | Revisar `codex/magazine-dbdeploy-20260909` | ⚠️ | Não verificado nesta rodada. |
| E15 | Validar higiene/integridade do repositório | ✅ | `git fsck --full` limpo (rodado no início da auditoria bidirecional). |
| E16 | Inventário canônico das migrations | 🟡 | 🔁 Sobreposto por plano [16] E06/E07 (manifesto ledger↔arquivo) — mesma necessidade, ação mais específica lá. |
| E17 | Validar ordenação/unicidade de versões | ❌ | 31 prefixos de versão duplicados confirmados (plano [16] §1.1) — ainda aberto. |
| E18 | Corrigir gate de referências de migrations | ✅ | Já marcado no próprio documento — resolvido por #1864. |
| E19 | Validar snapshot consolidado | ✅ | `SCHEMA_LIVE.sql`/`ALL_IN_ONE.sql`/`SNAPSHOT_META.json` gerados de verdade em 2026-09-16 (plano [16] E14). |
| E20 | Classificar os 10 drafts ativos | ⚠️ | Não verificado nesta rodada. 🔁 Sobreposto por plano [16] E13. |
| E21 | Validar os 4 drafts arquivados | ⚠️ | Não verificado nesta rodada (plano [16] §1.1 mediu 5 arquivados, não 4 — divergência a esclarecer). |
| E22 | Atualizar contrato do `MIGRATIONS_SYNC_LOG` | ⚠️ | Não verificado nesta rodada. 🔁 Sobreposto por plano [16] E48. |
| E23 | Fortalecer manifesto de reconciliação | ⚠️ | Não verificado nesta rodada. |
| E24 | Verificar migrations Kit Maker/Magazine | ⚠️ | Não verificado nesta rodada. |
| E25 | Dry-run estrutural das migrations | 🟡 | Feito de fato, mas por necessidade (5 rodadas de `db diff` em CI, plano [16] E02) em vez de como linter dedicado. |
| E26 | Restaurar autenticação local da CLI | ✅ | 🔁 **= plano [16] E02.** CLI local autenticado, `linked: true`, sem 401. |
| E27 | Restaurar credencial DB no GitHub Actions | ✅ | 🔁 **= plano [16] E02.** `SUPABASE_DB_PASSWORD` cadastrado pelo PO em 2026-09-16. |
| E28 | Eliminar falso verde do drift check | ✅ | Já marcado no próprio documento — resolvido por #1864, e hoje **fail-closed de verdade** (roda live, ver plano [16] E02). |
| E29 | Fixar/validar alvo canônico em todos os caminhos | ✅ | `doufsxqlfjyuvxuezpln` confirmado em `client.ts`, `config.toml`, e verificado em toda esta sessão via guarda do CI Guard (Gate 0) em cada commit. |
| E30 | Ler ledger remoto sem aplicar | ✅ | `supabase migration list --linked` (plano [16] E02) e `supabase_migrations.schema_migrations` consultada extensivamente. |
| E31 | Calcular `remoto − local` | ✅ | 5 versões (depois reduzidas a 0 reais após investigação — 4 são exceções conhecidas, 1 já resolvida por #1863). Plano [16] §1.1. |
| E32 | Calcular `local − remoto` | 🟡 | 484→544 migrations sem ledger medidas (plano [16] §1.1/E02); amostra de 5 confirmou 5/5 aplicadas ao vivo. Classificação individual das ~544 **não concluída** — é o E07 do plano [16], ainda aberto. |
| E33 | Comparar statements das versões compartilhadas | ❌ | 483 de 2.413 linhas do ledger **sem `statements`** — não comparável por hash (plano [16] §1.1). |
| E34 | Classificar os 3 IDs históricos inválidos | 🟡 | Achei **4**, não 3 (plano [16] §1.1) — divergência do número original a esclarecer. 1 já resolvido (#1863); 3 restantes com causa identificada (renome pós-aplicação) mas sem decisão formal de reparo. |
| E35 | Matriz de decisão por migration | ❌ | Não produzida — é essencialmente o que o plano [16] E06/E07 propõe fazer. |
| E36–E40 | Auditoria completa pg_catalog (schemas, constraints, RLS, funções, enums/cron) | 🟡 | Feita parcial e incidentalmente ao longo desta sessão (RLS, policies, grants, SECDEF, cron — tudo em `docs/SCHEMA_REFERENCE.md` regenerado) mas não como os 5 relatórios dedicados que estas etapas pedem. |
| E41 | Comparar Edge Functions locais/implantadas | ✅ | 108 remoto × 109 local, paridade total confirmada (plano [16] §1.5). |
| E42 | Validar Auth, redirects, providers | ⚠️ | Não verificado nesta rodada. |
| E43 | Validar Storage, buckets, policies | ⚠️ | Não verificado nesta rodada. |
| E44 | Testes transacionais com rollback | ⚠️ | Não verificado nesta rodada. |
| E45 | Regenerar/comparar tipos Supabase | ✅ | Paridade `types.ts` × schema vivo confirmada 100% (0 tabelas ausentes) — plano [16] §1.5. |
| E46 | Corrigir gates com falso verde | ✅ | Resolvido por #1864 (drift-check) — mesmo achado de plano [16] E02. |
| E47 | Preparar correções de código em PRs pequenas | 🟡 | Seguido nesta sessão (commits atômicos, um por achado) mas não como processo formal para todo o backlog. |
| E48 | Preparar migrations forward-only por objeto | 🟡 | 🔁 Sobreposto por plano [16] E15 (workflow de aplicação controlada) — ainda não construído. |
| E49 | Aplicar/validar mudanças autorizadas | ⚠️ | Não verificado nesta rodada — nenhuma mudança de schema foi aplicada ao vivo até agora (por desenho: tudo ficou em pacote de revisão). |
| E50 | Certificação final | ❌ | Não emitida — cedo demais, dado o volume de ⚠️/❌ acima. |

**Resumo [15]:** 15 ✅ · 11 🟡 · 6 ❌ · 18 ⚠️ não verificado.

---

## Plano [16] — DBA: Correções e Melhorias (2026-09-16, este)

Estado mantido no próprio documento (é o mais recente e o que está sendo executado ativamente).
Resumo nesta data:

| # | Título | Estado |
|---|---|---|
| E01 | Sincronizar branch de trabalho / congelar linha de base | ✅ |
| E02 | Restaurar verificação live (secrets e CLI) | ✅ |
| E03 | Backup/PITR + snapshot lógico | 🟡 (passos 3–4 feitos; passos 1–2 dependem do PO/CLI) |
| E04 | Regenerar `SCHEMA_REFERENCE.md` | ✅ |
| E05 | Esta matriz | ✅ (você está lendo) |
| E06–E50 | Ver documento próprio | ⚠️ não iniciadas / em andamento — status linha a linha em `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` |

---

## Achados da própria consolidação (coisas que só apareceram ao cruzar os 3 planos)

1. **E26/E27 do plano [15] e E02 do plano [16] são a mesma etapa**, descrita duas vezes em dois
   planos por agentes diferentes que não se viam. Concluída uma vez, vale para os dois.
2. **E31 do plano [13] e E10 do plano [16] são a mesma etapa** (67 nomes fora do contrato) — mesmo
   número exato medido em datas diferentes (09-13 e 09-16), confirmando que nada mudou nesse
   período. Ação recomendada: usar o texto do plano [16] E10 como canônico (é mais recente e já
   inclui o achado dos 31 prefixos duplicados).
3. **Divergência de contagem não resolvida:** plano [15] fala em "3 IDs históricos inválidos";
   medição de hoje (plano [16]) encontrou **4**. Não investiguei se o plano [15] errou a contagem
   original ou se um 4º apareceu depois — fica como pendência.
4. **Divergência de contagem não resolvida:** plano [15] fala em "4 drafts arquivados"; medição de
   hoje encontrou **5**. Mesma situação do item 3.
5. **`docs/SCHEMA_REFERENCE.md` regenerado (plano [16] E04) já cobre boa parte do que plano [15]
   E36–E40 pedia** (RLS, policies, grants, SECDEF, funções, enums) — não precisa ser refeito do
   zero, só teria que ser formatado nos 5 relatórios separados se alguém realmente precisar deles
   nesse formato específico.
6. **Nenhuma das 3 fases `[REQUER-PO]` de nenhum plano foi executada** — é intencional (REGRA #8) e
   consistente entre os três documentos.

## Como manter esta matriz viva

Ela **não é atualizada automaticamente**. Regenerar quando: (a) uma etapa `⚠️` for verificada de
verdade, (b) uma etapa `❌`/`🟡` avançar, (c) surgir uma 4ª rodada de plano. Não editar linha por
linha sem rodar a checagem de novo — o valor desta matriz é que cada estado tem uma evidência
datada, não uma opinião.
