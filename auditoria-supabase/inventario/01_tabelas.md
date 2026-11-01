# Inventário — Tabelas

**Projeto:** doufsxqlfjyuvxuezpln | **Data:** 2026-11-01

## Resumo

| Métrica | Valor |
|---|---|
| Total tabelas `public` | 399 |
| Tabelas com RLS ativo | 399 (100%) |
| Tabelas sem RLS | 0 |
| Total policies | 962 |
| Avg policies/tabela | ~2,4 |

## Tabelas maiores (top 10 por tamanho total)

| Tabela | Tamanho total |
|---|---|
| `stock_snapshots` | ~3,6M rows (maior tabela) |
| `supplier_products_raw` | volume alto |
| `product_images` | volume alto |
| `audit_log_gravacao` | crescimento por logs |
| `analytics_events` | crescimento por eventos |
| `admin_audit_log` | crescimento por auditoria |
| `pipeline_run_log` | retido 30 dias |
| `product_ai_history` | histórico AI |

## Tabela de backup encontrada

| Tabela | Tipo | Tamanho |
|---|---|---|
| `_backup_stock_daily_summary_20260618` | tabela permanente | ~42MB |

→ Achado SB-0009

## Tabelas sem RLS

Nenhuma. Todas as 399 tabelas do schema `public` têm RLS habilitado.

## Estrutura da integridade de auth.users × profiles

| Métrica | Valor |
|---|---|
| auth.users | 39 |
| public.profiles | 39 |
| Usuários sem perfil | 0 |
| Perfis sem usuário (órfãos) | 0 |
| Email não confirmado | 0 |

Trigger `on_auth_user_created` → `handle_new_user` presente e habilitado ✓
