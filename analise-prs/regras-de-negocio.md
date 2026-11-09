# Regras de Negócio — Análise de PRs

## Critério de merge autônomo
PR é mergeável se TODAS as condições abaixo forem verdadeiras:
1. Gate Final ("Gate Final - Deploy Ready") = SUCCESS no HEAD da PR
2. Sem conflito com main
3. PR não é draft
4. Não envolve: DDL/migration em banco, CI workflows (.github/workflows), segredos, deleção de dado, mudança arquitetural

## Exceção E14 (docs-only)
PRs que tocam apenas arquivos de documentação (docs/, *.md fora de src/, analise-prs/) passam com bypass Gates 1/2/3/6. Apenas Gate Final obrigatório.

## Critério AGUARDA_PO
PRs com qualquer dos seguintes requerem aprovação do PO antes do merge:
- Migrations DDL em banco de produção (doufsxqlfjyuvxuezpln)
- Alterações em .github/workflows/
- Mudanças de RLS/permissões/segredos
- Mudanças arquiteturais (schema, tipos críticos Product)

## Critério NÃO_MERGEAR
- CI vermelha (failure) no HEAD da PR que não é flake confirmado
- Conflito não resolvido com main
- Já implementado em main (redundante)
- PR supersedida por outra mais recente

## Critério AGUARDA_CI
Gate Final ainda não completou (queued/in_progress) no HEAD da PR.

## Critério AGUARDA_CI_OU_PO
Gate Final ainda não completou E PR também requer decisão do PO.
