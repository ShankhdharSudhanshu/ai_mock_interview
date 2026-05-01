import { createClient } from '@supabase/supabase-js';
import {
  localSignInWithPassword,
  localSignUp,
  localSignOut,
  localGetSession,
  localUpdatePassword,
  localOnAuthStateChange,
} from './local-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase;

if (supabaseUrl && supabaseKey) {
  // ── Real Supabase project configured ──────────────────────────
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: true,
    },
  });
} else {
  // ── No Supabase credentials: use local-auth (localStorage) ────
  // Full auth (sign up / sign in / sign out / sessions) works locally.
  // DB calls (from()) are no-ops — history is stored in localStorage by the app.
  const ok = async () => ({ data: null, error: null });

  supabase = {
    auth: {
      signInWithPassword:    localSignInWithPassword,
      signUp:                ({ email, password, options }) =>
                               localSignUp({ email, password, options }),
      signOut:               () => { localSignOut(); return ok(); },
      getSession:            localGetSession,
      getUser:               async () => {
                               const { data: { session } } = localGetSession();
                               return { data: { user: session?.user || null }, error: null };
                             },
      onAuthStateChange:     localOnAuthStateChange,
      // OAuth requires a server redirect — not possible locally
      signInWithOAuth:       async () => ({
                               error: { message: 'Google/GitHub login requires a Supabase project. Use email sign-up or ⚡ Try Demo instead.' },
                             }),
      resetPasswordForEmail: async () => ({
                               error: { message: 'Password reset requires a Supabase project. Create a new account or ⚡ Try Demo.' },
                             }),
      updateUser:            async ({ password }) => localUpdatePassword(password),
    },

    // DB (profiles, interviews) — no-op chain; the app uses localStorage as fallback
    from: () => {
      const chain = {
        insert: ok, upsert: ok, update: ok, delete: ok,
        select: () => chain,
        eq:     () => chain,
        order:  () => chain,
        limit:  () => chain,
        single: async () => ({ data: null, error: null }),
        then:   async (cb) => cb({ data: [], error: null }),
      };
      return chain;
    },
  };
}

export default supabase;