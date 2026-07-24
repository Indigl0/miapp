/*
# Create exercises, routines, and sessions tables for IRONLOG cloud sync

## Purpose
IRONLOG uses a custom username/password auth system (stored in the `users` table,
NOT Supabase Auth). The frontend always operates with the anon key. These tables
store exercises, routines, and training sessions so they sync across devices.

## New Tables

### exercises
- `id` (uuid, primary key) — matches the local Dexie ID
- `name` (text, not null) — exercise name
- `muscle_group` (text, not null) — muscle group category
- `notes` (text, nullable) — optional technique notes
- `created_at` (timestamptz) — creation timestamp
- `updated_at` (timestamptz) — last modification timestamp

### routines
- `id` (uuid, primary key)
- `name` (text, not null) — routine name
- `description` (text, nullable) — optional description
- `exercises` (jsonb, not null default '[]') — array of {exerciseId, sets, targetReps, restSeconds}
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### sessions
- `id` (uuid, primary key)
- `routine_id` (uuid, nullable) — reference to routine if started from one
- `routine_name` (text, not null) — snapshot of routine name at session creation
- `date` (bigint, not null) — training date as epoch milliseconds
- `exercises` (jsonb, not null default '[]') — array of {exerciseId, sets: [{setNumber, reps, weight, completed}]}
- `notes` (text, nullable)
- `completed` (boolean, not null default false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security
- RLS enabled on all three tables.
- All policies use `TO anon, authenticated` because the app uses custom auth
  (not Supabase Auth), so the frontend always runs as the `anon` role.
- `USING (true)` / `WITH CHECK (true)` is acceptable here because the data is
  intentionally shared across all users of the app (single-tenant model with
  custom auth — all logged-in users share the same exercise/routine/session pool).

## Important Notes
1. The `exercises` column on `routines` and `sessions` is jsonb to store nested
   array structures that match the Dexie local schema.
2. `date` on sessions is bigint (epoch ms) to match the local Dexie format.
3. `updated_at` is used for conflict resolution — the sync logic compares
   timestamps to decide whether to push local or pull remote.
*/

/*
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  muscle_group text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routines (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  routine_id uuid,
  routine_name text NOT NULL,
  date bigint NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Exercises policies
DROP POLICY IF EXISTS "anon_select_exercises" ON exercises;
CREATE POLICY "anon_select_exercises" ON exercises FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exercises" ON exercises;
CREATE POLICY "anon_insert_exercises" ON exercises FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exercises" ON exercises;
CREATE POLICY "anon_update_exercises" ON exercises FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exercises" ON exercises;
CREATE POLICY "anon_delete_exercises" ON exercises FOR DELETE
  TO anon, authenticated USING (true);

-- Routines policies
DROP POLICY IF EXISTS "anon_select_routines" ON routines;
CREATE POLICY "anon_select_routines" ON routines FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_routines" ON routines;
CREATE POLICY "anon_insert_routines" ON routines FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_routines" ON routines;
CREATE POLICY "anon_update_routines" ON routines FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_routines" ON routines;
CREATE POLICY "anon_delete_routines" ON routines FOR DELETE
  TO anon, authenticated USING (true);

-- Sessions policies
DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);


*/




-- Habilitar extensión si fuera necesario (por defecto ya viene)
-- create extension if not exists "uuid-ossp";

----------------------------------------------------
-- 1. TABLA EXERCISES
----------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    name text NOT NULL,
    muscle_group text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_exercises" ON exercises;
CREATE POLICY "user_select_exercises" ON exercises 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_exercises" ON exercises;
CREATE POLICY "user_insert_exercises" ON exercises 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_exercises" ON exercises;
CREATE POLICY "user_update_exercises" ON exercises 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_delete_exercises" ON exercises;
CREATE POLICY "user_delete_exercises" ON exercises 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);


----------------------------------------------------
-- 2. TABLA ROUTINES
----------------------------------------------------
CREATE TABLE IF NOT EXISTS routines (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    name text NOT NULL,
    description text,
    exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_routines" ON routines;
CREATE POLICY "user_select_routines" ON routines 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_routines" ON routines;
CREATE POLICY "user_insert_routines" ON routines 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_routines" ON routines;
CREATE POLICY "user_update_routines" ON routines 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_delete_routines" ON routines;
CREATE POLICY "user_delete_routines" ON routines 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);


----------------------------------------------------
-- 3. TABLA SESSIONS
----------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    routine_id uuid,
    routine_name text NOT NULL,
    date bigint NOT NULL,
    exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
    notes text,
    completed boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_sessions" ON sessions;
CREATE POLICY "user_select_sessions" ON sessions 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_sessions" ON sessions;
CREATE POLICY "user_insert_sessions" ON sessions 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_sessions" ON sessions;
CREATE POLICY "user_update_sessions" ON sessions 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_delete_sessions" ON sessions;
CREATE POLICY "user_delete_sessions" ON sessions 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);