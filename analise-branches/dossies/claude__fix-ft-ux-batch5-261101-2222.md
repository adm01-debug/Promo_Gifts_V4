# origin/claude/fix-ft-ux-batch5-261101-2222

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Dois dos tres ajustes (remover a marca da area certa no gerador de mockup e mostrar a mensagem certa de CNPJ no cadastro de fornecedor) ja estao no ar; sobra uma unica decisao sua: exigir senha de 8 caracteres tambem na tela de login, o que arrisca travar a entrada de contas antigas.
- **Tip / merge-base / main:** tip `592cc971fc4cce21dd3244ff906f6a4a4c98b2ad` · merge-base `46efff3c841461516aaff9b71a9467828d55727a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um commit unico (`592cc971fc`, 01/11/2026), 3 arquivos, 15 linhas adicionadas. Pela mensagem, sao tres
correcoes de UX independentes agrupadas num "batch 5":

- **FT-167** — No gerador de mockup, o botao de remover a marca recebia o id da area, mas ignorava: sempre
  limpava a area *ativa*. Quem apagasse a marca de uma area nao selecionada apagava a area errada.
- **FT-306** — `loginSchema` exigia senha de no minimo 6 caracteres enquanto o cadastro (`signupSchema`)
  exige 8. A branch alinhou o login para 8, "por consistencia".
- **FT-309** — No cadastro de fornecedor, o erro de CNPJ/CEP/telefone capturado antes do save mostrava a
  mensagem tecnica crua (`err.message`), diferente da mensagem amigavel que o mesmo formulario ja mostrava
  no catch do submit. A branch passou a usar `cnpjErrorHaystack` + `mapCnpjError`, a mesma copy do backend.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| FT-167 — remover a marca da area correta por `areaId` (nao mais da area ativa) | **ESTA**, e numa versao melhor: a main usa a mesma assinatura `(areaId)` e o mesmo `setPersonalizationAreas(prev => prev.map(a => a.id === areaId ? ...))` da branch, e ainda troca `clearAnalysis()` por `clearForArea(areaId)`, limpando a analise de cor so daquela area | `git show origin/main:src/pages/mockups/MockupGenerator.tsx` linhas 335-344: `onLogoRemove={(areaId) => { ... mg.logoColorAnalysis.clearForArea(areaId); mg.setPersonalizationAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, logoPreview: null, logoFile: null } : a)); mg.setGeneratedMockup(null); }}` |
| FT-309 — mensagem de CNPJ consistente no catch de `assertPersistableCnpj/Cep/Phone` | **ESTA**, reescrito como ternario mas com o mesmo comportamento: testa `/cnpj/i` sobre `cnpjErrorHaystack(err)`, deriva a mensagem por `mapCnpjError(err).message`, seta `setCnpjError` e mostra no toast a mensagem mapeada (caindo na crua so quando nao e erro de CNPJ) | `git show origin/main:src/components/admin/products/new-supplier/useNewSupplierForm.ts` linhas 425-430: `const cnpjMsg = /cnpj/i.test(cnpjErrorHaystack(err)) ? mapCnpjError(err).message : null; if (cnpjMsg) setCnpjError(cnpjMsg); toast.error(cnpjMsg ?? msg);` |
| FT-306 — `loginSchema.password` de `min(6)` para `min(8)` | **NAO ESTA** — e a main mantem `min(6)` de proposito, nao por esquecimento | `git show origin/main:src/lib/validations/authSchema.ts` linha 30: `password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')`. O motivo esta em `src/pages/auth/Auth.tsx` linhas 426-439: apos o login bem-sucedido, `if (isWeakPassword(data.password))` desvia a conta para `/reset-password` com o aviso "Sua senha atual nao atende a politica de seguranca". O comentario no codigo e explicito: "Senha abaixo da politica forte atual (contas legadas): forca troca antes de liberar o app". Esse desenho **ja existia no merge-base** (`git show 46efff3c84:src/lib/validations/authSchema.ts` linhas 16-22 trazem `isWeakPassword` e o aviso "Nao endurecer aqui sem revisar os tres consumidores") — ou seja, a branch endureceu o login contra uma decisao que ja estava tomada |

## A resgatar

Nada a resgatar "no automatico". Sobra **um item que precisa da sua decisao**, nao de um merge:

- `src/lib/validations/authSchema.ts` (linha 30) — **exigir 8 caracteres na tela de login**.
  - **Por que a branch quis:** o cadastro ja exige 8; o login aceitar 6 parece incoerente.
  - **Por que a main nao fez:** hoje a conta antiga com senha de 6 ou 7 caracteres **consegue entrar** e e
    imediatamente obrigada a criar uma senha forte (`Auth.tsx:426-439`). Se o login passar a exigir 8, essa
    pessoa e barrada no proprio formulario, nunca chega na tela de troca e so volta pelo "esqueci minha
    senha" por e-mail.
  - **O que esta em jogo para o negocio:** quantos usuarios antigos ainda tem senha curta. Se forem poucos ou
    nenhum, endurecer o login e ganho de seguranca sem custo. Se houver vendedores ativos com senha curta,
    endurecer gera chamado de suporte e vendedor fora do sistema no dia da mudanca.
  - **Observacao tecnica relevante:** nenhum teste trava esse numero. O teste real
    (`src/lib/validations/__tests__/authSchema.test.ts:8,18`) usa a senha `password123`, de 11 caracteres,
    e passaria com 6 ou com 8. Os dois outros arquivos que mostram `min(6)`
    (`tests/e2e/auth-flow.test.tsx:55` e `tests/pages/Auth.test.ts:18`) declaram uma **copia local** do
    schema e nao importam o de producao, portanto nao protegem nada. Conclusao: mudar o numero nao quebra CI
    — o risco e so com gente real.

## Risco de fechar esta branch

Baixo e limitado a um item. As duas correcoes de UX (mockup e fornecedor) ja estao em producao na main com
evidencia linha a linha, portanto fechar a branch nao perde nada delas. O que se perde e o **registro da
pergunta** sobre a senha minima no login: se a branch for apagada sem mais, a incoerencia 6-vs-8 continua
no sistema e ninguem volta a olhar. O risco de *aplicar* o item sem decidir e maior que o de fechar:
trancar na porta usuarios antigos com senha curta, justamente os que o fluxo atual pretende converter para
senha forte.

Esta branch nao toca banco, policy, migration, edge function, workflow nem segredo
(`git diff --name-only 46efff3c84 592cc971fc -- supabase/` retorna 0 arquivos; os 3 arquivos alterados estao
todos em `src/`), entao nao ha risco de infraestrutura em nenhum dos dois caminhos.

## Nao verificado

- **Quantas contas em producao tem senha com menos de 8 caracteres.** Nao da para medir: o Supabase guarda
  apenas o hash da senha, nao o comprimento. So se descobre por telemetria do fluxo
  `isWeakPassword` -> `/reset-password` (quantas vezes esse desvio aconteceu nos ultimos meses) ou aceitando
  o risco e monitorando o suporte depois da mudanca. Sem esse numero, a decisao do item FT-306 e de negocio,
  nao tecnica.
- **Se existe PR aberta desta branch.** Nao consultei o GitHub nesta analise; o veredito saiu so da
  comparacao de codigo entre branch e main.
