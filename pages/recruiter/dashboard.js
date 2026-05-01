import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthContext';

// ── Demo candidate data ────────────────────────────────────────────────────────
function generateDemoCandidates() {
  const names = ['Alex Chen', 'Priya Sharma', 'Jordan Lee', 'Morgan Davis', 'Sam Patel', 'Riley Kim', 'Taylor Brooks'];
  const tracks = ['Frontend Dev', 'Backend Dev', 'System Design', 'Data Science / ML', 'Behavioral', 'Full Stack', 'DevOps / Cloud'];
  const sentiments = ['Confident & Positive', 'Positive', 'Neutral', 'Uncertain / Hedging'];
  return names.map((name, i) => {
    const score = parseFloat((5.5 + Math.random() * 4.5).toFixed(1));
    return {
      id:         `cand-${i}`,
      name,
      email:      `${name.toLowerCase().replace(' ', '.')}@example.com`,
      track:      tracks[i % tracks.length],
      score,
      pct:        Math.round((score / 10) * 100),
      grade:      score >= 9 ? 'A+' : score >= 8 ? 'A' : score >= 7 ? 'B' : score >= 6 ? 'C' : 'D',
      sentiment:  sentiments[Math.floor(Math.random() * sentiments.length)],
      questions:  5,
      date:       new Date(Date.now() - i * 86400000 * Math.random() * 3).toISOString().split('T')[0],
      fillers:    Math.floor(Math.random() * 6),
      wordAvg:    40 + Math.floor(Math.random() * 80),
      status:     score >= 7 ? 'Shortlisted' : score >= 5.5 ? 'Under Review' : 'Not Suitable',
    };
  }).sort((a, b) => b.score - a.score);
}

function scoreColor(s) {
  if (s >= 8) return 'var(--success)';
  if (s >= 6) return 'var(--warning)';
  return 'var(--danger)';
}

function StatusBadge({ status }) {
  const map = {
    'Shortlisted':    { bg: 'rgba(0,217,126,0.12)', color: 'var(--success)', icon: '✅' },
    'Under Review':   { bg: 'rgba(255,184,0,0.12)',  color: 'var(--warning)', icon: '⏳' },
    'Not Suitable':   { bg: 'rgba(255,71,87,0.12)',  color: 'var(--danger)', icon: '❌' },
  };
  const s = map[status] || map['Under Review'];
  return (
    <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.icon} {status}
    </span>
  );
}

function SentimentDot({ label }) {
  const color = label === 'Confident & Positive' || label === 'Positive' ? 'var(--success)' : label === 'Negative' ? 'var(--danger)' : label === 'Uncertain / Hedging' ? 'var(--warning)' : 'var(--accent-h)';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }} />;
}

