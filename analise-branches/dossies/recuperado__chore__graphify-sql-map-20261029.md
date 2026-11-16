# origin/recuperado/chore/graphify-sql-map-20261029

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada muda para quem usa o site ou o painel: e so a ferramenta interna que monta o "mapa do codigo" usado pelos agentes de IA, e esse mapa ja esta no sistema de hoje, em versao mais nova.
- **Tip / merge-base / main:** tip `94159f01e0b30c284465fd4ca26cb1b2d1006d6c` · merge-base `c344508711797a730893644449b16a05f12f4fce` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico `94159f01e0` (2026-10-29), "chore(graphify): separar mapa SQL e referencias TypeScript". Quatro
objetivos, pela propria mensagem e pelo conteudo:

1. Tirar migrations/testes SQL do grafo principal (`*.sql` no `.graphifyignore`) e gerar para eles um grafo
   separado, por um script Python novo (`scripts/graphify/build_sql_map.py`).
2. Extrair relacoes entre simbolos TypeScript (arestas `references_type`) com a TypeScript Compiler API
   (`scripts/graphify/enrich_typescript_references.mjs`).
3. Corrigir a metrica do relatorio: trocar "isolated nodes" por "nos de baixa conectividade", excluindo
   lockfiles, configuracoes e nos estruturais (`scripts/graphify/postprocess_report.mjs`).
4. Documentar o procedimento, a versao homologada do Graphify e o benchmark `0.9.68` vs versao homologada
   (`docs/graphify/README.md`), com dois testes unitarios cobrindo (2) e (3).

Nenhum arquivo de banco, policy, grant, funcao do banco ou edge function e tocado: o script apenas **le**
arquivos `*.sql` ja versionados para montar o corpus do grafo (`build_sql_map.py`, `git ls-files -- *.sql`).

