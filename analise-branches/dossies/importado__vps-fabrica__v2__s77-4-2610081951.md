# origin/importado/vps-fabrica/v2/s77-4-2610081951

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Testes automaticos que garantem que, na tela de mockup, girar e redimensionar a logo nunca corta a arte em silencio e que, depois de editar, a ficha de aprovacao nao mistura dados do cliente/produto anterior.
- **Tip / merge-base / main:** tip `1385f56b2b9488516ede2842e7518d405a4678c7` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `1385f56b2b` — `test(mockup): matriz de aceite grupo 4 (rotacao e edicao pos-geracao)`.

A branch criou (arquivos novos, nao havia nada antes) a matriz de aceite do **Grupo 4** do mockup, cenarios
A09 e A10:

- **A09** — a logo gira em 0°, +15°, -15° (dando a volta para 345°, nunca negativo) e 90°; e o tamanho
  trava no limite da area de gravacao (badge `Máx 7×3cm` + botao de aumentar desabilitado) em vez de
  estourar a area e cortar a arte em silencio.
- **A10** — depois de gerar o mockup, trocar a tecnica nao substitui o resultado em silencio: abre
  confirmacao que avisa que o resultado antigo sera descartado, e so o confirmar descarta; e a ficha de
  aprovacao e remontada com a configuracao ATUAL, sem residuo do cliente/produto/medida anterior.
- Mais um arquivo de **fixtures ficticias** (`FIXTURE-*`, nenhuma marca ou cliente real, nada de rede,
  relogio ou catalogo).

Arquivos, os dois novos e so de teste:
`tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` e
`tests/components/mockup/acceptance/grupo4.fixtures.ts`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| O arquivo de aceite do Grupo 4 existe | Esta, com o mesmo caminho, os mesmos dois `describe` (A09 e A10) e evoluido por um agente posterior | `tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` na main tem 293 linhas; `describe('A09 …')` na linha 118 e `describe('A10 …')` na linha 178. Entrou pela PR #2736: `git log --oneline origin/main -- tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` → `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fábrica VPS (lote A) (#2736)` |
| A09 — rotacao +15° / -15° / volta ao 0° / 15° / 90° / nunca negativo (345°) | Esta, e mais forte: a main checa o angulo realmente aplicado na logo exibida (`transform: rotate(...)`) dentro do editor real, em vez de so checar o callback | main, mesmo arquivo, linhas 124–147: `expect(anguloDaLogoExibida()).toBe(0)`, `.toBe(15)`, `.toBe(90)`, `.toBe(345)` |
| A09 — tamanho trava no limite da area (sem corte silencioso) | Esta, e mais forte: a main confere o texto que o vendedor ve (`Máx 7×3cm`, `2.5cm`, `3cm`, `7cm`), os botoes desabilitados e ainda o botao "Máxima" | main, mesmo arquivo, linha 150 (`it('o tamanho da logo nunca passa do limite da área…')`) e linha 155 (`expect(screen.getByText('Máx 7×3cm'))`) |
| A09 — botao de **orientacao** (alternar 0°↔90°, e de 90° para 180°) | **NAO ESTA.** A main tirou essa verificacao de proposito, porque o rotulo do botao mudou; o botao continua existindo e funcionando no app, mas sem nenhum teste hoje | A main documenta a exclusao no cabecalho do proprio arquivo, linhas 7–8: "O botão de orientação (0°↔90°) não entra: o rótulo dele muda na n11 (v2/n11-2610082244)". O botao existe na main: `src/components/mockup/logo-editor/LogoQuickActions.tsx:24` (`const newRotation = ((logoRotation || 0) + 90) % 360;`) e o rotulo hoje e "Girar" (mesmo arquivo, linha ~106; veio de `3bd8af6646 feat(mockup): editor de logo com largura e altura proporcionais e botão "Girar" (#3669)`). Nenhum teste da main toca nisso: `git grep -n "Girar" origin/main -- tests/` nao retorna nada, e `git grep -n "Vertical\|Horizontal" origin/main -- tests/` so acha itens de outras telas (kit-builder, quote-stepper) |
| A10 — trocar a tecnica depois de gerar exige confirmacao e so o confirmar invalida o resultado | Esta, e mais forte: a main acrescentou o caso "sem resultado gerado o aviso nao aparece" e o caso "cancelar mantem tudo" | main, mesmo arquivo, linha 179 (`it('trocar a técnica depois de gerar abre uma confirmação…')`), com `expect(setGeneratedMockup).toHaveBeenCalledWith(null)` e o trecho "Cancelar mantém a técnica e o resultado antigo" |
| A10 — ficha de aprovacao remontada da configuracao atual, sem misturar a anterior | Esta, e mais forte: a main usa a MESMA instancia da tela (fecha a ficha, edita, gera de novo) e confere tambem a imagem do mockup e a medida antiga ausente | main, mesmo arquivo, linha 233 (`it('regerar depois de editar: a ficha da nova geração traz só cliente, produto, medida e imagem dela, sem resíduo da anterior')`), com `expect(screen.getByAltText('Mockup')).toHaveAttribute('src', MOCKUP_FIXTURE_URL_B)` |
| Fixtures ficticias do grupo 4 (logo, mockup, 2 clientes, 2 produtos, vendedor, 2 areas, 2 tecnicas) | Estao integralmente, com dois acrescimos da main (`MOCKUP_FIXTURE_URL_B` e `maxWidthCm`/`maxHeightCm` em `AREA_B`) | diff (B) do pacote de evidencia para `tests/components/mockup/acceptance/grupo4.fixtures.ts`: a main so ADICIONA linhas, nao remove nenhuma da branch |
| Assercao `onSizeChange` chamado com `(7, 2.5)` | Substituida por equivalente mais proxima do usuario (o valor que aparece na tela), nao e perda | main, mesmo arquivo, logo apos a linha 155: `fireEvent.click(botaoRotulado('Diminuir altura')); expect(screen.getByText('2.5cm'))` |

