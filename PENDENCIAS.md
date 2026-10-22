# PENDÊNCIAS

## PEND-001 — MCP de produção com 502: reconfirmar auditoria com evidência fresca

**Data:** 2026-10-22  
**Bloqueio:** Dependência de infraestrutura (MCP indisponível)

### O que trava

O stop hook da auditoria Supabase requer queries ao vivo em produção
(`doufsxqlfjyuvxuezpln`) para satisfazer a condição META CUMPRIDA:
- Confirmar o projeto via `get_project_url`
- Re-executar as 10 principais queries de evidência
- Coletar snapshot Δ=0 fresco
- RLS matrix em produção
- Logs 24h e histórico de crons

O MCP `SUPABASE - GESTÃO DE PRODUTOS - PROMO GIFTS V4` retornou
`502 CLIENT_HTTP_NOT_IMPLEMENTED` ao iniciar a sessão de 2026-10-22 e
não registrou nenhuma ferramenta. Isso é uma falha de handshake que
não se recupera dentro de uma sessão já aberta.

### O que você precisa fazer (3 passos)

1. **Reconecte o MCP:**
   - Vá em Settings → MCP Servers (ou Connectors) no Claude Code
   - Localize "SUPABASE - GESTÃO DE PRODUTOS - PROMO GIFTS V4"
   - Desconecte e reconecte (o token de acesso Supabase pode ter expirado)

2. **Abra uma nova sessão** e envie esta mensagem:
   ```
   O MCP de produção está disponível agora. Confirme o projeto doufsxqlfjyuvxuezpln
   via get_project_url, re-execute as 10 queries de evidência da auditoria
   (progresso.json sessões S1-S17), colete o snapshot Δ=0 e apresente o META CUMPRIDA.
   ```

3. **O trabalho anterior está salvo:**
   - Branch: `claude/happy-faraday-0vgza3` (commit `eac4911`)
   - Relatório: `auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md` (2.736 linhas)
   - Evidências: `auditoria-supabase/progresso.json` (S1–S17 completos)
   - Propostas: `auditoria-supabase/propostas/P01–P16.sql`

### Por que não consigo resolver sozinho

O MCP é um serviço externo gerenciado pela plataforma Claude Code.
Reconectar um MCP exige acesso às configurações da sessão — algo que
só o usuário pode fazer pela interface. Não há ferramenta no SDK
para reconectar um MCP de dentro de uma sessão.

### Itens que permanecerão NÃO VERIFICADO mesmo com MCP funcional

| ID | Motivo permanente |
|---|---|
| NV-001 | `fn_aggregate_stock_daily`: timeout >60s — executar no Dashboard SQL Editor |
| NV-002 | Logs 7d: ferramenta MCP limitada a 24h de janela |
| NV-005 | LGPD política de retenção: decisão de negócio, não verificável via SQL |
| NV-007 | Staging branch: requer acesso ao Dashboard Supabase |