O mesmo trabalho entrou na main no mesmo dia, por squash-merge da PR #2719 — `66d032afa8` 2026-10-29
"chore(build): separa mapas SQL e amplia referencias Graphify (#2719)" — com os arquivos renomeados de
snake_case para kebab-case, e foi evoluido depois por `dced532a34` (2026-11-01, "fixa Graphify") e
`a3f9f2e44b` (2026-11-10).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Ignorar `*.sql` no grafo principal | `.graphifyignore:52-55`, secao "SQL EM MAPA SEPARADO" (mesmo bloco, texto reescrito e movido para depois dos grafos proprios) | `git show origin/main:.graphifyignore` → linhas 52-55: `# === SQL EM MAPA SEPARADO ===` … `*.sql` |
| Script que monta o grafo SQL isolado | `scripts/graphify/build-sql-graph.py` (renomeado de `build_sql_map.py`); mesmo desenho e mais: lista so `*.sql` versionados, copia para corpus temporario, grava em diretorio separado e escreve `build-metadata.json`, acrescentando `input_sha256` que a branch nao tinha | `build-sql-graph.py:18-34` (`suffix.lower() != ".sql"`, `git ls-tree`), `:47-70` (`TemporaryDirectory(prefix="promo-gifts-sql-map-")` + `graphify extract`), `:71-85` (`graphify-out/build-metadata.json` com `source_commit`, `version`, `sql_files`, `nodes`, `edges`) |
| Clusterizacao do mapa SQL (a branch fazia `update --no-cluster` + `cluster-only`) | Coberto: a main chama `extract` **sem** `--no-cluster`, ou seja, clusteriza no proprio passo | `build-sql-graph.py:63-70` (sem `--no-cluster`) contra `scripts/graphify-local.mjs:662-672`, onde `--no-cluster` e passado de proposito e so ai um `cluster-only` separado e necessario |
| Pin da versao do Graphify (branch: exigia `0.9.97` instalado) | Mais forte na main: a versao e fixada na propria invocacao, `graphifyy[sql]==<versao>` via `uv tool run`, com default `0.9.91` e decisao escrita de manter `0.9.91` | `build-sql-graph.py:15,65`, `package.json:69` (`uv tool run --from graphifyy==0.9.91`), `docs/graphify/AUDITORIA_MAPAS_E_BENCHMARK_2026-10-29.md:25` ("manter `0.9.91` … nao autoriza atualizacao global implicita") |
| Arestas `references_type` via TypeScript Compiler API | `scripts/graphify/enrich-typescript-references.mjs` (renomeado); mesma relacao, mesma origem, mesmo texto de contexto, resolucao de alias e deduplicacao, mais contadores de descarte | `:41` (`checker.getAliasedSymbol`), `:49` (`ts.isTypeReferenceNode`), `:165-169` (`relation: 'references_type'`, `_origin: 'typescript-compiler-api'`, `context: \`type/interface ${edge.name}; ${edge.count} referência(s)\``), `:105` (`enrichGraphWithTypeReferences`), `:177` (`skippedUnmappedSources`) |
| Metrica "nos de baixa conectividade" (grau ≤1) no relatorio | `scripts/graphify/postprocess-report.mjs` + `scripts/graphify/graph-metrics.mjs` (a logica que a branch tinha inline foi extraida para modulo proprio) | `graph-metrics.mjs:43-93` (`calculateLowConnectivity`, `degree > 1 → continue`), `:96-109` (`replaceKnowledgeGapMetrics`, rotulo `nós de baixa conectividade (grau ≤ 1)`), `postprocess-report.mjs:9-19` (guarda `existsSync` + log `nós de baixa conectividade`) |
| Exclusao de lockfiles/manifests/configuracoes/nao-codigo da metrica | `graph-metrics.mjs:8-13,28-40`, cobrindo tudo o que a branch excluia (package-lock, pnpm/yarn/bun lock, tsconfig, `*.config.*`, `.github/`, `.vscode/`, `.husky/`, `.devcontainer/`, `node_modules/`, `dist/`, `build/`, `coverage/`, nao-codigo) e ainda dependencias declaradas no `package.json` | `graph-metrics.mjs:13` (`CONFIG_FILE`), `:8-12` (`DEPENDENCY_SEGMENTS`, `CONFIG_SEGMENTS`), `:30-38` (`exclusionReason`) |
| Exclusao de no estrutural ligado so por `contains` | Decisao **invertida de proposito** na main: o no-arquivo estrutural e excluido da populacao (`isStructuralFileNode`), mas as relacoes `contains` continuam contando no grau, para nao inflar o numero | `graph-metrics.mjs:19-26,52-53`, comentario `:58-60` ("Keep Graphify's structural degree semantics (including file/contains links)") e decisao escrita em `docs/graphify/AUDITORIA_MAPAS_E_BENCHMARK_2026-10-29.md:10` |
| Teste das referencias de tipo | `tests/scripts/graphify-typescript-references.test.mjs` (renomeado de `enrich-typescript-references.test.mjs`); cobre aresta entre arquivos, idempotencia e arquivo ausente do grafo | `:27` ("adds cross-file type/interface edges and stays idempotent"), `:65-67` (`relation: 'references_type'`), `:72` ("skips files absent from the primary graph") |
| Teste da metrica do relatorio | `tests/scripts/graphify-metrics.test.mjs` (renomeado de `postprocess-graphify-report.test.mjs`); cobre as exclusoes, a troca do rotulo em ingles e a preservacao do aviso de comunidades finas | `:5` ("excludes dependencies, config and SQL…"), `:38` ("uses the required Portuguese label and removes the old isolated-node wording"), `:41-43,54` (`isolated node(s)` → ausente; `thin communities` preservado) |
| `docs/graphify/README.md` (49 linhas) | O arquivo com esse nome NAO existe na main; o conteudo esta em `docs/graphify/AUDITORIA_MAPAS_E_BENCHMARK_2026-10-29.md`, tema por tema: mapas separados, versao homologada, benchmark `0.9.68`, referencias TypeScript, metrica de conectividade e passos de regeneracao | `:1` (titulo "mapas separados e benchmark de versao"), `:4` (versao homologada), `:14-25` (benchmark `0.9.68` versus versao homologada + decisao de nao substituir), `:12` (`references_type`), `:9-10,32-35` (metrica de baixa conectividade e seu caveat), `:43-51` (`npm run graphify:refresh`, `npm run graphify:sql`, os dois testes) |
| Passos de regeneracao como comando unico | Mais do que a branch: viraram scripts npm | `package.json:66-69` (`graphify:enrich-types`, `graphify:postprocess-report`, `graphify:sql`, `graphify:refresh`) |

Diferenca menor, verificada e sem valor de negocio: a branch tinha um `--dry-run` no enriquecedor
(`enrich_typescript_references.mjs`, `cli()`); a main nao tem (`enrich-typescript-references.mjs:8-9`, so
argumentos posicionais de grafo e tsconfig). E conveniencia de desenvolvedor, nao comportamento do sistema.

## A resgatar

Vazio. Nenhum item da branch ficou de fora.

## Risco de fechar esta branch

Praticamente nulo. As tres ferramentas, os dois testes, a regra de ignorar SQL e a documentacao estao na
main em versao posterior e mais completa, e a main ja evoluiu esses mesmos arquivos duas vezes depois
(2026-11-01 e 2026-11-10). Reabrir o conteudo da branch hoje seria **retrocesso**: traria de volta a
exigencia da versao `0.9.97`, contra a decisao registrada de fixar `0.9.91`, e a regra antiga de
conectividade que a main trocou de proposito. Nada no sistema para o cliente final depende disso.

## Nao verificado

- Nao foi executado nenhum dos scripts (`graphify:refresh`, `graphify:sql`, os dois testes) nesta analise:
  a comparacao foi de conteudo e comportamento declarado nos arquivos da main, nao execucao. Afirmacoes
  acima sao sobre codigo lido, nao sobre corrida verde.
- Nao foi verificado qual versao do Graphify esta instalada no ambiente de quem roda hoje; a divergencia
  entre `0.9.97` (branch) e `0.9.91` (main) e decisao ja registrada na main, nao pendencia desta branch.
