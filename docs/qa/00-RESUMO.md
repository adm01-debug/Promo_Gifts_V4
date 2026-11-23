# 00 · Resumo para o dono

> Auditoria de QA somente-leitura · 22 e 23 de novembro de 2026 · versão auditada: commit `ded84e9` de `main`.
> **Nada foi alterado.** Nenhum código, nenhuma migration, nenhum deploy, nenhuma escrita em banco.
> O plano de correção está em `04-PLANO.md`, pronto para outro agente executar etapa por etapa.

## Estado geral

O sistema está em melhor forma do que a maioria dos sistemas nesse estágio. A disciplina de engenharia é visível e
funciona: **a verificação de tipos passa sem um único erro**, o **lint passa sem erro nem alerta**, **nenhuma
dependência tem vulnerabilidade** conhecida, **nenhum segredo foi encontrado comitado hoje**, **todas as 417 tabelas
têm controle de acesso ligado**, o deploy de produção está no ar e sincronizado com `main`, e os webhooks têm
assinatura e proteção contra entrega duplicada — tudo isso foi medido, não suposto.

O problema não é falta de proteção. É que **várias proteções foram escritas, testadas e documentadas sem serem
ligadas**. Esse é o padrão que mais se repete na auditoria: aparece cinco vezes, e é a causa de quase todos os
riscos graves da lista abaixo. O time constrói a trava, guarda a chave na gaveta e segue achando que a porta está
fechada.

Em números: **103 problemas** encontrados, sendo **5 graves** e **31 importantes**. Dos 103, **99 foram
confirmados** lendo o código que roda ou medindo em produção; 4 ficaram como suspeita, e cada um diz o que faltou
para confirmar.

## Os 10 maiores riscos, em linguagem de negócio

1. **Qualquer pessoa na internet pode baixar o seu custo de compra.** Testado e confirmado: com a chave pública que
   vai no site, sem login nenhum, é possível ler o preço que você paga ao fornecedor, o nome e o código do
   fornecedor e a referência dele, produto por produto, do catálogo inteiro. E também o custo de gravação por faixa
   de quantidade. Um concorrente calcula a sua margem em minutos. *(ACH-001, ACH-002 · etapas 002 e 003)*

2. **A trava que deveria ter impedido isso olha para o lugar errado.** Existe um verificador automático que confere
   se alguma informação sensível vazou para a área pública — mas ele só examina uma lista fixa de 8 itens escrita em
   setembro. As três áreas que vazam o custo foram criadas em 21 e 22 de novembro, não estão na lista, e por isso o
   verificador passou verde. *(ACH-005 · etapa 005)*

3. **Uma senha de acesso total ao banco está no histórico do projeto e nunca foi trocada.** O próprio repositório
   registra sete pontos do histórico com essa credencial e a anotação "rotacionar pendente", descrita internamente
   como "a pendência mais antiga, travada desde o começo". Em vez de trocar a senha, o detector de senhas foi
   silenciado para esses pontos. Quem tiver acesso ao repositório — hoje ou a uma copia antiga — obtém uma chave que
   ignora todas as regras de permissão: lê, altera e apaga qualquer dado. *(ACH-012 · etapas 015 a 018)*

4. **O verificador de segurança de código está anunciado como obrigatório e não é.** A lista interna diz que três
   verificações bloqueiam a publicação; na configuração real do GitHub, só uma bloqueia. O verificador de
   vulnerabilidades ficou de fora, e o guarda que deveria detectar isso lê apenas o primeiro item da lista. Uma
   alteração com falha de segurança apontada pode ir para produção. *(ACH-006 · etapas 009 e 010)*

5. **Aplicar um modelo de orçamento apaga o custo da gravação, e o vendedor não vê.** A tela mostra o custo certo na
   lista de modelos; ao aplicar, o valor da personalização sai da conta e o orçamento vai ao cliente sem ele. É
   perda de receita direta, silenciosa, em cada orçamento feito por modelo. Vinte e sete testes passam porque cada
   metade é testada sozinha e ninguém testa o caminho completo. *(ACH-084 · etapas 063 a 066)*

6. **A proposta em PDF do cliente pode ser lida por qualquer pessoa que descubra o endereço.** Os arquivos de
   proposta ficam numa área marcada como pública, sem link temporário e sem prazo de validade. E, entre as contas
   com login, qualquer uma lê a arte e a proposta de qualquer cliente — não só as suas. *(ACH-014, ACH-015 · etapas
   029 a 031)*

7. **Os testes do sistema estão vermelhos e o controle de qualidade não vê.** Medido: 26 testes falham, em 7
   arquivos, concentrados na montagem de kits. A causa de parte deles é um componente que foi removido do sistema
   com os testes dele deixados para trás. Ninguém é avisado porque a verificação que bloqueia a publicação roda uma
   lista fixa de cerca de 70 arquivos, de 1.869. *(ACH-101, ACH-102 · etapas 131 a 137)*

8. **O total do orçamento é calculado em quatro lugares diferentes, com resultados diferentes.** Medido: num caso
   simples a soma das linhas dá R$ 7,98 e o subtotal gravado dá R$ 7,99. O cliente recebe uma proposta em que as
   contas não fecham por centavos. Pior: um alarme interno de "dados inconsistentes" dispara em **toda** cotação com
   desconto percentual, porque o banco grava um estado que o sistema considera inválido — e o time já aprendeu a
   ignorar esse alarme. *(ACH-090, ACH-091, ACH-092, ACH-093 · etapas 103 a 120)*

