import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';
import supabase from '../lib/supabase';

const CATEGORIES = [
  { id: 'frontend',        icon: '💻', title: 'Frontend Dev',      desc: 'React, CSS, JS, Browser APIs',          questions: 5, difficulty: 'Medium' },
  { id: 'backend',         icon: '⚙️',  title: 'Backend Dev',       desc: 'APIs, Databases, System Architecture',  questions: 5, difficulty: 'Medium' },
  { id: 'fullstack',       icon: '🌐', title: 'Full Stack',         desc: 'End-to-end development skills',         questions: 5, difficulty: 'Medium' },
  { id: 'system-design',   icon: '🏗️', title: 'System Design',      desc: 'Scalability, Architecture, Infra',      questions: 5, difficulty: 'Hard'   },
  { id: 'data-science',    icon: '📊', title: 'Data Science / ML',  desc: 'ML Algorithms, Stats, Python',          questions: 5, difficulty: 'Hard'   },
  { id: 'product-manager', icon: '📋', title: 'Product Manager',    desc: 'Strategy, Metrics, User Research',      questions: 5, difficulty: 'Medium' },
  { id: 'behavioral',      icon: '🤝', title: 'Behavioral',         desc: 'STAR method, Soft skills, Leadership',  questions: 5, difficulty: 'Easy'   },
  { id: 'devops',          icon: '🔧', title: 'DevOps / Cloud',     desc: 'CI/CD, Kubernetes, AWS/GCP',            questions: 5, difficulty: 'Hard'   },
];

