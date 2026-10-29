# Graphify — mapas separados e benchmark de versão

**Data:** 2026-10-29  
**Versão homologada:** `graphifyy 0.9.91`  
**Estado:** mapa principal não direcionado; SQL analisado em mapa separado.

## Decisões

1. O relatório chama os nós com grau zero ou um de **nós de baixa conectividade**. É uma medida de vizinhança estrutural, não evidência de causalidade ou de defeito no código.
2. Dependências, saídas geradas, configurações, nós estruturais de arquivo e nós sem origem de código são removidos da população da métrica. Relações com itens excluídos também não entram no grau; declarações com o mesmo nome-base do arquivo continuam sendo avaliadas como nós de código.
3. Todos os arquivos `*.sql` ficam fora do mapa principal. `npm run graphify:sql` extrai migrations e testes SQL em uma saída isolada e ignorada pelo Git, em `graphify-out/sql/`.
4. `npm run graphify:enrich-types` usa a TypeScript Compiler API para registrar referências entre arquivos para declarações de tipos, interfaces, classes e enums. As arestas `references_type` são extraídas do código e indicam referência estática; o mapa continua sendo não direcionado para as análises de comunidade.

## Benchmark isolado: 0.9.68 versus 0.9.91

O teste da versão `0.9.68` foi executado em ambiente isolado; não alterou a instalação global nem o mapa homologado. Na mesma fotografia do repositório, a extração registrou:

| Versão | Nós extraídos | Arestas extraídas | Modo direcionado |
|---|---:|---:|---|
| `0.9.68` | 23.190 | 48.997 | habilitado para avaliação |
| `0.9.91` | 43.127 | 71.301 | habilitado para avaliação |

No modo direcionado, o total aumentou em apenas 28 arcos em relação ao mapa não direcionado nas duas versões avaliadas, e o maior componente fortemente conectado continha 13 nós. Esse resultado não trouxe ganho suficiente para as consultas estruturais e de comunidade usadas pelo projeto. A versão `0.9.91` também extraiu substancialmente mais nós e relações no corpus avaliado.

**Decisão:** manter `0.9.91` e o mapa principal não direcionado. Não atualizar nem substituir a versão homologada com `0.9.68`. O executável global disponível no ambiente é `0.9.97`, enquanto os comandos reproduzíveis do projeto fixam `0.9.91`; a diferença não atualiza a versão homologada automaticamente.

Os totais do benchmark são da extração comparativa e não devem ser comparados diretamente com o grafo final: o mapa final exclui SQL, passa por enriquecimento de referências TypeScript e por clustering.

## Estado dos mapas em 2026-10-29

- Mapa principal (extraído com `0.9.91`): 35.479 nós, 64.053 relações, 1.909 comunidades; `directed: false`.
- Enriquecimento TypeScript: 1.714 arestas `references_type`; 10.343 referências externas ignoradas; 46 arquivos de origem sem nó no mapa e 2 declarações internas sem nó mapeável.
- Mapa SQL separado (execução reproduzível a partir de `HEAD`): 3.189 arquivos versionados, 20.291 nós e 21.533 relações; `build-metadata.json` registra commit, versão, quantidade de arquivos e SHA-256 do corpus. Saída em `graphify-out/sql/graphify-out/graph.json`, não versionada.
- A métrica de baixa conectividade foi recalculada após a extração: 14.620 nós entre 17.844 nós elegíveis. Nós estruturais de arquivo foram excluídos da população.
- Nós de baixa conectividade no mapa principal são recalculados no pós-processamento a cada atualização; o número vigente aparece na seção `Knowledge Gaps` do `graphify-out/GRAPH_REPORT.md`.

## Atualização reproduzível

```sh
npm run graphify:refresh
npm run graphify:sql
npm test -- --run tests/scripts/graphify-metrics.test.mjs tests/scripts/graphify-typescript-references.test.mjs
```

`graphify:refresh` reextrai o mapa principal, adiciona referências TypeScript, reclusteriza e sincroniza métricas e totais do relatório. `graphify:sql` reconstrói somente o mapa SQL. As saídas JSON são locais; os scripts, testes, configuração de exclusão, relatório e este registro são versionáveis.
