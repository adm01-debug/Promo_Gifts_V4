# Plano de Recuperação de Desastre (DR) — Promo Gifts V4

> Última atualização: 2026-10-02 · Auditoria 20-dimensões (achado: ausência de runbook de DR).
> Público: PO/adm + devs. Linguagem direta; cada passo aponta a ferramenta exata.

## 1. Ativos críticos e o que cobre cada um

| Ativo | Onde | Cobre | RPO esperado |
|---|---|---|---|
| Banco Postgres (`doufsxqlfjyuvxuezpln`) | Supabase — Database → Backups | **DADOS** (somente se PITR/backups estiverem ativos no plano) | ver §2 |
| Dump schema-only | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` (+ checksums) | **DDL** — reconstrói estrutura, NÃO dados | snapshot 2026-09-16 |
| Ledger de migrations | `docs/db/LEDGER_DATA_2026-09-16.sql` | histórico `schema_migrations` | snapshot 2026-09-16 |
| Código + edge functions | GitHub `main` | todo o código | cada merge |
| Deploy frontend | Vercel (redeploy de qualquer commit) | site | cada commit |
| Secrets de edge | Supabase — Edge Functions → Secrets | chaves de API de produção | manual (não versionado) |
| Auth users / storage objects | Supabase Auth + Storage | usuários e arquivos | backup Supabase |

## 2. Estado atual (atenção)

- **PITR: status desconhecido** — pendente de confirmação humana no painel
  (ver `docs/db/BACKUP_STATUS.md` §1). Até confirmado, assumir **sem rede de
  segurança para dados**.
- Backups físicos do Supabase dependem do plano do projeto — verificar em
  https://supabase.com/dashboard/project/doufsxqlfjyuvxuezpln/database/backups
- Secrets de edge functions existem só no Supabase — inventariar em cofre
  externo (1Password/Bitwarden) é ação pendente do PO.

## 3. Cenários e procedimentos

### 3.1 Deploy ruim (site quebrado, banco ok)
1. Vercel → Deployments → promover o deployment anterior ("Instant Rollback").
2. Confirmar no monitor: `.github/workflows/uptime-monitor.yml` (cron) ou
   `curl -sf https://<site>`.
3. Revert do commit no GitHub se necessário: `git revert <sha>` em `main`.

### 3.2 Migration ruim aplicada em produção
1. **Não** aplicar DDL corretiva ad-hoc — diagnosticar primeiro
   (`docs/db/POLITICA_DDL.md`).
2. Se PITR ativo: Supabase → Backups → Restore para ponto anterior à migration.
3. Se sem PITR: escrever migration corretiva, revisar, aplicar via
   `db-apply-migration.yml` (workflow_dispatch) — único caminho autorizado.
4. Registrar pós-incidente: criar `docs/POSMORTEM_<data>.md` (padrão existente).

### 3.3 Perda total do projeto Supabase (cenário extremo)
1. Criar projeto Supabase novo (mesma região).
2. Restaurar DDL: aplicar `docs/db/BACKUP_SCHEMA_ONLY_*.sql` via `psql -f`
   (ou `supabase db push` em ordem — preferir o dump canônico).
3. Restaurar ledger: `docs/db/LEDGER_DATA_*.sql`.
4. Dados de usuários: só recuperáveis via backup Supabase/PITR — sem eles,
   perda total de dados transacionais (catálogo pode ser reingerido via
   pipelines Bronze → Silver → Gold).
5. Recriar secrets das edge functions (cofre externo) e rodar
   `deploy-edge-functions.yml` (deploy full).
6. Atualizar `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts`
   (REGRA #1 exige o ID canônico — migração de projeto exige decisão do PO).
7. Apontar DNS/domínio Vercel para o novo backend; atualizar `SITE_URL`.

### 3.4 Comprometimento de credenciais
1. Rotacionar em Supabase → Edge Functions → Secrets (afetadas).
2. Rotacionar service_role/anon se vazadas: Supabase → Settings → API →
   "Generate new keys" (atualiza o JWT secret — invalida sessões).
3. Revogar tokens GitHub PAT usados em Actions (Settings → Secrets).
4. Auditar `admin_audit_log` e `log_login_attempt` para atividade do período.

## 4. Contatos e SLAs internos

- PO / aprovador de produção: Joaquim (adm01-debug)
- Escalonamento: provedor Supabase (status.supabase.com), Vercel (status.vercel.com)
- Meta de detecção: uptime-monitor (cron 15min) + deploy-failure-alert (realtime)
- Meta de restauração (RTO alvo): deploy ≤ 15 min (rollback Vercel) · banco
  conforme PITR (definir após confirmação do PO)

## 5. Manutenção deste plano

- Revisar a cada release maior ou mudança de provedor.
- Teste de restore **pelo menos 1×/trimestre**: restaurar dump schema-only em
  projeto Supabase descartável e validar `information_schema` vs produção.
- Atualizar §2 assim que o PO confirmar PITR/backups (checkbox em
  `docs/db/BACKUP_STATUS.md`).
