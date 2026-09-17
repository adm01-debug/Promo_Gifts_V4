# PLANO DE ENGENHARIA — 50 ETAPAS (2026-09-17)

> **Autor:** sessão Claude, atuando como dev sênior, a pedido do PO.
> **Escopo:** não repete o `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` — este plano
> **fecha o que ficou pendente dele** (backlog `[REQUER-PO]` e um gap de sincronismo doc↔commit que encontrei
> hoje) e **abre uma frente nova**: git/GitHub, segurança fora do escopo DB, qualidade de código/CI e
> processo — tudo com base em evidência coletada nesta sessão (auditoria tripla local↔GitHub↔banco de
> 2026-09-17) e nas issues reais já abertas no repositório.
> **Método:** mesma disciplina do plano DBA — "Problema (medido)" quando verifiquei ao vivo nesta sessão;
> "Problema (relatado)" quando a fonte é uma issue/doc anterior que **não** revalidei linha a linha aqui —
> nesses casos a própria etapa começa por medir antes de agir. Nenhuma DDL, nenhum push destrutivo, nenhuma
> rotação de segredo foi executada ao escrever este documento — é plano, não execução.
> **Pré-requisito de leitura:** este plano assume o estado documentado em
> `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (43/50 preparadas ou concluídas,
> 22 aguardando decisão do PO) e na auditoria tripla desta mesma conversa (git local vs GitHub vs
> `pg_catalog` ao vivo, 2026-09-17).

---

## 1. Achados que fundamentam este plano (resumo, evidência completa na conversa)

1. **29 commits locais nunca chegaram ao GitHub** nesta branch, incluindo os dois workflows de governança
   mais importantes do plano DBA — `db-apply-migration.yml` (E15) e `ddl-out-of-band-detector.yml` (E12).
   Enquanto não forem enviados, essas proteções **não existem** do ponto de vista de quem revisa no GitHub.
2. **6 migrations preparadas nesta sessão** (E18/E35/E37/E38/E45/E47 do plano DBA) somam-se às já
   preparadas (E08, E09, E17, E19, E21, E23, E25–E29, E30, E32, E33, E40) — **22 decisões `[REQUER-PO]`**
   acumuladas sem uma rodada de aprovação desde o Pacote de Aprovação #1 (2026-09-16, 3 ações).
3. **Gap de sincronismo plano↔commit**: encontrei e corrigi um caso (E45 — migration e achados existiam,
   mas o arquivo do plano nunca ganhou a nota "Preparado" nem a migration existia de fato). Não confirmei se
   E17/E19/E23/E25 (migrations já commitadas por sessões anteriores) têm a mesma lacuna — ação explícita
   abaixo (E3).
4. **4 issues abertas no GitHub descrevem problemas já resolvidos**, confirmado nesta sessão: #1000
   (`personalization_techniques` ausente de `types.ts` — presente agora), #1809 (Gate 1 TS quebrado no
   `main` — verde desde 12/09), #784 (edge functions `asia-ingestion`/`check-login` ausentes do repo —
   presentes desde o commit `00f39d1e2`), #563 (notificação antiga de drift-check com 0 divergências).
5. **1 issue P0 de segurança segue aberta há 18 dias** (#1807 — credencial hardcoded, pede rotação do
   `service_role`/DB canônico) sem confirmação de que a rotação ocorreu.
6. **5 branches locais têm commits que não existem em nenhuma ref do GitHub** (`claude/quality-gates-
   hardening-20260913`, `claude/zapp-catalog-stats-governance-20260915`, `codex/kit-maker-completion-
   20260912`, `codex/reconciliation-integrity-20260915`, `rescue/local-main-20260909-1145`) — risco de
   perda silenciosa se a máquina local for descartada.
7. **Issues reais de qualidade/segurança abertas e não ligadas ao plano DBA**: #1811 (6 testes de
   `tests/hooks/**` falhando + diretório fora do CI), #1831 (CSP `unsafe-inline` bloqueado por 3 injetores
   de estilo em runtime), #691 (tsconfig raiz não inclui `src/` no `tsc`, ~26 erros de tipo invisíveis ao
   build), #537 (bug de semântica array-vazio na escrita, adiado de propósito), #1341 (gitleaks, achados de
   3 meses atrás sem triagem registrada).

---

## FASE 0 — Fechar o ciclo desta sessão antes de abrir qualquer frente nova (E1–E8)
> Nada do resto deste plano tem efeito real em produção enquanto esta fase não fechar — é ela que faz o
> trabalho já feito existir fora do disco local.

### E1 · Push da branch e abertura do PR `[GIT]`
**Problema (medido):** `claude/audit-gaps-20260915` está 29 commits à frente do seu remoto; nenhum PR aberto.
**Ação:** `git push origin claude/audit-gaps-20260915`; `gh pr create` com corpo listando as 3 frentes
fechadas nesta sessão (E18/E35/E37/E38/E45/E47 preparadas, auditoria tripla, este plano).
**Checklist de conclusão:**
- [ ] `origin/claude/audit-gaps-20260915` = `HEAD` local
- [ ] PR aberto, linkando `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` e este arquivo
**Esforço:** P · **Dep.:** —

### E2 · CI verde no PR `[GIT]`
**Problema:** desconhecido até o PR existir — 40+ workflows, alguns com histórico de falha em PRs de migration draft (`db-schema-drift-check` vermelho no `main` desde 15/09 por causa já documentada no E02 do plano DBA).
**Ação:** abrir o PR (E1), observar os checks obrigatórios, corrigir o que quebrar por causa real (não silenciar). Se `db-schema-drift-check` falhar pela mesma causa raiz do `main`, documentar no PR que é conhecida (não é regressão desta branch) em vez de tentar mascarar.
**Checklist de conclusão:**
- [ ] Todos os checks obrigatórios do ruleset verdes, ou vermelho justificado por link para causa raiz conhecida
**Esforço:** M · **Dep.:** E1

### E3 · Auditar sincronismo plano↔commit para todas as etapas "concluídas"/"preparadas" `[GIT]`
**Problema (medido):** encontrei nesta sessão 1 caso confirmado (E45 do plano DBA — a nota "Preparado" e o arquivo de migration não existiam apesar do doc de achados já estar escrito) e não posso descartar recorrência: E17/E19/E23/E25 têm migration commitada por sessão anterior a esta, mas não confirmei se cada nota do plano bate exatamente com o commit real (SHA, data, arquivo).
**Ação:** para cada etapa marcada `✅` ou "Preparado" em `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`, confirmar 1:1: (a) o arquivo de migration/script citado existe no commit citado (`git log --diff-filter=A -- <arquivo>`); (b) o resultado numérico citado na nota bate com o que o arquivo realmente faz. Registrar divergências em tabela.
**Checklist de conclusão:**
- [ ] 50/50 etapas do plano DBA auditadas nota↔commit
- [ ] 0 divergências abertas, ou cada uma corrigida (como fiz para E45) no mesmo padrão
**Esforço:** M · **Dep.:** E1

### E4 · Merge do PR após revisão humana `[GIT]`
**Ação:** aguardar aprovação humana explícita (não é etapa que um agente decide sozinho — é mudança visível a outros). Squash ou merge conforme convenção do repo (conferir PRs recentes).
**Checklist de conclusão:**
- [ ] PR mergeado em `main`, ou decisão registrada de manter como branch de trabalho por mais tempo
**Esforço:** P · **Dep.:** E2

### E5 · Consolidar Pacote de Aprovação #2 `[REQUER-PO]`
**Problema:** as 6 migrations preparadas nesta sessão (E18×2, E35, E37, E38, E45, E47 do plano DBA) não têm ainda um pacote único e revisável pelo PO, no formato já validado do `docs/PACOTE_APROVACAO_1_2026-09-16.md`.
**Ação:** criar `docs/PACOTE_APROVACAO_2_2026-09-17.md` seguindo exatamente o formato do #1 (ação, tipo, origem, SQL exato, efeito esperado, teste de reversão) para cada uma das 6 migrations + a migration de comentário do E45.
**Checklist de conclusão:**
- [ ] 1 doc com 7 ações independentes, cada uma aprovável isoladamente
**Esforço:** P · **Dep.:** —

### E6 · PO decide Pacote #1 + Pacote #2 `[REQUER-PO]`
**Ação:** apresentar os 2 pacotes (3 + 7 ações = 10 decisões) ao PO numa única rodada. Reunir aprovação por escrito, por item (não "aprovado tudo" genérico — REGRA #3 do CLAUDE.md exige razão por resolução, mesmo espírito aqui).
**Checklist de conclusão:**
- [ ] 10/10 ações com decisão registrada (aprovado/rejeitado/adiado) e nome de quem decidiu
**Esforço:** P · **Dep.:** E5

### E7 · Aplicar os itens aprovados via E15 `[REQUER-PO]` (execução gateada por aprovação)
**Ação:** para cada ação aprovada em E6, disparar `.github/workflows/db-apply-migration.yml` (`workflow_dispatch(version)`) — nunca `supabase db push`, nunca MCP `apply_migration` direto (REGRA #8). Um de cada vez, com post-check entre aplicações.
**Checklist de conclusão:**
- [ ] N/N ações aprovadas aplicadas; 0 aplicadas sem aprovação
- [ ] Preflight (`scripts/preflight-migration-apply.mjs`) passou em todas
**Esforço:** M · **Dep.:** E6

### E8 · Registrar recibo em `MIGRATIONS_SYNC_LOG.md` para cada aplicação `[GIT]`
**Ação:** seguir o contrato do E48 do plano DBA — uma linha por aplicação, hash do arquivo, executor, método, data UTC, pós-check. `check:migrations-sync-log-gate` deve passar depois.
**Checklist de conclusão:**
- [ ] `npm run check:migrations-sync-log-gate` verde para as versões aplicadas em E7
**Esforço:** P · **Dep.:** E7

---

## FASE 1 — Higiene do GitHub: issues e branches (E9–E16)

### E9 · Fechar issue #1000 (`personalization_techniques` ausente de `types.ts`) `[GIT]`
**Problema (medido nesta sessão):** a coluna/tabela está presente em `types.ts` e ao vivo — confirmado por diff nome-a-nome (397/397 tabelas batendo). Issue aberta desde 2026-06-20, obsoleta.
**Ação:** comentar no #1000 com a evidência (diff table-by-table de 2026-09-17) e fechar como `not planned`/`resolved`.
**Checklist de conclusão:**
- [ ] #1000 fechada com comentário de evidência
**Esforço:** P · **Dep.:** —

### E10 · Fechar issue #1809 (Gate 1 TS regressão) `[GIT]`
**Problema (medido nesta sessão):** `quality-gate.yml` está verde no `main` desde 2026-09-12 (5 execuções consecutivas de sucesso). Issue aberta 2026-08-31, obsoleta.
**Ação:** comentar com o link das execuções verdes e fechar.
**Checklist de conclusão:**
- [ ] #1809 fechada com comentário de evidência
**Esforço:** P · **Dep.:** —

### E11 · Fechar issue #784 (edge functions órfãs) `[GIT]`
**Problema (medido nesta sessão):** `asia-ingestion` e `check-login` existem em `supabase/functions/` desde o commit `00f39d1e2` (anterior a esta sessão) e batem com o que está deployado (`ezbr_sha256` presente na Management API). Issue aberta 2026-06-16, obsoleta.
**Ação:** comentar com o SHA do commit que resolveu e fechar.
**Checklist de conclusão:**
- [ ] #784 fechada com comentário de evidência
**Esforço:** P · **Dep.:** —

### E12 · Triar issue #563 (drift-check antigo) `[GIT]`
**Problema (relatado):** notificação automática de 2026-06-01, "0 function(s) divergentes" — parece notificação informativa que nunca foi fechada, não um achado ativo.
**Ação:** confirmar que é auto-gerada por workflow (não ação humana pendente) e fechar, ou ajustar o workflow para não deixar issue aberta quando o resultado é "0 divergências".
**Checklist de conclusão:**
- [ ] #563 fechada ou workflow de origem corrigido para não reabrir o padrão
**Esforço:** P · **Dep.:** —

### E13 · Revalidar issue #1832 (deploy failure 2026-09-05) `[GIT]`
**Problema (relatado):** falha de deploy Preview específica de um SHA de 12 dias atrás — não revalidei se é sintoma recorrente ou incidente isolado já superado por deploys seguintes bem-sucedidos.
**Ação:** checar `gh run list` de Preview deployments desde então; se não houver recorrência do mesmo erro, fechar com nota; se houver, promover a issue ativa com investigação.
**Checklist de conclusão:**
- [ ] Decisão registrada (fechada como isolada, ou promovida com plano de correção)
**Esforço:** P · **Dep.:** —

### E14 · Triagem completa de #1341 (gitleaks, 3 meses em aberto) `[SEGURANÇA]`
**Problema (relatado):** achados de gitleaks de 2026-06-23 nunca categorizados publicamente (false positive / já rotacionado / rotacionar agora), segundo o corpo da própria issue.
**Ação:** baixar o artifact do run linkado (se ainda existir — 3 meses pode ter expirado no retention do Actions; se expirado, rodar gitleaks localmente contra o histórico de novo), categorizar cada finding, atualizar `.gitleaks.toml` allowlist para false positives, abrir sub-tarefas de rotação para o resto.
**Checklist de conclusão:**
- [ ] 100% dos findings categorizados (a/b/c do próprio template da issue)
- [ ] Segredos reais pendentes de rotação viram itens de E17 (abaixo)
**Esforço:** M · **Dep.:** —

### E15 · Decidir as 5 branches locais órfãs `[GIT]`
**Problema (medido nesta sessão):** `claude/quality-gates-hardening-20260913`, `claude/zapp-catalog-stats-governance-20260915`, `codex/kit-maker-completion-20260912`, `codex/reconciliation-integrity-20260915`, `rescue/local-main-20260909-1145` têm commits que não existem em nenhuma ref do GitHub nem são ancestrais do `main`.
**Ação:** para cada uma, `git diff main..<branch> --stat` já rodado (não-vazio nas 5); revisar se o conteúdo foi superado por trabalho equivalente já em `main` (plausível para as de `zapp-catalog`/`kit-maker`, dado que E18 desta sessão já cobriu achados de `zapp_catalog_stats`) ou se há trabalho único perdido. Preservar (`git push origin <branch>` antes de qualquer descarte) ou documentar decisão de abandono com prova de que o conteúdo é redundante.
**Checklist de conclusão:**
- [ ] 5/5 branches com decisão registrada e, se preservadas, enviadas ao GitHub
**Esforço:** M · **Dep.:** —

### E16 · Retomar E49 do plano DBA (higiene de repositório) `[GIT]` — **prazo: pptxgenjs antes de 2026-10-09**
**Ação:** exatamente o que o E49 original já descreve e nunca foi executado: classificar os 59 commits dangling, `git worktree prune`, `git branch -d` (nunca `-D`) nas `[gone]` já confirmadas redundantes, `graphify update . --force`, decidir renovação/remoção da allowlist `pptxgenjs`.
**Checklist de conclusão:** (herdado do E49 original)
- [ ] 59/59 dangling classificados; 0 com diff relevante não preservado
- [ ] `git worktree list` sem `prunable`; `git branch -vv | grep gone` vazio
- [ ] `GRAPH_REPORT.md` = `HEAD`
- [ ] Decisão `pptxgenjs` registrada antes de 2026-10-09
**Esforço:** P · **Dep.:** E15

---

## FASE 2 — Segurança fora do escopo DB (E17–E22)

### E17 · Confirmar e, se necessário, executar a rotação pedida em #1807 `[SEGURANÇA]` `[REQUER-PO]` — **P0**
**Problema (relatado, não revalidado nesta sessão):** issue P0 desde 2026-08-30 pede rotação de `ACCESS_KEY`/`service_role` do projeto canônico por vazamento no histórico público do `migrate-helper`.
**Ação:** confirmar com o PO se a rotação já ocorreu fora deste fluxo (muitas vezes esse tipo de ação é feita direto no painel Supabase, sem deixar rastro em commit). Se não: rotacionar `service_role` key no painel, atualizar **todos** os consumidores (Edge Functions com a env var, CI secrets do GitHub Actions, os ~80 conectores MCP desta própria sessão que usam a mesma credencial — ver E21), confirmar que o app continua funcional pós-rotação antes de revogar a chave antiga.
**Checklist de conclusão:**
- [ ] Rotação confirmada ou executada, com data
- [ ] Todos os consumidores atualizados e validados
- [ ] #1807 fechada com evidência
**Esforço:** G · **Dep.:** E14 (achados de gitleaks podem apontar outros segredos no mesmo lote)

### E18 · Remediar os achados reais de #1341 `[SEGURANÇA]` `[REQUER-PO]`
**Ação:** para cada finding de E14 categorizado como "chave real, precisa rotacionar": rotacionar e documentar, seguindo o mesmo rigor de E17.
**Checklist de conclusão:**
- [ ] 0 segredos reais pendentes de rotação
**Esforço:** M · **Dep.:** E14

### E19 · CSP: remover `unsafe-inline` de `style-src` (#1831) `[SEGURANÇA]`
**Problema (relatado):** 3 injetores de `<style>` em runtime impedem remover `unsafe-inline` sem quebrar produção (medido na auditoria r2 referenciada pela issue): `src/utils/proposalPdfReactGenerator.ts` é um deles.
**Ação:** migrar os 3 injetores para nonce (gerado por request, propagado via header) ou CSSOM (`CSSStyleSheet.insertRule`, sem `<style>` textual). Testar cada um isoladamente antes de tocar no `vercel.json`.
**Checklist de conclusão:**
- [ ] 3/3 injetores migrados e testados
- [ ] `style-src` sem `unsafe-inline` em produção, sem regressão visual
**Esforço:** M · **Dep.:** —

### E20 · Auditoria de Edge Functions com `verify_jwt=false` `[SEGURANÇA]` `[DB-RO]`
**Problema:** a listagem ao vivo desta sessão mostra dezenas de functions com `verify_jwt: false` (ex.: `ai-recommendations`, `cleanup-novelties`, `webhook-dispatcher`, `send-notification`, entre outras) — legítimo para webhooks/cron server-to-server, mas nunca inventariado com justificativa por função (complementa o E42 do plano DBA, que verifica hash do bundle, não a exposição).
**Ação:** listar todas as functions `verify_jwt=false`, classificar cada uma (webhook assinado / cron interno / público por design) com evidência de por que dispensar JWT é seguro (ex.: HMAC próprio, IP allowlist, rate limit).
**Checklist de conclusão:**
- [ ] N/N functions com `verify_jwt=false` documentadas com razão
**Esforço:** M · **Dep.:** —

### E21 · Mapear blast radius dos conectores MCP `[SEGURANÇA]`
**Problema (medido nesta sessão):** esta sessão listou ~80 servidores MCP conectados (`claude.ai SUPABASE - *`, `LOVABLE - *`), muitos com acesso de escrita total (`db_query`, `db_apply_migration`, `storage_*`) a múltiplos projetos Supabase distintos do canônico.
**Ação:** inventariar quais desses conectores têm credencial compartilhada com o projeto canônico `doufsxqlfjyuvxuezpln` (relevante para E17 — se a chave rotacionar, todos esses precisam ser atualizados); avaliar se algum conector deveria ter escopo reduzido (ex.: só leitura) dado REGRA #8 (Lovable/bots não são o PO).
**Checklist de conclusão:**
- [ ] Inventário publicado (conector → projeto → nível de acesso)
- [ ] Conectores com acesso de escrita desnecessário ao canônico reduzidos ou justificados
**Esforço:** M · **Dep.:** —

### E22 · Auditar SECURITY DEFINER dos 138 cron jobs `[DB-RO]`
**Problema:** o plano DBA (E17/E18) auditou SECDEF executável por `anon`/`authenticated`, mas não especificamente os cron jobs — muitos rodam como `postgres` (bypassrls) por design; vale confirmar que nenhum foi alterado para rodar com privilégio maior do que precisa.
**Ação:** `SELECT jobname, command FROM cron.job` cruzado com o owner de cada função chamada; sinalizar qualquer job que rode função não-SECDEF onde deveria (ou vice-versa).
**Checklist de conclusão:**
- [ ] 138/138 jobs com owner de função conferido
**Esforço:** M · **Dep.:** —

---

## FASE 3 — Qualidade de código e CI (E23–E30)

### E23 · Expor `src/` ao `tsc` no build (#691) `[CI]`
**Problema (relatado pela issue #691, não revalidado nesta sessão):** `tsconfig.json` raiz só inclui `vite.config.ts` — erros de tipo em `src/` nunca bloqueiam `vite build`; ~26 erros conhecidos e invisíveis desde a descoberta do PR #690/#689.
**Ação:** ajustar `tsconfig.app.json`/pipeline de CI para rodar `tsc --noEmit -p tsconfig.app.json` como gate obrigatório (não só localmente); medir quantos erros existem **hoje** (podem ter mudado desde #691).
**Checklist de conclusão:**
- [ ] `tsc --noEmit` roda em CI como gate obrigatório
- [ ] Contagem de erros atual registrada (baseline para E24)
**Esforço:** P · **Dep.:** —

### E24 · Corrigir os erros de tipo expostos por E23 `[CI]`
**Ação:** corrigir um a um, começando pelo caso já diagnosticado em #691 (`ProductQuickView` declara `PromobrindProduct` mas recebe `Product` do mapper). Não usar `as any` como atalho (REGRA do repo já proíbe isso em outros pontos — E42/allowlist).
**Checklist de conclusão:**
- [ ] 0 erros de `tsc --noEmit -p tsconfig.app.json`
**Esforço:** G · **Dep.:** E23

### E25 · Corrigir os 6 testes de `tests/hooks/**` e plugar no CI (#1811) `[CI]`
**Problema (relatado pela issue, não revalidado):** 6 testes de auditoria de bugfix falham localmente (fetch de source recebe `index.html` em vez do código-fonte esperado) e o diretório inteiro está fora do pipeline de CI — falso-verde possível em qualquer regressão coberta só por esses testes.
**Ação:** investigar por que o fetch recebe `index.html` (provável problema de base URL/mock no ambiente de teste), corrigir os 6, adicionar `tests/hooks/**` ao comando de CI.
**Checklist de conclusão:**
- [ ] 6/6 testes passando
- [ ] `tests/hooks/**` executado pelo CI (confirmar no log de um run real)
**Esforço:** M · **Dep.:** —

### E26 · Decidir a semântica de array-vazio na escrita (#537) `[CÓDIGO]`
**Problema (relatado, deixado de propósito pendente no PR #535):** `applyFilters` em `src/lib/external-db/rest-native.ts` usa um sentinel `__no_match__` para array vazio; caminho de leitura já resolvido, caminho de escrita (update/delete) não — decisão consciente adiada.
**Ação:** decidir entre no-op silencioso vs erro explícito para update/delete com filtro de array vazio; implementar e testar os dois caminhos (update, delete) explicitamente.
**Checklist de conclusão:**
- [ ] Decisão documentada com razão
- [ ] Testado update E delete com array vazio
**Esforço:** P · **Dep.:** —

### E27 · Medir cobertura real de testes vs. threshold declarado `[CI]`
**Problema:** #1811 revela que um diretório inteiro de testes estava fora do CI sem ninguém notar — sinal de que a cobertura "declarada" pode não refletir o que o CI realmente executa.
**Ação:** rodar a suíte completa localmente (não só o que o CI roda), comparar contra o que os workflows de CI efetivamente disparam, listar qualquer outro diretório de teste órfão do pipeline.
**Checklist de conclusão:**
- [ ] Inventário: diretório de teste → workflow que o executa (ou "nenhum")
- [ ] 0 diretórios de teste órfãos, ou justificados (ex.: manual/local-only por design)
**Esforço:** M · **Dep.:** E25

### E28 · Inventariar workflows GitHub Actions ativos vs. órfãos `[CI]`
**Problema:** o repo tem 40+ workflows (CLAUDE.md); nesta sessão descobri que `db-apply-migration.yml`/`ddl-out-of-band-detector.yml` ainda não estão nem no `main`, e que nomes de workflow no `gh workflow list` (ex.: "Deploy Gates") não batem obviamente com nomes de arquivo citados em docs (`quality-gate.yml`) — sinal de que o inventário mental do time pode estar desalinhado do inventário real.
**Ação:** `gh workflow list --all` completo, cruzar cada um com: está em qual branch, dispara em quais eventos, última execução, se está numa branch protection rule.
**Checklist de conclusão:**
- [ ] Tabela publicada: workflow → arquivo → branches onde existe → obrigatório no ruleset (sim/não)
**Esforço:** M · **Dep.:** E4

### E29 · Priorizar a causa raiz do `db-schema-drift-check` vermelho `[DB-RO]`
**Problema (medido nesta sessão):** falhando no `main` desde 2026-09-15 (4 execuções seguidas), fail-closed por design (`db diff` travado em DDL out-of-band histórica, conforme E02/E46 do plano DBA) — mas "vermelho esperado" por 3+ dias corridos ainda é sinal ruim para quem olha o board de CI sem contexto.
**Ação:** priorizar o fechamento de E07/E08 do plano DBA (a dívida histórica que impede `db diff` de completar) especificamente para destravar este check, não só por completude do plano.
**Checklist de conclusão:**
- [ ] `db-schema-drift-check` verde no `main`, ou substituído formalmente pelo mecanismo do E46 (`SCHEMA_LIVE.sql` diff semanal) como o gate visível
**Esforço:** G · **Dep.:** E6, E7 (parte do backlog de ledger repair)

### E30 · Documentar o "quality-gate.yml" real para onboarding `[DOCS]`
**Ação:** escrever, num único doc, o que cada Gate (0–6+) do `quality-gate.yml` verifica, o threshold de cada um, e o que fazer quando um Gate específico falha — hoje esse conhecimento está implícito em múltiplos arquivos de workflow.
**Checklist de conclusão:**
- [ ] `docs/CI_GATES_REFERENCE.md` publicado, um dev novo consegue diagnosticar Gate vermelho sem grep no YAML
**Esforço:** P · **Dep.:** E28

---

## FASE 4 — Backlog DBA ainda não iniciado (E31–E38)
> Estas repetem o objetivo de etapas do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` que **nunca
> saíram do zero** (diferente de E18/E35/E37/E38/E45/E47, já preparadas nesta sessão). Numeração própria
> aqui para caber no formato deste documento; a referência de origem está em cada etapa.

### E31 · Restaurar verificação live de secrets/CLI (origem: E02 do plano DBA) `[REQUER-PO]`
**Ação:** exatamente o E02 original — sem isso, todo script `check:*-drift` deste plano e do plano DBA roda em `static-pass`, não prova nada ao vivo.
**Esforço:** M · **Dep.:** decisão do PO sobre onde os secrets ficam disponíveis para CI (GitHub Environment secrets vs. outro cofre)

### E32 · Reparar ledger para as `aplicada-sem-ledger` restantes (origem: E08) `[REQUER-PO]`
**Ação:** completar os lotes de `migration repair --status applied` além do Lote 2 já aprovado no Pacote #1.
**Esforço:** M · **Dep.:** E31

### E33 · Fechar o gap do E09 — criar o arquivo-espelho pendente `[REQUER-PO]`
**Problema (medido nesta sessão):** o próprio E09 (2026-09-16) já identificou que `20260623_fix_google_provider_secret_name` é uma entrada real do ledger sem arquivo local, e propôs criar `supabase/migrations/20260916181609_backfill_fix_google_provider_secret_name_20260623.sql` como espelho — esse arquivo **nunca foi criado** (confirmado na auditoria de hoje, e é uma das 8 referências quebradas que `check:migration-refs` já reporta).
**Ação:** criar o arquivo exatamente como o E09 especificou.
**Checklist de conclusão:**
- [ ] Arquivo criado, `check:migration-refs` sem essa referência quebrada
**Esforço:** P · **Dep.:** —

### E34 · Validar a constraint `NOT VALID` (origem: E21) `[REQUER-PO]`
**Esforço:** M · **Dep.:** E31

### E35 · Capacidade — retenção Bronze, `stock_snapshots`, `stock_daily_summary` (origem: E26–E28) `[REQUER-PO]`
**Esforço:** G · **Dep.:** E7 (E25/partições precisa estar aplicado primeiro, prazo 2026-12-15)

### E36 · Índices faltantes/sobrando (origem: E29) `[REQUER-PO]`
**Esforço:** M · **Dep.:** E7

### E37 · Autovacuum por tabela de alta rotatividade (origem: E32) `[REQUER-PO]`
**Esforço:** M · **Dep.:** E7

### E38 · Confirmar o E47 aplicado rodando 4x/dia sem falha silenciosa `[DB-RO]`
**Ação:** depois que o Pacote #2 (E7) aplicar a migration do E47 (savepoint isolado), observar `cron.job_run_details` por pelo menos 2 dias (8 execuções) confirmando que as 2 chamadas de `fn_cron_safe_run` aparecem separadas e que uma falha na 2ª não mais desfaz a 1ª.
**Esforço:** P · **Dep.:** E7

---

## FASE 5 — Observabilidade e prevenção de recorrência (E39–E45)

### E39 · Gate automático contra o gap de sincronismo plano↔commit `[CI]`
**Problema:** encontrei manualmente 1 caso confirmado (E45) nesta sessão; sem automação, vai se repetir.
**Ação:** script `check-plan-annotation-drift.mjs` — falha se um commit adiciona `supabase/migrations/*.sql` referenciando uma etapa `EXX` no comentário de cabeçalho, mas `docs/plans/PLANO_*` não tem uma nota "Preparado"/"Concluído" para `EXX` no mesmo PR.
**Checklist de conclusão:**
- [ ] Script criado, testado por mutação (mesmo padrão do E46: injeta o caso do E45, confirma que falha; reverte)
- [ ] Plugado em CI
**Esforço:** M · **Dep.:** E3

### E40 · Processo de triagem de issues obsoletas `[PROCESSO]`
**Problema (medido nesta sessão):** 4 das 13 issues abertas (31%) descreviam problemas já resolvidos, sem que ninguém tivesse notado.
**Ação:** rotina mensal (manual ou workflow agendado) que lista issues sem atividade há 30+ dias com claim técnico verificável, e pede revalidação antes de continuar aberta.
**Checklist de conclusão:**
- [ ] Processo documentado e primeira rodada executada
**Esforço:** P · **Dep.:** E9–E13

### E41 · Certificação final e runbook mensal de DBA (origem: E50 do plano DBA) `[GIT]`
**Ação:** exatamente o E50 original — capstone do plano DBA, ainda não executado.
**Esforço:** M · **Dep.:** todas as etapas de FASE 0 e FASE 4 deste plano

### E42 · Dashboard único de saúde: ledger, schema, issues, branches `[OBSERVABILIDADE]`
**Problema:** a auditoria tripla desta sessão (git↔GitHub↔banco) foi 100% manual, levou dezenas de queries ad-hoc. Não é repetível por outra pessoa sem reconstruir o método do zero.
**Ação:** consolidar os 4 tipos de checagem feitos hoje (ledger vs. arquivos, `types.ts` vs. `pg_catalog`, branches locais vs. GitHub, issues abertas vs. estado real) num único script/workflow que produz um relatório, reaproveitando os scripts `check:*` já existentes onde possível.
**Checklist de conclusão:**
- [ ] `npm run audit:tripla` (ou nome equivalente) produz o relatório completo em 1 comando
**Esforço:** G · **Dep.:** E31 (precisa de live checks funcionando, não só static-pass)

### E43 · Agendar a auditoria tripla como rotina, não sob demanda `[CI]`
**Ação:** workflow semanal (ou quinzenal) que roda E42 e abre issue/PR com o resultado — mesmo padrão do E46 do plano DBA para schema drift.
**Checklist de conclusão:**
- [ ] Workflow agendado, 1ª execução automática confirmada
**Esforço:** M · **Dep.:** E42

### E44 · Registrar em `CLAUDE.md` a regra "sessão de governança termina com `git push`" `[DOCS]`
**Problema (medido nesta sessão):** a causa raiz do achado #1 (workflows de segurança invisíveis no GitHub) foi processual — múltiplas sessões prepararam trabalho crítico e nunca enviaram. `CLAUDE.md` hoje não instrui isso.
**Ação:** adicionar regra explícita (nova REGRA #9, ou nota na REGRA #6) — sessão automática que cria commit relevante para segurança/governança deve `git push` ao final, não deixar só local, mesmo que não haja PR.
**Checklist de conclusão:**
- [ ] `CLAUDE.md` atualizado
**Esforço:** P · **Dep.:** —

### E45 · Pós-mortem do achado #1 `[PROCESSO]`
**Ação:** documento curto (`docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md`) — o quê aconteceu, por quanto tempo, por que não foi notado antes, o que muda (E44) para não repetir. Sem culpar sessão/pessoa específica — é gap de processo, registrado no CLAUDE.md como "REGRA #7/#8 sabem lidar com o Lovable empurrando; não havia regra simétrica para 'Claude não empurrou'".
**Esforço:** P · **Dep.:** E44

---

## FASE 6 — Fechamento e certificação (E46–E50)

### E46 · Consolidar rastreamento num único lugar `[GIT]`
**Ação:** ligar este plano, o plano DBA, e a issue de tracking já existente no GitHub (#264, "Auditoria Promo Gifts — Plano de Correções em 20 Etapas") — ou atualizar #264 para referenciar os dois planos atuais, ou abrir uma issue nova de tracking e fechar #264 com redirecionamento (ela é de 2026-05-24, pode já estar obsoleta como as outras 4 encontradas nesta sessão — checar antes).
**Esforço:** P · **Dep.:** E9-E13 (aplicar o mesmo crivo de "ainda válida?")

### E47 · Rodar os dois checklists finais 10/10 `[GIT]`
**Ação:** o checklist final do plano DBA (§5) + um equivalente deste plano (git limpo, 0 branch órfã sem decisão, 0 issue obsoleta aberta, CI 100% inventariado, `tsc` no gate, cobertura real conhecida).
**Esforço:** M · **Dep.:** praticamente tudo

### E48 · Publicar changelog do que foi corrigido `[DOCS]`
**Ação:** a tabela `system_changelog` já existe no schema (visível no inventário de tabelas) — usar para registrar, de forma pesquisável pelo time, o que os dois planos corrigiram, em vez de só docs Markdown dispersos.
**Esforço:** P · **Dep.:** E47

### E49 · Resumo executivo para o PO `[DOCS]`
**Ação:** 1 página: decidido / aguardando decisão (com prazo de cada `[REQUER-PO]`) / bloqueado e por quê. Não é o plano inteiro — é o que um PO ocupado precisa para desbloquear em 5 minutos de leitura.
**Esforço:** P · **Dep.:** E47

### E50 · Agendar data de revisão do plano (30 dias) `[PROCESSO]`
**Ação:** nenhum plano deste tamanho deve ficar "vivo" indefinidamente sem checkpoint — agendar (calendário ou issue com data) uma revisão em 30 dias: o que fechou, o que não, por quê, e se o plano precisa de uma "geração 3".
**Esforço:** P · **Dep.:** E49

---

## 2. Ordem de execução

| Onda | Etapas | Marco |
|---|---|---|
| 1 — Tornar visível | E1–E4 | Trabalho existe no GitHub, não só no disco local |
| 2 — Decidir | E5–E8 | 10 decisões `[REQUER-PO]` resolvidas e aplicadas |
| 3 — Limpar GitHub | E9–E16 | 0 issue obsoleta aberta; branches órfãs decididas |
| 4 — Segurança | E17–E22 | P0 fechado; CSP sem `unsafe-inline`; MCP mapeado |
| 5 — Qualidade/CI | E23–E30 | `tsc` no gate; testes reais no CI; causa raiz do drift-check vermelho endereçada |
| 6 — Backlog DBA | E31–E38 | Os `[REQUER-PO]` que nunca saíram do zero, saem |
| 7 — Prevenção | E39–E45 | Os 2 gaps de processo descobertos hoje viram gate/regra, não recorrência |
| 8 — Fechamento | E46–E50 | Certificação, changelog, resumo pro PO, data de revisão |

## 3. Gates de interrupção (herdados + novos)

- Todos os gates do plano DBA (`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` §4) continuam valendo.
- Nenhuma etapa `[REQUER-PO]` executa sem aprovação escrita por item (E6).
- Se E17 (rotação P0) não puder ser confirmada como já feita, ela vira a etapa de maior prioridade do plano inteiro — tudo mais pode esperar, segredo vazado não.
- Se E3 encontrar mais casos como o do E45 (nota de plano sem commit real, ou commit sem nota), parar e corrigir antes de seguir para qualquer aplicação em E7.

## 4. Checklist final 10/10

- [ ] 0 commits locais sem push (E1)
- [ ] Os dois workflows de governança (E12/E15 do plano DBA) visíveis e ativos no `main`
- [ ] 10/10 decisões dos Pacotes #1+#2 resolvidas
- [ ] 0 issues abertas descrevendo estado já corrigido
- [ ] 5/5 branches órfãs com decisão registrada
- [ ] #1807 (P0 segurança) fechada com confirmação de rotação
- [ ] `tsc --noEmit` bloqueando build em CI
- [ ] `tests/hooks/**` executando em CI
- [ ] Gate automático contra gap de sincronismo plano↔commit no CI (E39)
- [ ] Resumo executivo entregue ao PO com data de próxima revisão agendada