Resumo: dos 7 comportamentos da branch, 6 estao na main (5 deles em versao mais forte) e 1 ficou de fora.

## A resgatar

1. **Teste do botao que gira a logo em 90° (hoje chamado "Girar")** — arquivo
   `tests/components/mockup/acceptance/grupo4.acceptance.test.tsx`.
   A branch verificava que esse botao leva a logo de 0° para 90° e de 90° para 180°. A main tirou a
   verificacao porque o rotulo do botao ia mudar (cabecalho do arquivo na main, linhas 7–8) — e ele ja
   mudou: hoje e "Girar" (`src/components/mockup/logo-editor/LogoQuickActions.tsx`, linha ~106, commit
   `3bd8af6646`). Resultado: o botao esta no ar, em producao, e nenhum teste do repositorio o cobre
   (`git grep -n "Girar" origin/main -- tests/` nao retorna nada).
   **Por que importa para o negocio:** esse e o botao que o vendedor usa para deitar ou levantar a logo
   antes de mandar o mockup ao cliente. Se ele parar de funcionar numa mudanca futura, nada avisa: ninguem
   descobre no CI, so o cliente recebendo a arte torta. O resgate e pequeno — uma assercao reaproveitada da
   branch, trocando o nome do botao de "Vertical"/"Horizontal" para "Girar".

## Risco de fechar esta branch

Baixo, mas nao zero. O trabalho de teste da branch esta na main e, nos pontos em que a main mexeu, ficou
melhor do que o original — fechar nao perde a matriz de aceite do Grupo 4. O que se perde e a unica
verificacao que existia do botao de girar a logo em 90°, que hoje roda em producao sem nenhuma rede de
protecao. Nao ha risco para dados, banco, preco ou permissao: a branch nao toca em nada disso, so em
arquivos de teste.

Recomendacao: registrar o item "A resgatar" como tarefa e entao fechar a branch. Sem registrar, o item se
perde junto com ela.

## Nao verificado

- Nao executei a suite (`npm test`) nem na branch nem na main; a comparacao foi feita por leitura do codigo
  e do pacote de evidencia. Portanto nao afirmo que os testes da main passam hoje — afirmo apenas que os
  comportamentos estao escritos nela, com as linhas citadas.
- Nao avaliei os itens que a propria main marca como PENDENTE no cabecalho do arquivo (linhas 12–17: corte
  real da logo pelo `overflow-hidden`/`ctx.clip()`, etapa 52; e o estado "desatualizado" das etapas 69–70).
  Eles sao limitacoes conhecidas do produto, nao trabalho desta branch que tenha ficado de fora.
