import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabaseClient ||
  createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (import.meta.env.DEV) {
  globalThis.__supabaseClient = supabase;
}
