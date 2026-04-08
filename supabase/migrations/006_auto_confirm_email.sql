-- ============================================================
-- Migration 006 — Auto-confirma email no signUp
-- Cole no Supabase: Dashboard → SQL Editor → New query → Run
--
-- Por que isso?
-- O sistema é interno B2B com aprovação manual pelo Dono.
-- Confirmação por email é redundante (e quebra o fluxo se a opção
-- "Confirm email" estiver ligada nas configurações do Supabase).
-- Esta migration garante que TODO novo usuário já nasce com
-- email_confirmed_at preenchido — independente da config global.
-- ============================================================

-- Atualiza o trigger handle_new_auth_user pra também confirmar o email
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  -- 1) Cria a linha em public.usuarios com status 'pendente'
  insert into public.usuarios (id, nome, email, cargo_informado, status, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'cargo_informado',
    'pendente',
    'funcionario'
  )
  on conflict (id) do nothing;

  -- 2) Auto-confirma o email — aprovação real é feita pelo Dono no /admin/usuarios.
  -- Sem isso, o usuário não consegue logar mesmo após aprovação.
  -- (confirmed_at é generated column, calculada automaticamente a partir de email_confirmed_at)
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer;

-- Confirma TODOS os usuários existentes que ainda estão pendentes de confirmação
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- Verificação
select email, email_confirmed_at is not null as confirmado
from auth.users
order by created_at desc;
