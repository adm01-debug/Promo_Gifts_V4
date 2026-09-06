# 📡 Status do Projeto

> Este arquivo deixou de ser o "estado atual" em 2026-09-05: ficava congelado por meses
> (a versão anterior descrevia sessões de 2026-06-02/03 como estado corrente).
> O estado vivo do sistema está em fontes que se atualizam sozinhas.

| O que você quer saber | Onde está |
|---|---|
| Nota técnica atual, gaps e roadmap | Último relatório em [`docs/reports/`](./docs/reports/README.md) |
| O que mudou por PR | [`CHANGELOG.md`](./CHANGELOG.md) |
| Produção está no ar? | Workflow **Uptime Monitor** (a cada 15 min) e issues com label `uptime` |
| Deploy falhou? | Workflow **Deployment Failure Alert** e issues com label `deploy-failure` |
| CI de `main` | Actions → runs no HEAD de `main`; required check `Gate Final - Deploy Ready` |
| Banco canônico (schema, contagens) | [`docs/SCHEMA_REFERENCE.md`](./docs/SCHEMA_REFERENCE.md) (REGRA #8 do `CLAUDE.md`) |
| Incidentes e resposta | [`docs/incident-response.md`](./docs/incident-response.md) e [`docs/INCIDENTS/`](./docs/INCIDENTS/) |
| Dívida técnica | Issues com label `tech-debt` no milestone **Dívida técnica — Q4 2026** |

Histórico das sessões de redeploy (2026-05/06): [`docs/redeploy/SESSIONS.md`](./docs/redeploy/SESSIONS.md).
