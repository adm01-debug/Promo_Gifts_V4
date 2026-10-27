# Regras de Negócio — Análise de PRs

**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF  
**Data:** 2026-10-27

Este documento registra as regras de negócio e critérios de decisão usados nesta sessão de análise de PRs.

---

## Critérios de veredicto

### MERGEADO_AUTONOMO
PR pode ser mergeado sem aprovação do PO quando:
1. Gate Final verde no HEAD atual
2. `mergeable_state == "clean"` (zero conflitos com main)
3. Não toca `.github/workflows/`, `supabase/migrations/`, `supabase/functions/` executáveis
4. Não é branch de outro agente/sessão (REGRA#10)
5. Não causa regressão semântica (downgrade, remoção de feature, mudança de regra de negócio)

### DECISAO_HUMANA
PR requer decisão do PO quando qualquer das condições abaixo for verdadeira:
- **REGRA#8:** toca `.github/workflows/`, `supabase/migrations/`, `supabase/functions/`, `.gitleaks.toml`, Dockerfile, infra
- **CONFLICT:** `mergeable_state != "clean"` — conflito com main que exige resolução manual
- **REGRA#10:** branch pertence a outra sessão/agente (esta sessão não escreve em branches alheias)
- **REGRESSAO:** downgrade de versão, remoção de feature usada, mudança de regra de negócio (filtro Kit Maker, etc.)
- **BREAKING:** upgrade major com breaking changes (zustand 4→5, react-day-picker 8→10)
- **DRAFT:** PR em estado draft sem REGRA#10/8 (só aguarda autor converter para ready)

### DRAFT_NOMERGE
PR draft que não deve ser mergeado autonomamente porque:
- Contém apenas documentação interna de análise (não é código de produção)
- OU é solução paliativa/incompleta que o autor deve revisar antes de mergear

### SUPERSEDED
PR cujos commits já foram incorporados em outro PR mergeado:
- Verificado via `git cherry` (zero commits únicos)
- OU PR body/título indica explicitamente que foi substituído

### CI_AGUARDANDO
PR meu (desta sessão) aguardando Gate Final para merge autônomo:
- Todos os outros critérios (conflicts, REGRA#8, REGRA#10) OK
- Gate Final ainda não completou ou está em andamento

### BRANCH_DIRTY
Branch com conflito ADD/ADD irresolvível nesta sessão:
- PR de outra sessão (REGRA#10 proíbe escrita)
- Conflitos introduzidos por merge posterior em main que cobriu os mesmos arquivos

### JA_EM_MAIN
PR cujos commits já estão em main:
- `git cherry -v main <branch>` retorna zero linhas

### FECHAR
PR sem ancestral comum com main (branch órfã):
- `test_merge: NO_MERGE_BASE` na análise de test-merge
- PO deve fechar manualmente

### MERGEADO_SESSAO_EXTERNA
PR que esta sessão rastreava mas foi mergeado por outra sessão durante o trabalho:
- SHA de merge confirmado via GitHub API

---

## Regras de negócio críticas identificadas

### RN-01 — E058: Rollback obrigatório por migration
Todo arquivo em `supabase/migrations/YYYYMMDDHHMMSS_*.sql` exige arquivo correspondente
em `supabase/rollbacks/YYYYMMDDHHMMSS_rollback.sql`. O workflow `db-apply-migration.yml`
falha no preflight (E058) se qualquer rollback estiver faltando.

**Evidência:** Run #40462419661 falhou — `20261027120000_rollback.sql não encontrado`.
PRs #2621 e #2627 cobrem os 9 rollbacks faltantes das migrations do PR #2603.

### RN-02 — Gate 1.12: Toda edge function deve estar declarada em edge-authz-manifest.ts
O arquivo `supabase/functions/_shared/edge-authz-manifest.ts` é SSOT da autorização.
Função presente no FS mas ausente no manifest → Gate 1.12 FAILED.

**Evidência:** PR #2603 adicionou `xbz-image-uploader/index.ts` sem declarar no manifest.
PR #2621 corrigiu: entrada `xbz-image-uploader` adicionada com `category: "service"`.

### RN-03 — Versão semântica via release-please
O PR da release-please (#2579, #2520) propõe versão baseada em conventional commits.
Downgrade de 1.2.1 → 1.0.0 é regressão — requer aprovação do PO.

### RN-04 — Deploy de edge function = caminho único
Deploy via `deploy-edge-functions.yml` apenas. Deploy direto via MCP/dashboard cria
divergência silenciosa entre GitHub e produção (drift check detecta mas não reverte).

### RN-05 — Drift de conteúdo vs. estrutural em edge functions
Drift de **conteúdo** (hash divergente) em PR é esperado: a função foi modificada no repo
mas só será deployada após o merge. Drift **estrutural** (função órfã/ausente) indica
problema real de infraestrutura.

**Evidência:** PR #2626 (E203) propõe distinguir os dois tipos no step "Fail if drift detected".

### RN-06 — Supabase canônico = `doufsxqlfjyuvxuezpln` (REGRA#1)
Nenhum PR pode alterar `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts`.
Qualquer merge que contenha `pqpdolkaeqlyzpdpbizo` em código executável é regressão.

### RN-07 — Merge automático = deploy em produção imediato
O Lovable redeploya `main` automaticamente em todo push. Merge autônomo = produção.
PRs com risco de regressão (breaking changes, remoção de feature) → DECISAO_HUMANA.
