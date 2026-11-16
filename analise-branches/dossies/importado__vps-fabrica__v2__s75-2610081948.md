# origin/importado/vps-fabrica/v2/s75-2610081948

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** no passo "Produto" do gerador de mockup, deixa o vendedor trocar a cor do brinde sem perder cliente e logo (ja na producao) e, o que ainda falta, explica para que serve escolher o produto e avisa quem usa leitor de tela que o catalogo esta carregando.
- **Tip / merge-base / main:** tip `f724394f2a3520d1816aa673cbcdf1bdae687035` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico `f724394f2a` — "feat(mockup): passo Produto com estados reais e troca de variante sem perder cliente/logo".
O proprio cabecalho do teste criado pela branch lista as quatro entregas:

1. **Sem produto escolhido:** o passo orienta a busca em vez de ficar mudo (frase "Nenhum produto selecionado — busque o brinde para orientar a tecnica, a area e a revisao visual", ligada ao botao de busca por `aria-describedby="mockup-product-empty-hint"`).
2. **Carregando:** a grade de esqueleto passa a ser anunciada como status (`role="status"`, `aria-busy="true"`, `aria-label="Carregando produtos"`) e nada clicavel incompleto aparece dentro dela.
3. **Sem foto utilizavel:** a confirmacao de cor nao avanca com `/placeholder.svg`; mostra alerta e oferece outra foto / outro produto. Nasce aqui a funcao `getUsablePhotos` (so URLs reais, sempre o original do CDN, miniatura e original da mesma foto contam uma vez).
4. **Trocar variante:** botao "Trocar variante de \<produto\>" na ficha do produto confirmado + o passo pendente vencer a ficha (`if (selection && !pendingProductId)`), para que a troca de cor nao exija limpar a selecao e perder cliente e logo (que vivem fora do componente, em `useMockupGenerator`).

Toca somente `src/components/mockup/MockupProductSelector.tsx` e o teste novo. Nao ha migration, policy, funcao de banco nem edge function.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Botao "Trocar variante de \<produto\>" na ficha do produto confirmado | **Esta** (resgatado em PR anterior) | `src/components/mockup/MockupProductSelector.tsx:231-240` — `aria-label={\`Trocar variante de ${selection.product.name}\`}` com icone `RefreshCw`; entrou por `git log -S"Trocar variante de" origin/main -- src/components/mockup/` → `e5afe82459 fix: trem das 5 correcoes ja verdes — ... 3 resgates, gerador de mockup ...` |
| Passo pendente vence a ficha (senao o clique nao abre nada) | **Esta**, ampliado | `src/components/mockup/MockupProductSelector.tsx:216` — `if (selection && !pendingProductId && !pendingVariant)`, com o comentario "Passo pendente vence a ficha: sem isso 'Trocar variante' nao abriria nada" |
| Teste de que a troca preserva cliente e logo | **Esta**, reescrito | `tests/components/mockup/MockupProductSelector.states.test.tsx` na main e dedicado a isso: `describe('MockupProductSelector — trocar variante de produto confirmado')`, com os `data-testid="client"` / `"logo"` do mesmo Harness |
| `getUsablePhotos` (so foto real, sempre o original, dedupe de miniatura+original) | **Esta**, renomeada e movida | `src/components/mockup/mockupVariantPhotos.ts:18` `export function getMockupVariantPhotos(...)`; mesma semantica (linhas 22-43: descarta placeholder, variante manda, dedupe pela base do CDN, devolve `getCdnUrl(url,'public')`). Reexportada em `src/components/mockup/MockupProductSelector.tsx:30`. Entrou por `ed4529c511 fix(mockup): geracao usa a foto original escolhida, nunca a miniatura` |
| Nao avancar sem foto utilizavel (nada de `/placeholder.svg` na geracao) | **Esta**, com UX diferente | `src/components/mockup/MockupPhotoPicker.tsx:34-37` — `photos.length === 0` → `<p role="alert">Este produto nao tem foto utilizavel para gerar o mockup.</p>` e nenhuma opcao clicavel; teste `tests/components/mockup/MockupProductSelector.photo.test.tsx:192-199` ("produto sem foto utilizavel nao deixa avancar"). Diferenca: a main oferece so "Voltar"; a branch oferecia "Escolher outra foto" e "Escolher outro produto" |
| Orientacao no passo vazio ("Nenhum produto selecionado — busque o brinde ...") + `aria-describedby="mockup-product-empty-hint"` | **NAO ESTA** | `grep -rn "mockup-product-empty-hint\|Nenhum produto selecionado" src tests` → so `src/hooks/simulator/useWizardDrafts.ts:61` (mensagem de erro de outro fluxo). `git log -S"mockup-product-empty-hint" origin/main` → **zero commits**: nunca entrou. O botao de busca na main (`MockupProductSelector.tsx:291-306`) nao tem `aria-describedby` e nao ha frase de orientacao; `grep -n 'aria-describedby' src/components/mockup/MockupProductSelector.tsx` → 0 ocorrencias |
| Esqueleto de carregamento anunciado (`role="status"` + `aria-busy` + `aria-label="Carregando produtos"`) | **NAO ESTA** | a main extraiu o esqueleto para `src/components/mockup/MockupCatalogStates.tsx:58-71` (`CatalogGridSkeleton`) e ele e uma `div` sem `role`, sem `aria-busy` e sem `aria-label`; o uso em `MockupProductSelector.tsx:388-389` tambem nao embrulha nada. `git log -S"Carregando produtos" origin/main -- src/components/mockup/` → **zero commits** |
| Testes dos estados "sem produto" e "carregando" | **NAO ESTAO** | a versao da main de `tests/components/mockup/MockupProductSelector.states.test.tsx` substituiu os quatro testes por um `describe` so de troca de variante; os dois casos (`'sem produto: orienta a busca...'`, `'carregando: anuncia o skeleton como status...'`) aparecem apenas como remocao no diff branch→main |

