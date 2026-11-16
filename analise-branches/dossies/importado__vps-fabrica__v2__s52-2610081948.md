# origin/importado/vps-fabrica/v2/s52-2610081948

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** no editor de mockup, a logo do cliente deixou de ser cortada em silencio quando e girada ou ampliada — o vendedor passa a ver um aviso vermelho "Marca cortada pela area de aplicacao" antes de mandar a arte para a fabrica.
- **Tip / merge-base / main:** tip `71f797453c3ffab8aef96fbf1dda2a1627cf8b3b` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`71f797453c` — "fix(mockup): giro e escala da logo nao cortam a marca em silencio"), em 2 arquivos
(`git diff --stat c194982c5f 71f797453c`: 349 insercoes, 24 remocoes).

Problema que ela atacou, conforme o proprio comentario do codigo: a caixa da marca no preview tinha tamanho fixo
(= tamanho de calibracao) e `overflow-hidden`, e a imagem girava/escalava **dentro** dela. Girar 90 graus uma marca
larga, ou ampliar acima de 1, empurrava a marca para fora da caixa e o corte acontecia sem nenhum aviso na tela.

O que ela entregou:
1. `getMarkFootprint()` — calcula a caixa real (bbox) da marca depois do giro e da escala;
2. `isMarkClipped()` — decide se essa caixa ultrapassa a area de aplicacao, com tolerancia de 0,5 px para nao
   acusar corte por arredondamento, e sem afirmar corte quando a area ainda nao foi medida (0 px);
3. `useAreaSize()` — mede a area de aplicacao e acompanha mudancas de tamanho (`ResizeObserver`, com queda para
   `window.resize`);
4. reestruturacao do DOM: `logo-drag-area` (pega do arraste, no tamanho de calibracao, para nao encolher) +
   `logo-brand-box` (caixa da marca, acompanha giro/escala e **sem** `overflow-hidden`);
