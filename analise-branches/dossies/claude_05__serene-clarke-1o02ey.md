# origin/claude_05/serene-clarke-1o02ey

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada muda no sistema — e so o caderno de anotacoes de uma revisao de 2026-11-01; o que vale resgatar sao 9 fichas de revisao que explicam por que 9 mudancas entraram (ou nao) naquele dia, e que hoje nao existem em nenhum lugar do repositorio.
- **Tip / merge-base / main:** tip `07fbc8725f52921fa610e80fb1e2c3b88aa594cc` · merge-base `d2033d9237fa72971ff9c92ca47442f7437463ff` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Esta branch **nao tem uma linha de codigo**. Os 15 arquivos que ela mexeu estao todos em `analise-prs/`
(evidencia: `git diff --name-only d2033d92 07fbc872 | grep -E "^(supabase|\.github|src|scripts)/"` → vazio;
diretorios tocados: `analise-prs`, `analise-prs/baseline`, `analise-prs/dossies`).

Pelas mensagens dos 13 commits (de `74411253ac` a `07fbc8725f`, todos de 2026-11-01), o agente estava rodando
uma **sessao de triagem das PRs abertas**: comecou com 4 PRs, cresceu para 36 e fechou em 45. A cada rodada ele
reescrevia o mesmo conjunto de arquivos de relatorio (`RELATORIO_PRS.md`, `prs.json`, `prs.csv`,
`progresso.json`, `regras-de-negocio.md`, `baseline/README.md`) e criava uma ficha por PR em
`analise-prs/dossies/PR-XXXX.md`.

O trabalho foi oferecido ao repositorio **duas vezes e recusado duas vezes**, sem merge:

| PR | Titulo | Estado |
|---|---|---|
| #2956 | docs(analise-prs): analise completa de 4 PRs abertas | CLOSED sem merge em 2026-11-01T23:06:49Z |
| #3014 | docs(analise-prs): v5 — 45 PRs analisadas | CLOSED sem merge em 2026-11-07T02:40:39Z |

(evidencia: `github_graphql` em `pullRequests(headRefName:"claude_05/serene-clarke-1o02ey")` — `mergedAt: null` nas duas)

Oito dias depois, uma outra sessao (`claude_04/optimistic-lovelace-n960f7`, 2026-11-09) reescreveu a mesma
pasta na main do zero. Por isso os 6 arquivos compartilhados diferem: **a main esta na frente**, nao atras.

## Item por item: esta na main?

### Parte 1 — tudo o que a branch descreve como mudanca de codigo JA ESTA na main

A branch so documenta; o codigo documentado entrou por outras branches. Verifiquei um por um:

| Item | Onde esta na main | Evidencia |
|---|---|---|
| PR #2927 — URL de lista volta ao filtro padrao no botao "voltar" | `src/hooks/common/useListUrlState.ts` | `origin/main:src/hooks/common/useListUrlState.ts:178` "Resync quando a navegacao foi por HISTORICO (POP…)" |
| PR #2927 — tira da allowlist de seguranca 2 entradas que nao existiam mais | `.security/lint-0029-allowlist.json` | `git grep "is_supervisor_or_above\|log_rls_denial" origin/main -- .security/lint-0029-allowlist.json` nao retorna nenhuma **entrada** (so textos de justificativa de outras entradas, datadas 2026-11-12) |
| PR #2941 — tira `mcp_kv_get` da allowlist | `.security/lint-0029-allowlist.json` | `git grep "mcp_kv_get" origin/main -- .security/lint-0029-allowlist.json` → vazio |
| PR #2940 — item "Audit Suite" no menu do admin | `src/components/layout/SidebarReorganized.tsx` | `origin/main:src/components/layout/SidebarReorganized.tsx:377` `label: 'Audit Suite'`, `:378` `href: '/admin/audit-suite'` |
| PR #2947 — arquivo de volta-atras da travessia `kill_switch_hits` | `supabase/rollbacks/` | `git ls-tree origin/main -- supabase/rollbacks/` lista `20261029160339_rollback.sql` |
| PR #2947 — trava `trg_anon_rate_guard` em `kill_switch_hits` | aplicada em producao e registrada | `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1681` "2026-11-15 — Reparo: `trg_anon_rate_guard` em `kill_switch_hits` (resgate da branch `claude/laughing-cori-o9w35e`)" — ou seja, **outra** branch resolveu isso |
| PR #2952 — portao de CI tolera politicas de particao mensal | `scripts/check-policies-baseline.mjs` | `origin/main:scripts/check-policies-baseline.mjs:300` `function normalizePartitionSelfRefs(text, tablename)` |
| PR #2960 — tira a barra de progresso falsa (`Math.random`) | removida | `git grep "Math.random" origin/main -- src/components/novidades src/components/reposicao` → vazio |
| Rotas vazias `/colecao`, `/comparar`, `/lista-publica` fora do roteador | removidas | `git grep "colecao\|comparar\|lista-publica" origin/main -- src/App.tsx` → vazio |

