# Seção 9 — Auth, Storage e Realtime

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 9.1 Auth

### Usuários
- **Total:** 39 usuários
- **Email confirmado:** 39/39 (100%)
- **Usuários banidos:** 0
- **Últimos 30 dias com atividade:** não medido (PII — omitido)

### MFA / 2FA
- Função `verify-2fa-token` existe com GUARD comentário: "manter como authenticated — não reverter para public"
- Não foi possível confirmar % de usuários com MFA habilitado sem PII

### Achados Auth

---

### [ID-AU-001] Sem política de senha documentada ou configurada
- **Severidade:** MÉDIO
- **Objeto:** Supabase Auth config
- **Evidência:** `docs/qa/perfil-dados-senha-preferencias-checklist.md` existe mas é checklist de QA, não política técnica. Não foi encontrada configuração de `minimum_password_length` ou `password_requirements` no projeto.
- **Impacto:** Senhas fracas aceitas por padrão (Supabase default: 6 chars).
- **Correção sugerida:** Configurar via Supabase Dashboard → Auth → Password → minimum length ≥ 12, require complexity.
- **Esforço:** Trivial (configuração dashboard)

---

### [ID-AU-002] Ausência de política de expiração de sessão documentada
- **Severidade:** BAIXO
- **Objeto:** Supabase Auth config
- **Evidência:** Não foi encontrada configuração de `jwt_expiry` customizada no repositório. Padrão Supabase é 3600s (1h) com refresh token de 1 semana.
- **Impacto:** Sessões longas aumentam janela de ataque em caso de token comprometido.
- **Correção sugerida:** Documentar política de sessão. Considerar reduzir `jwt_expiry` para workloads sensíveis.
- **Esforço:** Trivial

---

## 9.2 Storage

### Buckets (11 total)

