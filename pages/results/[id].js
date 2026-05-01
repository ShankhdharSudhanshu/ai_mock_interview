import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthContext';

// ── Score gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score: rawScore, size = 140 }) {
  const score = rawScore ?? 0;          // guard: null / undefined → 0
  const [animated, setAnimated] = useState(0);
  const r = size * 0.386;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 300);
    return () => clearTimeout(t);
  }, [score]);

  const offset = circ - (animated / 10) * circ;
  const color = score >= 8 ? 'var(--success)' : score >= 6 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f72ff" />
            <stop offset="100%" stopColor="#9c6bff" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={score >= 8 ? 'var(--success)' : 'url(#gaugeGrad)'}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.23, fontWeight: 900, color }}>{score.toFixed(1)}</div>
        <div style={{ fontSize: size * 0.086, color: 'var(--t-muted)' }}>out of 10</div>
      </div>
    </div>
  );
}

// ── Mini score bar ────────────────────────────────────────────────────────────
function ScoreBar({ label, score, color, weight }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(score), 400); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--t-secondary)', fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {weight && <span style={{ fontSize: 11, color: 'var(--t-muted)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 20 }}>weight {weight}</span>}
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{score?.toFixed(1) ?? '—'}/10</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(animated / 10) * 100}%`, background: color, borderRadius: 99, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

// ── Sentiment badge ───────────────────────────────────────────────────────────
function SentimentBadge({ label }) {
  const map = {
    'Confident & Positive': { bg: 'rgba(0,217,126,0.12)', color: 'var(--success)', icon: '😊' },
    'Positive':             { bg: 'rgba(0,217,126,0.08)', color: 'var(--success)', icon: '🙂' },
    'Neutral':              { bg: 'rgba(79,114,255,0.1)',  color: 'var(--accent-h)', icon: '😐' },
    'Uncertain / Hedging':  { bg: 'rgba(255,184,0,0.1)',  color: 'var(--warning)', icon: '🤔' },
    'Negative':             { bg: 'rgba(255,71,87,0.1)',  color: 'var(--danger)', icon: '😟' },
  };
  const s = map[label] || map['Neutral'];
  return (
    <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
      {s.icon} {label || 'Neutral'}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Results() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [session, setSession] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`vp-session-${id}`);
    if (stored) { setSession(JSON.parse(stored)); return; }
    // Fallback mock
    setSession({
      id, category: 'Interview Session',
      score: 7.4, date: new Date().toISOString().split('T')[0],
      answers: [
        {
          question: 'Tell me about your experience.',
          answer: 'I have 3 years of experience building web applications using React and Node.js. I\'ve delivered several projects successfully and collaborated closely with design and product teams.',
          score: 7.2, contentScore: 7, fluencyScore: 7.8, sentimentScore: 7,
          feedback: 'Good overview of experience with positive tone.',
          strengths: ['Structured response', 'Confident tone'],
          improvements: ['Add specific metrics', 'Mention key projects'],
          sentiment: { label: 'Confident & Positive', confidence: 0.75, fillerCount: 1 },
          fluency:   { fillerCount: 1, paceLabel: 'Appropriate', wordCount: 38 },
        },
        {
          question: 'Describe a challenge you overcame.',
          answer: 'At my last job we had a critical outage on a Friday evening. I led the incident response, coordinated with the team, identified a misconfigured load balancer, and restored service within 2 hours. We documented the post-mortem and implemented automated health checks to prevent recurrence.',
          score: 8.1, contentScore: 8.5, fluencyScore: 7.8, sentimentScore: 8,
          feedback: 'Excellent STAR method usage with clear outcome and learning.',
          strengths: ['Clear situation/task', 'Quantified result', 'Showed leadership'],
          improvements: ['Expand on personal learnings'],
          sentiment: { label: 'Confident & Positive', confidence: 0.82, fillerCount: 0 },
          fluency:   { fillerCount: 0, paceLabel: 'Detailed', wordCount: 68 },
        },
      ],
    });
  }, [id, loading, user]);

  if (loading || !user || !session) {
    return <div className="page-bg"><Navbar /><div className="loading-center mt-nav"><div className="spinner" /></div></div>;
  }

  const answers = session.answers || [];
  const avg = session.score;
  const pct = Math.round((avg / 10) * 100);
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';
  const getLabel = s => s >= 9 ? 'Excellent 🏆' : s >= 7 ? 'Good 👍' : s >= 5 ? 'Average 📈' : 'Needs Work 💪';
  const scoreColor = s => s >= 8 ? 'var(--success)' : s >= 6 ? 'var(--warning)' : 'var(--danger)';

  // ── Aggregate strengths/improvements across all answers ────────────────────
  const allStrengths = [...new Set(answers.flatMap(a => a.strengths || []))].slice(0, 5);
  const allImprove   = [...new Set(answers.flatMap(a => a.improvements || []))].slice(0, 5);

  // ── Sentiment summary ──────────────────────────────────────────────────────
  const sentimentCounts = {};
  answers.forEach(a => {
    const lbl = a.sentiment?.label || 'Neutral';
    sentimentCounts[lbl] = (sentimentCounts[lbl] || 0) + 1;
  });
  const dominantSentiment = Object.entries(sentimentCounts).sort((x, y) => y[1] - x[1])[0]?.[0] || 'Neutral';

  // ── Average sub-scores ─────────────────────────────────────────────────────
  const hasSubScores = answers.some(a => a.contentScore != null);
  const avgContent  = hasSubScores ? answers.reduce((s, a) => s + (a.contentScore  || a.score), 0) / answers.length : null;
  const avgFluency  = hasSubScores ? answers.reduce((s, a) => s + (a.fluencyScore  || a.score), 0) / answers.length : null;
  const avgSentiment= hasSubScores ? answers.reduce((s, a) => s + (a.sentimentScore|| a.score), 0) / answers.length : null;

  // ── Print/email scorecard ──────────────────────────────────────────────────
  const printScorecard = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 300);
  };

  const emailScorecard = () => {
    const subject = encodeURIComponent(`Interview Results — ${session.category} (${session.date})`);
    const body = encodeURIComponent(
      `Hi,\n\nHere are your AI Interview Platform results:\n\n` +
      `Track: ${session.category}\nDate: ${session.date}\nOverall Score: ${avg}/10 (${pct}% — Grade ${grade})\n` +
      `Dominant Sentiment: ${dominantSentiment}\n\n` +
      `Overall Strengths:\n${allStrengths.map(s => `• ${s}`).join('\n')}\n\n` +
      `Areas for Improvement:\n${allImprove.map(s => `• ${s}`).join('\n')}\n\n` +
      `Question Breakdown:\n${answers.map((a, i) => `Q${i+1}: ${a.question}\nScore: ${a.score}/10 — ${a.feedback}`).join('\n\n')}\n\n` +
      `Keep practising — every session brings you closer to your dream role!\n\nAI Interview Platform`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '48px 24px', maxWidth: '900px' }}>

          {/* ── Hero Score ── */}
          <div className="card text-center mb-32" style={{ padding: '48px 32px' }}>
            <div className="badge badge-blue mb-24" style={{ margin: '0 auto 24px' }}>Session Complete 🎉</div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>{session.category}</h1>
            <p style={{ fontSize: '13px', color: 'var(--t-muted)', marginBottom: '32px' }}>{session.date}</p>
            <ScoreGauge score={avg} />
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '20px' }}>{getLabel(avg)}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(79,114,255,0.12)', color: 'var(--accent-h)', padding: '6px 18px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
                {pct}% Overall
              </span>
              <span style={{ background: 'rgba(156,107,255,0.12)', color: '#9c6bff', padding: '6px 18px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
                Grade {grade}
              </span>
              <SentimentBadge label={dominantSentiment} />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--t-secondary)', marginTop: '16px', maxWidth: '460px', margin: '16px auto 0', lineHeight: 1.7 }}>
              {avg >= 8 ? "Outstanding performance! You're well prepared for real interviews." : avg >= 6 ? 'Solid effort. A few more practice sessions and you\'ll be interview-ready.' : 'Keep practising — every session brings you closer to your goal.'}
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <button onClick={emailScorecard} className="btn btn-secondary" style={{ gap: 6 }}>
                📧 Email Report
              </button>
              <button onClick={printScorecard} className="btn btn-secondary" style={{ gap: 6 }} disabled={printing}>
                {printing ? '⏳ Preparing…' : '🖨️ Print / Save PDF'}
              </button>
            </div>
          </div>

          {/* ── Summary Stats ── */}
          <div className="grid-3 mb-32">
            {[
              { label: 'Average Score',       value: `${avg}/10`,       color: scoreColor(avg) },
              { label: 'Questions Answered',   value: answers.length,    color: 'var(--accent-h)' },
              { label: 'Session Date',         value: session.date,      color: 'var(--t-secondary)' },
            ].map(s => (
              <div key={s.label} className="card text-center" style={{ padding: '24px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, marginBottom: '6px' }}>{s.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--t-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Scoring Breakdown (Step 7) ── */}
          {hasSubScores && (
            <div className="card mb-32" style={{ padding: '28px 32px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>📊 Score Breakdown</h2>
              <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 20 }}>Weighted: 50% content relevance · 30% fluency · 20% sentiment</p>
              <ScoreBar label="Content Relevance"  score={avgContent}   color="#4f72ff" weight="50%" />
              <ScoreBar label="Fluency & Delivery" score={avgFluency}   color="#9c6bff" weight="30%" />
              <ScoreBar label="Sentiment & Tone"   score={avgSentiment} color="#00d97e" weight="20%" />
            </div>
          )}

          {/* ── Sentiment Summary (Step 8) ── */}
          <div className="card mb-32" style={{ padding: '28px 32px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🧠 Sentiment Analysis</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {Object.entries(sentimentCounts).map(([label, count]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SentimentBadge label={label} />
                  <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>×{count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Dominant Tone', value: dominantSentiment },
                { label: 'Avg Filler Words / Q', value: answers.reduce((s, a) => s + (a.fluency?.fillerCount || 0), 0) === 0 ? '0' : (answers.reduce((s, a) => s + (a.fluency?.fillerCount || 0), 0) / answers.length).toFixed(1) },
                { label: 'Avg Answer Length', value: answers.length ? `${Math.round(answers.reduce((s, a) => s + (a.fluency?.wordCount || 0), 0) / answers.length)} words` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="card" style={{ padding: '14px 20px', flex: '1 1 auto', minWidth: 140, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Overall Strengths & Improvements (Step 8) ── */}
          <div className="grid-2 mb-32" style={{ gap: 20 }}>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 14 }}>✅ Overall Strengths</div>
              {allStrengths.length > 0
                ? <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {allStrengths.map((s, i) => <li key={i} style={{ fontSize: 13, color: 'var(--t-secondary)', lineHeight: 1.5 }}>{s}</li>)}
                  </ul>
                : <p style={{ fontSize: 13, color: 'var(--t-muted)' }}>Complete more questions for aggregated strengths.</p>
              }
            </div>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)', marginBottom: 14 }}>💡 Key Improvement Areas</div>
              {allImprove.length > 0
                ? <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {allImprove.map((s, i) => <li key={i} style={{ fontSize: 13, color: 'var(--t-secondary)', lineHeight: 1.5 }}>{s}</li>)}
                  </ul>
                : <p style={{ fontSize: 13, color: 'var(--t-muted)' }}>Complete more questions for improvement suggestions.</p>
              }
            </div>
          </div>

          {/* ── Per-Question Breakdown ── */}
          {answers.length > 0 && (
            <div className="mb-32">
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Question Breakdown</h2>
              <div className="question-breakdown">
                {answers.map((a, i) => (
                  <div key={i} className="breakdown-item" onClick={() => setExpanded(expanded === i ? null : i)}>
                    <div className="breakdown-header">
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t-muted)', minWidth: '24px' }}>Q{i + 1}</span>
                      <span className="breakdown-q">{a.question}</span>
                      <span className="breakdown-score" style={{ color: scoreColor(a.score), flexShrink: 0 }}>{a.score?.toFixed(1)}/10</span>
                      <span style={{ color: 'var(--t-muted)', fontSize: '13px', flexShrink: 0 }}>{expanded === i ? '▲' : '▼'}</span>
                    </div>
                    {expanded === i && (
                      <div className="breakdown-detail fade-in">
                        {/* Sub-score bars */}
                        {a.contentScore != null && (
                          <div style={{ marginBottom: 16 }}>
                            <ScoreBar label="Content"   score={a.contentScore}   color="#4f72ff" />
                            <ScoreBar label="Fluency"   score={a.fluencyScore}   color="#9c6bff" />
                            <ScoreBar label="Sentiment" score={a.sentimentScore} color="#00d97e" />
                          </div>
                        )}

                        {/* Fluency + Sentiment meta */}
                        {(a.fluency || a.sentiment) && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                            {a.sentiment?.label && <SentimentBadge label={a.sentiment.label} />}
                            {a.fluency?.paceLabel && (
                              <span style={{ background: 'rgba(79,114,255,0.1)', color: 'var(--accent-h)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                🎯 {a.fluency.paceLabel} · {a.fluency.wordCount} words
                              </span>
                            )}
                            {a.fluency?.fillerCount > 0 && (
                              <span style={{ background: 'rgba(255,184,0,0.1)', color: 'var(--warning)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                ⚠️ {a.fluency.fillerCount} filler words
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ marginBottom: '12px' }}>
                          <div className="label mb-8">Your Answer</div>
                          <div className="transcript-box" style={{ fontSize: '13px' }}>{a.answer || 'No answer recorded.'}</div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <div className="label mb-8">AI Feedback</div>
                          <p style={{ fontSize: '14px', color: 'var(--t-secondary)', lineHeight: '1.7' }}>{a.feedback}</p>
                        </div>
                        <div className="grid-2" style={{ gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>✅ Strengths</div>
                            <ul className="feedback-list">{(a.strengths || []).map((s, j) => <li key={j}>{s}</li>)}</ul>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warning)', marginBottom: '8px' }}>💡 Improvements</div>
                            <ul className="feedback-list">{(a.improvements || []).map((s, j) => <li key={j}>{s}</li>)}</ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.back()} className="btn btn-secondary btn-lg">↩ Practice Again</button>
            <Link href="/dashboard" className="btn btn-primary btn-lg">→ Back to Dashboard</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
