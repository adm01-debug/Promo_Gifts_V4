# origin/claude_pink/sleepy-cannon-h000nc

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada no sistema — e o caderno de anotacoes de um agente que, em 09-10/11, revisou uma a uma 61 propostas de mudanca e escreveu por que cada uma foi aceita ou recusada.
- **Tip / merge-base / main:** tip `1b82ee7161f890d2dd684b4455b96fa411175041` · merge-base `a58b98ee20ad49664f9e29a551bfd25a1e4fba71` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelas 30 mensagens de commit (todas com prefixo `docs(analise-prs)` / `chore(analise-prs)`), a
intencao foi uma so: **auditar as PRs abertas do repo e deixar o resultado por escrito**. A propria
branch se declara material de registro, nao de producao — `analise-prs/baseline/CI_BASELINE.md:3`
diz literalmente "Branch de entrega: `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)".

Nao ha nada de produto aqui. Medido mecanicamente:

```
git diff --name-only a58b98ee origin/claude_pink/sleepy-cannon-h000nc | grep -v '^analise-prs/'
→ .eslint-baseline-scope.json        (1 arquivo, e so esse)
```

132 arquivos / +5.996 −646 linhas, dos quais **131 sao documentacao** em `analise-prs/`
(114 `.md`, 12 `.txt`, 4 `.json`, 1 `.csv`). Zero codigo, zero migration, zero edge function,
zero workflow, zero rota, zero teste.