function MiniBar({ value, max = 10, color }) {
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, width: 60, display: 'inline-block', verticalAlign: 'middle', marginLeft: 6 }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function RecruiterDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [trackFilter, setTrackFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'recruiter' && user.role !== 'admin' && !user.isDemo))) {
      // Allow demo users to see this page for demonstration
      if (!user?.isDemo) router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Load from localStorage (real sessions) + fill with demo data
    const real = [];
    try {
      const hist = JSON.parse(localStorage.getItem('vp-history') || '[]');
      hist.forEach(h => {
        real.push({
          id:        h.id,
          name:      user?.name || 'You',
          email:     user?.email || 'you@example.com',
          track:     h.category,
          score:     h.score,
          pct:       Math.round((h.score / 10) * 100),
          grade:     h.score >= 9 ? 'A+' : h.score >= 8 ? 'A' : h.score >= 7 ? 'B' : h.score >= 6 ? 'C' : 'D',
          sentiment: 'Neutral',
          questions: h.questions || 5,
          date:      h.date,
          fillers:   0,
          wordAvg:   60,
          status:    h.score >= 7 ? 'Shortlisted' : h.score >= 5.5 ? 'Under Review' : 'Not Suitable',
          sessionId: h.id,
        });
      });
    } catch (_) {}
    setCandidates([...real, ...generateDemoCandidates()]);
  }, [user]);

  if (!mounted || loading || !user) return (
    <div className="page-bg"><Navbar /><div className="loading-center mt-nav"><div className="spinner" /></div></div>
  );

  const allTracks  = ['All', ...new Set(candidates.map(c => c.track))];
  const allStatuses = ['All', 'Shortlisted', 'Under Review', 'Not Suitable'];

  const filtered = candidates
    .filter(c => trackFilter  === 'All' || c.track  === trackFilter)
    .filter(c => statusFilter === 'All' || c.status === statusFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.track.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'score' ? b.score - a.score : sortBy === 'date' ? b.date.localeCompare(a.date) : a.name.localeCompare(b.name));

  const shortlisted   = candidates.filter(c => c.status === 'Shortlisted').length;
  const underReview   = candidates.filter(c => c.status === 'Under Review').length;
  const avgScore      = candidates.length ? (candidates.reduce((s, c) => s + c.score, 0) / candidates.length).toFixed(1) : '—';
  const topCandidate  = candidates[0];

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportSelected = () => {
    const rows = filtered
      .filter(c => selectedIds.size === 0 || selectedIds.has(c.id))
      .map(c => `${c.name},${c.email},${c.track},${c.score}/10,${c.pct}%,${c.grade},${c.sentiment},${c.status},${c.date}`)
      .join('\n');
    const csv = `Name,Email,Track,Score,Percentage,Grade,Sentiment,Status,Date\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'candidates.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '40px 24px', maxWidth: 1200 }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
            <div>
              <div className="badge badge-blue" style={{ marginBottom: 12 }}>📋 Recruiter Portal</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Candidate Analytics Dashboard</h1>
              <p style={{ color: 'var(--t-secondary)', fontSize: 14 }}>Ranked by AI interview score · Role-based access</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/admin/questions" className="btn btn-secondary btn-sm">🛠 Question Bank</Link>
              <button onClick={exportSelected} className="btn btn-primary btn-sm">⬇️ Export CSV</button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="stats-grid mb-32">
            {[
              { icon: '👥', value: candidates.length,  label: 'Total Candidates', sub: 'All sessions' },
              { icon: '✅', value: shortlisted,         label: 'Shortlisted',      sub: 'Score ≥ 7/10' },
              { icon: '⏳', value: underReview,         label: 'Under Review',     sub: 'Score 5.5–7' },
              { icon: '📈', value: avgScore,            label: 'Avg Score',        sub: 'Platform-wide' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value gradient-text">{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-change text-muted fs-12">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Top candidate highlight ── */}
          {topCandidate && (
            <div className="card mb-24" style={{
              background: 'linear-gradient(135deg, rgba(79,114,255,0.1), rgba(156,107,255,0.06))',
              border: '1px solid rgba(79,114,255,0.3)', padding: '22px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#4f72ff,#9c6bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {topCandidate.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>🏆 Top Performer: {topCandidate.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--t-secondary)' }}>{topCandidate.track} · {topCandidate.date}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: scoreColor(topCandidate.score) }}>{topCandidate.score}/10</span>
                <StatusBadge status={topCandidate.status} />
                {topCandidate.sessionId && (
                  <Link href={`/results/${topCandidate.sessionId}`} className="btn btn-ghost btn-sm">View Report →</Link>
                )}
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <input
              className="input" placeholder="🔍 Search candidates…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <select className="input" value={trackFilter} onChange={e => setTrackFilter(e.target.value)} style={{ maxWidth: 180 }}>
              {allTracks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 150 }}>
              <option value="score">Sort: Score</option>
              <option value="date">Sort: Date</option>
              <option value="name">Sort: Name</option>
            </select>
            <span style={{ fontSize: 13, color: 'var(--t-muted)', marginLeft: 'auto' }}>{filtered.length} results</span>
          </div>

          {/* ── Candidate Table ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table" style={{ fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
                        checked={selectedIds.size === filtered.length && filtered.length > 0} />
                    </th>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Track</th>
                    <th>Score</th>
                    <th>Breakdown</th>
                    <th>Sentiment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} style={{ background: selectedIds.has(c.id) ? 'rgba(79,114,255,0.04)' : undefined }}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--t-muted)' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4f72ff,#9c6bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {c.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--t-primary)' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{c.track}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: scoreColor(c.score) }}>{c.score}</span>
                          <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>/10</span>
                          <span style={{ fontSize: 11, background: 'var(--surface)', padding: '1px 7px', borderRadius: 20, color: 'var(--t-secondary)' }}>Grade {c.grade}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--t-muted)', gap: 4 }}>
                          <span>~{c.wordAvg}w</span>
                          <MiniBar value={c.score} color={scoreColor(c.score)} />
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12 }}>
                          <SentimentDot label={c.sentiment} />
                          {c.sentiment?.replace('Confident & ', '') || 'Neutral'}
                        </span>
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ color: 'var(--t-muted)', fontSize: 12 }}>{c.date}</td>
                      <td>
                        {c.sessionId
                          ? <Link href={`/results/${c.sessionId}`} className="btn btn-ghost btn-sm">View →</Link>
                          : <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>Demo</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--t-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <p>No candidates match your filters.</p>
              </div>
            )}
          </div>

          {/* ── Comparative analytics summary ── */}
          <div className="grid-3 mb-32" style={{ gap: 20 }}>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📊 Track Distribution</div>
              {Object.entries(
                candidates.reduce((acc, c) => { acc[c.track] = (acc[c.track] || 0) + 1; return acc; }, {})
              ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([track, count]) => (
                <div key={track} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--t-secondary)' }}>{track}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${(count / candidates.length) * 100}%`, background: 'var(--accent-h)', borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>😊 Sentiment Breakdown</div>
              {Object.entries(
                candidates.reduce((acc, c) => { acc[c.sentiment] = (acc[c.sentiment] || 0) + 1; return acc; }, {})
              ).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--t-secondary)' }}><SentimentDot label={label} />{label}</span>
                  <span style={{ fontWeight: 600 }}>{count} ({Math.round(count / candidates.length * 100)}%)</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>🏅 Status Summary</div>
              {[
                { status: 'Shortlisted',  count: shortlisted, color: 'var(--success)' },
                { status: 'Under Review', count: underReview, color: 'var(--warning)' },
                { status: 'Not Suitable', count: candidates.length - shortlisted - underReview, color: 'var(--danger)' },
              ].map(({ status, count, color }) => (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--t-secondary)' }}>{status}</span>
                    <span style={{ fontWeight: 600, color }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${Math.max(0, (count / candidates.length) * 100)}%`, background: color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--t-muted)' }}>
                <div>Shortlist rate: <strong style={{ color: 'var(--success)' }}>{candidates.length ? Math.round(shortlisted / candidates.length * 100) : 0}%</strong></div>
              </div>
            </div>
          </div>

          {/* ── Quick configure link ── */}
          <div className="card" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🛠 Configure Interview Questions</div>
              <div style={{ fontSize: 13, color: 'var(--t-secondary)' }}>Add, edit or AI-generate questions tagged by role, topic, and difficulty</div>
            </div>
            <Link href="/admin/questions" className="btn btn-primary">Manage Question Bank →</Link>
          </div>

        </div>
      </main>
    </div>
  );
}
