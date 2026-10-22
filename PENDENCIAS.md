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

## 3. Secret `ASIA_INGESTION_CRON_SECRET` ausente

**O que é:** uma rotina de ingestão do fornecedor Asia reclama 143 vezes/dia que esse segredo não existe no cofre do Supabase.

**Por que trava:** só você tem o valor do segredo.

**Passo a passo:** Supabase → Project Settings → Vault → "Add new secret" com o nome `ASIA_INGESTION_CRON_SECRET` e o valor fornecido pela integração Asia.
