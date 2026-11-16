# origin/importado/vps-fabrica/v2/n67-2610082251

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante, por teste automatico, que a tela de criacao de mockups continue utilizavel por quem depende de leitor de tela, tanto no celular quanto no computador — e isso ja esta valendo em producao.
- **Tip / merge-base / main:** tip `03f629bf6b299a4b278200f901c268a648562d1c` · merge-base `3ebd35e6d379ce27f6d6687e2a5bbc31bb8baae9` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`03f629bf6b`, "Fabrica Hermes 2026-10-13"), com a mensagem
`test(a11y): varredura axe da pagina do gerador de mockups (3 estados x 375/1280)`.

A branch adicionou **um unico arquivo novo** e nada mais:

```
$ git diff --name-status 3ebd35e6d3 03f629bf6b
A	tests/pages/MockupGenerator.a11y.test.tsx
```

O conteudo (360 linhas) e um teste de acessibilidade que roda o axe-core (WCAG 2.1 AA) sobre a
pagina inteira do gerador de mockups (`document.body`, incluindo os dialogos em portal), nos tres
estados da pagina (vazio, configurando, resultado) e em duas larguras de tela (375px e 1280px).
Inclui um harness proprio para compensar o jsdom nao carregar o Tailwind
(`applyResponsiveVisibility`, `setViewport`, `BREAKPOINT_VISIBILITY`) e dubles acessiveis para os
paineis que buscam dados no mount.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| O arquivo `tests/pages/MockupGenerator.a11y.test.tsx` inteiro (360 linhas) | Esta na main, no mesmo caminho. Entrou **byte a byte identico** pelo squash da PR #3671. | `git rev-parse 03f629bf6b:tests/pages/MockupGenerator.a11y.test.tsx` → `9211cef04e7bee1e305fdc5d95cdec962b083a3c`; `git rev-parse c72d30a9ce:tests/pages/MockupGenerator.a11y.test.tsx` → **mesmo blob** `9211cef04e...` |
| Commit que levou o arquivo para a main | `c72d30a9ce` (2026-11-15) — `fix(mockup): etapas do gerador voltam a ser anunciadas pelo leitor de tela no celular (#3671)` | `git log --diff-filter=A --format='%h %ad %s' origin/main -- tests/pages/MockupGenerator.a11y.test.tsx` → `c72d30a9ce 2026-11-15 ... (#3671)`; `git show --stat c72d30a9ce -- <arquivo>` → `1 file changed, 360 insertions(+)` (exatamente as 360 linhas da branch) |
| Varredura axe nos 3 estados x 2 larguras (o contrato que a branch queria proteger) | Esta na main, ativa. | `tests/pages/MockupGenerator.a11y.test.tsx:284` na main: `describe.each(VIEWPORTS)('MockupGenerator — acessibilidade da página ($width px)'...)`; chamadas de `auditPage` nas linhas 303, 314, 326, 345, 359 |
| Harness de breakpoint do Tailwind (`applyResponsiveVisibility`, `BREAKPOINT_VISIBILITY`, `auditPage`) | Esta na main, com os mesmos nomes. | `tests/pages/MockupGenerator.a11y.test.tsx:181`, `:189`, `:194`, `:241`, `:242` na main (`git grep` em `e4ab7f85d9`) |
| Diferenca que resta hoje entre branch e main | **A main esta a frente**, nao atras: uma linha **adicionada depois** pela main. Nada da branch foi removido. | `git diff 03f629bf6b e4ab7f85d9 -- tests/pages/MockupGenerator.a11y.test.tsx` → `1 file changed, 1 insertion(+)`: `+ 'setLastSavedArea resetProjectIdentity ' +`, vinda de `ecface83bd` (#3674, 2026-11-15) |

Conclusao: a unica contribuicao da branch entrou na main sem perda, e a divergencia atual do arquivo
e evolucao posterior da main (duas chaves novas do hook `useMockupGenerator`), nao trabalho perdido.
E o caso (a) descrito na tarefa, comprovado por igualdade de blob — a forma mais forte de evidencia
possivel, mais forte que patch-id.

## A resgatar

Nada. Nao ha item da branch ausente da main.

## Risco de fechar esta branch

Nenhum risco de perda de trabalho. Todo o conteudo proprio da branch (um arquivo de teste) ja esta
em producao, e a main inclusive o melhorou depois. Fechar a branch nao remove nenhum teste, nao
muda nenhuma tela, nao toca banco de dados, nao toca integracao nem configuracao. O unico "custo"
seria historico: perde-se o registro de que essa varredura de acessibilidade nasceu nessa branch —
informacao que fica preservada neste dossie e no commit `c72d30a9ce` da main.

## Nao verificado

- Nao executei a suite de testes (`npm test`) para confirmar que a versao atual do arquivo na main
  passa. Nao era necessario para o veredito: a decisao e sobre o arquivo estar ou nao na main, e
  isso foi provado por igualdade de blob. Se a main estivesse com o teste quebrado, isso seria
  problema da main, nao desta branch.
- Nao verifiquei se a PR #3671 foi aberta a partir desta branch ou se o mesmo arquivo foi recriado
  por outro agente. Indiferente para a decisao: o blob e identico, logo o conteudo chegou intacto.
- Arquivos sem leitura por truncamento: 0. O pacote truncou o fim do diff (A), mas o diff
  branch->main completo (1 linha de insercao) prova que **todas** as linhas da branch estao na main,
  o que torna a leitura do diff (A) dispensavel.
