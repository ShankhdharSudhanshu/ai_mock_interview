import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';
import { validateEmail } from '../lib/validate';

export default function ResetPassword() {
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword }   = useAuth();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    setLoading(true);
    const result = await resetPassword(email.trim().toLowerCase());
    setLoading(false);
    if (result?.success) { setSent(true); }
    else setError(result?.error || 'Failed to send reset email.');
  };

  return (
    <div className="page-bg">
      <Navbar />
      <div className="mt-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '80px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
          <div className="text-center mb-32">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Reset your password</h1>
            <p style={{ fontSize: 14, color: 'var(--t-secondary)' }}>
              Enter your email and we'll send a reset link.
            </p>
          </div>

          <div className="card" style={{ padding: 32 }}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Check your inbox</h2>
                <p style={{ color: 'var(--t-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                  We sent a password reset link to <strong>{email}</strong>.<br />
                  Click the link in the email to set a new password.
                </p>
                <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 24 }}>
                  ← Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-group">
                <div>
                  <label className="label">Email Address</label>
                  <input className="input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--danger)' }}>
                    ⚠️ {error}
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: 14 }}>
                  {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '📧 Send Reset Link'}
                </button>
                <Link href="/login" style={{ display: 'block', textAlign: 'center', fontSize: 14, color: 'var(--t-muted)', marginTop: 8 }}>
                  ← Back to Sign In
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
