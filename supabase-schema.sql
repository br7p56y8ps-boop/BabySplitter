-- BabySplitter Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/lxnzautcwhcfjkzwhjbz/sql/new

-- Members table
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  original_name text not null unique,
  current_name text not null,
  is_preset boolean default true,
  created_at timestamptz default now()
);

-- Seed preset members
insert into members (original_name, current_name, is_preset) values
  ('Avraar', 'Avraar', true),
  ('Chetan', 'Chetan', true),
  ('Tenzing', 'Tenzing', true),
  ('Sanajaoba', 'Sanajaoba', true),
  ('Balbir', 'Balbir', true),
  ('Dhanaraj', 'Dhanaraj', true)
on conflict (original_name) do nothing;

-- Expenses table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  total_amount numeric(12,2) not null,
  currency text not null default 'BDT',
  expense_date date not null,
  created_by text not null,
  status text not null default 'unsettled',
  temp_members jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expense payers (multiple payers supported)
create table if not exists expense_payers (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  member_name text not null,
  amount_paid numeric(12,2) not null
);

-- Expense participants
create table if not exists expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  member_name text not null
);

-- Settlements table
create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  debtor text not null,
  creditor text not null,
  amount numeric(12,2) not null,
  settled_at timestamptz default now(),
  settled_by text not null,
  settlement_type text not null default 'full',
  expense_title text not null,
  expense_date date not null,
  is_undone boolean default false
);

-- Chat messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  message text not null,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text not null,
  created_at timestamptz default now(),
  read_by jsonb default '[]'
);

-- Enable Row Level Security (open access for trusted group — no auth)
alter table members enable row level security;
alter table expenses enable row level security;
alter table expense_payers enable row level security;
alter table expense_participants enable row level security;
alter table settlements enable row level security;
alter table chat_messages enable row level security;
alter table notifications enable row level security;

-- RLS Policies: allow all operations (no auth required for this closed group app)
create policy "allow all" on members for all using (true) with check (true);
create policy "allow all" on expenses for all using (true) with check (true);
create policy "allow all" on expense_payers for all using (true) with check (true);
create policy "allow all" on expense_participants for all using (true) with check (true);
create policy "allow all" on settlements for all using (true) with check (true);
create policy "allow all" on chat_messages for all using (true) with check (true);
create policy "allow all" on notifications for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_payers;
alter publication supabase_realtime add table expense_participants;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table notifications;
