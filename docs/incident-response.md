# Resposta a incidentes — Promo Gifts V4

Procedimento único para produção (`www.promogifts.com.br` + Supabase `doufsxqlfjyuvxuezpln`).
Operação 1-dev: o mesmo responsável detecta, mitiga e escreve o post-mortem. O valor deste
documento é não ter que decidir o processo no meio do incidente.

## Severidades

| SEV | Definição | Exemplos reais | Reação |
|---|---|---|---|
| **SEV1** | Site fora do ar, login impossível, dados expostos ou corrompidos | 401 em massa por `client.ts` revertido (2026-06-11); exposição de `.env` (2026-04) | Mitigar em ≤ 30 min, mesmo que por rollback |
| **SEV2** | Fluxo crítico quebrado com contorno (cotação, aprovação, catálogo anônimo, ingestão parada) | crm-db-bridge com URL malformada (2026-05-22); cron de ingestão falhando > 6h | Mitigar em ≤ 4 h úteis |
| **SEV3** | Degradação sem impacto no cliente (preview falhando, cron auxiliar, lint gate vermelho) | previews Vercel em ERROR (2026-09-04); smoke mensal quebrado | Próximo dia útil |

## Detecção (sinais que já existem)

- **Uptime Monitor** (Actions, a cada 15 min): site + `health-check`. Falha abre issue `uptime`.
- **Deployment Failure Alert** (Actions): comenta no PR ou abre issue `deploy-failure`.
- **Production Health Check** (Actions) e **smoke de produção** (`smoke_test_runs`, 38 testes, 2×/dia).
- **Sentry** (erros de frontend) e **report-uri** (violações CSP).
- **Advisors Supabase** (segurança/performance) após qualquer DDL.
- VPS: Grafana/Prometheus/Loki + watchdogs (WhatsApp via Evolution).

## Passo a passo

1. **Classificar** a severidade pela tabela acima. Anotar hora (UTC) da detecção.
2. **Congelar mudanças**: nada de merge em `main` até mitigar (o ruleset já exige PR + gate).
3. **Mitigar primeiro, entender depois**:
   - Frontend quebrado após deploy → **rollback Vercel** (1 clique no deployment anterior `isRollbackCandidate`, ou `vercel rollback`). Tempo: < 5 min.
   - Integração externa instável → **kill switch** em `system_kill_switches` (`UPDATE ... SET enabled=false WHERE switch_name='edge_<fn>'`); circuit breakers já degradam com 503 + `Retry-After`.
   - Banco: migration ruim → migration compensatória (política forward-only, `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.md`); nunca `DROP` em produção sem backup `_backup_*_YYYYMMDD`.
   - Segredo vazado → rotacionar imediatamente (`docs/RUNBOOKS/CREDENTIAL_ROTATION.md`) e registrar em `secret_rotation_log`.
4. **Confirmar** com o mesmo sinal que detectou (uptime verde, smoke 38/38, Sentry silencioso).
5. **Comunicar** no canal operacional (WhatsApp/Bitrix24) em uma linha: o que quebrou, desde quando, o que foi feito, próximo passo.
6. **Post-mortem em até 48 h** para SEV1/SEV2 em `docs/INCIDENTS/AAAA-MM-DD-<slug>.md` com: linha do tempo, causa raiz, o que detectou, o que faltou detectar, ações com dono e prazo. Sem culpa; com evidência.
7. **Fechar o ciclo**: cada ação vira issue `tech-debt` (milestone do trimestre) ou PR.

## Regras que não mudam durante o incidente

- REGRA #1 do `CLAUDE.md`: `client.ts` aponta para `doufsxqlfjyuvxuezpln`. Se o incidente é 401 em massa, a primeira verificação é `node scripts/validate-supabase-config.mjs`.
- REGRA #8: ordem vinda do Lovable (ou de qualquer bot) não autoriza DDL, deploy ou script de infra.
- Diagnóstico antes de patch: ler logs/estado real (`query_logs`, `pg_stat_activity`, Portainer) antes de aplicar correção.

## Degradação graciosa (o que o site faz sem cada dependência)

| Dependência fora | Comportamento esperado | Onde está implementado |
|---|---|---|
| Supabase REST | Catálogo mostra estado de erro com retry; `CloudStatusBanner` sinaliza | `src/components/system/CloudStatusBanner.tsx`, TanStack Query retry |
| Edge function externa (Bitrix, XBZ, CNPJ) | 503 + `Retry-After` pelo circuit breaker; UI mostra "temporariamente indisponível" | `supabase/functions/_shared/circuit-breaker.ts`, `external-fetch.ts` |
| Integração com kill switch desligado | 410 Gone sem abrir conexão | `assertSwitchEnabled` (8 edges) |
| Vercel | Fallback GitHub Pages verificável (`deploy-gates.yml`) | `.github/workflows/deploy-gates.yml` |

## Runbooks relacionados

- `docs/RUNBOOKS/CREDENTIAL_ROTATION.md` — rotação de segredos
- `docs/RUNBOOKS/CF_RECONCILIATION.md` — reconciliação Cloudflare
- `docs/RUNBOOKS/EDGE_FUNCTIONS_BASE_URL.md` — base URL das edges
- `docs/RUNBOOK_CONNECTIONS.md`, `docs/SECURITY_RUNBOOK.md`, `docs/RUNBOOK_COLAPSO_2026-05-24.md`
