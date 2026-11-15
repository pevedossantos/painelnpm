-- =====================================================================
--  N.P.M. · Núcleo Preparatório Militar · Exército de Solano
--  Banco do painel do NPM (mesmo projeto Supabase do rpcontrol e do TEN-GEN)
--
--  Como usar: Supabase → SQL Editor → New query → cole TODO este arquivo → Run.
--  Pode rodar de novo quando o arquivo for atualizado: os dados não se perdem.
--
--  • Contas próprias do NPM (separadas do rpcontrol). A PRIMEIRA conta criada
--    no painel do NPM vira administradora e aprova as próximas.
--  • Efetivos ficam em npm_efetivos, a mesma tabela que o painel do TEN-GEN lê.
--    Quem é marcado como "setorizar" aparece para o TEN-GEN, que escolhe o setor.
--  • O NPM não consegue mudar o setor de destino: só o TEN-GEN.
--  • Nada aqui altera o rpcontrol.
-- =====================================================================

create extension if not exists pgcrypto;

-- Peças do painel do TEN-GEN usadas aqui (criadas também pelo script dele)
create table if not exists public.tg_dono (
  user_id   uuid primary key references auth.users on delete cascade,
  criado_em timestamptz not null default now()
);
create or replace function public.tg_sou_dono() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tg_dono where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Efetivos do NPM (compartilhado com o TEN-GEN)
-- ---------------------------------------------------------------------
create table if not exists public.npm_efetivos (
  id             uuid primary key default gen_random_uuid(),
  qra            text not null check (length(qra) between 1 and 60),
  dc             text not null default '',
  nivel          text not null default 'iniciante' check (nivel in ('iniciante','avancado','setorizar')),
  obs            text not null default '',
  setor_destino  text check (setor_destino in ('Sul','Norte','Centro','Leste')),
  setorizado_em  timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
alter table public.npm_efetivos add column if not exists data_entrada  date not null default current_date;
alter table public.npm_efetivos add column if not exists recrutado_por text not null default '';
alter table public.npm_efetivos add column if not exists criado_por    uuid;
create index if not exists npm_efetivos_nivel_idx on public.npm_efetivos (nivel, setor_destino);

-- ---------------------------------------------------------------------
-- Contas do NPM
-- ---------------------------------------------------------------------
create table if not exists public.npm_usuarios (
  user_id   uuid primary key references auth.users on delete cascade,
  nome      text not null check (length(nome) between 1 and 40),
  papel     text not null default 'membro' check (papel in ('admin','membro')),
  aprovado  boolean not null default false,
  criado_em timestamptz not null default now()
);

create or replace function public.npm_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.npm_usuarios where user_id = auth.uid() and aprovado);
$$;
create or replace function public.npm_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.npm_usuarios where user_id = auth.uid() and aprovado and papel = 'admin');
$$;

-- Chamada logo após criar a conta no painel do NPM.
-- Só contas do NPM (e-mail interno @npm-solano.com) podem se registrar aqui.
-- Se ainda não existe administrador, a conta vira administradora já aprovada.
create or replace function public.npm_registrar(p_nome text) returns text
language plpgsql security definer set search_path = public as $$
declare em text; n text := trim(coalesce(p_nome, ''));
begin
  if auth.uid() is null then raise exception 'Entre primeiro.'; end if;
  select email into em from auth.users where id = auth.uid();
  if em is null or em not like '%@npm-solano.com' then raise exception 'Esta conta não é do NPM.'; end if;
  if length(n) < 1 or length(n) > 40 then raise exception 'Nome inválido.'; end if;
  if exists (select 1 from npm_usuarios where user_id = auth.uid()) then
    return (select case when aprovado then papel else 'pendente' end from npm_usuarios where user_id = auth.uid());
  end if;
  lock table npm_usuarios in exclusive mode;
  if not exists (select 1 from npm_usuarios where papel = 'admin' and aprovado) then
    insert into npm_usuarios (user_id, nome, papel, aprovado) values (auth.uid(), n, 'admin', true);
    return 'admin';
  end if;
  insert into npm_usuarios (user_id, nome) values (auth.uid(), n);
  return 'pendente';
