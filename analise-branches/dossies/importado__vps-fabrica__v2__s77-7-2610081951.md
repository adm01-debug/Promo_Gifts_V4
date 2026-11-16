# origin/importado/vps-fabrica/v2/s77-7-2610081951

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante, por teste automatico, que a ficha de aprovacao do mockup sai com a mesma imagem/data/referencia que o vendedor viu na tela, e que arquivos de arte acima do tamanho permitido sao recusados em vez de quebrar o envio.
- **Tip / merge-base / main:** tip `6d20f946b85d1661cae2e40b11d97788d271c995` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`6d20f946b8` — "test(mockup): matriz de aceite grupo 7 (saidas e historico A18-A20)"), que **so adiciona testes**. Nenhuma mudanca de codigo de producao, de banco ou de edge function.

A branch criou 2 arquivos novos (saida de `git diff --name-status c194982c5f 6d20f946b8`):

- `A  tests/components/mockup/acceptance/grupo7.acceptance.test.tsx`
- `A  tests/components/mockup/acceptance/grupo7.fixtures.ts`

Cenarios cobertos, conforme o cabecalho do proprio teste:

- **A18** — a ficha de aprovacao sai da mesma revisao que a imagem: mesma referencia (`MK-AAAAMMDD-HHMM`), mesma data, mesma imagem, e o PDF baixado nomeado pela mesma referencia.
- **A20** — limites de upload: raster ate 10 MB (`MultiAreaManager`) e arte original AI/EPS/PDF/SVG/CDR ate 25 MB (`ArtFileUpload`), com recusa acima do limite e recusa de extensao fora da lista.
- **A19** — deliberadamente **nao** virou teste; o proprio arquivo declara que depende de correcao nao integrada (cartao `t_a87fe5f2`, branch `v2/s63-2610081947`). Isso e uma decisao registrada da branch, nao uma lacuna dela.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Arquivo de teste `grupo7.acceptance.test.tsx` | Esta na main | `git log --oneline origin/main -- tests/components/mockup/acceptance/grupo7.acceptance.test.tsx` → `b243f02ffd`, `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)` (2026-10-29) |
| Fixtures `grupo7.fixtures.ts` | Esta na main, **byte a byte igual** a versao da branch | `git diff --stat 6d20f946b8:tests/.../grupo7.fixtures.ts origin/main:tests/.../grupo7.fixtures.ts` → saida vazia; `git cat-file -e origin/main:tests/.../grupo7.fixtures.ts` → existe |
| Teste A18, 1o caso ("ficha baixa com a MESMA imagem, referencia e data") | Esta na main, identico exceto o nome do botao clicado | Diff (B) do pacote: unica alteracao no bloco A18 e `/Gerar Layout - IA/` → `/Gerar documento/` |
| Teste A18, 2o caso ("ficha fixa mantem referencia, data e imagem no PDF") | Esta na main, identico | Diff (B) do pacote nao toca esse bloco |
| Teste A20 (raster 10 MB, arte 25 MB, extensao invalida) | Esta na main, identico exceto 2 `waitFor` de `aria-busy` adicionados pela main | Diff (B) do pacote: so 2 hunks de adicao, nenhuma remocao de assercao |
| Nota de que A19 fica pendente | Esta na main (comentario preservado) | `grep -n "A19" tests/components/mockup/acceptance/grupo7.acceptance.test.tsx` → linha 10 do arquivo da main |

### Por que o unico arquivo que "difere" nao e trabalho perdido

O diff (B) branch→main tem **3 hunks, todos de adaptacao da main, nenhuma assercao removida**:

1. `-fireEvent.click(await screen.findByRole('button', { name: /Gerar Layout - IA/ }))` → `+... /Gerar documento/`. A main **renomeou o botao no produto**: `src/components/mockup/approval/MockupLayoutButtons.tsx:343` renderiza `Gerar documento`, e o comentario de cabecalho do componente (linha 3) diz `"Gerar documento" monta o papel timbrado`. O teste da branch, com o nome antigo, **falharia na main de hoje**. A main corrigiu o seletor; a cobertura e a mesma.
2 e 3. `+await waitFor(() => expect(arte.container.querySelector('[aria-busy="true"]')).toBeNull())` antes de cada novo `fireEvent.change`. A main introduziu trava de um envio por vez em `ArtFileUpload`: `src/components/mockup/ArtFileUpload.tsx:243` tem `aria-busy={isUploading}`. Sem essa espera o teste ficaria instavel. E endurecimento do teste, nao perda.

Ou seja: o commit `b243f02ffd` ("test(mockup): testes do lote alinhados a main atual", 2026-10-29) e exatamente o ato de **integrar e atualizar** esses testes. Como o repo usa squash-merge (PR #2736), a branch nao e ancestral da main e o patch-id nao bate — o que, conforme o criterio desta tarefa, nao prova nada; a verificacao por comportamento (nome do teste, assercoes, fixtures identicas) mostra que tudo entrou.

## A resgatar

Vazio. Nenhum item da branch ficou de fora: a versao da main contem todas as assercoes da branch e mais duas esperas de estabilidade, e o arquivo de fixtures e identico.

## Risco de fechar esta branch

Nenhum risco pratico. A branch nao tem codigo de produto, de banco nem de edge function — so testes, e esses testes ja rodam na main em versao mais atual (ajustada ao nome de botao e a trava de upload que existem hoje). Fechar a branch nao remove cobertura nem muda comportamento do sistema. Se a branch fosse reaplicada como esta, ela na verdade **pioraria** a main: reintroduziria o seletor `/Gerar Layout - IA/`, que nao existe mais no produto, deixando o teste vermelho.

Unico ponto para nao perder de vista (independe desta branch): o cenario **A19** — excluir o ultimo item da ultima pagina do historico e reconciliar a pagina — continua sem teste na main, por dependencia declarada do cartao `t_a87fe5f2` / branch `v2/s63-2610081947`. Isso e um item de backlog que vive no comentario do arquivo da main (linha 10), nao algo que se perca ao fechar esta branch.

## Nao verificado

- Nao executei a suite (`npm test`) para confirmar que a versao da main de `grupo7.acceptance.test.tsx` passa; a tarefa e somente leitura e nao rodei testes. A conclusao de incorporacao se apoia em comparacao de conteudo e historico do git, nao em execucao.
- Nao confirmei se a PR #2736 foi a unica porta de entrada do arquivo (ha tambem `b243f02ffd` no historico do caminho); isso nao altera o veredito, pois ambos os commits estao em `origin/main`.
