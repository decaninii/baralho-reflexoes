-- ============================================================
-- Minuto de Reflexão — schema inicial do Supabase
-- Rode isso no SQL Editor do painel do Supabase (uma vez só).
-- ============================================================

-- ============================================================
-- Migração (rode isso se as tabelas já existiam antes destes campos):
--   alter table public.profiles add column if not exists full_name text;
--   alter table public.profiles add column if not exists birth_date date;
--   alter table public.profiles add column if not exists preferred_theme_id text;
--   alter table public.profiles add column if not exists is_admin boolean not null default false;
-- ============================================================

-- Perfil básico (1 linha por usuário autenticado)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  birth_date date,
  preferred_theme_id text,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- Favoritos (uma linha por frase salva)
create table if not exists public.favorites (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  theme_id text not null,
  phrase_idx int not null,
  created_at timestamptz default now(),
  unique (user_id, theme_id, phrase_idx)
);

-- Assinaturas (status vem do webhook do Mercado Pago)
create table if not exists public.subscriptions (
  user_id uuid references auth.users(id) on delete cascade primary key,
  status text not null default 'inactive', -- 'active' | 'inactive' | 'cancelled'
  mp_subscription_id text,
  valid_until timestamptz,
  updated_at timestamptz default now()
);

-- Inscrições de push (uma linha por dispositivo/navegador)
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security: cada pessoa só acessa os próprios dados
-- ============================================================
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "profiles: usuário vê o próprio" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: usuário cria o próprio" on public.profiles
  for insert with check (auth.uid() = id);

create policy "favorites: CRUD do próprio usuário" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions: usuário lê a própria" on public.subscriptions
  for select using (auth.uid() = user_id);
-- IMPORTANTE: updates de subscriptions vêm só do webhook (service role),
-- que ignora RLS — por isso não existe policy de insert/update para o usuário aqui.

create policy "push_subscriptions: CRUD do próprio usuário" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cria o profile automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, birth_date, preferred_theme_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'preferred_theme_id'
  );
  insert into public.subscriptions (user_id, status) values (new.id, 'inactive');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Conta de teste com acesso total (rode isso DEPOIS de criar a
-- conta teste@teste.com pela tela de cadastro do app):
--   update public.profiles set is_admin = true where email = 'teste@teste.com';
-- ============================================================
