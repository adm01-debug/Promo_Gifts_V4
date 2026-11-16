# Dados da análise das 160 branches do GitHub

Gerado em 2026-11-16, com `main` = `e4ab7f85d9`. São os dados brutos por trás dos
dossiês em `analise-branches/dossies/`. Servem para continuar o trabalho sem refazer
a medição.

## Arquivos

| Arquivo | O que é |
|---|---|
| `vereditos-160-branches.json` | Veredito de cada uma das 160 branches, com resumo de negócio, evidência, itens a resgatar e risco de fechar. Tem também o resultado do agente refutador. |
| `branch-x-arquivo.tsv` | Tabela `branch · arquivo · IGUAL/DIFERE`: para cada arquivo que a branch mexeu, se o conteúdo na `main` de hoje é idêntico. 12.892 linhas. |
| `ranking-arquivos-por-branch.tsv` | Quantos arquivos de cada branch diferem da `main`, do maior para o menor. |
| `auditoria-branches-locais.tsv` | As branches que existiam no container da sessão e se o conteúdo delas já estava na `main`. |

## Números

- 160 branches decididas, 159 com confiança alta.
- 84 `INCORPORADA_TOTAL` + 3 `FECHAR_SEM_VALOR` = 87 autorizavam fechar.
- Dessas 87, o agente refutador **derrubou 15**: achou trabalho que a `main` não tem.
  Sobram **72 liberadas para apagar**.
- 53 `RESGATAR_PARCIAL`, 2 `COMPLETAR`, 18 `DECISAO_HUMANA`.
- **214 itens a resgatar** listados um a um, com arquivo e efeito no negócio.
- 44 branches tocam banco ou edge function.

## A armadilha que esses dados evitam

"O arquivo difere da `main`" **não** quer dizer que o trabalho ficou de fora: a `main`
andou muito, e o repositório usa squash-merge, então toda branch de PR já mergeada
aparece como divergente e com patch-id diferente. Em 7 branches grandes, 191 arquivos
que pareciam ausentes da `main` na verdade existiam no merge-base e foram apagados pela
própria `main` depois — não eram trabalho da branch.

Por isso todo veredito que autorizava fechar passou por um segundo agente encarregado
de refutá-lo, com instrução de tratar dúvida como "resgatar": errar para "incorporada"
apaga trabalho de outro agente para sempre; errar para "resgatar" só custa tempo.

## Preservação

Nada depende mais de máquina nenhuma:

- `salvo/261116-pc-tips` — 379 pontas de branch do PC do dono.
- `salvo/261116-container` — 36 pontas de branch do container desta sessão.
- `salvo/261115-preservacao` — 28 pontas + 33 commits órfãos achados antes.

São commits de preservação: a árvore é igual à da `main` e o que importa são os pais.
Não são para mergear.
