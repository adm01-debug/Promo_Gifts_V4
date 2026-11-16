# origin/codex/e23-required-secrets-20261030

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** fazia os portões de qualidade reprovarem de verdade quando faltam credenciais (hoje a main faz isso), **mas também abria exceção para o robô de atualização de segurança das bibliotecas** — sem essa exceção, nenhuma atualização automática de biblioteca consegue passar nos portões e todas vêm sendo fechadas sem entrar.
- **Tip / merge-base / main:** tip `3fc3806e10598c26154bb832a1c954942f8123dc` · merge-base `554ef41b44c9f318777d7e7b11189490a29a8c0a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`
- **PR de origem:** [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839) — `state: closed`, `merged_at: null` (fechada em 2026-11-01T21:23:16Z **sem merge**). Foi substituída por [#2939](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2939) = commit `70ffed17e2` na main, cuja mensagem diz literalmente **"Substitui #2847 e #2839"**. Uma segunda parte foi resgatada em `74d9fdad66` — "fix(sentinel): audita intervalo first-parent do push (**recupera parte faltante da #2839**)".

## O que a branch quis fazer

Pelas mensagens dos 17 commits, o agente atacou 5 frentes, todas de endurecimento de CI (etapas P200-E007/E008/E009 do plano de 200 etapas):

1. **`fix(ci): falha Gate E23 sem secrets internos`** — o portão que confere as credenciais de teste ponta-a-ponta (E2E) chamava o verificador sem `fail_if_missing`, cujo padrão é `false`. Resultado: o portão **nunca podia reprovar** e a checagem no agregador final era tautológica. A branch passou a exigir as credenciais **em push e em PR interno de pessoa**, e manteve a dispensa explícita para PR de fork **e para o robô Dependabot** — porque nenhum dos dois recebe os segredos do repositório.
2. **`fix(ci): exige evidência live para o gate de RLS`** — o Gate 1.13 rodava `check-policies-baseline.mjs` sem `--require-live`, e o script devolve aprovação estática (exit 0) quando não há credencial ou quando a API do Supabase falha. Ou seja: ~950 regras de acesso ao banco podiam passar sem comparação nenhuma. A branch acrescentou `--require-live` e estendeu as verificações live do Gate 5 (`supabase-security-gate.yml`) aos PRs do próprio repositório — sempre com dispensa explícita para fork e Dependabot.
3. **`fix(ci): protege ranges e gates sem secrets` + `reconhece squash no sentinel`** — o sentinel de proteção da `main` auditava só o HEAD quando o commit do topo parecia um merge de PR; um squash no topo podia esconder um commit anterior sem PR no mesmo push. A branch extraiu a seleção do intervalo para `scripts/sentinel-push-range.sh` (first-parent completo), criou teste e ligou o job no self-test.
4. **`docs(governance): exige PR para mudanças críticas`** — reescreveu a REGRA #9 de "termine a sessão com `git push`" para "mudança em `.github/**`, `CODEOWNERS`, `supabase/migrations/**`, `scripts/check-*` e `.gitleaks.toml` exige PR, inclusive do CODEOWNER; push direto na `main` é proibido, até em incidente".
5. **`test(quotes)` + `test(ci): estabiliza E2E`** — apontou o fuzz de alinhamento para o componente extraído (`QuoteBuilderSummaryItems.tsx`) e corrigiu dois testes E2E instáveis (o de expiração do toast "Desfazer" clicava aos 700 ms num botão que o componente mantém ativo por no mínimo 1.000 ms).

Os demais commits (`docs(ci): registra/inventaria/revalida…`) são registro de sessão em `PENDENCIAS.md`, `RELATORIO_CI.md` e no plano.

## Item por item: esta na main?

| Item | Onde esta na main (ou NAO ESTA) | Evidencia |
|---|---|---|
| Sentinel audita o intervalo first-parent do push (anti-squash) | **ESTÁ** — `scripts/sentinel-push-range.sh`, `tests/scripts/sentinel-push-range.test.mjs`, changelog v2.1.3 e job `test-push-range-selection` | `git log --reverse origin/main -- scripts/sentinel-push-range.sh` → `74d9fdad66 fix(sentinel): audita intervalo first-parent do push (recupera parte faltante da #2839)`; a main já evoluiu para v2.2.0 **em cima** da v2.1.3 da branch |
| Gate E23 pode reprovar (`fail_if_missing`) | **ESTÁ, e mais estrito** — a main passa `fail_if_missing: true` fixo | `git show origin/main:.github/workflows/deploy-gates.yml` linha 563: `fail_if_missing: true  # E007: falhar se credenciais E2E ausentes` |
| Gate 1.13 exige comparação live das regras de acesso (`--require-live`) | **ESTÁ** — e a main acrescentou um passo estático só para fork, que a branch não tinha | `origin/main:.github/workflows/deploy-gates.yml` passos "Gate 1.13 — Policies baseline vs pg_policies live (obrigatório)" e "Gate 1.13 — Policies baseline estático em PR de fork"; trazido por `70ffed17e2` ("Substitui #2847 e #2839") |
| Gate 5 (`supabase-security-gate.yml`): checks live com guarda explícita nos 4 passos | **ESTÁ** (guarda de fork) | `origin/main:.github/workflows/supabase-security-gate.yml`: os 4 passos têm `if: … head.repo.full_name == github.repository` e `--require-live`; coberto por `tests/scripts/deploy-gates-live-audit.test.mjs` |
| Governança: mudança crítica só por PR, inclusive para o CODEOWNER | **ESTÁ** (texto reescrito, regra preservada) | `origin/main:AGENTS.md:68-69` — "Governança (`.github/**`, `supabase/migrations/**`, `scripts/check-*`, `.gitleaks.toml`) só por PR, inclusive para CODEOWNER e para o dono da conta"; item 1 do Git: "Nunca commite em `main`" |
| Fuzz de alinhamento lê `QuoteBuilderSummaryItems.tsx` | **ESTÁ** | diff (B) do pacote: a main difere da branch só em comentários; a linha `const SRC = readFileSync(resolve(__dirname, '../QuoteBuilderSummaryItems.tsx'), 'utf8')` é idêntica |
| E2E `04r-undo-toast`: não clicar antes da expiração real | **ESTÁ** (implementação equivalente) | `origin/main:e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:148-162` — `showUndoToastInBrowser(page, 1000)` + `page.waitForFunction(… dataset.expired === "true")`; comentário "1s é a duração mínima aplicada pelo componente (`Math.max(1000, duration)`)" |
| **Dispensa do Dependabot no Gate E23** | **NÃO ESTÁ** — e é um defeito vivo | run **43385527230** (PR Dependabot #3495, 2026-11-13, contra a main atual): job `Gate E23 - Verifica secrets E2E` → **failure** no passo "Checa credenciais E2E"; `Gate 3 - E2E Smoke` → **skipped**; `Gate Final - Deploy Ready` → **failure** |
| **Dispensa do Dependabot no Gate 1.13 / 1.13.2** | **NÃO ESTÁ** — a condição da main dispensa só fork, e a branch do Dependabot é interna | `origin/main:deploy-gates.yml` Gate 1.13 `if: … github.event_name != 'pull_request' \|\| head.repo.full_name == github.repository` (verdadeiro para Dependabot) + `node scripts/check-policies-baseline.mjs --require-live` sem credencial → `exit 2` / `"status":"inconclusive"` (executado nesta análise) |
| **Gate Final aceitar skip do E2E em PR do Dependabot** | **NÃO ESTÁ** — só aceita docs-only e fork | `origin/main:deploy-gates.yml:966-974`: `elif [[ "$GITHUB_EVENT_NAME" == "pull_request" && "$IS_FORK" == "true" ]]` … `else fail_gate "Gate 3 e2e-smoke skipped em execução confiável"` |
| 3 testes-guarda `p200-e007/e008/e009` | **NÃO ESTÃO** — e, como escritos, **contradizem** a main | `git log origin/main -- tests/scripts/p200-e00*.test.mjs` → vazio. Substituto parcial na main: `tests/scripts/deploy-gates-live-audit.test.mjs` (de `70ffed17e2`), que **fixa `IS_DEPENDABOT: 'false'`** e portanto não cobre o caso do robô |
| E2E `quote-view-no-presentation-mode`: folga de tempo nos spies | **NÃO ESTÁ** — a main manteve 250 ms / 600 ms | `git show origin/main:e2e/quotes/quote-view-no-presentation-mode.spec.ts` linhas 219 (`250`) e 254 (`600`); a branch usava `1000` e `2000` "mesmo sob carga do runner" |
| Texto R5 do plano (proibir push direto mesmo em incidente) | **NÃO ESTÁ** — a main ainda permite a exceção, contradizendo o AGENTS.md | `origin/main:docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md:105`: "Push direto em `main` só para reverter incidente em curso" vs. `AGENTS.md` Git 1 "Nunca commite em `main`" |
| Linha do ledger de conflitos (PR #2839 × RELATORIO_CI.md) | **NÃO ESTÁ** — e perdeu o objeto: descreve a resolução de um merge que nunca aconteceu | diff (B) do pacote remove a linha `2026-10-30T21:59Z \| PR #2839 …`; PR #2839 `merged_at: null` |
| `PENDENCIAS.md §P32–P34` e `RELATORIO_CI.md §§13–24` | **NÃO ESTÃO** — registro de execuções de CI de 2026-10-30 | corpo da PR #2839: "registram os resultados mais recentes de `main@9541666bf`"; a main já reorganizou os dois arquivos |
| Totais em `tests/scripts/plan-status.test.mjs` (85/104 vs 86/103) | **NÃO ESTÁ** — e não deve ir: os números da main refletem o plano da main | diff (B): a main tem `claimed: 86 / todo: 103`, que é o estado do arquivo de plano na main |

## A resgatar

**1. Dispensar o robô Dependabot no portão de credenciais E2E (`.github/workflows/deploy-gates.yml`, job `secrets-check`, linha 563).**
Hoje a main exige as credenciais sempre (`fail_if_missing: true`). O Dependabot não recebe os segredos do repositório, então o portão reprova, o Gate 3 é pulado e o **Gate Final reprova**. Prova de produção: run [43385527230](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/43385527230) — `Gate E23 … → failure`, `Gate 3 - E2E Smoke → skipped`, `Gate Final - Deploy Ready → failure`. As 6 PRs mais recentes do Dependabot estão **todas** `CLOSED` com `statusCheckRollup: FAILURE` (#3495, #3489, #3334, #3333, #3332, #3331). Efeito no negócio: as atualizações automáticas de biblioteca — inclusive as que corrigem falhas de segurança — não entram.
Caminho (um dos dois, é decisão de política): (a) voltar à expressão da branch, `fail_if_missing: ${{ github.event_name != 'pull_request' || (github.event.pull_request.head.repo.full_name == github.repository && github.actor != 'dependabot[bot]') }}`; **ou** (b) manter `true` e aceitar o skip do Gate 3 para Dependabot no agregador (`deploy-gates.yml:966-974`, somar `IS_DEPENDABOT == "true"` à condição que hoje só olha `IS_FORK`).

**2. Dispensar o Dependabot nos portões que consultam o banco ao vivo (`deploy-gates.yml` Gate 1.13 e 1.13.2; `supabase-security-gate.yml` 4 passos).**
As condições da main dispensam apenas PR de fork. A branch do Dependabot é interna, logo entra na condição e roda `--require-live` **sem o token** — e o script termina `exit 2` (verificado: `node scripts/check-policies-baseline.mjs --require-live` sem credenciais → `inconclusive`, exit 2). Resultado: Gate 1 reprova por falta de credencial, não por defeito. No run 43385527230 esses passos apareceram como `skipped` porque o job já havia morrido antes, no `Setup Node CI` — ou seja, o efeito é **inferido do código e do exit 2 medido**, não observado naquele run.

**3. Teste que fixe o comportamento do Dependabot.**
`tests/scripts/deploy-gates-live-audit.test.mjs` (na main) cobre E007/E008, mas passa `IS_DEPENDABOT: 'false'` fixo — o caso do robô não tem guarda nenhuma, foi exatamente por isso que a regressão passou. Resgatar como **novos casos dentro desse arquivo da main**, não copiando `p200-e007/e008/e009`: esses três, como estão escritos, reprovam contra a main (o e007 exige a string literal da expressão condicional; o e009 exige `REGRA #9` e o marcador `# CONTEXTO DO PROJETO` no `AGENTS.md`, que a main reescreveu por inteiro).

**4. Folga de tempo nos dois spies de `e2e/quotes/quote-view-no-presentation-mode.spec.ts` (linhas 219 e 254 na main).**
A branch subiu 250→1000 ms e 600→2000 ms para a asserção do estado "carregando" não perder a janela sob carga do runner. Baixa prioridade: é estabilidade de teste, não comportamento de produto. Só vale mexer se esse spec aparecer como intermitente.

**5. Coerência do texto de governança: `docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md:105`.**
O plano na main ainda diz que push direto na `main` é aceitável "só para reverter incidente em curso"; o `AGENTS.md:68-69` e o item 1 do Git dizem o contrário. Um agente que leia o plano encontra permissão para o que a regra proíbe. Correção é de uma frase.

## Risco de fechar esta branch

Fechar a branch **não perde** o endurecimento dos portões: ele está na main por outro caminho (PR #2939 / `70ffed17e2` e `74d9fdad66`), com teste próprio. O que se perde é a **lista de exceções**: sem o item 1 acima, nenhuma atualização automática de biblioteca passa nos portões. Isso já está acontecendo — as 6 últimas PRs do Dependabot foram fechadas sem entrar, todas com checks vermelhos. Na prática o repositório está sem o canal automático de correção de vulnerabilidades de dependência, e cada atualização passa a exigir trabalho manual. Esse é o único risco material; o resto do que a branch tem de exclusivo é registro de sessão de 2026-10-30, uma linha de ledger sobre um merge que nunca ocorreu e dois ajustes de tempo em teste E2E.

Importante: os itens 1 e 2 mexem em **workflow de CI e em quais portões consultam o banco de produção**. Pelo item 7 das regras de Git, isso vai em PR que fica aberta para o dono decidir — a escolha entre "dispensar o Dependabot" e "exigir credencial de todos" é política, não técnica.

## Nao verificado

- **O efeito do Gate 1.13/1.13.2 em PR do Dependabot não foi observado numa execução real.** No run 43385527230 esses passos ficaram `skipped` porque o job `Gate 1 - Lint + TypeScript` falhou antes, no `Setup Node CI`. A afirmação se apoia na condição `if:` do arquivo na main e no `exit 2` medido localmente, não num log de CI.
- **Não foi medido se `supabase-security-gate.yml` é required check**; se não for, a reprovação ali não bloqueia o merge e o impacto do item 2 é menor do que o do item 1.
- **Nenhum teste da branch foi executado** contra a main: os três `p200-*` não existem na main e, pela leitura das asserções, reprovariam. A conclusão de que reprovariam é leitura de código, não execução.
- **A instabilidade que motivou as folgas de tempo do item 4 não foi reproduzida**; não há evidência própria de que o spec esteja intermitente hoje.
- `PENDENCIAS.md` e `RELATORIO_CI.md` foram classificados como registro de sessão pelo corpo da PR #2839 e pela linha de ledger que a própria branch escreveu; **o conteúdo das seções 13–24 não foi lido linha a linha**.
