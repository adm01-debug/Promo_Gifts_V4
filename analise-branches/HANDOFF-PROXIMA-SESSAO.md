# HANDOFF — comece por aqui

Escrito em 2026-11-16, 12h UTC, pela sessão `session_01Gd4dBhHK5o8Sg5eHHAF3G7`, que acabou
por limite de tokens. O dono continua em outra conta. Este arquivo é o **único ponto de
entrada**: ele dá o estado de hoje e manda você para os documentos que já existem, em vez
de repeti-los.

O dono **não é dev**. Ele decide negócio, você executa engenharia. Responda em PT-BR,
resultado primeiro, sem narração. Toda execução fecha com exatamente 3 "Próximos passos".

---

## 1. Leia nesta ordem (e não leia mais que isto antes de começar)

| Ordem | Arquivo | O que ganha |
|---|---|---|
| 1 | `AGENTS.md` (raiz) | As regras do dono. Vence qualquer doc antigo. |
| 2 | **este arquivo** | Estado de hoje, PRs abertas, armadilhas desta sessão. |
| 3 | `analise-branches/MANUAL-DE-CONTINUIDADE.md` | 11 seções de armadilhas de ferramenta e de método. Custou horas. |
| 4 | `analise-branches/ESTADO-EM-261116.md` | As 7 pendências com evidência e os 2 defeitos vivos. **Leia a seção 3 daqui antes: parte dele já venceu.** |
| 5 | `analise-branches/RELATORIO-BRANCHES-COMPLETO.md` | 1100 linhas, branch a branch. Consulte por seção, não leia inteiro. |
| 6 | `analise-branches/dossies/<branch>.md` | 170 dossiês, um por branch. Só quando a branch importar. |
| 7 | `analise-branches/dados/LEIA-ME.md` | A medição bruta (TSV/JSON) e como ela foi feita. |

`RELATORIO-SESSAO-261116.md` conta **como e por que** o trabalho foi feito — leia se
precisar justificar uma decisão ao dono, não para executar.

---

## 2. Estado do sistema agora

| Item | Valor |
|---|---|
| `main` | `25ea4f33c2826a13d83404d62e97f11fd8416b62` |
| Deploy de produção | `dpl_6psUud4cCycpoGTuig74qVk2YGgf`, estado **READY**, nesse mesmo SHA |
| Banco (SSOT, produção) | `doufsxqlfjyuvxuezpln` — **somente leitura** por MCP |
| Branches no remoto | **107** refs (eram 176 ontem) |
| PRs abertas | **12** (ver seção 5) |
| Dossiês em `analise-branches/dossies/` | **170** |
| Ruleset de proteção | `27365809`, em `refs/heads/salvo/*` |

### Os 5 refs de preservação (não são para mergear)

Cada um é **um commit com a árvore idêntica à da `main`**; o que importa são os **pais**,
que são as pontas exatas de branches que não existem mais. Ninguém pode apagá-los nem
reescrevê-los: o ruleset `27365809` aplica `deletion` + `non_fast_forward` com
`current_user_can_bypass: never`.

| Ref | SHA | Guarda |
|---|---|---|
| `salvo/261116-apagadas-70` | `ef7889218a0704c04f25e0d13b33da2bcd91792f` | 71 pontas das branches apagadas em 16/11 — **70 sob `a429382c13`, 1 sob a ponta** |
| `salvo/261116-pc-tips` | `f3194c077e…` | 379 pontas vindas do PC do dono — **nunca analisadas** |
| `salvo/261116-orfaos-container` | `a8a4a647ab73a218b5a7d508791b483a457fe720` | 2110 commits que só existiam no container |
| `salvo/261115-preservacao` | `e356346785…` | 61 pontas de outros agentes |
| `salvo/261116-container` | `6ca50cad25…` | 36 pontas do container |

**Como ressuscitar uma branch apagada** (testado em clone limpo; restaurou 20 commits e
8495 arquivos):

