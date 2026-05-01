import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { syncUser } from '../lib/db-client';

const AuthContext = createContext(null);

/** Build a rich user object from Supabase user + optional profile row */
function buildUser(supaUser, profile = {}) {
  const name = profile.full_name
    || supaUser.user_metadata?.full_name
    || supaUser.email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    || 'User';
  return {
    id:            supaUser.id,
    email:         supaUser.email,
    name,
    avatar:        profile.avatar_url || null,
    avatarInitial: name[0].toUpperCase(),
    plan:          profile.plan || supaUser.user_metadata?.plan || 'free',
    role:          profile.role || supaUser.user_metadata?.role || 'candidate',
    skills:        profile.skills || [],
    bio:           profile.bio || '',
    resumeUrl:     profile.resume_url || '',
    emailVerified: supaUser.email_confirmed_at != null,
    isDemo:        false,
  };
}

/** Fetch profile row from DB */
async function fetchProfile(userId) {
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data || {};
  } catch { return {}; }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = useCallback(async (supaUser) => {
    const profile = await fetchProfile(supaUser.id);
    const u = buildUser(supaUser, profile);
    setUser(u);
    // Non-blocking: sync this user to MongoDB
    syncUser({ name: u.name, avatarUrl: u.avatar, role: u.role, plan: u.plan }).catch(() => {});
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) { await hydrateUser(session.user); setLoading(false); return; }
      } catch (_) {}
      // Demo fallback
      try {
        const stored = localStorage.getItem('vp-user');
        if (stored) setUser(JSON.parse(stored));
      } catch (_) {}
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        localStorage.removeItem('vp-user');
        await hydrateUser(session.user);
      } else {
        try {
          const stored = localStorage.getItem('vp-user');
          setUser(stored ? JSON.parse(stored) : null);
        } catch { setUser(null); }
      }
    });
    return () => subscription?.unsubscribe?.();
  }, [hydrateUser]);

  // ── Email + Password Login ─────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login')) return { success: false, error: 'Incorrect email or password.' };
      if (error.message.includes('Email not confirmed')) return { success: false, error: 'Please verify your email first.' };
      return { success: false, error: error.message };
    }
    if (data?.user) { await hydrateUser(data.user); return { success: true }; }
    return { success: false, error: 'Unexpected error.' };
  }, [hydrateUser]);

  // ── Sign Up ────────────────────────────────────────────────
  const signup = useCallback(async ({ email, password, name, role = 'candidate' }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, role } },
    });
    if (error) {
      if (error.message.includes('already registered')) return { success: false, error: 'Email already registered. Try signing in.' };
      return { success: false, error: error.message };
    }
    if (data?.user && !data.session) return { success: true, confirmEmail: true, role };
    if (data?.user) { await hydrateUser(data.user); return { success: true, role }; }
    return { success: false, error: 'Unexpected error.' };
  }, [hydrateUser]);

  // ── Google OAuth ───────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── GitHub OAuth ───────────────────────────────────────────
  const loginWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── Forgot Password ────────────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── Update Password ────────────────────────────────────────
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── Update Profile ─────────────────────────────────────────
  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) return { success: false, error: 'Not logged in.' };
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    });
    if (error) return { success: false, error: error.message };
    setUser(prev => ({ ...prev, ...updates }));
    return { success: true };
  }, [user]);

  // ── Demo Login ─────────────────────────────────────────────
  const demoLogin = useCallback(() => {
    const demo = { id: 'demo-001', email: 'demo@aivoiceagent.app', name: 'Demo User', avatarInitial: 'D', plan: 'pro', role: 'candidate', isDemo: true };
    localStorage.setItem('vp-user', JSON.stringify(demo));
    setUser(demo);
    return { success: true };
  }, []);

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('vp-user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, loginWithGitHub, resetPassword, updatePassword, updateProfile, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
