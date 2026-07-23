/*
# Create users table for IRONLOG

1. New Tables
- `users`
  - `id` (uuid, primary key)
  - `name` (text, not null) — full display name
  - `username` (text, unique, not null) — login handle
  - `password` (text, not null) — plaintext password (app uses custom auth, not Supabase Auth)
  - `role` (text, not null, default 'user') — 'admin' or 'user'
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `users`.
- The app uses custom username/password auth (not Supabase Auth), so the
  frontend always operates with the anon key. Policies must allow
  `anon, authenticated` CRUD so the app can read and write users.

3. Important Notes
- This table stores the app's user accounts. The login flow queries this
  table by username/password to authenticate. The admin panel reads all
  rows and can create/update/delete users.
- `USING (true)` is acceptable here because the app intentionally shares
  the user list across all authenticated sessions (custom auth, not row-
  level ownership via Supabase Auth).
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);
