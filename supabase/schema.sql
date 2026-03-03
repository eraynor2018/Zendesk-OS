-- Zendesk OS: Weekly Reports table
-- Run this in your Supabase SQL Editor to create the table

create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  report_data jsonb not null,
  slack_output text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table weekly_reports enable row level security;

-- Allow all operations for authenticated users (adjust as needed)
create policy "Allow all for authenticated users"
  on weekly_reports
  for all
  using (true)
  with check (true);