end $$;

-- Situação de quem está logado: 'admin', 'membro', 'pendente' ou 'nenhum'
create or replace function public.npm_situacao() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select case when aprovado then papel else 'pendente' end from npm_usuarios where user_id = auth.uid()), 'nenhum');
$$;

-- Administração da equipe (só administradores)
create or replace function public.npm_aprovar(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not npm_admin() then raise exception 'Só administradores.'; end if;
  update npm_usuarios set aprovado = true where user_id = p_user;
end $$;

create or replace function public.npm_definir_papel(p_user uuid, p_papel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not npm_admin() then raise exception 'Só administradores.'; end if;
  if p_papel not in ('admin','membro') then raise exception 'Papel inválido.'; end if;
  if p_papel = 'membro' and (select count(*) from npm_usuarios where papel = 'admin' and aprovado and user_id <> p_user) = 0 then
    raise exception 'O NPM precisa de pelo menos um administrador.';
  end if;
  update npm_usuarios set papel = p_papel where user_id = p_user;
end $$;

create or replace function public.npm_remover(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not npm_admin() then raise exception 'Só administradores.'; end if;
  if (select papel from npm_usuarios where user_id = p_user) = 'admin'
     and (select count(*) from npm_usuarios where papel = 'admin' and aprovado and user_id <> p_user) = 0 then
    raise exception 'O NPM precisa de pelo menos um administrador.';
  end if;
  delete from npm_usuarios where user_id = p_user;
end $$;

revoke all on function public.npm_registrar(text), public.npm_situacao(), public.npm_aprovar(uuid),
  public.npm_definir_papel(uuid, text), public.npm_remover(uuid) from public, anon;
grant execute on function public.npm_registrar(text), public.npm_situacao(), public.npm_aprovar(uuid),
  public.npm_definir_papel(uuid, text), public.npm_remover(uuid), public.npm_ok(), public.npm_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Proteções automáticas em npm_efetivos
-- ---------------------------------------------------------------------
create or replace function public.npm_marca_atualizacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := auth.uid();
    new.setor_destino := null; new.setorizado_em := null;
    new.atualizado_em := now();
    return new;
  end if;
  -- Só o TEN-GEN muda o setor de destino
  if not public.tg_sou_dono() then
    new.setor_destino := old.setor_destino; new.setorizado_em := old.setorizado_em;
  end if;
  if new.nivel is distinct from old.nivel then new.atualizado_em := now(); end if;
  return new;
end $$;
drop trigger if exists npm_efetivos_atualizado on public.npm_efetivos;
create trigger npm_efetivos_atualizado before insert or update on public.npm_efetivos
  for each row execute function public.npm_marca_atualizacao();

-- ---------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------
alter table public.npm_usuarios enable row level security;
alter table public.npm_efetivos enable row level security;

drop policy if exists npm_usuarios_ler on public.npm_usuarios;
create policy npm_usuarios_ler on public.npm_usuarios for select to authenticated
  using (user_id = auth.uid() or public.npm_ok());

drop policy if exists npm_tg_ler on public.npm_efetivos;
create policy npm_tg_ler on public.npm_efetivos for select to authenticated using (public.tg_sou_dono());
drop policy if exists npm_equipe_ler on public.npm_efetivos;
create policy npm_equipe_ler on public.npm_efetivos for select to authenticated using (public.npm_ok());
drop policy if exists npm_equipe_criar on public.npm_efetivos;
create policy npm_equipe_criar on public.npm_efetivos for insert to authenticated with check (public.npm_ok());
drop policy if exists npm_equipe_editar on public.npm_efetivos;
create policy npm_equipe_editar on public.npm_efetivos for update to authenticated using (public.npm_ok()) with check (public.npm_ok());
drop policy if exists npm_equipe_apagar on public.npm_efetivos;
create policy npm_equipe_apagar on public.npm_efetivos for delete to authenticated using (public.npm_ok());

grant select, insert, update, delete on public.npm_efetivos to authenticated;
grant select on public.npm_usuarios to authenticated;
revoke all on public.npm_efetivos, public.npm_usuarios from anon;