Nota de contexto: a main evoluiu o passo para **dois estagios** (cor → foto real, via `MockupPhotoPicker`) e extraiu estados de catalogo (`CatalogEmptyState`, `CatalogGridSkeleton`, `CatalogLoadError`) porque `MockupProductSelector.tsx` esta em 489 linhas, no teto do gate de 500 (`MockupCatalogStates.tsx:8-9`). Logo, o resgate dos dois itens pendentes deve ser feito **dentro de `MockupCatalogStates.tsx`**, nao inflando o selector.

## A resgatar

1. **Frase de orientacao no passo vazio + ligacao com o botao de busca** — `src/components/mockup/MockupProductSelector.tsx` (texto e `aria-describedby`). Hoje, quem abre o passo "Produto" ve so um botao "Buscar produto": nao ha nada dizendo que a escolha do brinde e o que define a tecnica, a area de gravacao e a revisao visual. Baixo custo, zero risco tecnico.
2. **Anunciar o carregamento do catalogo** — `src/components/mockup/MockupCatalogStates.tsx` (`CatalogGridSkeleton` sem `role="status"`/`aria-busy`/`aria-label`). Quem usa leitor de tela nao recebe aviso nenhum enquanto a grade carrega; e tambem a garantia de que nada clicavel incompleto aparece no meio do carregamento. O repo ja usa esse padrao em outros lugares (`src/components/replenishments/ReplenishmentProductGrid.tsx:218` tem exatamente `role="status" aria-label="Carregando produtos"`), entao e so aplicar o mesmo padrao.
3. **Os dois testes correspondentes** — `tests/components/mockup/MockupProductSelector.states.test.tsx` (ou arquivo novo). Sem eles, os dois comportamentos acima voltam a cair fora dos portoes na proxima refatoracao, como ja aconteceu.

## Risco de fechar esta branch

Nada de dinheiro, estoque, preco ou dado de cliente: o que se perde e **acabamento do passo "Produto" do gerador de mockup**. Concretamente: (a) o passo continua sem explicar por que escolher o brinde importa, o que custa duvida e suporte com vendedor novo; (b) o carregamento do catalogo segue invisivel para leitor de tela, o que e um ponto de acessibilidade em aberto (e pode reprovar auditoria de acessibilidade se houver). O resgate e pequeno — duas frases de interface, tres atributos e dois testes — e nao toca banco, pagamento nem permissao. Fechar sem resgatar perde trabalho ja feito e revisado por outro agente.

## Nao verificado

- Nao executei `npm test` nem `npm run qa:typecheck`: a tarefa e somente leitura, logo nao ha afirmacao minha de "testado/validado" sobre o comportamento em execucao. Todas as conclusoes acima vem de leitura de codigo da main de hoje (`e4ab7f85d9`), com arquivo:linha, e de `git log -S`.
- Nao avaliei se a troca de variante da main (cor → foto, dois cliques) e preferivel a da branch (um clique) do ponto de vista de negocio; ambas preservam cliente e logo, que era o defeito-alvo.
- Arquivos sem leitura por truncamento: **0** (o pacote trouxe os dois arquivos com os dois diffs completos, sem marca de TRUNCADO).
