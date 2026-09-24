-- Run once in the Supabase SQL Editor for the Neuron Beat project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 2 and 20)
);
create unique index if not exists profiles_display_name_lower_unique on public.profiles (lower(display_name));

create or replace function public.create_neuron_beat_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_name text;
begin
  requested_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if requested_name !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,19}$' then
    raise exception 'Display names must be 2–20 characters using letters, numbers, spaces, _ or -.';
  end if;
  insert into public.profiles(id, display_name) values (new.id, requested_name);
  return new;
end;
$$;

drop trigger if exists neuron_beat_profile_after_signup on auth.users;
create trigger neuron_beat_profile_after_signup
  after insert on auth.users for each row execute function public.create_neuron_beat_profile();

create table if not exists public.scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_level text not null,
  difficulty text not null check (difficulty in ('easy','normal','hard','expert')),
  score integer not null check (score between 0 and 10000000),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  max_combo integer not null check (max_combo between 0 and 750),
  pattern_seed bigint not null check (pattern_seed between 0 and 4294967295),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_level, difficulty),
  constraint scores_known_level check (
    game_level in ('heartbeat','morning_scent','shadow_overhead','sweet_tooth','ping_pong','storm')
    or game_level ~ '^daily_[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  )
);
create index if not exists scores_leaderboard_order on public.scores (game_level, difficulty, score desc, accuracy desc, max_combo desc, updated_at asc);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.scores from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant select on table public.scores to anon, authenticated;

drop policy if exists "Public display names" on public.profiles;
create policy "Public display names" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Public leaderboard scores" on public.scores;
create policy "Public leaderboard scores" on public.scores for select to anon, authenticated using (true);

create or replace function public.submit_neuron_beat_score(
  p_song_id text,
  p_difficulty text,
  p_score integer,
  p_accuracy numeric,
  p_max_combo integer,
  p_pattern_seed bigint
)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in before submitting a score.'; end if;
  if p_difficulty not in ('easy','normal','hard','expert') then raise exception 'Invalid difficulty.'; end if;
  if p_song_id not in ('heartbeat','morning_scent','shadow_overhead','sweet_tooth','ping_pong','storm')
     and p_song_id !~ '^daily_[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid signal.'; end if;
  if p_score not between 0 and 10000000 or p_accuracy not between 0 and 100
     or p_max_combo not between 0 and 750 or p_pattern_seed not between 0 and 4294967295 then
    raise exception 'Score details are outside the allowed range.';
  end if;
  insert into public.scores(user_id, game_level, difficulty, score, accuracy, max_combo, pattern_seed)
    values (uid, p_song_id, p_difficulty, p_score, round(p_accuracy, 2), p_max_combo, p_pattern_seed)
  on conflict (user_id, game_level, difficulty) do update set
    score = excluded.score,
    accuracy = excluded.accuracy,
    max_combo = excluded.max_combo,
    pattern_seed = excluded.pattern_seed,
    updated_at = now()
  where (excluded.score, excluded.accuracy, excluded.max_combo)
      > (public.scores.score, public.scores.accuracy, public.scores.max_combo);
end;
$$;
revoke all on function public.submit_neuron_beat_score(text,text,integer,numeric,integer,bigint) from public, anon;
grant execute on function public.submit_neuron_beat_score(text,text,integer,numeric,integer,bigint) to authenticated;