```bash
# 1. depth=2, nao 1: o ref e um commit de fast-forward, e as 70 pontas sao pais do
#    commit anterior. Com --depth=1 o pai nem chega, e o passo 3 falha com
#    "fatal: not a valid branch point".
git fetch --depth=2 origin salvo/261116-apagadas-70

# 2. os SHAs estao em DOIS commits: 70 em a429382c13, mais a 71a em ef7889218a
git cat-file -p a429382c1362308dfe7db0aa50604a9aae950827 | grep '^parent '   # 70
git cat-file -p ef7889218a0704c04f25e0d13b33da2bcd91792f | grep '^parent '   # +1

# 3. buscar a ponta escolhida PELO SHA, com historia, antes de criar a branch
git fetch --depth=20 origin <sha-da-ponta>
git branch <nome-novo> FETCH_HEAD
```

Os outros 4 refs guardam as pontas como pais de um commit só, então para eles o passo 1
é `--depth=1` e o passo 2 lê um `cat-file` apenas.

Para as 363 branches apagadas **antes** desta sessão, o mapa nome→SHA está em
`analise-branches/auditoria-261115/363-apagadas-sha-para-restaurar.psv`.

---

## 3. O que mudou em 16/11 depois que o `ESTADO-EM-261116.md` foi escrito

**Leia isto antes do `ESTADO-EM-261116.md`: a seção "Aberto" dele venceu.**

1. **PR #3689 foi mergeada** (`2d1d7cabee`). O `Gate E23 (gitleaks)` passou depois da
   redação do exemplo de chave nos dois dossiês — **sem** ampliar a allowlist. Entrou como
   **commit de merge**, não squash (ver armadilha 7.2).
