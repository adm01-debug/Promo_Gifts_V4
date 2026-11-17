# Pós-mortem — 29+ commits de governança presos só no disco local (2026-09-17)

## O que aconteceu

Uma auditoria tripla (local ↔ GitHub ↔ banco), feita em 2026-09-17 na branch
`claude/audit-gaps-20260915`, encontrou que o branch estava **29 commits à
frente do seu remoto**, e o último commit visível no GitHub para essa branch
(`67b742146`) era de uma sessão anterior. Entre os 29 commits só-locais
estavam os dois artefatos de governança mais importantes produzidos pelo
`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`:

- `.github/workflows/ddl-out-of-band-detector.yml` (E12) — detecta DDL
  aplicada fora do fluxo de migration.
- `.github/workflows/db-apply-migration.yml` (E15) — o único caminho
  autorizado para aplicar migration nova em produção, gateado por
  `environment: production`.

Uma auditoria mais ampla (E28 do `PLANO_ENGENHARIA_SENIOR_50_ETAPAS_2026-09-17.md`)
encontrou depois que o número real era **5 workflows locais-only**, não 2:
os dois acima mais `capacity-growth-report.yml` (E30), `pgss-slo-report.yml`
(E40) e `wraparound-monitor-report.yml` (E33).

## Impacto

Nenhum. Não houve incidente de produção, vazamento ou aplicação indevida —
o pior efeito real foi que as proteções descritas acima **não existiam do
ponto de vista de quem revisa no GitHub**, com o mesmo efeito prático de
nunca terem sido construídas: ninguém além de quem rodou a sessão local
sabia que E12/E15 existiam prontos. Se uma migration precisasse ser aplicada
com urgência nesse intervalo, o único caminho "visível" continuaria sendo
os métodos antigos que a REGRA #8/E15 existem para substituir.

## Por que não foi notado antes

- Múltiplas sessões (`claude/audit-gaps-20260915`, iniciada antes de
  2026-09-16) produziram commits reais, com testes e revisão própria, mas
  nenhuma delas rodou `git push` ao final.
- Não havia PR aberto para a branch — nada no GitHub sinalizava "há trabalho
  pendente de revisão aqui".
- O CLAUDE.md deste repo (lido no início de cada sessão) tinha regras
  detalhadas sobre *o que* commitar e *como* resolver conflitos (REGRA #1–#8),
  mas nenhuma sobre *quando* dar push — a suposição implícita era de que toda
  sessão terminaria com o branch sincronizado, sem nunca declarar isso.

## Causa raiz

Processual, não técnica. Nenhuma ferramenta quebrou; nenhum comando falhou.
Faltava uma regra explícita dizendo que uma sessão que produz commit de
governança/segurança precisa terminar com `git push` — o oposto do padrão
já bem resolvido pela REGRA #7/#8 (o que fazer quando o *Lovable* empurra
código): não havia uma regra simétrica sobre a própria sessão Claude nunca
ter empurrado.

## Correção

- **REGRA #9** adicionada ao `CLAUDE.md` (2026-09-17): sessão que gera commit
  relevante para segurança/CI/governança termina com `git push`, mesmo sem
  PR aberto; se não houver PR e o trabalho estiver pronto, abre um.
- Branch enviada e PR aberto nesta mesma sessão
  (`https://github.com/adm01-debug/Promo_Gifts_V4/pull/1865`).
- As 5 branches locais órfãs encontradas na mesma auditoria (commits que não
  existiam em nenhuma ref do GitHub) foram enviadas para preservação —
  ver `docs/plans/PLANO_ENGENHARIA_SENIOR_50_ETAPAS_2026-09-17.md` E15.

## Não foi feito (fora de escopo deste documento)

- Auditoria de *por que* nenhuma sessão anterior deu push não identifica uma
  sessão/pessoa específica — não é objetivo deste documento apontar culpa,
  é registrar o gap de processo e a correção.