### Parte 2 — os 6 arquivos de relatorio: a MAIN ESTA MAIS NOVA, nao resgatar

A versao da branch e de 2026-11-01; a da main e de 2026-11-09/2026-11-12 e e maior em **todos** os seis.
Trazer a versao da branch apagaria trabalho mais recente de outro agente.

| Arquivo | branch | main | Evidencia |
|---|---|---|---|
| `analise-prs/RELATORIO_PRS.md` | 262 linhas (v5, 2026-11-01) | 282 linhas | cabecalho da main: "Sessao: `claude_04/optimistic-lovelace-n960f7` · Data: 2026-11-09" |
| `analise-prs/regras-de-negocio.md` | 74 linhas, 11 secoes rasas | 141 linhas, 11 secoes com `arquivo:linha` | a branch **apaga** as secoes 1–11 da main (SSOT, tipo `Product`, status de orcamento, RLS, tipos do banco, arquivos protegidos, contrato de calendario) e poe no lugar notas soltas das PRs do dia |
| `analise-prs/prs.json` | 47 linhas | 66 linhas | diff (A) da branch: `prs.json \| 719 +++------` (a branch encurtou o arquivo) |
| `analise-prs/prs.csv` | 37 linhas | 52 linhas | `git show …:analise-prs/prs.csv \| wc -l` |
| `analise-prs/progresso.json` | 62 linhas | 91 linhas | idem |
| `analise-prs/baseline/README.md` | 31 linhas | 66 linhas | idem |

### Parte 3 — os 9 dossies: NAO ESTAO na main e nunca estiveram

A main tem 236 fichas em `analise-prs/dossies/`, cobrindo PR-2290 a PR-3292, **mas com um buraco de
PR-2832 a PR-3127** — exatamente a faixa desta sessao.

| Item | Onde esta na main | Evidencia |
|---|---|---|
| `analise-prs/dossies/PR-2927.md` (117 linhas) | **NAO ESTA** | `git log origin/main -- analise-prs/dossies/PR-2927.md` → saida vazia (nunca existiu na main) |
| `analise-prs/dossies/PR-2941.md` (121 linhas) | **NAO ESTA** | `git ls-tree -r origin/main -- analise-prs/dossies/ \| grep -c PR-2941` → 0 |
| `analise-prs/dossies/PR-2940.md` (52 linhas) | **NAO ESTA** (so 1 linha solta em outro arquivo) | `origin/main:docs/estado/PROGRESSO.md:11` "audit suite nav #2940 mergeada 2026-11-01T23:08Z" |
| `analise-prs/dossies/PR-2947.md` (55 linhas) | **NAO ESTA** | `grep -c PR-2947` no `ls-tree` da main → 0 |
| `analise-prs/dossies/PR-2952.md` (48 linhas) | **NAO ESTA** | idem → 0 |
| `analise-prs/dossies/PR-2960.md` (49 linhas) | **NAO ESTA** | idem → 0 |
| `analise-prs/dossies/PR-2942.md` (51 linhas) | **NAO ESTA** | idem → 0 |
| `analise-prs/dossies/PR-2944.md` (39 linhas) | **NAO ESTA** (so 1 linha solta) | `origin/main:docs/estado/PROGRESSO.md:9` "PR #2944 release-1.6.1 aguarda PO" |
| `analise-prs/dossies/PR-2983.md` (37 linhas) | **NAO ESTA** | idem → 0 |

