# /merge-prs — Promo Gifts V4: analisar, corrigir e mergear todas as PRs abertas

Salvar no repo `adm01-debug/Promo_Gifts_V4` em `.claude/commands/merge-prs.md`. Idioma: PT-BR em tudo.

## 0. Parâmetros
| Chave | Valor |
|---|---|
| REPO | `adm01-debug/Promo_Gifts_V4` (público; `main`; `strict=true`; required = `Gate Final - Deploy Ready`; ~115 workflows; `delete_branch_on_merge`) |
| SUPABASE | produção `doufsxqlfjyuvxuezpln` — **somente leitura**, só para provar se PR já está implementada ou se migration/edge bate com o banco. Confirme o `project_ref` antes de qualquer SQL. SINGU, Gestão de Clientes, Gestão de Produtos, ZAPP: proibidos. |
| DEPLOY NO MERGE | `deploy-vercel.yml` (front, Vercel), `deploy-edge-functions.yml` (edges), `db-apply-migration.yml` (banco), `delete-orphan-edges.yml` (apaga edge em produção) — merge em `main` = produção |
| RETRATO 2026-11-11 | 61 PRs abertas (29 draft): 43 `claude/*`, 5 `codex/*`, 8 Dependabot, 1 release-please, 1 `github-actions[bot]`; 1 PR com base em `claude/chore-e2e-modules-matrix-261102-2115` (não em `main`). Reexecute no início. |
| ESCRITA GITHUB | conector `GITHUB - MCP - FOREVER` (o MCP padrão dá 403 em write) |
| PASTA | `analise-prs/` (reaproveitar `auditoria-supabase/` como fonte de regras do banco; `dossies/`, `prs.json`, `baseline/`, `regras-de-negocio.md` se já existirem) |
| LIMITE | 80 turnos por sessão; retomar pelo `progresso.json` |
| LEITURA OBRIGATÓRIA | `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.github/workflows/*` (só leitura), branch protection/rulesets de `main` |

## 1. Meta
Toda PR aberta termina em um destes estados, com evidência:
- **MERGEADA** — todos os checks verdes (required **e** não required), squash-merge, deploy confirmado quando houver.
- **CORRIGIDA E MERGEADA** — conflito/bug/check vermelho corrigido por você até ficar 100 % verde, depois mergeada.
- **AGUARDANDO HUMANO** — pronta e verde, mas toca item da regra 4 (não mergear).
- **JÁ IMPLEMENTADA / DUPLICADA / SUPERSEDIDA / DESCARTAR** — motivo + evidência; não fechar, só relatar.

"Verde" = `get_combined_status` + `list_check_runs` do **último SHA** da PR sem `failure`, `cancelled`, `timed_out`, `action_required` nem `pending`; `mergeable_state = clean`. Nada de "o check que falhou não é required".

## 2. Regras invioláveis
1. Nunca commit/push em `main`, nunca force-push em `main`, nunca apagar branch/tag alheia, nunca fechar/editar/comentar PR de outra sessão.
2. **Branch de outra sessão/agente é somente leitura.** Para corrigir PR alheia: branch nova `claude/fix-pr<n>-<slug>-<AAMMDD-HHMM>` **a partir da branch da PR**, rebase em `main`, correção, PR nova com `supersede #n` no corpo. Na sua própria branch: `--force-with-lease` só nela. Antes de cada push, confirme que o último commit da branch é seu.
3. **Proibido "verdejar" afrouxando o portão**: não pular/apagar/`skip`/`.only` teste, não baixar threshold de cobertura, não adicionar `eslint-disable`/`@ts-ignore`/`any` para calar erro, não ampliar `known-violations`/baselines/allowlists, não mexer em `.github/workflows`, não usar `--no-verify`, não marcar check como neutro. O código tem de passar no check como ele é.
4. **Não mergear (deixar verde e aberta, AGUARDANDO HUMANO)**: DDL/migration que roda em banco de produção; `.github/workflows`, segredos, Dockerfile, stack/Swarm, Traefik; deleção de dado; mudança de arquitetura ou custo; conflito de escopo entre PRs de agentes diferentes que exige escolha de negócio; edge function R2 (pedido, orçamento, pagamento, e-mail, integração CRM/catálogo externo) cujo merge faz deploy; qualquer PR que remova edge function (dispara `delete-orphan-edges.yml`) ou toque `supabase/migrations/` (dispara `db-apply-migration.yml`); PR do release-please (gera release/tag); Dependabot com bump **major**.
5. Segredo nunca em código, commit, PR ou chat. Repo público → gitleaks no diff antes de cada push.
6. Evidência em tudo (SHA, arquivo:linha, nome do check + linha do log). Sem evidência = NÃO VERIFICADO. Título/branch/comentário não provam nada — leia o diff.
7. Diff mínimo: corrija a causa do vermelho/conflito; não refatore nem "aproveite". Outro bug fora da PR → anote, não conserte.
8. Travou (403, MCP fora, check que depende de segredo ausente) → erro exato, marque a PR e siga para a próxima; não contorne.

