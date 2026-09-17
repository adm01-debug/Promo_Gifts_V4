# Pós-mortem — commits de governança 100% locais (2026-09-17)

## O que aconteceu

Uma auditoria tripla (local ↔ GitHub ↔ banco), realizada em 2026-09-17 como parte da
continuação do `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`, encontrou
29 commits na branch `claude/audit-gaps-20260915` que existiam **só no disco local** — nenhum
deles tinha chegado ao GitHub, nem à branch remota já existente, nem a nenhuma outra ref.

Entre esses 29 commits estavam os dois artefatos mais importantes do plano DBA:

- `.github/workflows/db-apply-migration.yml` (E15) — o único caminho autorizado para aplicar
  uma migration nova no banco canônico.
- `.github/workflows/ddl-out-of-band-detector.yml` (E12) — o detector de DDL aplicada fora do
  fluxo de migration.

Uma auditoria de workflows subsequente (E28) encontrou mais 3 no mesmo estado
(`capacity-growth-report.yml`, `pgss-slo-report.yml`, `wraparound-monitor-report.yml`) —
**5 workflows no total**, não 2.

## Por quanto tempo

Os commits mais antigos deste grupo datam de 2026-09-16 (E12, E15 construídos nessa sessão).
O `git push` que os tornou visíveis só ocorreu em 2026-09-17, às ~11:20 UTC — pelo menos
1 sessão inteira, possivelmente mais, sem nenhum `git push`.

## Por que não foi notado antes

Não havia checagem, gate ou hábito que comparasse "o que existe localmente" contra "o que
existe no GitHub". Todas as verificações de qualidade do repositório (`check:*` scripts,
CI, `db-schema-drift-check`) rodam sobre o estado do checkout atual — nenhuma delas audita
se aquele checkout já chegou ao remoto. O gap só apareceu porque a auditoria tripla de hoje
foi desenhada especificamente para comparar as três fontes (local, GitHub, banco), não porque
algum gate existente capturou o problema.

## Causa raiz

Processual, não técnica: o fluxo de trabalho estabelecido (preparar, revisar, commitar) nunca
incluiu explicitamente "e depois, `git push`". Múltiplas sessões audit-and-fix trataram o
commit local como o fim da unidade de trabalho, quando na verdade o commit só é útil se
alguém (humano ou CI) puder vê-lo.

## O que muda

- **REGRA #9** adicionada ao `CLAUDE.md`: sessão que gera commit relevante para segurança,
  CI/CD ou governança deve `git push` ao final, mesmo sem PR aberto.
- Este pós-mortem não atribui a nenhuma sessão específica — não há como (nem motivo para)
  identificar "qual sessão" deixou de dar push; o ponto é que o processo permitia isso
  acontecer silenciosamente, e agora tem uma regra explícita contra.
- Não abrimos gate automatizado para isso nesta rodada (`git push` não é algo que um workflow
  de CI possa fazer sozinho de forma segura) — a mitigação é a regra explícita em CLAUDE.md,
  reforçada pela auditoria tripla (E42/E43 do plano de engenharia) rodando com regularidade
  daqui para frente, não só sob demanda.

## Referências

- `docs/plans/PLANO_ENGENHARIA_SENIOR_50_ETAPAS_2026-09-17.md` §1 (achado #1) e etapas
  E1 (push realizado), E28 (inventário completo dos 5 workflows), E44 (esta regra), E45
  (este documento).
- PR #1865 — onde os 29+ commits finalmente ficaram visíveis.
