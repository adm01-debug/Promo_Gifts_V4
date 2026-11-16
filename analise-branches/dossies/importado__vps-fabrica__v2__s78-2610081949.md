# origin/importado/vps-fabrica/v2/s78-2610081949

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** deixa a tela de mockup usavel por quem navega so com teclado ou leitor de tela (e com o dedo no celular), dizendo em voz alta a cor e o estoque de cada variante — e isso ja esta no ar.
- **Tip / merge-base / main:** tip `98bb2cd57a790fc1547ae2f03557d7043b92dab7` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`98bb2cd57a`, "Fabrica Hermes", 2026-10-09), de acessibilidade na tela de mockup:

1. **ProductSearchCombobox** — nome acessivel fixo no gatilho da busca (corrige a violacao axe `button-name`), alvo de toque de 44px e spinner que respeita `prefers-reduced-motion`.
2. **MockupColorSelector** — cada variante de cor passa a anunciar "cor + estoque", com 44px de alvo de toque, foco visivel e animacao reduzida.
3. **LogoSizeControls** — nome acessivel nos tres sliders (Largura / Altura / Escala).
4. **ui/slider** — repassa `aria-label`/`aria-labelledby` do Root para o Thumb, porque o nome de um `role="slider"` pertence ao thumb e o Radix nao repassa. Corrige `aria-input-field-name` para **todos** os sliders do app.
5. **Novo teste** `a11y.mockup.test.tsx` (jest-axe + teclado + nomes acessiveis), 283 linhas.
6. **Snapshot** de `NegotiationMarkupCard` atualizado para refletir o `aria-label` que passou a sair no thumb.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Slider repassa `aria-label`/`aria-labelledby` ao Thumb | `src/components/ui/slider.tsx:23-24` (identico; na main so a **redacao do comentario** mudou: "mantendo essas props tambem no Root") | `git show origin/main:src/components/ui/slider.tsx` linhas 18-27 — `aria-label={props['aria-label']}` / `aria-labelledby={props['aria-labelledby']}` presentes. Diff (B) do pacote mostra como unica diferenca duas linhas de comentario |
| Variante de cor anuncia cor + estoque | `src/components/mockup/MockupColorSelector.tsx:199-203` | `git show origin/main:...MockupColorSelector.tsx \| grep -n` → `199: aria-label={...}`, `201: 'estoque zerado'`, `202: unidades em estoque` |
| Variante com 44px, foco visivel e `motion-reduce` | `MockupColorSelector.tsx:205-206` | mesma saida: `205: ... min-h-[44px] ... motion-reduce:transition-none`, `206: focus-visible:ring-2 focus-visible:ring-primary ...` |
| Skeleton da variante com `motion-reduce:animate-none` | `MockupColorSelector.tsx:163` | mesma saida: `163: ... bg-card p-3 motion-reduce:animate-none` |
| `aria-label` nos tres sliders do logo | `LogoSizeControls.tsx:120` (Largura), `:160` (Altura), `:225` (Escala) | `git show origin/main:...LogoSizeControls.tsx \| grep -n "aria-label"` → `120: aria-label="Largura (cm)"`, `160: "Altura (cm)"`, `225: "Escala (%)"` |
| Gatilho da busca: nome acessivel + 44px + spinner com motion-reduce | `ProductSearchCombobox.tsx:95` (`aria-label`), `:103` (`min-h-[44px]`), `:189` (`animate-spin ... motion-reduce:animate-none`) | o arquivo **nao aparece** na lista dos 5 que diferem (ou seja, main e branch sao identicos nele) e o grep na main confirma as tres linhas |
| Teste `a11y.mockup.test.tsx` | existe na main, mesmos 283 testes; na main as 4 assercoes `expect(results).toHaveNoViolations()` viraram `expect(results.violations).toEqual([])` (ratchet de assercoes do repo) | `git cat-file -e origin/main:src/components/mockup/__tests__/a11y.mockup.test.tsx` → OK; diff (B) do pacote mostra apenas essas 4 linhas |
| Snapshot do NegotiationMarkupCard com `aria-label` no thumb | `NegotiationMarkupCard.visualA11y.test.tsx.snap:173` e `:484` | `grep -n "Margem de negociação em porcentagem"` na main → linhas 152, 173, 463, 484. Diff (B) mostra como unica diferenca o nome do teste sem aspas simples |
| **Como entrou** | squash-merge `f6ffe3710b` na main, 2026-10-29, "fix(a11y): comentario do slider sem o token 'as <Tipo>' (ratchet de assercoes)", corpo: "Origem: entrega da fabrica VPS v2/... revisada e reaplicada sobre a main" — `--stat` lista exatamente os 6 arquivos da branch (319 insercoes) | `git show --stat f6ffe3710b`; `git log -S"unidades em estoque" --oneline origin/main -- src/components/mockup/MockupColorSelector.tsx` → so `f6ffe3710b` |

As diferencas que sobram nos 5 arquivos sao **evolucao posterior da main**, nao trabalho perdido da branch:

- `MockupColorSelector.tsx`: a main ganhou depois um estado de erro proprio ("Nao foi possivel carregar a lista de cores deste produto" + botao "Tentar novamente") que impede auto-selecionar produto sem cor quando a carga falha — recurso que a branch nao tinha.
- `LogoSizeControls.tsx`: a main ganhou depois o botao "Proporcao vinculada / Proporcao livre" (`aspectLinked`) — recurso que a branch nao tinha.

## A resgatar

Nada. Todos os 6 itens do commit estao na main de hoje, com evidencia linha a linha na tabela acima.

## Risco de fechar esta branch

Nenhum risco pratico. O que a branch entrega esta em producao desde 29/10/2026 e a main hoje tem **mais** do que ela (estado de erro na escolha de cor e vinculo de proporcao do logo). Fechar a branch nao remove nada do sistema. Manter a branch aberta, ao contrario, so cria risco de alguem reaplica-la e **desfazer** esses dois recursos mais novos da main.

## Nao verificado

- Nao executei `npm test` nem o axe para confirmar que os testes de acessibilidade passam hoje na main — a verificacao foi de presenca de codigo e historico, nao de execucao.
- Nao verifiquei visualmente no navegador o anuncio do leitor de tela; a evidencia e o codigo e o teste automatizado versionados.