| Bucket | Público | Mime permitidos | Política especial |
|---|---|---|---|
| `avatars` | **SIM** | images/* | Público — leitura anônima |
| `mockup-assets` | **SIM** | images/*, application/pdf | Público — risco de vazamento |
| `art-files` | não | * | **SELECT {public}** — veja EF-S001 |
| `component-media` | não | * | **"Anyone can read" {public}** — veja EF-S001 |
| `scripts` | não | * | Aceita shell scripts — veja EF-S002 |
| `recibos-entrega` | não | * | UPDATE policy sem WITH CHECK — veja EF-S003 |
| demais 5 | não | varies | Políticas padrão |

### Achados Storage

---

### [ID-ST-001] Buckets privados com política SELECT `{public}` (art-files, component-media)
- **Severidade:** ALTO
- **Objeto:** Storage buckets `art-files` e `component-media`
- **Evidência:** Buckets marcados como `public=false` no schema, mas têm políticas RLS com `TO public` e sem filtro de usuário (qualificador `true` ou equivalente). Qualquer pessoa com a URL do objeto pode acessar os arquivos.
- **Impacto:** Arte de clientes e mídias de componentes acessíveis publicamente sem autenticação, apesar do bucket ser privado. Potencial vazamento de material proprietário.
- **Correção sugerida:** Remover a política `{public}` SELECT e substituir por `auth.uid() IS NOT NULL` (usuários autenticados) ou política baseada em ownership. Se leitura pública for intencional, marcar o bucket como `public=true` explicitamente e documentar.
- **Esforço:** Pequeno (2 políticas RLS)

---

### [ID-ST-002] Bucket `scripts` aceita upload de shell scripts sem restrição de mime
- **Severidade:** MÉDIO
- **Objeto:** Storage bucket `scripts`
- **Evidência:** MIME types permitidos: `*` (qualquer tipo). Bucket aceita arquivos `.sh`, `.py`, `.js`, etc.
- **Impacto:** Se política de INSERT permitir uploads por usuários não-admin, scripts maliciosos podem ser armazenados e referenciados. Risco de confused deputy.
- **Correção sugerida:** Restringir MIME types do bucket `scripts` aos tipos realmente necessários (ex: `application/javascript`, `application/json`). Garantir que INSERT é restrito a admins.
- **Esforço:** Pequeno

---

### [ID-ST-003] Política UPDATE em `recibos-entrega` sem WITH CHECK
- **Severidade:** MÉDIO
- **Objeto:** Storage bucket `recibos-entrega` — política UPDATE
- **Evidência:** Política UPDATE existe mas não tem cláusula `WITH CHECK`. Em RLS do PostgreSQL, `WITH CHECK` é a cláusula que valida o estado **após** a modificação. Sem ela, um usuário pode sobrescrever um recibo com um arquivo de outro dono.
- **Impacto:** Usuário A pode fazer UPDATE no objeto de usuário B se tiver acesso ao path.
- **Correção sugerida:** Adicionar `WITH CHECK (owner = auth.uid())` (ou equivalente) à política UPDATE.
- **Esforço:** Trivial (1 migration)

---

### [ID-ST-004] `mockup-assets` público — confirmar intencionalidade
- **Severidade:** INFO
- **Objeto:** Storage bucket `mockup-assets`
- **Evidência:** Bucket marcado `public=true`. Contém assets de mockup de produtos.
- **Impacto:** URLs de mockup são acessíveis sem autenticação. Pode ser intencional (CDN para visualização pública) ou inadvertido.
- **Correção sugerida:** Confirmar com PO se todos os mockups devem ser públicos. Se sim, documentar a decisão.
- **Esforço:** N/A (decisão de negócio)

---

## 9.3 Realtime

### Tabelas na publicação `supabase_realtime` (10 total)

| Tabela | RLS | Observação |
|---|---|---|
| `seller_carts` | habilitada | Carrinho — RLS obrigatória |
| `workspace_notifications` | habilitada | Notificações — RLS obrigatória |
| `catalog_items` | habilitada | Catálogo público |
| `product_favorites` | habilitada | Favoritos por usuário |
| `quote_items` | habilitada | Itens de orçamento |
| `quotes` | habilitada | Orçamentos |
| demais 4 | habilitada | RLS em todas |

**Confirmado:** todas as 10 tabelas no Realtime têm RLS habilitada. Sem risco de broadcast não autorizado.

### auth.users no Realtime

---

### [ID-RT-001] `auth.users` na publicação Realtime — confirmar escopo
- **Severidade:** MÉDIO
- **Objeto:** `supabase_realtime` publication — tabela `auth.users`
- **Evidência:** Query em `pg_publication_tables` confirmou `auth.users` na publicação Realtime. Supabase por padrão **não** inclui `auth.users` no Realtime — isso foi uma adição manual ou via dashboard.
- **Impacto:** Se RLS de `auth.users` permitir Realtime subscription por usuários não-admin, mudanças em qualquer usuário podem vazar para subscribers. O schema `auth` é gerenciado pelo Supabase e mudanças de RLS nele podem ser resetadas em upgrades.
- **Correção sugerida:** Verificar se há listeners de `auth.users` no frontend. Se não houver, remover da publicação. Se houver, garantir que política Realtime filtra por `auth.uid() = id`.
- **Esforço:** Pequeno

---

## 9.4 pg_net — Webhooks HTTP

### Status (últimos 7 dias)
- **Total de requisições:** 228
- **Sucesso:** 99 (43%)
- **Falha/pendente:** 129 (**57% de falha**)

---

### [ID-NET-001] Taxa de falha de 57% em webhooks pg_net
- **Severidade:** ALTO
- **Objeto:** `net._http_response` (pg_net)
- **Evidência:** Query em `net._http_response` retornou 228 registros nos últimos 7 dias: 99 com status 2xx, 129 com erro ou pendente. Taxa de falha: 56,6%.
- **Impacto:** Webhooks falhos significam integrações não notificadas (CRM, ERP, sistemas externos). Dependendo do destino, pode haver perda de dados de venda, notificações de estoque, callbacks de pagamento.
- **Correção sugerida:** 
  1. Inspecionar `net._http_response` para identificar os endpoints com mais falhas (`group by url`)
  2. Verificar se os endpoints externos estão respondendo
  3. Implementar retry logic ou Dead Letter Queue para webhooks críticos
  4. Adicionar alerta no uptime monitor para taxa de falha > 20%
- **Esforço:** Médio (investigação + retry logic)

---

## 9.5 Sumário da Seção 9

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 2 (ST-001, NET-001) |
| MÉDIO | 4 (AU-001, ST-002, ST-003, RT-001) |
| BAIXO | 1 (AU-002) |
| INFO | 1 (ST-004) |