### Específico do Promo Gifts V4
- **"Todos os checks"** = todo check-run e status do último SHA, não só o `Gate Final - Deploy Ready`. `skipped` por condição do workflow conta como ok; `neutral`, `action_required`, `stale` não.
- **Dependabot**: patch/minor → mesmo fluxo (verde + changelog sem breaking + lockfile coerente); major → AGUARDANDO HUMANO com o breaking change citado. Conflito de lockfile em PR do Dependabot: não comente `@dependabot rebase` (é escrita em PR alheia) — branch nova com supersede.
- **Draft**: draft de outra sessão é só analisada; se for válida e corrigível, supersede por branch nova (não draft). Draft vazia/abandonada → DESCARTAR na lista final.
- **PR empilhada** (base ≠ `main`): só depois que a base for mergeada; então rebase em `main` via supersede.
- **Migration**: além de não mergear, prove no banco (somente leitura) se o objeto já existe → JÁ IMPLEMENTADA; se a `version` colide com o ledger → anote.
- **Pós-merge**: confirme `deploy-vercel.yml` verde **e** o deployment de produção `READY` no Vercel MCP; edge → run verde de `deploy-edge-functions.yml`.

## 3. Fase 0 — Inventário (só leitura)
1. Fixe `main` (SHA) e o estado dos checks em `main` → `baseline/main.json`. Check vermelho **já em `main`** = herdado: registre; ele bloqueia toda PR com `strict`, então vira a **primeira** correção (branch `claude/fix-ci-main-<slug>-…`, regra 3 vale; se a causa estiver em workflow → AGUARDANDO HUMANO e pare os merges).
2. Liste todas as PRs abertas (inclusive draft — draft só é analisada, não mergeada, salvo se for sua). Para cada uma, num script/lote único: número, autor, base, head, SHA, draft, `mergeable_state`, arquivos tocados, +/-, checks (nome → estado), idade, labels, PRs com arquivos em comum.
3. Grafo de dependência: PR cuja base é outra PR; PRs que tocam os mesmos arquivos; PRs que se cobrem (mesmo slug/tema/patch-id).
4. `prs.json` + `progresso.json`.

## 4. Fase A — Análise por PR (só leitura)
Para cada PR, em `dossies/pr-<n>.md`:
- **Válida?** O que faz em 1 linha para negócio; regra de negócio vigente.
- **JÁ IMPLEMENTADA?** O equivalente já está em `main` (patch-id, símbolo, rota, tabela, texto)? Cite o commit do `main`.
- **REGRESSÃO?** Reverte/apaga código mais novo de `main`, quebra chamadores, muda defaults/permissões, enfraquece/remove testes, quebra contrato com backend.
- **COMPLETA?** Componente usado, rota registrada, hook/serviço chamado, edge registrada, tabela com RLS, estados erro/loading/vazio; sem TODO/mock/hardcode.
- **Checks:** para cada vermelho, leia `get_run_failure_summary`/log do job e cite a linha da causa. Classifique: código da PR | conflito/defasagem com `main` | flaky (passa no rerun) | herdado de `main` | infra/segredo.
- **Veredito:** MERGEAR | CORRIGIR+MERGEAR | AGUARDANDO HUMANO | JÁ IMPLEMENTADA | DUPLICADA de #m | REGRESSÃO (corrigível? então CORRIGIR) | DESCARTAR.

