# origin/importado/vps-fabrica/v2/docs-criar-docs-fabrica-vps-faq-md-com-p-2610081318

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Cria uma pagina de perguntas e respostas que explica, em linguagem de dono, como as correcoes feitas pelos robos chegam (ou nao) ao site e por que nada entra em producao sem aprovacao humana.
- **Tip / merge-base / main:** tip `c648a8c6a3faa2f52d55ad1574cf4591591af666` / merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`c648a8c6a3`, "docs(fabrica): criar FAQ da fabrica de correcoes (VPS Hostinger)") cria
um unico arquivo novo, `docs/FABRICA_VPS_FAQ.md`, com 41 linhas e 5 perguntas. E documentacao: nao toca
codigo, banco, edge function, workflow nem configuracao.

O proprio texto se declara "documento irmao" de `docs/FABRICA_VPS.md`. Ou seja: eram dois cartoes da mesma
fabrica. O irmao entrou na main (`c7424e37b4`, PR #2088, `git log --oneline origin/main -- docs/FABRICA_VPS.md`);
este FAQ nao. O caminho `docs/FABRICA_VPS_FAQ.md` nunca existiu na main em nenhum momento da historia:
`git log --oneline --follow origin/main -- docs/FABRICA_VPS_FAQ.md` nao retorna nada, e `git log -S"FAQ da Fabrica"
--oneline origin/main` tambem nao.

As cinco perguntas sao: (1) como um cartao vira codigo na branch `v2/*`; (2) por que a fabrica nunca faz
merge na main; (3) o que acontece quando o portao automatico reprova; (4) quais arquivos a fabrica nao pode
tocar e por que; (5) como o dono revisa e aprova a entrega pelo Pull Request.

Conclusao da verificacao: os **fatos** do FAQ estao, quase todos, duplicados no documento irmao que ja esta
na main. O que ficou de fora e o **formato** (perguntas e respostas para quem nao e dev) e um punhado de
justificativas e consequencias que o irmao nao registra.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Q1 - fluxo do cartao: worktree isolada e branch propria | `docs/FABRICA_VPS.md:11` | "Cada cartao e uma tarefa no kanban interno (uma worktree isolada, uma branch propria)." |
| Q1 - convencao `v2/<slug>-<timestamp>` | `docs/FABRICA_VPS.md:22-28` | "Formato: `v2/<slug-da-tarefa>-<timestamp>`" + exemplo na linha 28 |
| Q1 - provas obrigatorias (`typecheck` + `vitest related`) | `docs/FABRICA_VPS.md:35` | "**Provas obrigatorias:** `npm run typecheck` verde e `npx vitest related --run <arquivos>` verde." |
| Q1 - padrao de commit `tipo(escopo): descricao` | `docs/FABRICA_VPS.md:47-56` | secao 4 inteira, com os tipos aceitos |
| Q1 - "a branch parte da `main`" (ponto de partida explicito) | NAO ESTA | nenhuma linha de `docs/FABRICA_VPS.md` afirma de onde a branch parte; o gate so compara "o diff contra `origin/main`" (linha 32-33) |
| Q2 - agente nao faz push/merge/deploy | `docs/FABRICA_VPS.md:17` e `docs/fabrica-vps/validacao-publicacao.md` | "O agente **nunca faz push, merge ou deploy** - isso e do integrador."; o stub reforca "Push, merge, PR e deploy ficam com o integrador" |
| Q2 - "nenhum agente aprova o proprio trabalho" | `docs/FABRICA_VPS.md:18` | frase literal: "Nenhum agente aprova o proprio trabalho." |
| Q3 - as 7 regras do `gate.py` (typecheck/vitest, 12 arquivos/400 linhas, caminho proibido, guardas SSOT/GUARD/CRITICO/DO NOT REMOVE, teste afrouxado, segredo, projeto Supabase antigo) | `docs/FABRICA_VPS.md:32-45` | secao 3 lista as sete, uma a uma; nenhuma regra do FAQ esta ausente |
| Q3 - consequencia da reprovacao: "nada e mergeado; o cartao volta bloqueado e o agente corrige ou escala o motivo" | NAO ESTA | a main diz apenas "reprova na hora" (`docs/FABRICA_VPS.md:33`); `git grep -F "cartao volta bloqueado" origin/main` = 0 hits |
| Q4 - lista dos caminhos intocaveis (client.ts, types.ts, supabase/migrations + config.toml, .github/workflows, .env*, package.json/lockfiles, .husky, baselines) | `docs/FABRICA_VPS.md:37-41` | lista identica, com os mesmos rotulos curtos |
| Q4 - o **porque** de cada caminho: incidente do Lovable que reverteu as guardas de SSOT e derrubou producao | NAO ESTA neste contexto | a main rotula so "(guardas de SSOT - REGRA #1)" (linha 38); `git grep -l -F "derrubou producao" origin/main` aponta apenas `docs/auditoria-planejado-nao-executado-2026-10-11/A06_banco_dba.md`, outro documento e outro assunto |
| Q4 - `types.ts`: editar a mao quebra a tipagem (REGRA #4) | PARCIAL | a main diz so "(arquivo gerado)" (linha 39); a consequencia e a referencia REGRA #4 nao aparecem no doc da fabrica |
| Q4 - `.github/workflows/`: nao podem virar `continue-on-error` | NAO ESTA neste contexto | a main so lista o caminho (linha 41); a expressao aparece em workflows reais, nunca como regra da fabrica |
| Q5 - merge na main e sempre humano, via Pull Request | `docs/FABRICA_VPS.md:18` | "O merge na `main` e **sempre humano, via Pull Request**." |
| Q5 - o rito da revisao: integrador empurra e abre o PR; o dono le o diff, confere as provas do cartao, aprova e mergeia; pediu ajuste o cartao reabre; reprovou a branch e descartada | NAO ESTA | `git grep -F "branch e descartada" origin/main` = 0 hits; a main nao descreve o que o dono faz dentro do PR nem os dois desfechos |
| o arquivo `docs/FABRICA_VPS_FAQ.md` em si | NAO ESTA; nunca existiu | `git log --follow origin/main -- docs/FABRICA_VPS_FAQ.md` sem saida; `git ls-tree -r --name-only origin/main \| grep -i faq` sem hit |

## A resgatar

1. **`docs/FABRICA_VPS_FAQ.md` - o documento em formato pergunta e resposta.** Por que importa: o documento
   que esta na main (`docs/FABRICA_VPS.md`) e uma referencia tecnica em topicos; este e escrito para o dono,
   que nao e dev, responder sozinho "como isso chega no site?" sem abrir o repo. E o unico conteudo proprio
   da branch e nao existe em lugar nenhum da main.
2. **`docs/FABRICA_VPS_FAQ.md` (Q4) - a justificativa de cada arquivo proibido, incluindo o incidente real
   em que as guardas de SSOT foram revertidas e a producao caiu.** Por que importa: a main lista os arquivos
   intocaveis mas nao diz o preco de toca-los. Essa e a memoria institucional que impede o proximo agente
   (ou o proximo bot) de repetir a queda; sem ela a regra parece burocracia.
3. **`docs/FABRICA_VPS_FAQ.md` (Q3) - o que acontece depois que o portao reprova** ("nada e mergeado; o cartao
   volta bloqueado e o agente corrige ou escala"). Por que importa: diz ao dono que uma reprovacao nao e
   trabalho perdido nem risco solto, e explica quem fica responsavel pelo cartao bloqueado.
4. **`docs/FABRICA_VPS_FAQ.md` (Q5) - o rito de aprovacao no Pull Request e os dois desfechos** (pediu ajuste
   reabre o cartao; reprovou descarta a branch). Por que importa: e a instrucao operacional do dono - o unico
   lugar que descreve o que ele deve fazer na hora de aprovar, e o que acontece se ele nao aprovar.
5. **`docs/FABRICA_VPS_FAQ.md` (Q1) - a afirmacao de que a branch parte da `main`.** Por que importa: item
   menor, mas e a garantia de que o cartao nao e construido sobre trabalho nao revisado de outro agente.

Observacao para quem for resgatar: o resgate pode ser o arquivo inteiro (41 linhas, sem conflito - o caminho
esta livre na main) ou so os itens 2 a 5 incorporados ao `docs/FABRICA_VPS.md` existente. O arquivo inteiro e
mais barato e nao mexe em nada que ja esta na main.

## Risco de fechar esta branch

Risco de producao: **nenhum**. A branch nao toca codigo, banco, permissao, workflow nem deploy - e um unico
arquivo de texto novo. Nada deixa de funcionar e nada quebra se a branch for apagada hoje.

Risco real: perde-se a unica explicacao em linguagem de dono sobre como as correcoes dos robos chegam ao site.
As regras tecnicas sobrevivem no documento irmao que ja esta na main, mas tres coisas somem de vez: o motivo
pelo qual certos arquivos sao proibidos (incluindo o registro de que mexer neles ja derrubou a producao), o que
acontece com um cartao reprovado, e o passo a passo do que o dono faz para aprovar uma entrega. Custo de nao
resgatar: na proxima duvida sobre a fabrica, alguem reescreve esse texto do zero - ou, pior, uma regra sem
justificativa registrada e afrouxada por parecer burocracia.

## Nao verificado

- Nao verifiquei se o conteudo do FAQ foi reaproveitado em algum lugar **fora** do repositorio (wiki, Notion,
  kanban interno da fabrica, `.hermes.md` de outra maquina). A verificacao cobriu apenas a arvore de
  `origin/main` e a historia do git deste repo.
- Nao verifiquei se existe PR aberta para esta branch; a decisao aqui e sobre o conteudo, nao sobre o estado
  da PR.
- Arquivos sem leitura por truncamento: 0. O pacote nao trouxe marca de TRUNCADO e o unico arquivo divergente
  foi lido integralmente nos dois sentidos (A e B).
