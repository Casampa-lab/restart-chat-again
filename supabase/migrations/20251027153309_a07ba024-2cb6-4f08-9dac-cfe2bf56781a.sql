-- 0) Garantir schema e contexto
set search_path = public;

-- 1) Tabelas de auditoria (apenas para leitura posterior no painel)
create table if not exists audit_intervencoes_report (
  table_name text primary key,
  family text,                        -- 'legacy' = intervencoes_* | 'ficha' = ficha_*_intervencoes
  row_count bigint,
  has_user_id boolean,
  has_created_at boolean,
  has_updated_at boolean,
  last_row_ts timestamptz,
  rls_on boolean,
  policies integer,
  fk_incoming integer,                -- quantas FKs apontam PARA esta tabela
  fk_outgoing integer,                -- quantas FKs esta tabela aponta PARA outras
  deps_views integer,                 -- views que dependem desta tabela
  has_index_user_id boolean,
  writes_counter bigint               -- ins + upd + del (pg_stat_user_tables)
);

create table if not exists audit_intervencoes_recommendations (
  table_name text primary key,
  family text,
  row_count bigint,
  deps_views integer,
  fk_incoming integer,
  writes_counter bigint,
  rls_on boolean,
  policies integer,
  recommendation text                 -- 'MANTER' ou 'REMOVER'
);

-- 2) Limpar relatórios anteriores
truncate table audit_intervencoes_report;
truncate table audit_intervencoes_recommendations;

-- 3) Catalogar as possíveis tabelas das duas famílias
--    (se alguma não existir, será ignorada no preenchimento)
do $$
declare
  rec record;
  v_tables constant text[] := array[
    -- família LEGACY (intervencoes_*)
    'intervencoes_cilindros',
    'intervencoes_inscricoes',
    'intervencoes_porticos',
    'intervencoes_sh',
    'intervencoes_sv',
    'intervencoes_tacha',

    -- família NOVA (ficha_*_intervencoes)
    'defensas_intervencoes',
    'ficha_cilindros_intervencoes',
    'ficha_inscricoes_intervencoes',
    'ficha_marcas_longitudinais_intervencoes',
    'ficha_placa_intervencoes',
    'ficha_porticos_intervencoes',
    'ficha_tachas_intervencoes'
  ];
  v_t text;
  v_family text;
  v_rowcount bigint;
  v_has_user boolean;
  v_has_created boolean;
  v_has_updated boolean;
  v_last_ts timestamptz;
  v_rls boolean;
  v_policies int;
  v_fk_in int;
  v_fk_out int;
  v_deps int;
  v_has_idx_user boolean;
  v_writes bigint;
  v_sql text;
begin
  foreach v_t in array v_tables loop
    -- pular se a tabela não existe
    if to_regclass('public.'||v_t) is null then
      continue;
    end if;

    -- família
    if v_t like 'intervencoes_%' then
      v_family := 'legacy';
    else
      v_family := 'ficha';
    end if;

    -- contagem de linhas (precisa de EXECUTE)
    v_sql := format('select count(*)::bigint from public.%I', v_t);
    execute v_sql into v_rowcount;

    -- existência de colunas
    select exists (
             select 1 from information_schema.columns
             where table_schema='public' and table_name=v_t and column_name='user_id'
           ),
           exists (
             select 1 from information_schema.columns
             where table_schema='public' and table_name=v_t and column_name='created_at'
           ),
           exists (
             select 1 from information_schema.columns
             where table_schema='public' and table_name=v_t and column_name='updated_at'
           )
      into v_has_user, v_has_created, v_has_updated;

    -- última data (usa updated_at se existir; senão created_at; senão null)
    v_last_ts := null;
    if v_has_updated then
      v_sql := format('select max(updated_at)::timestamptz from public.%I', v_t);
      execute v_sql into v_last_ts;
    elsif v_has_created then
      v_sql := format('select max(created_at)::timestamptz from public.%I', v_t);
      execute v_sql into v_last_ts;
    end if;

    -- se RLS está ligado
    select c.relrowsecurity
      into v_rls
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public'
       and c.relname=v_t
       and c.relkind='r';

    -- nº de policies
    select count(*) into v_policies
      from pg_policies p
     where p.schemaname='public'
       and p.tablename=v_t;

    -- FKs que apontam PARA esta tabela (incoming)
    select count(*) into v_fk_in
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu
        on rc.unique_constraint_name = kcu.constraint_name
     where kcu.table_schema='public'
       and kcu.table_name = v_t;

    -- FKs que esta tabela aponta (outgoing)
    select count(*) into v_fk_out
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
     where tc.table_schema='public'
       and tc.table_name = v_t
       and tc.constraint_type='FOREIGN KEY';

    -- views dependentes
    select count(*)
      into v_deps
      from pg_depend d
      join pg_class c on c.oid = d.refobjid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname='public'
       and c.relname = v_t
       and d.classid = 'pg_class'::regclass
       and d.refclassid = 'pg_class'::regclass
       and exists (
         select 1
         from pg_class vc
         where vc.oid = d.objid
           and vc.relkind = 'v'  -- view
       );

    -- índice em user_id
    select exists (
      select 1
      from pg_indexes i
      where schemaname='public'
        and tablename=v_t
        and indexdef ilike '%(user_id)%'
    ) into v_has_idx_user;

    -- contadores de escrita
    select coalesce(s.n_tup_ins,0) + coalesce(s.n_tup_upd,0) + coalesce(s.n_tup_del,0)
      into v_writes
      from pg_stat_user_tables s
     where s.relname = v_t;

    -- inserir no relatório
    insert into audit_intervencoes_report(
      table_name,family,row_count,has_user_id,has_created_at,has_updated_at,
      last_row_ts,rls_on,policies,fk_incoming,fk_outgoing,deps_views,
      has_index_user_id,writes_counter
    )
    values (
      v_t, v_family, v_rowcount, v_has_user, v_has_created, v_has_updated,
      v_last_ts, v_rls, v_policies, v_fk_in, v_fk_out, v_deps,
      v_has_idx_user, coalesce(v_writes,0)
    );
  end loop;
end $$;

-- 4) Recomendação automática (não altera nada; só sugere)
insert into audit_intervencoes_recommendations(table_name,family,row_count,deps_views,fk_incoming,writes_counter,rls_on,policies,recommendation)
select
  r.table_name,
  r.family,
  r.row_count,
  r.deps_views,
  r.fk_incoming,
  r.writes_counter,
  r.rls_on,
  r.policies,
  case
    when coalesce(r.row_count,0) > 0 then 'MANTER'
    when coalesce(r.deps_views,0) > 0 then 'MANTER'
    when coalesce(r.fk_incoming,0) > 0 then 'MANTER'
    when coalesce(r.writes_counter,0) > 0 then 'MANTER'
    else 'REMOVER'
  end as recommendation
from audit_intervencoes_report r;