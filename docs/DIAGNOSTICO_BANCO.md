# 🔍 Diagnóstico de Comunicação com Banco de Dados

## ✅ Status Atual

**Última verificação**: 2026-08-19 17:40:08

| Serviço | Status | Latência |
|---------|--------|----------|
| Database interno (Supabase) | ✅ Healthy | 102ms |
| External DB (Promobrind) | ✅ Healthy | 125ms |

**Endpoint de verificação**:
```bash
GET https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/health-check?fresh=1
```

---

## 📋 Checklist de Diagnóstico

Quando você reportar um erro, me diga:

### 1. **URL/Endpoint Afetado**
- Qual página está abrindo? (ex: `/produto/123`, `/admin/conexoes`)
- Qual ação está tentando? (buscar, criar, atualizar, deletar)

### 2. **Erro Exato**
- Mensagem completa do erro (copie/cole)
- Status HTTP (se aparecer)
- Console do navegador (F12 → Console)

### 3. **Contexto**
- Está logado? Com qual tipo de usuário?
- É a primeira vez que faz essa ação ou funcionava antes?

---

## 🔧 Endpoints de Teste Rápido

### Health Check Geral
```bash
curl -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/health-check?fresh=1"
```

### Conexões Específicas
```bash
# Conexões cadastradas
curl -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-health-check"

# Auditoria completa
curl -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-hub-audit"
```

---

## 🗄️ Tabelas Principais

Se algum módulo der erro, podemos consultar direto:

| Tabela | Função |
|--------|--------|
| `products` | Catálogo de produtos |
| `product_images` | Imagens dos produtos (com `content_hash`) |
| `categories` | Categorias |
| `organizations` | Organizações |
| `profiles` | Usuários |
| `quotes` | Orçamentos |
| `integration_credentials` | Credenciais de integrações |

---

## 🚨 Erros Comuns e Soluções

### `JWT/anon key inválida`
- Token expirou → usuário precisa logar novamente
- Chave rotacionada → atualizar `VITE_SUPABASE_PUBLISHABLE_KEY`

### `Network Error` / `Failed to fetch`
- Problema de CORS
- Edge function offline
- Problema de DNS

### `permission denied for table X`
- Política RLS bloqueando
- Usuário sem permissão

### `relation does not exist`
- Migration não foi aplicada
- Tabela em schema diferente

---

## 📞 Próximo Passo

**Abra a página que está dando erro** e me envie:

1. ✅ Mensagem de erro exata
2. ✅ URL da página
3. ✅ O que estava tentando fazer
4. ✅ Screenshot (se possível)

Vou diagnosticar e corrigir! 🚀