5. aviso visivel de corte: `Badge` destrutivo com `role="status"` e texto "Marca cortada pela area de aplicacao";
6. arquivo novo de teste `LogoPreviewCanvas.clip.test.tsx` (191 linhas, 25 casos/blocos) provando o contrato:
   bbox correta em 0/15/90 graus e escalas 0.4/3, caixa sem recorte, pega que nao encolhe, aviso quando corta,
   nenhum aviso quando nao corta e nenhum aviso sem area medida.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `getMarkFootprint()` (bbox da marca girada/escalada) | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx:28` | `git grep -n -F getMarkFootprint e4ab7f85d9` → `LogoPreviewCanvas.tsx:28:export function getMarkFootprint(` |
| `isMarkClipped()` + tolerancia de 0,5 px + area 0 px nao afirma corte | `LogoPreviewCanvas.tsx:52`, constante em `:45`, usada em `:56` | `git grep -n -F isMarkClipped e4ab7f85d9` → `:52:export function isMarkClipped(`; `git grep -n -F CLIP_TOLERANCE_PX e4ab7f85d9` → `:45:const CLIP_TOLERANCE_PX = 0.5;` |
| `useAreaSize()` (mede a area e acompanha resize) | `LogoPreviewCanvas.tsx:72`, chamada em `:268` | `git grep -n -F useAreaSize e4ab7f85d9` → `:72:function useAreaSize(...)` e `:268: const area = useAreaSize(containerRef);` |
| Corpo das 3 funcoes identico ao da branch (nada enfraquecido na main) | linhas 4–104 do arquivo | `diff` entre `git show 71f797453c:...LogoPreviewCanvas.tsx` (linhas 1–130) e `git show e4ab7f85d9:...` (linhas 1–105): as unicas diferencas sao 3 linhas de `import` (a main importa mais icones) — o bloco 4–104 e byte-identico |
| Pega do arraste no tamanho de calibracao (`logo-drag-area`, `dragWidth`/`dragHeight`) | `LogoPreviewCanvas.tsx:347` e calculo em `:274-275` | `git show e4ab7f85d9:...` linhas 345–357: `data-testid="logo-drag-area"` com `width: ${dragWidth}px` |
| Caixa da marca sem recorte (`logo-brand-box`, sem `overflow-hidden`) | `LogoPreviewCanvas.tsx:362` | `git show e4ab7f85d9:...` linhas 359–368: `data-testid="logo-brand-box"`, `className="absolute left-1/2 top-1/2 rounded-sm ring-2 ring-primary/30"` — sem `overflow-hidden`, com o comentario original da branch preservado |
| `data-clipped` na caixa da marca | `LogoPreviewCanvas.tsx:363` | `git grep -n -F data-clipped e4ab7f85d9` → `:363: data-clipped={clipped ? 'true' : 'false'}` |
| Aviso visivel "Marca cortada pela area de aplicacao" com `role="status"` | `LogoPreviewCanvas.tsx:405` (testid) e `:409` (texto) | `git grep -n -F "Marca cortada pela área de aplicação" e4ab7f85d9` → `:409`; `git grep -n -F logo-clip-warning e4ab7f85d9` → `:405` |
| Arquivo de teste `LogoPreviewCanvas.clip.test.tsx` | existe na main, 25 blocos/casos | `git show e4ab7f85d9:...__tests__/LogoPreviewCanvas.clip.test.tsx` → 25 linhas de `it(`/`describe(`/`nome:`, mesmo numero do tip da branch |
| Cada nome de teste da branch | todos presentes | varredura de todos os nomes de `it(`/`describe(` do tip da branch contra o arquivo da main: **nenhum ausente** |
| Quando entrou | PR **#2739**, commit `294cee8389` "fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS)" | `git log -S"getMarkFootprint" --oneline e4ab7f85d9 -- src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` → so `294cee8389`; `git log --oneline --diff-filter=A e4ab7f85d9 -- .../LogoPreviewCanvas.clip.test.tsx` → o mesmo `294cee8389` |

Por que os 2 arquivos ainda "diferem da main": a main **andou para frente em cima** deste trabalho, nao para o lado.
O diff branch→main e **puramente aditivo** sobre a parte da branch:
- acrescenta o rotulo de estado de geometria (`describeGeometry`, `GeometryState`, `logo-geometry-state`) e os campos
  em cm (`maxWidthCm`, `logoWidthCm`, ...);
- acrescenta acessibilidade por teclado (`onKeyDown`, `role="group"`, `aria-describedby`, `useId`);
- move o aviso de corte de `bottom-2` para `bottom-10` para nao sobrepor o novo rotulo de geometria (a logica e o
  texto do aviso ficam intactos);
- no arquivo de teste, as diferencas sao **somente reformatacao do Prettier** (listas quebradas em varias linhas) e
  a troca `string | undefined | null` → `string | null | undefined` na assinatura do helper `px`. Nenhum caso de
  teste foi removido nem afrouxado.

## A resgatar

Nada. Todos os 10 itens de comportamento da branch foram localizados na main de hoje, com evidencia individual na
tabela acima, inclusive os corpos de funcao byte-identicos.

## Risco de fechar esta branch

Praticamente nulo. O aviso de logo cortada e a caixa que acompanha giro/escala estao em producao na main (PR #2739),
com os mesmos 25 testes automaticos que a branch escreveu para proteger esse comportamento. Fechar a branch nao
tira nada do sistema: o vendedor continua vendo o aviso vermelho antes de enviar a arte. O unico efeito e perder o
historico isolado do commit `71f797453c`, cujo conteudo ja esta na main.

## Nao verificado

- Nao executei `npm test` nem abri a tela no navegador nesta sessao: a verificacao foi estatica (presenca dos
  simbolos, dos `data-testid`, do texto de UI e dos nomes de teste na main, mais comparacao byte a byte das
  funcoes). O comportamento em tempo de execucao na main nao foi observado por mim.
- Nao conferi se a PR #2739 nasceu desta branch ou se outro agente reaplicou o mesmo patch: o repo usa squash-merge,
  entao a branch nao e ancestral da main por construcao. Isso nao afeta o veredito, que se apoia no conteudo
  presente na main, nao na topologia do git.
- Arquivos sem leitura por truncamento: 0 (o pacote trouxe os 2 arquivos integralmente, com os dois diffs).
