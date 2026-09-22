# Aplicação autorizada: 20260922170000

## Estado

**APROVADA PELO PO, AINDA NÃO APLICADA.** Em 22/09/2026, o PO confirmou explicitamente: `aprovado! proposta: 20260922170000`.

Alvo único: `doufsxqlfjyuvxuezpln`, função `public.handle_new_user()`.
Arquivo: `supabase/migrations/20260922170000_signup_identity_safe_default.sql`.
SHA-256: `266f0963a9e7b1d30e8594d7c6218747b6a79baf16aa272249e864f55a64b29b`.

A PR #1872 já foi mergeada em `2a5b9f135eb0547052e707181d2f9ad51b707407`.
Esta continuação parte desse commit, na branch `codex/apply-signup-20260922170000`.

## Escopo aprovado

- Preencher `profiles.user_id` com o UUID do usuário recém-criado.
- Usar papel inicial `sales`, convertido a `vendedor` pelo trigger existente.
- Não conceder privilégios a partir de `raw_user_meta_data.role`.
- Preservar nome, departamento, preferências e o fluxo administrativo de promoção.
- Não alterar usuários existentes, Auth providers, outras funções, tabelas, grants ou policies.
- Não aplicar a migration antiga `20260920120000` nem executar `db push`.

O SQL executável (a partir de `DO $precondition$`) é byte a byte igual ao da proposta arquivada em `docs/db/proposals/20260922170000_signup_identity_safe_default.sql`; apenas o cabeçalho informa aprovação e origem. O arquivo arquivado preserva a evidência original, não é um segundo caminho de deploy. O simulador agora consome a migration canônica.

## Pré-aplicação verificada

- [x] Recoleta read-only do canônico: corpo anterior normalizado MD5 `59e7ff7d047a8a855cc785ee2e9b5ccf`.
- [x] `SECURITY DEFINER`, `search_path=public`, ACL `{postgres=X/postgres,service_role=X/postgres}` preservados na linha de base.
- [x] 13 profiles existentes; zero identidades divergentes.
- [x] Nenhum registro das versões `20260920120000` e `20260922170000` no ledger.
- [x] `preflight-migration-apply --version=20260922170000 --require-live`: `passed`, arquivo único, rollback no cabeçalho, versão ainda não aplicada, sem DDL não transacional.
- [x] Simulação PG17 sem rede/porta/dados reais: oito funções e seis triggers, metadata privilegiada ignorada, rollback, identidade duplicada, trigger desabilitado, mudança concorrente, sincronização do perfil e limite inicial de desconto zero.
- [x] Captura da definição anterior em `docs/db/recovery/20260922170000_handle_new_user_before.sql`. Só usar em recuperação supervisionada; ela reintroduz o defeito anterior.
- [x] Secrets necessários existem no GitHub por nome: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, SUPABASE_ACCESS_TOKEN e SUPABASE_DB_PASSWORD. Valores não foram extraídos; a validade do destino PG será verificada pelo guard do job.
- [ ] Reviewer obrigatório no environment Production: leitura atual ainda retorna `protection_rules: []`.
- [ ] Aplicação transacional pelo E15.
- [ ] Pós-check do corpo, proprietário/ACL, integridade dos profiles e ledger.
- [ ] Recibo de aplicação real e validação administrativa de criação de conta.

## Próxima ação

O PO aprovou a migration, mas não confirmou a pergunta separada sobre configurar `adm01-debug` como reviewer. Não alterar a proteção do environment por inferência nem contornar o guard com outro canal SQL.

Após definir o reviewer e publicar o arquivo, o E15 pode ser disparado com **somente** `version=20260922170000` na branch que contém esta migration. A aprovação do job protegido deve ocorrer no GitHub. Não autoaprovar um gate humano em nome do PO.

Antes de aplicar, recoletar as pré-condições e confirmar o SHA da branch. Se a função tiver mudado, o SQL aborta: não flexibilizar seus hashes para forçar a aplicação. Após aplicar, confirmar registro do ledger e gerar recibo real. Se DDL concluir e o repair falhar, **não reaplicar o SQL**: registrar o estado parcial e reconciliar somente esta versão após comprovar o efeito.

O gate de recibo pode permanecer vermelho enquanto a migration ainda não foi aplicada. Não criar recibo fictício de execução para tornar a PR verde. Este documento é autorização/preparação, não recibo.
