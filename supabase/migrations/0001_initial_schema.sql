-- portafolio-alan: initial schema
-- Photos catalog + contact messages

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  code text not null,                -- instagram shortcode / external id
  filename text not null unique,
  category text not null check (category in ('weddings','hotels','documentary','prints')),
  storage_path text not null,
  width int,
  height int,
  caption text,
  location text,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists photos_category_idx on public.photos (category, sort_order);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.photos enable row level security;
alter table public.contact_messages enable row level security;

-- Photos: anyone can read
create policy "photos_public_read" on public.photos
  for select using (true);

-- Contact: anyone can submit, nobody can read via anon
create policy "contact_anon_insert" on public.contact_messages
  for insert with check (true);
