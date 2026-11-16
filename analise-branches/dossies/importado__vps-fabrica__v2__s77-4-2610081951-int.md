# origin/importado/vps-fabrica/v2/s77-4-2610081951-int

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** adiciona testes automaticos que vigiam a tela de mockup — garantem que girar e redimensionar a logo obedece o limite da area de gravacao e que, ao trocar a tecnica ou gerar de novo, a ficha enviada ao cliente nunca sai com dados ou imagem da geracao anterior.
- **Tip / merge-base / main:** tip `076dc259f5dd6f19b9d67c762e4ea6f8d8f32344` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos de teste, nenhum de codigo de producao:

- `1385f56b2b` — "test(mockup): matriz de aceite grupo 4 (rotacao e edicao pos-geracao)" (Fabrica Hermes)
- `076dc259f5` — "test(mockup): grupo 4 da matriz de aceite assere o resultado visivel e deixa de fixar o oposto da regra do dono" (Claude integrador)

A intencao declarada no corpo do commit `076dc259f5` e na cabeca do arquivo:

1. **A09** — testar a rotacao pelo resultado *visivel* (o `transform` que o preview aplica a logo), nao pelo rotulo do botao: `+15` leva a 15 e, em seis passos, a 90; o botao do valor atual volta a 0; `-15` abaixo de 0 da a volta para 345 (nunca negativo). E o tamanho da logo nunca passa do limite da area — "Maxima" para exatamente nele.
2. **A10 (a)** — trocar a tecnica depois de gerar nao aplica em silencio: abre confirmacao que so avisa do descarte quando HA resultado gerado; cancelar nao muda nada; confirmar invalida o resultado (`setGeneratedMockup(null)`).
3. **A10 (b)** — reescrito de proposito porque o teste original fixava o OPOSTO da regra do dono (reabria a ficha com dados novos e imagem antiga). Passou a exigir que ficha e imagem nascam do mesmo snapshot.
4. Deixou **declarado como PENDENTE** no cabecalho, sem transformar em teste: "sem corte silencioso" (etapa 52) e "editar marca o resultado antigo" para posicao/tamanho/rotacao/logo/cliente (etapas 69-70).
5. Ajustes de robustez: consultas por texto/aria-label em vez de `getByRole` (A09 chegava a 15 s sob carga) e timeout de 60 s nos 3 testes pesados.

Arquivos criados pela branch (`git diff --name-status c194982c5f 076dc259f5`): apenas
`tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` (A) e
`tests/components/mockup/acceptance/grupo4.fixtures.ts` (A). Nada fora de `tests/`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O arquivo de teste inteiro (293 linhas) | `tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` | `git log origin/main -- tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` → `31ebc2d35c 2026-10-29 test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)` — entrou por squash-merge |
| As fixtures | `tests/components/mockup/acceptance/grupo4.fixtures.ts`, **byte a byte igual** | `git diff --stat 076dc259f5 e4ab7f85d9 -- .../grupo4.fixtures.ts` → saida vazia |
| A09: rotacao chega a 90 em seis passos | main, linha 132 | `expect(anguloDaLogoExibida()).toBe(90);` |
| A09: `-15` da a volta para 345, nunca negativo | main, linhas 143 e 147 | `expect(anguloDaLogoExibida()).toBe(345);` |
| A09: "Maxima" para exatamente no limite da area | main, linhas 150, 167, 170 | `fireEvent.click(botao('Máxima'));` dentro do teste `o tamanho da logo nunca passa do limite da área...` |
| A10 (a): aviso de descarte so com resultado gerado | main, linhas 179, 195, 197 | `expect(aviso()).toContain('O mockup gerado será descartado');` e, sem resultado, `expect(aviso()).not.toContain('descartado');` |
| A10 (a): confirmar invalida o resultado | main, linha 229 | `expect(setGeneratedMockup).toHaveBeenCalledWith(null);` |
| A10 (b): ficha da nova geracao sem residuo da anterior | main, linha 233 | teste `regerar depois de editar: a ficha da nova geração traz só cliente, produto, medida e imagem dela, sem resíduo da anterior` |
| A10 (b): botao aceita os dois rotulos | main, linhas 262-264 | regex `/Gerar Layout - IA\|Gerar documento/` preservada |
| Cabecalho com os PENDENTES declarados | main (cabecalho do arquivo preservado) | diff branch→main tem 1 linha so (abaixo); o cabecalho nao aparece nele, logo esta identico |

**A unica diferenca entre a branch e a main hoje** (diff (B) do pacote, `git diff 076dc259f5 e4ab7f85d9`, 1 linha):

```
-      name: TECNICA_SERIGRAFIA.name,
+      name: TECNICA_SERIGRAFIA.name ?? '',
```

A main **endureceu** o teste (proteje contra `name` nulo/undefined, tipicamente para passar o typecheck). Nao removeu nem enfraqueceu nada da branch. A main ainda ganhou, depois, os grupos 1, 3, 5, 6 e 7 que a branch nao tem (`git diff --stat 076dc259f5 e4ab7f85d9 -- tests/components/mockup/acceptance/` → +1796 linhas em main, −1 na branch).

Observacao sobre a armadilha: a branch nao e ancestral da main e o patch-id nao bate — esperado, porque a entrada foi por squash-merge (#2736). Isso nao indica perda; a comparacao de conteudo mostra identidade.

## A resgatar

Nada. Os dois arquivos da branch estao na main; um identico, o outro com uma melhoria feita depois pela propria main.

## Risco de fechar esta branch

Nenhum risco pratico. A branch nao tem codigo de produto, nao toca banco, policy, funcao do banco, edge function, workflow nem configuracao — so dois arquivos dentro de `tests/`. Tudo o que ela escreveu ja esta rodando na main, com um ajuste que a main fez por cima. Fechar nao muda nada no sistema que o cliente usa e nao apaga nenhuma protecao de teste.

Unico ponto a nao esquecer (nao e risco de fechar, e trabalho que a branch deliberadamente deixou de fora): os dois itens marcados PENDENTE no cabecalho do teste continuam sem cobertura automatica — (1) a logo girada/ampliada ser recortada em silencio pelo preview e pela composicao estatica (etapa 52) e (2) editar posicao, tamanho, rotacao, logo reenviada ou cliente nao marcar o resultado antigo como desatualizado (etapas 69-70). Isso pertence as branches das etapas 52 e 69-70, nao a esta.

## Nao verificado

- Nao executei a suite (`npm test`) para confirmar que o grupo 4 passa hoje na main; a verificacao foi de conteudo (presenca dos asserts no arquivo da main), nao de execucao.
- Nao confirmei se os PENDENTES (etapas 52 e 69-70) foram cobertos por outro arquivo da main; esta fora do escopo desta branch.
- Arquivos sem leitura por truncamento: 0. O pacote nao reportou TRUNCADO e os 2 arquivos da branch foram lidos.
