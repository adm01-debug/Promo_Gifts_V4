# Faxina de 2026-11-14 — provas e registros

Esta pasta guarda as provas da limpeza feita em 14/11/2026 no repositório: quais branches foram
excluídas, por que cada uma podia sair, e o que foi decidido sobre os workflows. Está aqui, versionado,
porque a regra do dono é que nenhum trabalho de agente se perca sem prova — e prova guardada em pasta
temporária de sessão não é prova.

## O que tem em cada arquivo

| Arquivo | O que é |
|---|---|
| `01-auditoria-branches-excluidas.md` | A auditoria adversarial das 211 branches excluídas. Responde, uma por uma, à pergunta "todo o trabalho dela já estava na `main`?" |
| `02-prova-211-branches.tsv` | A prova mecânica das 211: para cada branch, o SHA e o resultado da comparação com a `main` |
| `03-branches-excluidas-com-sha.tsv` | A lista das 211 com o SHA de cada uma. **Serve para recriar qualquer uma delas**: `git branch <nome> <sha>` |
| `04-prova-profunda-19-casos.txt` | Os 19 casos que exigiram conferência linha a linha, com o detalhe de cada um |
| `05-plano-workflows.md` | O levantamento dos ~115 workflows de CI: qual faz o quê, quais são redundantes, quais estão quebrados e o que fazer com cada um |
| `06-prova-prs-supersedidas-trem2.tsv` | A prova de que as PRs fechadas depois do trem 2 já estavam integralmente na `main` |

## Como ler a prova de uma branch excluída

O teste usado não é o nome da branch nem o título da PR — é o conteúdo:

```
git merge-tree --write-tree origin/main <sha-da-branch>
```

Se o resultado for igual à árvore do `origin/main`, mesclar aquela branch **não mudaria um único byte**
do sistema: tudo o que ela tinha já está na `main`. É esse o critério registrado nos arquivos.

Para os casos em que o conteúdo é equivalente mas não idêntico (por exemplo a política de segurança de
conteúdo, que é uma linha única e por isso conflita textualmente com qualquer alteração), a prova é por
item: cada hash, cada símbolo, cada migration conferida uma a uma contra a `main`.

## O que fazer se faltar algo

Nenhuma das 211 teve perda de trabalho confirmada. Mas se um dia aparecer algo que falte, a recuperação é
direta: pegue o SHA em `03-branches-excluidas-com-sha.tsv` e recrie a branch. Os objetos continuam no
repositório do GitHub.
