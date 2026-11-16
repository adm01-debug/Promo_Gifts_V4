# origin/claude/analise-merge-prs-abertas-shh8ez

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada muda no sistema para o usuario; e o registro escrito (prova) de por que 28 pedidos de mudanca foram aprovados ou recusados em 30-31/out, e esse registro nunca entrou na main.
- **Tip / merge-base / main:** tip `82d9ee9cd6aeb623a7d2fac7b7c4b6055da69d6c` / merge-base `554ef41b44c9f318777d7e7b11189490a29a8c0a` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Branch de uma sessao de triagem de PRs (sessao `014nTibSuSPcPvDsPZWiwQbH`, 30-31/out/2026). Pelas mensagens
dos 25 commits, o agente queria **documentar com evidencia** o destino de cada PR aberta naquele dia:

1. Escrever um dossie por PR (28 PRs: #2701 ate #2853) respondendo 4 perguntas fixas — ainda e valida?
   traz regressao? ja esta na main? a regra de negocio esta certa?
2. Registrar o **baseline antes/depois dos merges** (lint, typecheck, build, vitest) para provar que os
   merges feitos nao quebraram nada — ex.: commit `5177bc1e7d` "4 falhas pre-existentes antes e depois —
   zero falhas novas".
3. Registrar **merge-test local** de cada PR nao mergeada (conflito / historico desconectado / merge limpo),
   commit `c58f67d0b1`.
4. Registrar a **causa raiz** das CIs vermelhas: Gate 0.5 (npm audit), Gate 1.3 (`.migration-refs-baseline.json`
   com 5 entradas obsoletas) e Gate 1.9 (contagem de linhas de `useMockupGenerator.ts`), commit `dd26a6293a`.
5. Consolidar tudo em `RELATORIO_PRS.md`, `prs.json`, `prs.csv` e `progresso.json`.

Nao ha uma linha de codigo de produto: `git diff --name-only 554ef41b 82d9ee9cd6 | grep -v '^analise-prs/'`
retorna vazio. Sao 40 arquivos, todos em `analise-prs/` (17 novos, 23 alterados). Zero migration, zero
edge function, zero workflow.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| 13 dossies novos: PR-2834, 2836, 2839, 2844, 2845, 2846, 2847, 2848, 2849, 2850, 2851, 2852, 2853 | **NAO ESTA** | `git cat-file -e origin/main:analise-prs/dossies/PR-2834.md` falha para os 13. A main tem dossies de 2810, 2813, 2821-2827, 2830, 2831, 2832 e depois salta para 2900+; os numeros 2834/2836/2839/2844-2853 nao existem em nenhum caminho (`git ls-tree -r --name-only origin/main \| grep 28[0-9][0-9]`) |
| Enriquecimento dos 15 dossies existentes (diff lido, merge-test local, correcao de veredito) | **NAO ESTA** | A main esta byte a byte igual ao merge-base nesses arquivos: PR-2701 37 linhas na main e no merge-base vs 85 na branch; PR-2823 38 vs 107; PR-2831 39 vs 81. `git show origin/main:...PR-2823.md \| grep -c "MERGE-TEST LOCAL"` = 0 |
| 4 arquivos de baseline da sessao: `baseline-session-014nTibSuSPcPvDsPZWiwQbH.md`, `gate2-vitest-build-output.md`, `vitest-summary.txt`, `vitest.txt` | **NAO ESTA** | `git cat-file -e origin/main:analise-prs/baseline/vitest-summary.txt` falha nos 4 |
| Acrescimos em `prs.csv`, `regras-de-negocio.md`, `baseline/README.md`, `baseline/lint.txt`, `baseline/typecheck.txt` | **NAO ESTA** (e a main nao mexeu neles depois) | hash da main = hash do merge-base nos 5; branch tem 65/169/59/14/19 linhas vs 52/141/66/12/13 |
| `RELATORIO_PRS.md`, `progresso.json`, `prs.json` (snapshot da sessao de 31/out) | **SUPERADO por sessao mais nova** — nao resgatar | `git show origin/main:analise-prs/RELATORIO_PRS.md \| head -5` = "Sessao claude_04/optimistic-lovelace-n960f7, Data 2026-11-09". Sao arquivos rotativos: cada sessao sobrescreve. Restaurar a versao da branch apagaria o relatorio de 09/nov |
| Decisao de negocio pendente que a branch sinalizou (5 PRs "DECISAO_HUMANA": #2821 #2823 #2824 #2827 #2839) | **RESOLVIDO fora da branch** — nao ha pendencia | GraphQL em 16/nov: #2821 MERGED, #2823 CLOSED, #2824 CLOSED, #2827 CLOSED, #2839 CLOSED. Nenhuma das 28 PRs esta aberta hoje |
| Correcao tecnica que a branch apontou em #2853 (ESLint como dependencia de desenvolvimento) | **ESTA na main** | `git show origin/main:package.json` lista `eslint`, `@eslint/js`, `eslint-plugin-*` dentro de `devDependencies` (linhas 24-28 do bloco). PR #2853 = MERGED |
| Endurecimento de gates que a branch barrou em #2839 (script `sentinel-push-range.sh`, changelog v2.1.2/v2.1.3) | **ESTA na main** (entrou por outro caminho, apesar de #2839 ter sido fechada) | `git ls-tree origin/main -- scripts` mostra `scripts/sentinel-push-range.sh`; `.github/SENTINEL_CHANGELOG.md` da main tem as secoes `## v2.1.3 — 2026-10-30` e `## v2.1.2 — 2026-10-30` |
| Causa raiz do Gate 1.3 (5 refs obsoletas em `.migration-refs-baseline.json`) | **Nao se aplica mais** | A main ainda tem 5 entradas apontando para `analise-prs/`, mas sao caminhos atuais (`analise-prs/2026-11-12/prs.json`, `PR-2426.md`, `PR-2432.md`, `PR-2714.md`), nao os obsoletos de 31/out: baseline foi refeito por sessao posterior |

Resumo: **nenhum** dos 40 arquivos da branch e identico ao da main hoje (verificado arquivo por arquivo com
`git rev-parse <ref>:<arquivo>`), e 17+5 nunca chegaram la. Em contrapartida, **todo efeito pratico** que a
branch descrevia (merges, fechamentos, correcao do ESLint, endurecimento do sentinel) ja aconteceu na main.
O que ficou de fora e a prova escrita, nao o comportamento.

## A resgatar

1. **13 dossies de PR que nao existem na main** — `analise-prs/dossies/PR-2834.md`, `PR-2836.md`,
   `PR-2839.md`, `PR-2844.md`, `PR-2845.md`, `PR-2846.md`, `PR-2847.md`, `PR-2848.md`, `PR-2849.md`,
   `PR-2850.md`, `PR-2851.md`, `PR-2852.md`, `PR-2853.md`.
   Por que importa: sao as unicas paginas do repositorio que explicam por que 6 dessas PRs entraram e 7
   foram fechadas sem entrar. Sem elas, se alguem perguntar "por que recusamos a #2847?" a resposta nao
   existe em lugar nenhum.
2. **Enriquecimento dos 15 dossies de #2701 a #2831** — mesma pasta, arquivos `PR-2701.md`, `PR-2731.md`,
   `PR-2739.md`, `PR-2744.md`, `PR-2758.md`, `PR-2799.md`, `PR-2810.md`, `PR-2821.md`, `PR-2822.md`,
   `PR-2823.md`, `PR-2824.md`, `PR-2825.md`, `PR-2826.md`, `PR-2827.md`, `PR-2831.md`.
   Por que importa: a versao da main e a versao "crua" (37-39 linhas, sem teste de juncao e sem diff lido);
   a da branch tem o dobro e inclui o teste de juncao que mostra qual PR dava conflito e qual nao.
3. **4 arquivos de prova de que os merges daquele dia nao quebraram nada** —
   `analise-prs/baseline/baseline-session-014nTibSuSPcPvDsPZWiwQbH.md`,
   `analise-prs/baseline/gate2-vitest-build-output.md`, `analise-prs/baseline/vitest-summary.txt`,
   `analise-prs/baseline/vitest.txt`.
   Por que importa: e o "antes e depois" (957-1937 testes, 3 falhas pre-existentes de fuso horario) que
   sustenta a afirmacao de zero regressao nos 5 merges de 31/out.
4. **Acrescimos em 5 arquivos que a main nao tocou desde entao** — `analise-prs/prs.csv` (+13 linhas),
   `analise-prs/regras-de-negocio.md` (+28), `analise-prs/baseline/lint.txt`, `.../typecheck.txt`,
   `.../README.md`. Por que importa: resgate barato e sem conflito, porque ninguem mexeu nesses arquivos
   depois do merge-base.

**NAO resgatar** (decisao tecnica, nao de negocio): `analise-prs/RELATORIO_PRS.md`,
`analise-prs/progresso.json` e `analise-prs/prs.json`. Sao arquivos rotativos que a main ja regravou com a
sessao de 09/nov; trazer a versao de 31/out apagaria informacao mais nova. Se o resgate for feito, o
caminho correto e o padrao que a propria main ja adotou: pasta datada (`analise-prs/2026-10-31/`), como
existe `analise-prs/2026-11-12/`.

## Risco de fechar esta branch

**Risco operacional: nenhum.** Nenhum cliente, tela, preco, regra fiscal ou permissao depende desta branch.
Ela nao tem codigo, nao tem banco, nao tem funcao de borda. As 28 PRs que ela analisava estao todas
resolvidas (6 mergeadas, 7 fechadas das 13 novas; nenhuma aberta) e os dois pontos tecnicos que ela
levantou ja estao corrigidos na main (ESLint como dependencia de desenvolvimento; script do sentinel).

**Risco real: perda de rastreabilidade.** Fechar apaga a unica explicacao escrita de 28 decisoes de
aprovar/recusar mudanca, inclusive de 7 PRs que foram descartadas sem entrar. Em auditoria, revisao de
governanca ou numa discussao futura do tipo "isso ja foi tentado e recusado — por que?", a resposta
deixaria de existir no repositorio.

**Pros e contras da decisao (RESGATAR_PARCIAL em vez de fechar):**
- A favor de resgatar: custo quase zero (sao 22 arquivos de texto, nenhum conflito nos 17 novos, nenhum
  risco de CI porque e PR so-de-documentacao e os portoes de codigo nao rodam); recupera prova que nao
  existe em nenhuma outra fonte; alinhado com a regra do projeto de que afirmacao sobre codigo precisa de
  evidencia.
- Contra resgatar: enche `analise-prs/` (que ja tem 284 arquivos) com o retrato de um dia que passou;
  os vereditos da branch estao desatualizados em relacao ao que de fato aconteceu depois (ex.: a branch
  afirma "#2839 nao esta na main", e hoje o conteudo dela esta) — resgatar sem uma nota de data pode
  confundir quem ler depois.
- Decisao: resgatar os 22 arquivos **dentro de pasta datada** `analise-prs/2026-10-31/`, com uma linha no
  topo dizendo "retrato de 31/out/2026; estado atual das PRs mudou". Isso preserva a prova sem contradizer
  o relatorio mais novo da main.

## Nao verificado

- **Conteudo integral dos 13 dossies novos:** li `PR-2839.md` por inteiro (o unico marcado DECISAO_HUMANA
  sem dossie na main) e conferi a existencia e o tamanho dos outros 12. Nao li linha a linha os 12
  restantes; a decisao nao depende disso, porque o criterio foi "existe na main?" e a resposta e nao para
  todos eles.
- **Se as afirmacoes de teste da branch sao verdadeiras:** os numeros de baseline (1937 testes, 0 falhas;
  957 testes, exit 0) foram copiados das mensagens de commit e do proprio arquivo. Nao reexecutei nenhum
  teste nem build nesta analise — e proibido alterar a arvore de trabalho aqui. Entao o valor desses
  arquivos e "registro do que foi medido naquele dia", nao "medicao confirmada hoje".
- **Por que os 13 dossies ficaram fora:** nao achei PR desta branch nem commit de squash correspondente na
  main. Nao sei dizer se a PR foi fechada sem merge, se nunca foi aberta, ou se a sessao terminou antes.
  Nao investiguei o historico de PRs desta branch porque nao muda o veredito.
- **Nenhum arquivo do pacote ficou sem leitura:** o pacote trouxe os 40 diffs (`grep -c "^##### ARQUIVO:"`
  = 40) e nao diz TRUNCADO.