A PR dessa branch (**#3355**) foi **fechada sem merge em 2026-11-13**
(`gh api repos/adm01-debug/Promo_Gifts_V4/pulls/3355` → `state=closed`, `merged=false`,
`closed_at=2026-11-13T07:14:17Z`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `.eslint-baseline-scope.json`: `"mode": "full"` → `"incremental"` (justificado no commit `c54cea72c9` como "fix OOM no pre-push hook") | **NAO ESTA — e nao deve estar.** A main esta em `full`, que e o modo rigoroso. Com `incremental` e `include: []`, o portao de ESLint para de reprovar qualquer regressao | `origin/main:.eslint-baseline-scope.json:3` = `"mode": "full"`; `scripts/check-eslint-baseline.mjs:74` → `if (includeGlobs.length === 0) return false; // escopo vazio ⇒ nada bloqueia`. Historico: `git log origin/main -- .eslint-baseline-scope.json` → ultima alteracao 2026-07-15, nunca saiu de `full` |
| O problema real que a branch contornava (ESLint estourando memoria e nao gerando o relatorio) | **ESTA na main**, resolvido do jeito certo: guarda de crash + limite de memoria, sem afrouxar o portao | `scripts/check-eslint-baseline.mjs:86` (`NODE_OPTIONS: '--max-old-space-size=4096'`) e `:93` (`if (!existsSync(out))`); entrou em `0fe3c0089a` (2026-11-09) e `8bc5078dbc` (2026-11-02) |
| 26 dossies de PR da branch (#3129–#3334, #3339, #3355, #3364, #3367, #3369–#3383) | **ESTA na main**, por outro caminho: `analise-prs/dossies/` (236 arquivos, sessao `claude_04/optimistic-lovelace-n960f7`) e o levantamento mais novo `analise-prs/2026-11-12/prs.json` (61 PRs) | `git ls-tree -r origin/main -- analise-prs/dossies \| wc -l` → 236; numeros em `analise-prs/2026-11-12/prs.json` incluem 3327–3334, 3339, 3355, 3364, 3367, 3369–3383 |
| 35 dossies de PR **sem equivalente em lugar nenhum da main** (#2670, #2671, #2672, #2686, #2689, #2692, #3099, #3321–#3326, #3335, #3337, #3340–#3350, #3357, #3359–#3361, #3363, #3365, #3366, #3368, #3372) | **NAO ESTA** | `comm -23` entre os dossies da branch e a uniao de `analise-prs/dossies/` + `analise-prs/prs.json` + `analise-prs/2026-11-12/prs.json` da main → 35 numeros |
| 12 arquivos de evidencia de CI daquela semana (`baseline/CI_BASELINE.md`, `merge-tests.txt`, `merges-realizados.json`, `comparacao-merges.md`, `gate-final-main.json`, `gate-final-push.txt`, `gate-2-unit-tests.txt`, `main-293b9287.md`, `supabase-logs.txt`, `unit-tests-78729fc1-session4.txt`, `worktrees.txt`, `NOTA_LIMITACAO.md`) | **NAO ESTA** | `git ls-tree origin/main -- analise-prs/baseline` nao lista nenhum dos 12 |
| Versoes da branch de `prs.json` / `prs.csv` / `progresso.json` / `RELATORIO_PRS.md` / `regras-de-negocio.md` | **A main tem versoes diferentes, de outra sessao, cobrindo outro conjunto de PRs** — trazer as da branch apagaria as da main | `origin/main:analise-prs/RELATORIO_PRS.md:3` = sessao `claude_04/optimistic-lovelace-n960f7`; `origin/main:analise-prs/prs.json` cobre #3127–#3338, a da branch cobre #3129–#3371 |
| Veredito previo sobre esta mesma branch | A main ja tem um, com os mesmos fatos que eu reencontrei de forma independente | `origin/main:analise-branches/auditoria-261115/veredito_lote01.md:9-21` e `:270` → "DESCARTAR … 131 de 132 arquivos sao dossie de PR; o 132º afrouxa o gate do eslint" |

**Nenhuma das 61 PRs analisadas pela branch esta aberta hoje.** Consultei as 35 sem cobertura uma a
uma via `gh api repos/.../pulls/<n>`: 35 de 35 `state=closed` — 24 mergeadas, 11 fechadas sem merge
(#2670, #2671, #2672, #3099, #3321, #3324, #3335, #3345, #3363, #3365, #3368). Ou seja: **nenhuma
decisao pendente esta presa nesta branch.**

## A resgatar

Nada de funcionamento do sistema. O que sobra e trilha de auditoria, e vale pouco — mas e trabalho
de outro agente que nao existe em nenhum outro lugar, entao listo:

1. **35 dossies de PR** — `analise-prs/dossies/PR-{2670,2671,2672,2686,2689,2692,3099,3321,3322,3323,3324,3325,3326,3335,3337,3340,3341,3342,3343,3344,3345,3346,3347,3348,3349,3350,3357,3359,3360,3361,3363,3365,3366,3368,3372}.md`.
   Por que importa: sao o unico registro escrito do porque 11 propostas foram **recusadas sem
   entrar**. Se amanha alguem perguntar "sobrou alguma coisa boa naquelas 11?", este e o unico texto
   que responde. Qualidade desigual: alguns sao analise de verdade com o diff lido
   (`PR-3368.md` descreve os 4 arquivos e o motivo do bloqueio), outros sao rascunho com
   "NAO VERIFICADO" em todos os campos (`PR-3321.md`, `PR-3345.md`).
2. **12 arquivos de evidencia de CI de 09/11** — `analise-prs/baseline/` (lista completa na tabela).
   Por que importa: registram, com numero de execucao, que a producao estava verde naquele dia e
   quais 6 merges aquele agente fez (`merges-realizados.json`, `comparacao-merges.md`). Serve de
   historico de "quem mexeu em que", nao de base de comparacao — os numeros sao de main `293b9287`
   e a main de hoje e `e4ab7f85`.
3. **Como resgatar, se o dono quiser:** copiar os 47 arquivos para uma pasta nova e datada
   (ex. `analise-prs/arquivo-261109/`), **nunca** sobre `analise-prs/prs.json`,
   `prs.csv`, `progresso.json`, `RELATORIO_PRS.md` ou `regras-de-negocio.md`, que hoje pertencem a
   outra sessao e cobrem outro conjunto de PRs. E docs-only: nao dispara portao de CI (E14).

### NAO resgatar (regressao, nao resgate)

`.eslint-baseline-scope.json` com `"mode": "incremental"`. Com `include` vazio, isso **desliga** a
verificacao de qualidade de codigo para todos os arquivos (`scripts/check-eslint-baseline.mjs:74`).
Era um contorno para um travamento de memoria que a main ja resolveu direito
(`scripts/check-eslint-baseline.mjs:86,93`). Trazer esse arquivo abriria a porta para erro novo
entrar sem ninguem ver.

## Risco de fechar esta branch

**Risco para o sistema: nenhum.** Nao ha codigo, banco, edge function, rota, tela nem teste nesta
branch — comprovado pela lista completa de arquivos (131 em `analise-prs/`, 1 arquivo de
configuracao que a main corretamente nao quer). Fechar nao tira nenhuma funcionalidade do ar e nao
perde nenhuma decisao pendente: as 61 PRs analisadas estao todas fechadas.

**Risco de memoria:** perde-se para sempre ~6.000 linhas de analise escrita, entre elas os 35
dossies acima. O efeito pratico aparece so se alguem quiser reabrir a conversa sobre as 11 propostas
recusadas sem merge. A main ja tem auditorias mais novas e mais amplas que cobrem esse terreno por
outro angulo (`analise-prs/2026-11-12/` com 61 PRs e `analise-branches/auditoria-261115/` com 165
branches), e o `AGENTS.md` do proprio repo trata `analise-*` como "historico, nao ordem".

**Custo de resgatar:** um commit de documentacao, sem CI, sem risco de producao. Por isso a
recomendacao e: copiar os 47 arquivos para pasta datada e so depois fechar a branch.

## Nao verificado

- **85 dos 132 arquivos nao foram lidos linha a linha.** O pacote de evidencia veio TRUNCADO (diff
  dos 40 primeiros; os outros 92 so por nome). Dos 92, abri 7 (`PR-3368.md`, `PR-3345.md`,
  `PR-3321.md`, `baseline/CI_BASELINE.md`, `baseline/merges-realizados.json`,
  `baseline/comparacao-merges.md`, `baseline/NOTA_LIMITACAO.md`) e verifiquei os 132 por caminho,
  extensao e presenca/ausencia na main. **Isso nao enfraquece o veredito sobre perda de trabalho:**
  a propria lista de caminhos prova que os 85 nao lidos estao todos em `analise-prs/` com extensao
  `.md`/`.txt`/`.json`/`.csv`, logo nao pode haver codigo escondido neles.
- **Nao julguei a qualidade do conteudo dos 35 dossies um por um** (li 3). Pela amostra, o conteudo
  varia de analise solida a rascunho vazio; nao sei a proporcao.
- **Nao verifiquei se as 11 PRs fechadas sem merge deixaram trabalho perdido.** Isso e assunto das
  branches delas, nao desta; esta branch so comenta sobre elas.
