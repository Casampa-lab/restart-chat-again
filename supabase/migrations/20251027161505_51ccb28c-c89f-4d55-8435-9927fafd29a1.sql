-- Enum e função de papéis (idempotentes)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin','coordenador','tecnico');
  end if;
end $$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role    = _role
  );
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Ativa RLS e cria policies nas 7 tabelas
do $$
declare
  t text;
  tbls text[] := array[
    'defensas_intervencoes',
    'ficha_cilindros_intervencoes',
    'ficha_inscricoes_intervencoes',
    'ficha_marcas_longitudinais_intervencoes',
    'ficha_placa_intervencoes',
    'ficha_porticos_intervencoes',
    'ficha_tachas_intervencoes'
  ];
begin
  foreach t in array tbls loop
    -- pula se a tabela não existir
    if to_regclass('public.'||t) is null then continue; end if;

    execute format('alter table public.%I enable row level security;', t);

    -- limpa policies antigas (se houver)
    execute format('drop policy if exists %I on public.%I;', t||'_select_authenticated', t);
    execute format('drop policy if exists %I on public.%I;', t||'_insert_roles', t);
    execute format('drop policy if exists %I on public.%I;', t||'_update_owner_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t||'_delete_owner_or_admin', t);

    -- DROP todas as outras policies antigas
    execute format('drop policy if exists "Coordenadores can view all %I" on public.%I;', replace(t, '_intervencoes', ''), t);
    execute format('drop policy if exists "Users can create intervencoes for %I" on public.%I;', replace(t, '_intervencoes', ''), t);
    execute format('drop policy if exists "Users can view their own %I" on public.%I;', replace(t, '_intervencoes', ''), t);
    execute format('drop policy if exists "Users can create their own %I interventions" on public.%I;', replace(t, 'ficha_', ''), t);
    execute format('drop policy if exists "Coordenadores can view all %I" on public.%I;', t, t);
    execute format('drop policy if exists "Users can view their own %I" on public.%I;', t, t);
    execute format('drop policy if exists "Users can create their own %I" on public.%I;', t, t);

    -- SELECT
    execute format($f$
      create policy %I on public.%I
      as permissive for select to authenticated
      using (true);
    $f$, t||'_select_authenticated', t);

    -- INSERT
    execute format($f$
      create policy %I on public.%I
      as permissive for insert to authenticated
      with check (
        public.has_role(auth.uid(),'tecnico'::public.app_role)
        or public.has_role(auth.uid(),'coordenador'::public.app_role)
        or public.has_role(auth.uid(),'admin'::public.app_role)
      );
    $f$, t||'_insert_roles', t);

    -- UPDATE
    execute format($f$
      create policy %I on public.%I
      as permissive for update to authenticated
      using (
        user_id = auth.uid()
        or public.has_role(auth.uid(),'coordenador'::public.app_role)
        or public.has_role(auth.uid(),'admin'::public.app_role)
      )
      with check (
        user_id = auth.uid()
        or public.has_role(auth.uid(),'coordenador'::public.app_role)
        or public.has_role(auth.uid(),'admin'::public.app_role)
      );
    $f$, t||'_update_owner_or_admin', t);

    -- DELETE
    execute format($f$
      create policy %I on public.%I
      as permissive for delete to authenticated
      using (
        user_id = auth.uid()
        or public.has_role(auth.uid(),'coordenador'::public.app_role)
        or public.has_role(auth.uid(),'admin'::public.app_role)
      );
    $f$, t||'_delete_owner_or_admin', t);

    -- Índice em user_id (se existir a coluna)
    perform 1
    from information_schema.columns
    where table_schema='public' and table_name=t and column_name='user_id';

    if found then
      execute format('create index if not exists %I on public.%I (user_id);',
                     'idx_'||t||'_user_id', t);
    end if;
  end loop;
end $$;