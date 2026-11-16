# origin/importado/vps-fabrica/v2/s54-2610081948

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** no gerador de mockup, quem escolhe uma empresa que ja tem a marca cadastrada no CRM aplica essa marca no produto com um clique, sem precisar procurar e subir o arquivo da logo na mao.
- **Tip / merge-base / main:** tip `1e7ddd0958d0e0457d77f106da30b1c7648e45ee` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`1e7ddd0958`, 08/10/2026): *"feat(mockup): acao 'Usar logo do cliente' aplica a marca do CRM na area ativa"*.
A branch mexeu em exatamente 3 arquivos (`git diff --name-only c194982c 1e7ddd0958`), todos em `src/components/mockup/`:

1. Mostrar um botao **"Usar logo do cliente"** abaixo do chip da empresa selecionada, **so quando** aquela empresa tem `logo_url` no CRM (`MockupClientSelector.tsx`, nova prop opcional `onUseClientLogo`).
2. Ao clicar, baixar a imagem do CRM, transformar em arquivo e manda-la pelo **mesmo caminho do upload manual** (`onLogoUpload`), para passar pelas mesmas validacoes de formato/tamanho/SVG e pela analise de cores; se falhar, avisar por toast, registrar log e **nao mexer** no cliente nem no produto ja escolhidos (`MockupConfigPanel.tsx`, `handleUseClientLogo`).
3. Teste de comportamento cobrindo os 4 casos: aparece a acao com logo; aplica na area ativa como `File`; empresa sem logo nao oferece a acao; falha de download preserva cliente e produto (`__tests__/MockupClientSelector.logo.test.tsx`, arquivo novo).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Prop `onUseClientLogo` no seletor de empresa | `src/components/mockup/MockupClientSelector.tsx:28` (declaracao), `:65` (desestruturacao) | `git grep -n onUseClientLogo origin/main -- src` |
| Botao de UI com o texto "Usar logo do cliente", condicionado a `logo_url` | `src/components/mockup/MockupClientSelector.tsx:230` (`{selectedClient.logo_url && onUseClientLogo && (`), `:235` (`data-testid="mockup-client-use-logo"`), `:237` (`onClick`), `:240` (rotulo) | mesma saida de `git grep` |
| Botao fora do chip (nao aninhar controle interativo dentro de controle) | main mantem o padrao: o chip e montado em `const chip` e o botao sai num fragmento irmao, com o comentario "Fora do chip para não aninhar controles interativos (nested-interactive)" | diff (B) do pacote, `MockupClientSelector.tsx` hunk `@@ -152,11 +209,24 @@` |
| Ligacao painel → seletor (`onUseClientLogo={handleUseClientLogo}`) | `src/components/mockup/MockupConfigPanel.tsx:174` | `git grep -n onUseClientLogo origin/main -- src` |
| Handler: escolhe area ativa com fallback para a 1a area; sem area, toast "Selecione uma área de personalização antes de usar a logo do cliente." | `src/components/mockup/MockupConfigPanel.tsx:120-126` (`const areaId = activeAreaId ?? personalizationAreas[0]?.id;`) | `git show origin/main:src/components/mockup/MockupConfigPanel.tsx \| sed -n 115,140p` |
| Handler: baixa, vira `File` e entra por `onLogoUpload` (mesmo caminho do upload manual) | `src/components/mockup/MockupConfigPanel.tsx:128` (`onLogoUpload(areaId, await fetchClientLogoFile(client.logo_url));`) — a logica do download foi **extraida** para `src/components/mockup/clientLogoFile.ts:8` `fetchClientLogoFile` | mesma saida; `git show origin/main:src/components/mockup/clientLogoFile.ts` |
| Handler: falha avisa por toast, loga e nao altera cliente/produto | `src/components/mockup/MockupConfigPanel.tsx:129-133` (toast "Não foi possível carregar a logo do cliente. Faça o upload manual." + `log.error('use_client_logo_failed', ...)`) | mesma saida |
| Teste 1 — com logo aparece a acao | `__tests__/MockupClientSelector.logo.test.tsx:143` | `git show origin/main:... \| grep -n "  it("` |
| Teste 2 — aplica na area ativa como `File` validado | `__tests__/MockupClientSelector.logo.test.tsx:151` | idem |
| Teste 3 — sem logo nao oferece a acao | `__tests__/MockupClientSelector.logo.test.tsx:173` | idem |
| Teste 4 — falha mantem cliente e produto | `__tests__/MockupClientSelector.logo.test.tsx:183` | idem |
| (bonus da main, nao existia na branch) recusa resposta 200 sem Content-Type de imagem | `clientLogoFile.ts:11` (`if (!blob.type.startsWith('image/')) throw ...`) + teste em `...logo.test.tsx:199` | idem |

Quando entrou na main: `git log -S"onUseClientLogo" --oneline origin/main -- src/components/mockup/MockupClientSelector.tsx` aponta um unico commit, `e5afe82459` (14/11/2026) — *"fix: trem das 5 correções já verdes — recibos, código morto do CRM, 3 resgates, gerador de mockup e aba Marketing (#3647)"*. A propria mensagem fala de "3 resgates" e "gerador de mockup": este trabalho foi resgatado por PR squash-merge, por isso a branch nao e ancestral da main.

**Por que os 3 arquivos ainda diferem da main (sem nada da branch de fora):** as diferencas de hoje sao trabalho que a main acumulou DEPOIS, nos mesmos arquivos, por outros motivos — busca de empresa no servidor do CRM (`searchCompaniesRemote`, debounce, react-query), navegacao por teclado/ARIA no combobox, confirmacao antes de remover a empresa (`ConfirmDialog`), `CompanyAvatar` movido para arquivo proprio, estados de erro/retry de tecnicas e area, `Technique` movido para `mockupTechnique`. Nada disso remove a acao da logo; ela aparece inteira dentro desse codigo novo.

## A resgatar

Nada. Os 3 arquivos da branch e todos os comportamentos do commit estao na main, com um endurecimento extra (recusa de conteudo que nao e imagem) que a branch nao tinha.

## Risco de fechar esta branch

Praticamente nulo. O recurso que a branch criou esta no ar na main hoje — o botao "Usar logo do cliente", o download validado e os 4 testes de comportamento, mais um quinto teste que a main acrescentou. Fechar a branch nao remove nada do sistema e nao desfaz nenhuma protecao. O unico efeito de mante-la aberta e ruido: ela carrega uma versao antiga desses arquivos (sem a busca de empresa no servidor, sem a confirmacao ao remover empresa e sem a recusa de arquivo que nao e imagem); se alguem tentasse aplica-la hoje, estaria regredindo o gerador de mockup.

## Nao verificado

- Nao executei `npm test` nem lint nesta sessao (a tarefa e somente leitura); a verificacao e por codigo e nome de teste na main, nao por suite rodada.
- Nao abri o GitHub para localizar o numero da PR original desta branch; a atribuicao ao commit `e5afe82459` vem de `git log -S` no proprio repo, nao do historico de PRs.