9. **Regras comerciais que você definiu não existem no sistema.** O mínimo do fornecedor não é verificado nos
   orçamentos (só na montagem de kits), então sai pedido com quantidade que o fornecedor não aceita e a quebra
   aparece na produção, com o cliente já comprometido. E a alçada intermediária de desconto — aquela em que o
   gerente de vendas precisa aprovar — não é lida por nenhuma camada: desconto que deveria subir para aprovação não
   sobe. *(ACH-095, ACH-096 · etapas 121 a 129)*

10. **Uma cotação aprovada não pode ser editada, mas pode ser apagada — com todo o histórico de itens.** A trava
    protege contra alteração e não contra exclusão, e a tela oferece exclusão em massa. Um clique errado leva a
    cotação aprovada e todos os itens dela, sem volta. *(ACH-098 · etapas 038 a 040)*

### Mais três que valem a sua atenção

- **Administradores levam "acesso negado" numa função que é deles.** As quatro contas de administrador não
  conseguem testar nem reenviar webhook, porque o papel "admin" ficou de fora de uma tabela interna de permissões —
  e a mesma correção já foi feita num arquivo vizinho e não foi copiada. Só as duas contas de desenvolvedor
  conseguem. *(ACH-022 · etapa 069)*
- **O cliente que recebe o catálogo digital não consegue imprimir.** O botão "Imprimir" da revista pública manda o
  visitante para a tela de login. *(ACH-046 · etapa 067)*
- **O vendedor continua com o teto de desconto antigo depois de você mudá-lo.** O limite tem duas fontes que não
  conversam; até recarregar a página, ele negocia com o número velho e o desconto passa sem aprovação.
  *(ACH-033 · etapas 080 a 083)*

## Contagem por severidade

| Severidade | O que significa | Quantos |
|---|---|---|
| **Crítica** | perda ou vazamento de dado, falha de segurança, fluxo principal quebrado | **5** |
| **Alta** | função importante falha ou dá resultado errado | **31** |
| **Média** | funciona com defeito ou fragilidade | **45** |
| **Baixa** | acabamento e higiene | **22** |
| | **Total** | **103** |

Confiança: 99 confirmados · 4 com parte em suspeita declarada.
Causas raiz distintas: 31 — ou seja, os 103 problemas vêm de 31 origens, e corrigir a origem resolve vários de uma vez.

O plano tem **300 etapas**, em 8 ondas por ordem de risco. **97 delas ficam com a aprovação esperando por você** —
são as que mexem em banco de produção, em controle de qualidade, em segredo, em infraestrutura, em exclusão de dado
ou em custo.

## Duas boas notícias que a auditoria também mediu

- **Dois riscos da sua lista de pendências já estavam resolvidos** e continuavam ocupando espaço: as divisões de
  histórico para 2027 (que, segundo a documentação, pararia o sistema em janeiro) **existem**, e o risco de número de
  cotação duplicado **já tem** trava no banco. Risco falso competindo com risco real custa atenção.
- **Vários ataques comuns foram testados e não funcionam neste sistema**: não há injeção de SQL nos caminhos
  verificados, não é possível ver cotação de outro cliente pelo endereço, não é possível trancar a conta de outra
  pessoa errando a senha dela, a área administrativa exige segundo fator, e nenhuma chave privada vai no site. A
  lista completa do que foi testado e está limpo está no fim de `03-ACHADOS.md` — vale como registro de que já foi
  verificado e não precisa ser reauditado.

## O que esta auditoria NÃO cobriu

Isto é importante: **o que não está na lista acima não foi declarado seguro, foi declarado não verificado.**

- A **suíte de testes de navegador** (627 testes) não rodou: exige um ambiente com dados de teste que não existia
  nesta sessão.
- O **empacotamento para produção** (`npm run build`) não foi executado.
- As **1.087 regras de acesso** do banco e as **1.360 funções** de banco não foram lidas uma a uma; foi feita uma
  verificação estrutural em todas (e ela voltou limpa) mais uma amostragem dirigida nas áreas de cotação, cliente,
  mockup e arquivo de arte.
- Os **89 fluxos de automação** não foram lidos um a um, só os ligados a publicação, banco, segredo e aos
  verificadores citados.
- **Nenhum teste de carga nem de concorrência real** foi feito: escreveria em produção. Tudo o que envolve "duas
  pessoas ao mesmo tempo", "clicar duas vezes" ou "rede caindo no meio" foi analisado no código, nunca executado.
- As jornadas de **montagem de kit, mockup e frete** foram cobertas por leitura, sem usar as telas.
- As integrações com **Cloudflare Images, Roboflow e ElevenLabs** ficaram fora: exigem credencial e chamada ao
  terceiro.
- **Acessibilidade** só no básico objetivo; não houve auditoria completa nem teste com leitor de tela.
- O **banco do CRM externo** não foi auditado — ele está fora do sistema e só é alcançado por uma ponte.

A etapa 300 do plano existe justamente para reauditar essas camadas depois que o resto estiver corrigido, quando
houver suíte de teste confiável e ambiente para isso.

Uma observação de ferramenta, porque afeta todo agente que trabalhar aqui: **o acesso automatizado à Vercel está
quebrado** (o projeto responde "não encontrado"). Nesta auditoria o estado do deploy teve de ser obtido por um
caminho indireto, e nenhum agente consegue hoje diagnosticar publicação, variável de ambiente ou log de erro pela
Vercel. É a etapa 176.