function scoreColor(s) {
  if (s >= 8) return 'var(--success)';
  if (s >= 6) return 'var(--warning)';
  return 'var(--danger)';
}
function difficultyColor(d) {
  if (d === 'Easy') return 'badge-green';
  if (d === 'Hard') return 'badge-red';
  return 'badge-yellow';
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory]   = useState([]);
  const [loadingH, setLoadingH] = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Load history: Supabase first, localStorage fallback
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingH(true);
      let loaded = false;

      // Try Supabase for real (non-demo) users
      if (!user.isDemo) {
        try {
          const { data, error } = await supabase
            .from('interviews')
            .select('id, category, score, created_at, answers')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (!error && data?.length > 0) {
            setHistory(data.map(r => ({
              id: r.id,
              category: r.category,
              date: r.created_at?.split('T')[0] || '',
              score: parseFloat(r.score),
              questions: Array.isArray(r.answers) ? r.answers.length : 5,
            })));
            loaded = true;
          }
        } catch (_) {}
      }

      // Fall back to localStorage
      if (!loaded) {
        try {
          const stored = JSON.parse(localStorage.getItem('vp-history') || '[]');
          setHistory(stored.map(s => ({
            id: s.id,
            category: s.category,
            date: s.date,
            score: parseFloat(s.score),
            questions: s.questions || s.answers?.length || 5,
          })));
        } catch (_) { setHistory([]); }
      }
      setLoadingH(false);
    };
    load();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="page-bg">
        <Navbar />
        <div className="loading-center mt-nav"><div className="spinner" /></div>
      </div>
    );
  }

  const avgScore = history.length
    ? (history.reduce((a, c) => a + c.score, 0) / history.length).toFixed(1)
    : '—';

  const filtered = CATEGORIES.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '40px 24px' }}>

          {/* ── Welcome Banner ── */}
          <div className="card card-accent mb-32" style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '28px 32px'
          }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
                Welcome back, {user.name?.split(' ')[0] || 'there'} 👋
              </h1>
              <p style={{ color: 'var(--t-secondary)', fontSize: '14px' }}>
                {user.isDemo
                  ? '⚡ Demo mode active — create an account to save your progress'
                  : 'Ready for your next session? Pick a track below.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {user.isDemo && (
                <Link href="/login" className="btn btn-primary btn-sm">Create Account →</Link>
              )}
              <button
                onClick={() => router.push('/voice-agent')}
                className="btn btn-sm"
                style={{ background: 'linear-gradient(135deg,#4f72ff,#9c6bff)', color: 'white', gap: 6 }}
              >
                🎙️ Start Voice Agent
              </button>
              <span className={`badge ${user.plan === 'pro' ? 'badge-blue' : 'badge-green'}`}
                style={{ fontSize: '13px', padding: '6px 14px' }}>
                {user.plan === 'pro' ? '⭐ Pro Plan' : '🆓 Free Plan'}
              </span>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="stats-grid mb-32">
            {[
              { icon: '🎯', value: history.length, label: 'Sessions Done',  sub: 'Total practice sessions' },
              { icon: '📈', value: avgScore,       label: 'Avg Score / 10', sub: 'Across all sessions' },
              { icon: '🔥', value: Math.min(history.length, 7), label: 'Day Streak', sub: 'Keep practicing daily!' },
              { icon: '🏅', value: history.length > 5 ? 'A+' : 'B+', label: 'Performance Grade', sub: 'Based on avg score' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value gradient-text">{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-change text-muted fs-12">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Voice Agent Feature Card ── */}
          <div
            onClick={() => router.push('/voice-agent')}
            className="card mb-24"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && router.push('/voice-agent')}
            style={{
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(79,114,255,0.12) 0%, rgba(156,107,255,0.08) 100%)',
              border: '1px solid rgba(79,114,255,0.35)',
              padding: '22px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,114,255,0.7)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(79,114,255,0.35)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg,#4f72ff,#9c6bff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, boxShadow: '0 0 20px rgba(79,114,255,0.4)',
              }}>🎙️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Free AI Voice Agent</div>
                <div style={{ fontSize: 13, color: 'var(--t-secondary)' }}>
                  Hands-free interview — AI speaks questions &amp; listens to your answers automatically
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span className="badge badge-purple" style={{ fontSize: 11 }}>100% Free</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-h)' }}>Start now →</span>
            </div>
          </div>

          {/* ── Category Grid ── */}
          <div className="flex-between mb-20" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Choose Interview Track</h2>
              <p style={{ fontSize: '13px', color: 'var(--t-secondary)' }}>Click any card to start a 5-question AI session</p>
            </div>
            <input
              className="input"
              placeholder="🔍 Search tracks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '240px' }}
            />
          </div>

          <div className="category-grid mb-48">
            {filtered.map(cat => (
              <div
                key={cat.id}
                className="category-card"
                onClick={() => router.push(`/interview/${cat.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && router.push(`/interview/${cat.id}`)}
              >
                <div className="category-icon">{cat.icon}</div>
                <div>
                  <div className="category-title">{cat.title}</div>
                  <div className="category-desc">{cat.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span className="category-count">{cat.questions} questions</span>
                  <span className={`badge ${difficultyColor(cat.difficulty)}`}>{cat.difficulty}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="card text-center" style={{ gridColumn: '1/-1', padding: '48px' }}>
                <p style={{ color: 'var(--t-muted)' }}>No tracks match "{search}".</p>
              </div>
            )}
          </div>

          {/* ── Recent Sessions ── */}
          <div>
            <div className="flex-between mb-16">
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Recent Sessions</h2>
              {loadingH && <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}
            </div>

            {!loadingH && history.length === 0 ? (
              <div className="card text-center" style={{ padding: '48px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</p>
                <p style={{ fontWeight: 600, marginBottom: '8px' }}>No sessions yet</p>
                <p style={{ color: 'var(--t-muted)', fontSize: '14px', marginBottom: '20px' }}>
                  Start your first practice session above to see your history here.
                </p>
                <button className="btn btn-primary" onClick={() => router.push('/interview/behavioral')}>
                  Start First Session →
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Track</th>
                      <th>Date</th>
                      <th>Questions</th>
                      <th>Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 600, color: 'var(--t-primary)' }}>{h.category}</td>
                        <td>{h.date}</td>
                        <td>{h.questions} / {h.questions}</td>
                        <td>
                          <span className="score-pill"
                            style={{ background: `${scoreColor(h.score)}22`, color: scoreColor(h.score) }}>
                            {h.score}
                          </span>
                        </td>
                        <td>
                          <Link href={`/results/${h.id}`} className="btn btn-ghost btn-sm">View →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
