# Pendências que dependem de você

## 1. Aprovar a aplicação da correção do banco (incidente 22/10/2026) — URGENTE

**O que é:** a correção que reduz a frequência das rotinas automáticas que estão sobrecarregando o banco (PR #2348).

**Por que trava:** as regras do projeto exigem que toda mudança no banco de produção passe pelo workflow `db-apply-migration.yml` e seja **aprovada por uma pessoa** no ambiente "production" do GitHub. Eu não posso aprovar no seu lugar.

**Passo a passo:**
1. Abra https://github.com/adm01-debug/Promo_Gifts_V4/actions/workflows/db-apply-migration.yml
2. Se já houver uma execução esperando ("Waiting"), clique nela e depois em **"Review deployments"** → marque **production** → **"Approve and deploy"**.
3. Se não houver nenhuma execução: clique em **"Run workflow"**, branch **main**, preencha:
   - `version`: `20261022193000`
   - `approved_by`: seu nome
   - `mode`: deixe o padrão
   Depois aprove como no passo 2.
4. Me avise quando terminar — eu meço os erros antes × depois.

## 2. Avaliar aumentar o tamanho da máquina do banco (decisão de negócio/custo)

**O que é:** o banco roda numa máquina pequena (2 GB de memória) com ~150 rotinas automáticas. Mesmo com a correção, a folga é pouca.

**Por que trava:** envolve custo mensal no Supabase.

**Passo a passo:** Supabase → projeto `doufsxqlfjyuvxuezpln` → Settings → Compute and Disk → avaliar o próximo tamanho (ex.: Medium) e ver o novo preço antes de confirmar.

## 3. 30 correções antigas que nunca foram aplicadas no banco (decisão)

**O que é:** comparei o repositório com o banco de produção. Desde agosto, 30 migrações foram escritas e aprovadas em PR, mas nunca aplicadas (não constam no registro do banco). Entre elas: `e38` (remove 2 rotinas mortas), `e23`/`e17`/`e18` (endurecimento de segurança), `e25` (particionamento automático de histórico), `20261008230000` (restringir links públicos de aprovação de mockup), além de monitoramentos E30/E33/E40.

**Por que trava:** cada uma exige aprovação do PO pelo mesmo workflow do item 1. Algumas ficaram obsoletas (ex.: `e35` — a lentidão já foi resolvida por um índice criado depois; `e37` aumentaria a carga hoje) e não devem ser aplicadas.

**Passo a passo:** depois que o banco estabilizar, me peça "revise as migrações pendentes" — eu classifico cada uma em aplicar / descartar / reescrever e preparo os PRs, para você só aprovar.

## 4. Painel de estoque sem o card "Risco de ruptura" (decisão de segurança)

**O que é:** em 13/10 o acesso à visão `mv_stock_rupture_alert` foi retirado dos usuários logados (contenção de segurança). A tela de estoque ainda tenta lê-la → 632 erros "acesso negado" hoje e o card não carrega.

**Por que trava:** reabrir o acesso desfaz uma decisão de segurança. Recomendação: criar uma função segura que entregue só os campos do card para perfis internos.

**Passo a passo:** responda "pode criar a função segura do card de ruptura" e eu faço o PR.

## 5. Personalização de produto chamada por visitantes anônimos (decisão)

**O que é:** a função `fn_get_product_customization_options` foi fechada para visitantes em 16/07, mas a tela de regras de personalização ainda a chama sem login → 873 erros hoje.

**Por que trava:** decidir se visitantes devem ver opções de personalização (reabrir) ou se a tela deve exigir login.

## 6. Secret `ASIA_INGESTION_CRON_SECRET` ausente

**O que é:** uma rotina de ingestão do fornecedor Asia reclama 143 vezes/dia que esse segredo não existe no cofre do Supabase.

**Por que trava:** só você tem o valor do segredo.

**Passo a passo:** Supabase → Project Settings → Vault → "Add new secret" com o nome `ASIA_INGESTION_CRON_SECRET` e o valor fornecido pela integração Asia.
