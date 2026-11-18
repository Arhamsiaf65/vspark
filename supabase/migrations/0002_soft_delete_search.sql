-- Soft delete (undo) + search indexes. Run after 0001_init.sql.

alter table public.posts add column deleted_at timestamptz;

-- Active-post listing: filter by owner, hide deleted, keyset-paginate by created_at / scheduled_at.
create index posts_active_created_idx on public.posts (user_id, created_at desc, id)
  where deleted_at is null;
create index posts_active_scheduled_idx on public.posts (user_id, scheduled_at, id)
  where deleted_at is null;

-- Server-side search (ilike '%term%') on title and caption.
create extension if not exists pg_trgm with schema extensions;
create index posts_title_trgm_idx on public.posts using gin (title extensions.gin_trgm_ops);
create index posts_caption_trgm_idx on public.posts using gin (caption extensions.gin_trgm_ops);

-- Reminders must skip soft-deleted posts.
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
      and p.deleted_at is null
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

revoke all on function public.claim_due_reminders(text) from public;
grant execute on function public.claim_due_reminders(text) to anon, authenticated;
