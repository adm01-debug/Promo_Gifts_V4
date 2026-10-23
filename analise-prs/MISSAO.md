# MISSÃO DAS PRs — adm01-debug/Promo_Gifts_V4

> Salvo em: 2026-10-23. Este arquivo prevalece sobre qualquer resumo de contexto.

## Texto original da missão (verbatim)

Execute a MISSÃO DAS PRs de adm01-debug/Promo_Gifts_V4 que mandei na mensagem anterior.
Antes de qualquer outra ação, salve a missão inteira, sem resumir, em analise-prs/MISSAO.md.
Releia esse arquivo ao retomar, após compactação de contexto e antes de cada escrita no GitHub;
ele prevalece sobre qualquer resumo.
Se analise-prs/progresso.json existir, retome dele.

## Limites que nunca caem

- Escrever só em branch criada por você
- Nunca na branch de outra PR
- Nunca push no main
- Nunca tocar .github/workflows, segredos ou configurações (exceto quando Joaquim autorizar explicitamente)
- SINGU só leitura
- Nada sem evidência é mergeado
- Qualquer falha nova no CI ou em produção após um merge = PARE TODAS AS ESCRITAS e registre SHA + PR

## META CUMPRIDA somente quando mostrar no chat, com evidência:

1. total de PRs abertas no início = total analisado, com contagem por veredito
   (MERGEAR, COMPLETAR, CORRIGIR, RESGATAR PARCIAL, FECHAR, BLOQUEADA)
2. cada PR mergeada com SHA, e CI do main e produção sem falha nova vs. linha de base após cada merge
3. cada PR inacabada completada via PR sucessora mergeada (original → sucessora → SHA),
   e a original fechada com comentário de evidência
4. PRs obsoletas, duplicadas ou já implementadas fechadas com comentário de evidência
5. PRs que continuam abertas = somente as BLOQUEADAS, cada uma com motivo e recomendação
6. lista de todas as escritas feitas no GitHub, todas dentro do permitido
7. worktrees removidos
8. caminhos de analise-prs/: MISSAO.md, baseline/, regras-de-negocio.md, progresso.json,
   prs.json, prs.csv, dossies/, RELATORIO_PRS.md

## Se chegar a 80 turnos sem cumprir

Salvar progresso.json, gerar RELATORIO_PRS.md parcial e dizer exatamente em que PR e etapa parou.

## Sessão atual — contexto

Branch de trabalho desta sessão: `claude/pensive-faraday-pwphva`

PRs criadas nesta sessão:
- PR #2372: fix(ci): remove E2E_USER_* de workflows chromium-public (substitui #2315)
- PR #2373: fix(ci): allowlist migrations 20261022194* no gitleaks

PR fechada:
- PR #2315: fechada, substituída por #2372
