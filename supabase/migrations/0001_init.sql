-- AI Social Content Generator & Scheduler: schema, RLS, reminder RPCs.
-- Run in Supabase Dashboard > SQL Editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
-- No insert/update/delete policies: role can only be changed by SQL (deny by default).
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------- notification_settings
create table public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_enabled boolean not null default true,
  notify_email text check (notify_email is null or char_length(notify_email) <= 254),
  lead_minutes integer not null default 30 check (lead_minutes between 0 and 10080),
  subject_template text not null default 'Time to post: {{title}}'
    check (char_length(subject_template) between 1 and 120),
  include_caption boolean not null default true,
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
create policy "settings: read own" on public.notification_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "settings: insert own" on public.notification_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "settings: update own" on public.notification_settings
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create trigger notification_settings_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- create profile + default settings on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  insert into public.notification_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------- google_connections
-- Holds the Google refresh token used for Drive sync. Owner-only via RLS.
create table public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  drive_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_connections enable row level security;
create policy "google: read own" on public.google_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "google: insert own" on public.google_connections
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "google: update own" on public.google_connections
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "google: delete own" on public.google_connections
  for delete to authenticated using (user_id = (select auth.uid()));
create trigger google_connections_updated_at before update on public.google_connections
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  caption text not null check (char_length(caption) between 1 and 2200),
  hashtags text[] not null default '{}' check (cardinality(hashtags) <= 30),
  platform text not null default 'instagram'
    check (platform in ('instagram', 'x', 'linkedin', 'facebook', 'tiktok')),
  notes text check (notes is null or char_length(notes) <= 500),
  status text not null default 'draft' check (status in ('draft', 'scheduled')),
  scheduled_at timestamptz,
  lead_minutes integer check (lead_minutes is null or lead_minutes between 0 and 10080),
  reminder_sent_at timestamptz,
  drive_file_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_scheduled_needs_time check (status <> 'scheduled' or scheduled_at is not null)
);
alter table public.posts enable row level security;
create policy "posts: read own" on public.posts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "posts: insert own" on public.posts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "posts: update own" on public.posts
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "posts: delete own" on public.posts
  for delete to authenticated using (user_id = (select auth.uid()));
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_user_scheduled_idx on public.posts (user_id, scheduled_at);
create index posts_due_idx on public.posts (scheduled_at)
  where status = 'scheduled' and reminder_sent_at is null;

-- -------------------------------------------- cron secret + reminder RPCs
-- The cron route has no user session and the service_role key is never used in app code,
-- so due-reminder access goes through SECURITY DEFINER functions guarded by a shared secret.
create table public.app_secrets (
  name text primary key,
  value text not null
);
alter table public.app_secrets enable row level security; -- no policies: nobody reads it via API
revoke all on public.app_secrets from anon, authenticated;

create or replace function public.claim_due_reminders(p_secret text)
returns table (
  post_id uuid, title text, caption text, hashtags text[], platform text,
  scheduled_at timestamptz, to_email text, subject_template text,
  include_caption boolean, timezone text
)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_secrets s where s.name = 'cron' and s.value = p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with due as (
    select p.id
    from public.posts p
    join public.notification_settings ns on ns.user_id = p.user_id
    where p.status = 'scheduled'
      and p.reminder_sent_at is null
      and ns.email_enabled
      and p.scheduled_at - make_interval(mins => coalesce(p.lead_minutes, ns.lead_minutes)) <= now()
    order by p.scheduled_at
    limit 50
    for update of p skip locked
  ), claimed as (
    update public.posts p set reminder_sent_at = now()
    from due where p.id = due.id
    returning p.*
  )
  select c.id, c.title, c.caption, c.hashtags, c.platform, c.scheduled_at,
         coalesce(ns.notify_email, u.email)::text, ns.subject_template,
         ns.include_caption, ns.timezone
  from claimed c
  join public.notification_settings ns on ns.user_id = c.user_id
  join auth.users u on u.id = c.user_id;
end $$;

create or replace function public.release_reminder(p_secret text, p_post_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_secrets s where s.name = 'cron' and s.value = p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.posts set reminder_sent_at = null where id = p_post_id;
end $$;

revoke all on function public.claim_due_reminders(text) from public;
revoke all on function public.release_reminder(text, uuid) from public;
grant execute on function public.claim_due_reminders(text) to anon, authenticated;
grant execute on function public.release_reminder(text, uuid) to anon, authenticated;

-- AFTER RUNNING THIS FILE, set the cron secret (same value as CRON_SECRET in Vercel):
--   insert into public.app_secrets (name, value) values ('cron', 'PASTE_LONG_RANDOM_STRING')
--   on conflict (name) do update set value = excluded.value;
