-- Fee vault mappings for X users
create table if not exists public.fee_vaults (
  id bigserial primary key,
  x_user_id text not null,
  x_user_handle text,
  vault_address text not null,
  created_at timestamptz not null default now()
);

-- One vault per user
create unique index if not exists fee_vaults_unique_user
  on public.fee_vaults (x_user_id);

-- Upsert helper to avoid concurrent insert races
create or replace function public.upsert_fee_vault(
  p_x_user_id text,
  p_x_user_handle text,
  p_vault_address text
)
returns public.fee_vaults
language plpgsql
as $$
declare
  result public.fee_vaults;
begin
  insert into public.fee_vaults (x_user_id, x_user_handle, vault_address)
  values (p_x_user_id, p_x_user_handle, p_vault_address)
  on conflict (x_user_id)
  do update set
    x_user_handle = excluded.x_user_handle,
    vault_address = excluded.vault_address
  returning * into result;

  return result;
end;
$$;
