import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout }       = useAuth();
  const router                  = useRouter();
  const [dropOpen, setDropOpen] = useState(false);
  const [mounted, setMounted]   = useState(false);   // ← hydration guard
  const dropRef                 = useRef(null);

  // Mark as mounted on client — prevents SSR / client mismatch
  useEffect(() => { setMounted(true); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Guard with mounted to prevent SSR hydration mismatch
  const isActive = (path) => {
    if (!mounted) return 'nav-link';
    if (path === '/') return router.pathname === '/' ? 'nav-link active' : 'nav-link';
    return router.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">🎙️</div>
          <span>AI Voice<span style={{ color: 'var(--accent-h)' }}> Agent</span></span>
        </Link>

        {/* Nav links — all rendered as 'nav-link' on server, active class applied after mount */}
        <div className="nav-links">
          <Link href="/" suppressHydrationWarning className={isActive('/')}>Home</Link>
          {/* Role-based links after mount */}
          {mounted && user && user.role === 'recruiter' ? (
            <>
              <Link href="/recruiter/dashboard" className={isActive('/recruiter')}>Recruiter Portal</Link>
              <Link href="/admin/questions" suppressHydrationWarning className={isActive('/admin/questions')}>Question Bank</Link>
            </>
          ) : (
            <>
              {mounted && user && (
                <Link href="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
              )}
              <Link href="/question-bank" suppressHydrationWarning className={isActive('/question-bank')}>Question Bank</Link>
            </>
          )}
          <Link href="/feedback" suppressHydrationWarning className={isActive('/feedback')}>Feedback</Link>
        </div>

        {/* Right actions */}
        <div className="nav-actions">
          {/* Theme toggle — suppress mismatch since icon depends on theme from localStorage */}
          <button
            suppressHydrationWarning
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {/* Render a neutral icon on server, real icon after mount */}
            {mounted ? (theme === 'dark' ? '☀️' : '🌙') : '☀️'}
          </button>

          {/*
            Auth section — CRITICAL: render identical HTML on server + first client paint.
            Only show dynamic user content after `mounted === true`.
          */}
          {!mounted ? (
            /* Server / pre-hydration: always render guest buttons — must match SSR */
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 76, height: 34 }} />  {/* placeholder width */}
              <div style={{ width: 95, height: 34 }} />
            </div>
          ) : user ? (
            /* Authenticated user after mount */
            <div className="nav-user-menu" ref={dropRef}>
              {/* Avatar */}
              <div
                className="nav-avatar"
                onClick={() => setDropOpen(o => !o)}
                title={user.name}
                style={{ cursor: 'pointer', overflow: 'hidden' }}
              >
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : (user.avatarInitial || user.name?.[0] || 'U')}
              </div>

              {dropOpen && (
                <div className="user-dropdown">
                  <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>{user.email}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {user.isDemo && <div className="badge badge-yellow" style={{ fontSize: 11 }}>⚡ Demo</div>}
                      {user.role && <div className={`badge ${user.role === 'admin' ? 'badge-red' : user.role === 'recruiter' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 11 }}>{user.role}</div>}
                    </div>
                  </div>
                  <button className="user-dropdown-item" onClick={() => { router.push('/profile'); setDropOpen(false); }}>
                    👤 My Profile
                  </button>
                  {user.role === 'recruiter' || user.role === 'admin' ? (
                    <>
                      <button className="user-dropdown-item" onClick={() => { router.push('/recruiter/dashboard'); setDropOpen(false); }}>
                        📋 Recruiter Portal
                      </button>
                      <button className="user-dropdown-item" onClick={() => { router.push('/admin/questions'); setDropOpen(false); }}>
                        🛠 Question Bank
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="user-dropdown-item" onClick={() => { router.push('/dashboard'); setDropOpen(false); }}>
                        📊 Dashboard
                      </button>
                      <button className="user-dropdown-item" onClick={() => { router.push('/voice-agent'); setDropOpen(false); }}>
                        🎙️ Voice Agent
                      </button>
                    </>
                  )}
                  <button className="user-dropdown-item" onClick={() => { router.push('/feedback'); setDropOpen(false); }}>
                    💬 Give Feedback
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                    <button
                      className="user-dropdown-item danger"
                      onClick={() => { logout(); router.push('/'); setDropOpen(false); }}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest after mount */
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link href="/login" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