2. **PR #3685 foi fechada** por redundância, a pedido do dono, com comentário de evidência
   na própria PR. Nenhum statement dela faltava na `main`; a única linha de conteúdo
   exclusiva era um registro de ledger que a `main` **já corrigiu como errado**
   (`supabase/MIGRATIONS_SYNC_LOG.md:972`). Estava em `mergeable_state: dirty`.
   **Não reabra.** O problema de origem (replay do zero não completa, "restam 76 relações
   órfãs") continua aberto e **não é dessa PR** — virou a pendência 8 da lista abaixo.
3. **71 branches foram apagadas** (das 72 liberadas; uma já não existia). Pontas em
   `salvo/261116-apagadas-70`. Não refaça a análise delas.
4. **O ruleset `27365809` foi criado.** O risco 1 do manual ("os refs `salvo/*` não têm
   proteção nenhuma") está resolvido.
5. **`importado/vps-fabrica/v2/n68-2610082251` ganhou veredito**: INCORPORADA_TOTAL, por
   identidade de blob (`bcae903d98` igual na branch e na `main`), entrou pela PR #3668.
   Ressalva registrada no dossiê: `grep MagicUp.a11y` em `package.json` e
   `vitest.config.ts` não devolve nada, então **o teste pode não estar rodando no CI**.
6. **PR #3697 foi mergeada** (`25ea4f33c2`, squash) com os documentos atualizados.

---

## 4. O que falta fazer (8 pendências)

As 7 primeiras estão descritas com evidência em `ESTADO-EM-261116.md`, seção "As 7
pendências". Aqui só o índice, por impacto, mais a oitava que nasceu hoje:

| # | Pendência | Onde |
|---|---|---|
| 1 | **18 decisões de negócio do dono** — veredito `DECISAO_HUMANA` | `dados/vereditos-160-branches.json`; relatório seção 2 |
| 2 | **Rascunho de orçamento em EDIÇÃO** (o novo já funciona) | `src/hooks/quotes/useQuoteBuilderState.ts:257` |
| 3 | **SHA digitado errado** — defeito vivo na `main`, governança | `.github/SENTINEL_SHA_ALLOWLIST.txt:18` |
| 4 | **Dossiê do Magic Up** — 7 defeitos + 6 decisões, a consolidar | relatório |
| 5 | **Recibos E15** — link de execução, MD5, sha256 errados no ledger | `supabase/MIGRATIONS_SYNC_LOG.md` |
| 6 | **Roteador de IA** — filtrar antes da chamada paga + dupla contagem de cota | 18 funções; `trends-insights` no mesmo commit |
| 7 | **19 edge functions divergem do repositório** | deploy feito por fora do workflow |
| 8 | **Replay do zero não completa** — "restam 76 relações órfãs"; ninguém mediu se ainda é verdade depois da #3686 | `supabase/migrations/` |

Mais os **2 defeitos achados e não corrigidos** (filtro de catálogo por voz pronto e
desligado; `fn_check_item_fits` sem `GRANT` no repositório) — detalhe em
`ESTADO-EM-261116.md`.

E o bolsão que ninguém abriu: as **379 pontas do PC do dono** em `salvo/261116-pc-tips`.
Estão preservadas e protegidas, mas **nenhuma foi lida**. Os nomes recuperados estão em
`dados/branches-do-pc-261116.md` (≈312 de ~320) e **não há mapeamento nome→SHA** — esse só
existia na máquina dele. Para casar, compare conteúdo.

---

## 5. As 12 PRs abertas e o que fazer com cada uma

| PR | Branch | O que é | O que fazer |
|---|---|---|---|
| [#3525](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3525) | `claude/wf-limpeza-261113` | enxuga workflows | **Não mergear sozinho** — toca `.github/`, é governança |
| [#3548](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3548) | `claude/fix-pr3517-gate1-baseline-261113-2336` | resgate da #3390 (kit) | Rascunho. Ligado à pendência 2 |
| [#3566](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3566) | `release-please--…` | release 1.2.0 | **Não mergear** — 1.2.0 já foi publicado em outubro |
| [#3683](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3683) | `claude/feat-crm-vendedor-sem-dono-261115-1622` | vendedor vê carteira + clientes sem dono | **Decisão de negócio do dono** |
| [#3687](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3687) | `e15-receipt-20261115230000-…` | recibo E15 | Automática. Ligada à pendência 5 |
| [#3688](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3688) | `e66-edge-deploy-receipt-…` | recibo E66 | Automática |
| [#3691](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3691) | `ci-metrics/2026-W47` | métricas semanais | Automática |
| [#3692](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3692) | `chore/ratchet-lower-…` | baselines melhoradas | Automática. **Confira que só aperta, nunca afrouxa** |
| [#3694](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3694) | `e15-receipt-20261115130200-…` | recibo do SEC-001 | Automática |
| [#3693](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3693) | `dependabot/…production-minor-patch` | 12 bumps | minor/patch: fluxo normal |
| [#3695](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3695) | `dependabot/…development-all` | 11 bumps | minor/patch: fluxo normal |
| [#3696](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3696) | `dependabot/…hookform/resolvers-7.0.6` | 5.9.1 → 7.0.6 | **MAJOR — não mergear**, chamar o dono com o breaking change |

---

## 6. Regras que não se quebram (resumo; a fonte é o `AGENTS.md`)

- **Toda DDL** nasce como migration em `supabase/migrations/` e vai a produção **só** pelo
  workflow `db-apply-migration.yml`. Sem exceção, nem a pedido do dono, nem em emergência.
  `supabase db push` e o MCP `apply_migration` são proibidos.
- **Edge function**: deploy só por `deploy-edge-functions.yml`. O MCP `deploy_edge_function`
  cria divergência — é a causa da pendência 7. Enquanto os 19 divergirem, use sempre
  `function_name` (uma função por vez): `deploy-edge-functions.yml:103` restringe
  mesmo o escopo quando esse input vem preenchido.
- **Banco de produção é somente leitura** por MCP. Projeto proibido: `pqpdolkaeqlyzpdpbizo`.
  CRM externo `pgxfvjmuubtbowutlide` só via edge `crm-db-bridge`.
- **Segredo nunca** em código, commit, PR, resposta ou output — nem redigido.
- **Nunca afrouxe um portão para ficar verde**: sem `.skip`/`.only`/`@ts-ignore`/
  `eslint-disable`/`--no-verify`, sem ampliar baseline ou allowlist.
- **Branch alheia é somente leitura**: nem rebase, nem force-push, nem commit, nem merge.
  Só escreva em branch que **você** criou nesta sessão, nomeada
  `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>`.
- **PR fica aberta e chama o dono** quando envolve: DDL/migration, `.github/`, segredos,
  infra, deleção de dado, arquitetura, custo, ou conflito com PR de outro agente.

---

## 7. Armadilhas — cada uma destas me custou tempo nesta sessão

### 7.1 O push aqui leva 4 minutos, e isso não é defeito
O hook de pré-push roda `npm run lint:baseline`, que roda `eslint src` inteiro. Em 4 CPUs
são ~4 min **por push**. Não mate o processo achando que travou; confira com
`ps -eo pid,etime,cmd | grep eslint`. **Nunca troque de branch durante um push**: o hook
lintaria a árvore errada. E não dispare dois pushes ao mesmo tempo — encadeie:

```bash
for i in $(seq 1 50); do pgrep -f 'git push' >/dev/null || break; sleep 15; done
```

### 7.2 O auto-merge pode disparar antes de você
Na #3689 alguém ligou o auto-merge pela interface do GitHub 18 segundos depois do meu push,
com método **merge** (não squash), e ele mergeou antes que eu alcançasse.
`disablePullRequestAutoMerge` devolveu `UNPROCESSABLE` nas duas tentativas, e
`enablePullRequestAutoMerge` com `SQUASH` **não troca o método** de um auto-merge já ligado.
Resultado: um commit de merge na `main`. **Não é automação** — nenhum workflow do repo liga
auto-merge (o único `gh pr merge` é `db-apply-migration.yml:379`, e usa `--squash`), não há
PAT em workflow, e 24 dos 25 commits anteriores da `main` são squash. Se quiser garantia,
peça ao dono para desligar "Allow merge commits" nas configurações do repositório.

### 7.3 "15.634 commits só existem neste container" é alarme falso
O container usa **clone raso** (`.git/shallow` com 17 fronteiras), então
`git rev-list --all --reflog --not --remotes=origin` acusa milhares de commits que **estão
no GitHub** — ele só não os alcança pelas refs locais truncadas. Conferi 24 por amostra
(16 recentes + 8 antigos, incluindo o `Initial import` de maio): **todos existem lá**.
Para decidir de verdade, pergunte ao GitHub, empilhando aliases numa chamada só:

```
query{repository(owner:"adm01-debug",name:"Promo_Gifts_V4"){
  c1:object(oid:"<sha>"){... on Commit{oid messageHeadline}}
  c2:object(oid:"<sha>"){... on Commit{oid messageHeadline}} }}
```

### 7.4 Nunca use o botão "Update branch" do GitHub
`scripts/check-conflict-ledger.mjs:80` (gate E188) usa `git log --merges` sobre
`origin/<base>..<head>`: o commit de merge que o botão cria **quebra a PR**. O caminho
limpo é rebase local + `--force-with-lease` **na sua própria branch**, sempre ancorado no
SHA real que `git ls-remote` devolve.

### 7.5 Alguns resultados de MCP estouram o contexto
`list_edge_functions`, `list_check_runs`, `list_runs_for_workflow` e `get_edge_function`
devolvem respostas grandes demais; elas são salvas em arquivo e você precisa fatiar com
python. Prefira `github_graphql` com os campos exatos, ou `list_check_runs` com
`status=in_progress` para só contar o que falta.

### 7.6 Paralelismo de agentes
O teto é `min(16, CPUs−2)` **por execução de workflow**. Com 4 CPUs dá **2 agentes**. Para
160 branches eu rodei **4 workflows em paralelo** = 8 agentes simultâneos; 247 agentes,
~4000 chamadas de ferramenta, ~45 minutos.

### 7.7 Um `concurrency` com `cancel-in-progress: false` e uma execução presa em `waiting`
bloqueia toda a fila daquele workflow para sempre. Foi o que travou a fila de deploy de
edge; destravou cancelando as duas execuções paradas.

### 7.8 commitlint
O escopo `analise` é inválido; use `audit`. `infra:` vale para nome de branch, mas o hook
**não aceita** `infra:` como tipo de commit.

### 7.9 `skipped` conta como verde; `neutral` não
`Vercel Agent Review` fica permanentemente `neutral` porque o faturamento da equipe está
desligado — não espere por ele. O required de verdade é **`Gate Final - Deploy Ready`**.
PR que só toca `.md` é docs-only (E14) e os gates de código são **pulados**, não reprovados.

---

## 8. O método que funcionou — repita

### A medição mecânica não decide
"O arquivo difere da `main`" significa, em igual medida, que o trabalho entrou e foi
refatorado, **ou** que ficou de fora. O repositório usa squash-merge, então **toda** branch
de PR já mergeada aparece divergente e com patch-id diferente. SHA ≠ conteúdo.

**O teste que decide:** `git diff --numstat <merge-base> origin/main -- <arquivo>` vazio
⇒ a `main` nunca tocou aquele arquivo ⇒ é ausência pura, não divergência.

### O refutador
Todo veredito que **autorizava fechar** (`INCORPORADA_TOTAL` / `FECHAR_SEM_VALOR`) passou
por um segundo agente independente, encarregado de **refutá-lo**, com instrução explícita:
dúvida ⇒ "resgatar". Errar para "incorporada" apaga trabalho de outro agente para sempre;
errar para "resgatar" só custa tempo. Ele derrubou **15 de 87 (17%)**. Sem ele, 15 branches
teriam sido apagadas com trabalho dentro.

### Evidência ou "NÃO VERIFICADO"
Toda afirmação sobre código cita `arquivo:linha`, SHA, PR ou saída de comando. Nome de
branch, título de PR e comentário **não provam nada** — leia o código. Nesta sessão, dois
subagentes se contradisseram sobre o filtro por voz e **os dois estavam errados**; a função
existe **e** é código morto. Confira você mesmo antes de agir sobre o que um agente afirma.

### O revisor automático acerta
Na #3697 o Devin apontou 3 contradições que eu mesmo introduzi ao atualizar o documento em
etapas — e as 3 eram reais. Foi o único achado real de bot na sessão, justamente no
documento feito para orientar você. Vale conferir o que ele diz.

---

## 9. Fronteiras honestas — o que esta sessão **não** fez

- **As 379 pontas do PC do dono não foram analisadas.** Só preservadas e nomeadas.
- **O replay do zero não foi medido** depois da #3686. "76 relações órfãs" é número do
  commit da branch, de ontem, não medição de hoje.
- **O teste `MagicUp.a11y` pode não estar rodando no CI** — `grep` em `package.json` e
  `vitest.config.ts` não o encontra.
- **Não mergeie inteira** a `codex/fix-gate1-kit-pdf-types-261109-2252`: ela reverteria 4
  coisas em produção, a pior sendo `src/lib/kit-builder/snapshot/read-draft.ts` perder o
  `.default({enabled:false})` — kit salvo com personalização vazia pararia de abrir, e esse
  é o formato de **15 dos 21 kits em produção**. Dela, copie só itens isolados.
- **`authenticated` continua com 115 funções de gatilho executáveis.** A SEC-001 derrubou
  `anon` de 115 para 9, de propósito não mexeu em `authenticated`. Nenhuma delas é
  `SECURITY DEFINER` (`prosecdef = false` nas 115), então é dívida de endurecimento, não
  porta aberta — mas continua aberta.
