# Aplicação autorizada: 20260922170000

## Estado

**APROVADA PELO PO, AINDA NÃO APLICADA.** Em 22/09/2026, o PO confirmou explicitamente: `aprovado! proposta: 20260922170000`.

Alvo único: `doufsxqlfjyuvxuezpln`, função `public.handle_new_user()`.
Arquivo: `supabase/migrations/20260922170000_signup_identity_safe_default.sql`.
SHA-256: `266f0963a9e7b1d30e8594d7c6218747b6a79baf16aa272249e864f55a64b29b`.

A PR #1873 publicou a migration na `main` em `e30dfa6487eb1b1131b698cb9d1c6b2a7c261ea4`, após a PR #1872.
A correção do executor está na branch `codex/e15-pooler-validation-20260922`, criada dessa main, sem alterar o SQL aprovado.

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
- [x] Reviewer obrigatório no environment Production: `adm01-debug`, configurado após autorização explícita; regras prévias preservadas. Aprovação humana do job continua obrigatória no fluxo E15.
- [ ] Aplicação transacional pelo E15.
- [ ] Pós-check do corpo, proprietário/ACL, integridade dos profiles e ledger.
- [ ] Recibo de aplicação real e validação administrativa de criação de conta.

## Próxima ação

O PO aprovou separadamente o reviewer. A [primeira execução](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35754514535), aprovada no GitHub, falhou **antes da DDL**, por `FATAL: (ENOTFOUND) tenant/user not found`. Catálogo e ledger consultados depois confirmaram corpo antigo e ausência da versão; os 13 profiles continuam com `user_id=id`.

Diagnóstico de 22/09: o IP de destino da falha (`54.94.90.106`) corresponde ao cluster `aws-0-sa-east-1.pooler.supabase.com`. A Management API `GET /v1/projects/doufsxqlfjyuvxuezpln/config/database/pooler` informa como PRIMARY `aws-1-sa-east-1.pooler.supabase.com`, usuário `postgres.doufsxqlfjyuvxuezpln`. A configuração local da CLI confirma o host atual. O formato de host+usuário passou no guard antigo, mas isso não provava associação ao cluster vivo.

Foi corrigido **somente** o secret de repositório `PGHOST`, mantendo senha e usuário. A [segunda execução](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35760867980), também na main `e30dfa6487eb1b1131b698cb9d1c6b2a7c261ea4`, passou no preflight e aguarda aprovação humana de `Production` na coleta desta atualização. Não autoaprovar esse gate. A autenticação PG ainda não foi provada após a correção; se houver falha de senha, parar e resolver a credencial sem reset não autorizado.

O endurecimento adicional do executor (em PR separado) confronta host/usuário/database com a API atual, exige sessão 5432, falha fechado em erro/timeout/JSON inválido, testa conexão read-only antes de DDL, desabilita prompts e fornece ao repair a mesma senha usada no psql. Ele não está incluído retroativamente na segunda execução, que usa a main anterior.

Referências: [pooler config](https://supabase.com/docs/reference/api/v1-get-pooler-config) e [endpoints e modos de conexão](https://supabase.com/docs/guides/database/connecting-to-postgres). O índice do cluster não deve ser deduzido da região.

Antes de aplicar, recoletar as pré-condições e confirmar o SHA da branch. Se a função tiver mudado, o SQL aborta: não flexibilizar seus hashes para forçar a aplicação. Após aplicar, confirmar registro do ledger e gerar recibo real. Se DDL concluir e o repair falhar, **não reaplicar o SQL**: registrar o estado parcial e reconciliar somente esta versão após comprovar o efeito.

O gate de recibo pode permanecer vermelho enquanto a migration ainda não foi aplicada. Não criar recibo fictício de execução para tornar a PR verde. Este documento é autorização/preparação, não recibo.