Das 9 PRs, **7 nao sao citadas em nenhum arquivo da main** (`git grep -l "#<n>" origin/main -- analise-prs/ docs/`
retorna 0 para #2927, #2941, #2942, #2947, #2952, #2960 e #2983).

## A resgatar

Um unico item, de prioridade baixa e risco zero: **copiar os 9 arquivos de ficha para `analise-prs/dossies/`**,
sem tocar em mais nada da pasta.

| Arquivo | O que e | Por que importa |
|---|---|---|
| `analise-prs/dossies/PR-2927.md` | ficha da correcao do filtro de lista no botao "voltar" | e o unico registro de por que aquela mudanca entrou e do que foi conferido no banco antes |
| `analise-prs/dossies/PR-2941.md` | ficha da limpeza da allowlist de seguranca (`mcp_kv_get`) | registra que a funcao teve o acesso revogado por travessia e que a entrada ficou obsoleta — contexto de seguranca que hoje nao esta escrito em lugar nenhum |
| `analise-prs/dossies/PR-2940.md` | ficha do item "Audit Suite" no menu | registra que a mudanca foi aprovada **com** um defeito conhecido e 2 comentarios de revisao em aberto |
| `analise-prs/dossies/PR-2947.md` | ficha do volta-atras da travessia `kill_switch_hits` | explica por que arquivo de volta-atras nao conta como mexida em banco de producao — a regra que foi usada para liberar o merge |
| `analise-prs/dossies/PR-2952.md` | ficha do portao de CI das politicas de particao | era uma decisao de dono (mexe em `scripts/check-*`); a ficha registra que o dono aprovou e por que |
| `analise-prs/dossies/PR-2960.md` | ficha da remocao da barra de progresso falsa | registra que o sistema mostrava progresso inventado ao usuario, e que isso foi tirado |
| `analise-prs/dossies/PR-2942.md` | ficha de uma proposta recusada | evita que alguem reabra a mesma proposta sem saber por que foi recusada |
| `analise-prs/dossies/PR-2944.md` | ficha da versao 1.6.1 (robo de release) | registra a regra de nunca aprovar release do robo na mao |
| `analise-prs/dossies/PR-2983.md` | ficha de ajuste em relatorio de auditoria | fecha o buraco de cobertura da faixa 2832–3127 |

**Nao resgatar** os outros 6 arquivos (`RELATORIO_PRS.md`, `regras-de-negocio.md`, `prs.json`, `prs.csv`,
`progresso.json`, `baseline/README.md`): as versoes da main sao posteriores e mais completas, e trazer as da
branch apagaria o trabalho da sessao de 2026-11-09.

## Risco de fechar esta branch

**Baixo, e nenhum risco para o sistema em producao.** Nada aqui e codigo, banco, travessia de banco, funcao de
borda, portao de CI ou configuracao — so texto em `analise-prs/`. Fechar a branch **nao muda uma unica linha do
que esta no ar**: tudo o que ela descreve ja esta na main (Parte 1 acima).

O que se perde e so registro: as 9 fichas sao o unico lugar que explica, com detalhe, por que 9 mudancas do dia
2026-11-01 entraram ou foram recusadas — inclusive duas que entraram **sabendo** de problema (o defeito de
digitacao da #2940 e os comentarios de revisao nao resolvidos da #2960). Se amanha alguem perguntar "por que
isso foi aprovado assim?", a resposta desaparece. E um custo de memoria da equipe, nao de funcionamento.

Observacao de contexto para a decisao: este trabalho **ja foi recusado duas vezes** pelo repositorio (PRs #2956
e #3014 fechadas sem merge) e a pasta foi reescrita por uma sessao mais nova. Fechar a branch apenas confirma
uma decisao que ja foi tomada; o resgate das 9 fichas e um acerto de arquivo, nao uma reversao dessa decisao.

## Nao verificado

- **Por que as PRs #2956 e #3014 foram fechadas.** A consulta so devolve `state: CLOSED` e `closedAt`; nao li os
  comentarios nem quem fechou. Entao nao sei dizer se foram recusadas pelo conteudo ou apenas abandonadas por
  terem sido substituidas pela analise de 2026-11-09.
- **Se o conteudo das 9 fichas esta correto.** Conferi que os 9 arquivos **nao existem** na main e que o codigo
  que elas descrevem **existe** na main. Nao reauditei PR por PR para confirmar se cada afirmacao dentro das
  fichas (SHAs de merge, resultados de CI, horarios) esta certa. Se forem resgatadas, entram como registro
  historico daquela sessao, nao como fato reverificado hoje.
- **Defeito de digitacao ainda vivo na main (achado colateral, fora do escopo desta branch):**
  `origin/main:src/components/layout/SidebarReorganized.tsx:534` tem `// Se ogropo for de Insights…` ("o grupo"
  escrito errado). Esta **dentro de um comentario**, portanto nao afeta o comportamento do sistema; a ficha
  PR-2940.md desta branch e o unico lugar que registra esse achado. Nao medi se ha outro efeito alem do
  comentario.
- **Arquivos sem leitura:** nenhum. O pacote traz os dois diffs (A e B) para todos os 15 arquivos, sem marca de
  TRUNCADO (conferido com `grep -n "^##### ARQUIVO\|TRUNCADO"` no pacote: 15 blocos, 15 pares de diff).
