import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';

export default function UpdatePassword() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [ready, setReady]         = useState(false);
  const { updatePassword }        = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Supabase puts ?type=recovery in the URL after redirect
    const hash = window.location.hash || window.location.search;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setReady(true);
    } else {
      // Give it 1 second for Supabase to exchange the code
      const t = setTimeout(() => setReady(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result?.success) {
      setSuccess(true);
      setTimeout(() => router.replace('/dashboard'), 2000);
    } else {
      setError(result?.error || 'Failed to update password. The link may have expired.');
    }
  };

  return (
    <div className="page-bg">
      <Navbar />
      <div className="mt-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '80px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
          <div className="text-center mb-32">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Set new password</h1>
            <p style={{ fontSize: 14, color: 'var(--t-secondary)' }}>Choose a strong password for your account.</p>
          </div>

          <div className="card" style={{ padding: 32 }}>
            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Password updated!</h2>
                <p style={{ color: 'var(--t-secondary)', fontSize: 14 }}>Redirecting to your dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-group">
                <div>
                  <label className="label">New Password</label>
                  <input className="input" type="password" placeholder="Min. 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input className="input" type="password" placeholder="Repeat your password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--danger)' }}>
                    ⚠️ {error}
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading || !ready} style={{ padding: 14 }}>
                  {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '🔒 Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
