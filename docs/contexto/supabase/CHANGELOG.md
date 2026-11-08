# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-08 00:40 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_11`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_04`

## 2026-11-07 02:05 UTC

- **functions** alterado (1): `public.handle_updated_at()`
- **migrations** adicionado (1): `20261106232045_fix_handle_updated_at_search_path`

## 2026-11-07 01:53 UTC

- **lints** adicionado (1): `view_security_definer:public.vw_system_health_quick`
- **migrations** adicionado (1): `20261101201000_fix_health_view_backup_check`
- **views** alterado (1): `public.vw_system_health_quick`

## 2026-11-07 00:48 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_03`

## 2026-11-06 16:13 UTC

- **colunas** adicionado (9): `public.stock_notes.created_at`, `public.stock_notes.created_by`, `public.stock_notes.deleted_at`, `public.stock_notes.id`, `public.stock_notes.is_pinned`, `public.stock_notes.note`, `public.stock_notes.supplier_id`, `public.stock_notes.updated_at`, `public.stock_notes.variant_id`
- **constraints** adicionado (4): `public.stock_notes.stock_notes_created_by_fkey`, `public.stock_notes.stock_notes_pkey`, `public.stock_notes.stock_notes_supplier_id_fkey`, `public.stock_notes.stock_notes_variant_id_fkey`
- **functions** adicionado (1): `public.handle_updated_at()`
- **grants** adicionado (3): `public.stock_notes:anon`, `public.stock_notes:authenticated`, `public.stock_notes:service_role`
- **indexes** adicionado (3): `public.stock_notes_active_idx`, `public.stock_notes_pkey`, `public.stock_notes_variant_idx`
- **lints** adicionado (5): `fk_without_index:public.stock_notes.stock_notes_created_by_fkey`, `fk_without_index:public.stock_notes.stock_notes_supplier_id_fkey`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_delete_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_insert_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_update_own`
- **migrations** adicionado (1): `20261031000000_create_stock_notes`
- **policies (RLS)** adicionado (4): `public.stock_notes.stock_notes_delete_own`, `public.stock_notes.stock_notes_insert_own`, `public.stock_notes.stock_notes_select_authenticated`, `public.stock_notes.stock_notes_update_own`
- **tabelas** adicionado (1): `public.stock_notes`
- **triggers** adicionado (1): `public.stock_notes.set_stock_notes_updated_at`

## 2026-11-06 01:55 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_02`

## 2026-11-05 07:19 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_08`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_01`

## 2026-11-04 12:22 UTC

- Snapshot inicial.