## 5. Fase B — Execução, uma PR por vez
Ordem: correções de CI do `main` → PRs base de outras → MERGEAR já verdes e pequenas → CORRIGIR+MERGEAR por impacto no negócio → resto. Entre PRs que tocam os mesmos arquivos, a mais completa primeiro; as outras são reavaliadas depois do merge.

Por PR:
1. Reconfira SHA e checks ao vivo (outros agentes mexem ao mesmo tempo). Mudou → reanalise.
2. **Conflito/defasagem**: PR sua → rebase em `main`. PR alheia → regra 2.2. Resolva lendo os dois lados e a regra de negócio; nunca descarte o lado de `main` sem motivo citado.
3. **Check vermelho**: corrija a causa (regra 3). Flaky: `rerun_failed_jobs` no máximo 2 vezes; persistiu → trate como falha real. Rode localmente typecheck/lint/testes dos arquivos tocados antes do push quando o ambiente permitir.
4. Push → aguarde **todos** os checks do novo SHA terminarem. Vermelho → volte ao passo 3. Máximo 5 ciclos por PR; estourou → para, registre a causa exata e siga.
5. `strict`/BEHIND: atualize a branch (`update_pr_branch` na sua; na alheia, regra 2.2) e espere checks de novo. Merge 405 com tudo verde → leia proteção ao vivo, não retente às cegas.
6. Todos verdes + veredito permite (regra 4) → **squash-merge** e apague a branch se for sua.
7. Pós-merge: checks do `main` no SHA do merge; se o repo faz deploy no merge (Vercel/Lovable/Cloudflare/`deploy-functions`), confirme o deploy concluído. `main` ficou vermelho por causa do seu merge → **pare os merges**, corrija em branch `claude/fix-…` na mesma sessão até `main` verde, só então continue.
8. Atualize `prs.json`, dossiê e `progresso.json`.

PR supersedida e mergeada: registre "#n coberta por #m (SHA)" — o fechamento da original vai para a lista final.

## 6. Entregáveis em `analise-prs/`
`progresso.json`, `prs.json`, `baseline/main.json`, `dossies/pr-<n>.md`, `RELATORIO_PRS.md`: contagem por estado; tabela PR × veredito × ação × PR nova × SHA do merge × checks × deploy; AGUARDANDO HUMANO (o que exatamente precisa ser decidido, 1 linha cada); PRs a fechar (JÁ IMPLEMENTADA/DUPLICADA/SUPERSEDIDA) com evidência; NÃO VERIFICADO; bugs fora de escopo encontrados. Esses arquivos entram por PR de documentação própria (`claude/chore-relatorio-prs-…`), mergeada só com checks verdes.

## 7. META CUMPRIDA — só quando mostrar no chat
1. Nº de PRs abertas no início = soma por estado final.
2. Para cada PR mergeada: link, SHA do merge, prova de checks 100 % verdes no último SHA, deploy confirmado (quando houver).
3. Lista única `AGUARDANDO HUMANO: #n (motivo), …`.
4. PRs a fechar com evidência.
5. `main` verde no SHA final (checks listados) e SHA antes/depois.
6. Prova de que nenhuma PR alheia foi editada/fechada/force-pushed e nenhum check/workflow/teste foi afrouxado (`git diff` das PRs mergeadas sem `.github/`, `skip`, `@ts-ignore`, `eslint-disable` novos).
7. Caminhos dos arquivos + bloco `Próximos passos` com 3 itens.
