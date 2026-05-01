import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';

/** Handles Supabase OAuth redirect (Google / GitHub) */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      // Supabase automatically exchanges the ?code= param for a session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      } else {
        // Fallback: listen for auth state change triggered by the URL hash/code
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) { subscription.unsubscribe(); router.replace('/dashboard'); }
        });
        // If nothing happens in 5s, go to login
        setTimeout(() => { subscription.unsubscribe(); router.replace('/login'); }, 5000);
      }
    };
    handle();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', gap: 16 }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      <p style={{ color: 'var(--t-secondary)', fontSize: 15 }}>Completing sign-in…</p>
    </div>
  );
}
