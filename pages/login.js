import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';
import { validateLogin, validateSignup, sanitize } from '../lib/validate';

const ROLES = [
  { id: 'candidate', icon: '🎤', label: 'Candidate', desc: 'Practice interviews & get feedback' },
  { id: 'recruiter', icon: '📋', label: 'Recruiter',  desc: 'Configure sessions & view analytics' },
];

export default function Login() {
  const [tab, setTab]     = useState('login');
  const [form, setForm]   = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [errors, setErrors] = useState({});
  const [info, setInfo]   = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle, loginWithGitHub, demoLogin } = useAuth();
  const router = useRouter();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const clearMessages = () => { setErrors({}); setInfo(''); };

  const handleSubmit = async e => {
    e.preventDefault();
    clearMessages();
    const data = { name: sanitize(form.name), email: form.email.trim().toLowerCase(), password: form.password };
    const errs = tab === 'login' ? validateLogin(data) : validateSignup(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const result = tab === 'login'
        ? await login({ email: data.email, password: data.password })
        : await signup({ email: data.email, password: data.password, name: data.name, role: form.role });
      if (result?.confirmEmail) {
        setInfo('✉️ Check your inbox — click the confirmation link, then come back to sign in.');
      } else if (result?.success) {
        // Route by role — recruiter goes to their portal
        const userRole = result.role || form.role;
        router.push(userRole === 'recruiter' ? '/recruiter/dashboard' : '/dashboard');
      } else {
        setErrors({ form: result?.error || 'Something went wrong.' });
      }
    } finally { setLoading(false); }
  };

  const handleOAuth = async provider => {
    clearMessages();
    setLoading(true);
    const fn = provider === 'google' ? loginWithGoogle : loginWithGitHub;
    const result = await fn();
    if (!result?.success) {
      const msg = result?.error || 'OAuth failed.';
      // OAuth-unavailable messages are informational, not errors
      const isInfo = msg.includes('Supabase project') || msg.includes('Demo');
      if (isInfo) setInfo(msg);
      else setErrors({ form: msg });
    }
    setLoading(false);
  };

  return (
    <div className="page-bg">
      <Navbar />
      <div className="mt-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '80px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">

          {/* Logo */}
          <div className="text-center mb-32">
            <div style={{ width: 52, height: 52, fontSize: 24, margin: '0 auto 16px', borderRadius: 14, background: 'var(--g-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--s-glow)' }}>🎙️</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--t-secondary)' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already registered? '}
              <button onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); clearMessages(); }}
                style={{ color: 'var(--accent-h)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                {tab === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>

          <div className="card" style={{ padding: 32 }}>
            {/* Tabs */}
            <div className="tabs mb-24">
              <button className={`tab-btn${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); clearMessages(); }}>Sign In</button>
              <button className={`tab-btn${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); clearMessages(); }}>Sign Up</button>
            </div>

            {/* OAuth buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={() => handleOAuth('google')} className="btn btn-secondary" style={{ flex: 1, gap: 8, fontSize: 13 }} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button onClick={() => handleOAuth('github')} className="btn btn-secondary" style={{ flex: 1, gap: 8, fontSize: 13 }} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleSubmit} className="form-group">
              {tab === 'signup' && (
                <>
                  <div>
                    <label className="label">Full Name</label>
                    <input className={`input${errors.name ? ' input-error' : ''}`} placeholder="Your full name" value={form.name} onChange={set('name')} />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                  </div>
                  {/* Role selector */}
                  <div>
                    <label className="label" style={{ marginBottom: 10, display: 'block' }}>I am signing up as a…</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {ROLES.map(r => (
                        <button
                          key={r.id} type="button"
                          onClick={() => setForm(f => ({ ...f, role: r.id }))}
                          style={{
                            flex: 1, padding: '12px 10px', borderRadius: 'var(--r-md)',
                            border: `2px solid ${form.role === r.id ? 'var(--accent-h)' : 'var(--border)'}`,
                            background: form.role === r.id ? 'rgba(79,114,255,0.1)' : 'var(--surface)',
                            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: form.role === r.id ? 'var(--accent-h)' : 'var(--t-primary)' }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--t-muted)', lineHeight: 1.4, marginTop: 2 }}>{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="label">Email Address</label>
                <input className={`input${errors.email ? ' input-error' : ''}`} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                {errors.email && <div className="field-error">{errors.email}</div>}
              </div>
              <div>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Password
                  {tab === 'login' && <Link href="/reset-password" style={{ fontSize: 12, color: 'var(--accent-h)', fontWeight: 500 }}>Forgot password?</Link>}
                </label>
                <input className={`input${errors.password ? ' input-error' : ''}`} type="password" placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'} value={form.password} onChange={set('password')} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
                {errors.password && <div className="field-error">{errors.password}</div>}
              </div>

              {errors.form && (
                <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--danger)' }}>
                  ⚠️ {errors.form}
                </div>
              )}
              {info && (
                <div style={{ background: 'rgba(79,114,255,0.1)', border: '1px solid rgba(79,114,255,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--accent-h)', lineHeight: 1.6 }}>
                  ℹ️ {info}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: 14, fontSize: 15 }}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : tab === 'login' ? '→ Sign In' : '→ Create Account'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button onClick={() => { demoLogin(); router.push('/dashboard'); }} className="btn btn-secondary btn-full" style={{ padding: 13 }}>
              ⚡ Try Demo — No account needed
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t-muted)', marginTop: 20 }}>
            By continuing you agree to our <Link href="#" style={{ color: 'var(--accent-h)' }}>Terms</Link> &amp; <Link href="#" style={{ color: 'var(--accent-h)' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}