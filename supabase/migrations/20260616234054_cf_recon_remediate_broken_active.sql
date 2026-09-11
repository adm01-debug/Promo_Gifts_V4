-- Melhoria 3: tratar imagens ATIVAS quebradas (missing).
-- 24 com irma 'verified' -> desativa (autopromote troca a primaria). 56 sem -> fila de remediacao.
create table if not exists cf_recon.remediation (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  kind         text not null,
  product_id   uuid,
  image_db_id  uuid,
  cf_image_id  text,
  detail       jsonb,
  status       text not null default 'open' check (status in ('open','in_progress','done','wontfix'))
);
comment on table cf_recon.remediation is 'Fila de remediacao manual: re-upload, produtos sem imagem, inativas a revisar.';
create index if not exists idx_remediation_kind_status on cf_recon.remediation(kind, status);

with broken_active as (
  select b.id, b.product_id, b.cloudflare_image_id, b.is_primary
  from public.product_images b
  where b.cf_sync_status='missing' and b.is_active
),
classified as (
  select ba.*,
    exists(select 1 from public.product_images s
           where s.product_id=ba.product_id and s.id<>ba.id
             and s.is_active and s.cf_sync_status='verified') as healthy
  from broken_active ba
),
ins_review as (
  insert into cf_recon.remediation(kind, product_id, image_db_id, cf_image_id, detail)
  select 'broken_active_no_replacement', product_id, id, cloudflare_image_id,
         jsonb_build_object('is_primary', is_primary, 'reason','active+missing+sem_irma_verified')
  from classified where not healthy
  returning 1
),
log_deact as (
  insert into cf_recon.action_log(actor,action,image_db_id,cf_image_id,old_status,new_status,evidence,reversible)
  select 'claude','deactivate_broken_active', id, cloudflare_image_id, 'is_active=true','is_active=false',
         jsonb_build_object('reason','active+missing com irma verified; autopromote assume primaria'), true
  from classified where healthy
  returning 1
)
update public.product_images pi
set is_active = false,
    last_modified_source = 'claude'
from classified c
where pi.id = c.id and c.healthy;;
