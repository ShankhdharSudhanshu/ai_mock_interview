import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';

const TRACKS = [
  'Frontend Dev', 'Backend Dev', 'Full Stack', 'System Design',
  'Data Science / ML', 'Product Manager', 'Behavioral', 'DevOps / Cloud', 'Other',
];

function StarRating({ value, onChange, label }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div>
      {label && <div className="label mb-8">{label}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            style={{
              fontSize: 32, background: 'none', border: 'none', cursor: 'pointer',
              color: n <= (hovered || value) ? '#ffb800' : 'var(--border)',
              transition: 'color 0.15s, transform 0.15s',
              transform: n <= (hovered || value) ? 'scale(1.2)' : 'scale(1)',
              padding: 0,
            }}
            aria-label={`${n} stars`}
          >★</button>
        ))}
      </div>
    </div>
  );
}

export default function Feedback() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    overallRating: 0,
    aiQualityRating: 0,
    track: '',
    message: '',
    recommend: '',
    name: user?.name || '',
    email: user?.email || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const setE = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.overallRating) return 'Please give an overall rating.';
    if (!form.message.trim()) return 'Please share your feedback.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: user?.id }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        throw new Error('Submit failed');
      }
    } catch {
      // Save locally as fallback
      const prev = JSON.parse(localStorage.getItem('vp-feedback') || '[]');
      localStorage.setItem('vp-feedback', JSON.stringify([...prev, { ...form, date: new Date().toISOString() }]));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '60px 24px', maxWidth: '680px' }}>

          {submitted ? (
            /* ── Thank-you state ── */
            <div className="card text-center fade-in" style={{ padding: '64px 40px' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Thank you!</h1>
              <p style={{ color: 'var(--t-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                Your feedback helps us make Real-time AI Voice Agent better for every candidate.
                We read every submission.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/dashboard" className="btn btn-primary btn-lg">Back to Dashboard</a>
                <button className="btn btn-secondary btn-lg" onClick={() => { setSubmitted(false); setForm(f => ({ ...f, message: '', overallRating: 0, aiQualityRating: 0, recommend: '' })); }}>
                  Submit More Feedback
                </button>
              </div>
            </div>
          ) : (
            /* ── Feedback Form ── */
            <div className="fade-in">
              <div className="text-center mb-40">
                <div className="badge badge-blue" style={{ margin: '0 auto 16px' }}>💬 We Value Your Input</div>
                <h1 className="section-title">Share Your <span className="gradient-text">Feedback</span></h1>
                <p style={{ color: 'var(--t-secondary)', fontSize: 15, marginTop: 12 }}>
                  Help us improve Real-time AI Voice Agent. Takes less than 2 minutes.
                </p>
              </div>

              <div className="card" style={{ padding: 36 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                  {/* Overall rating */}
                  <StarRating
                    label="Overall Experience *"
                    value={form.overallRating}
                    onChange={set('overallRating')}
                  />

                  {/* AI feedback quality */}
                  <StarRating
                    label="AI Feedback Quality"
                    value={form.aiQualityRating}
                    onChange={set('aiQualityRating')}
                  />

                  {/* Track */}
                  <div>
                    <label className="label">Which interview track did you use?</label>
                    <select
                      className="input"
                      value={form.track}
                      onChange={setE('track')}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Select a track…</option>
                      {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Would recommend */}
                  <div>
                    <div className="label mb-12">Would you recommend Real-time AI Voice Agent to a friend?</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {['Definitely!', 'Maybe', 'Not yet'].map(opt => (
                        <button
                          key={opt} type="button"
                          onClick={() => setForm(f => ({ ...f, recommend: opt }))}
                          className={`btn btn-sm ${form.recommend === opt ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ flex: 1 }}
                        >{opt}</button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="label">Your Feedback *</label>
                    <textarea
                      className="input"
                      placeholder="What did you love? What can we improve? Any feature requests?"
                      value={form.message}
                      onChange={setE('message')}
                      rows={5}
                      style={{ resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>

                  {/* Contact info (optional) */}
                  {!user && (
                    <div className="grid-2" style={{ gap: 16 }}>
                      <div>
                        <label className="label">Name (optional)</label>
                        <input className="input" placeholder="Your name" value={form.name} onChange={setE('name')} />
                      </div>
                      <div>
                        <label className="label">Email (optional)</label>
                        <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={setE('email')} />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--danger)' }}>
                      ⚠️ {error}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-full" disabled={submitting}
                    style={{ padding: 14, fontSize: 15 }}>
                    {submitting
                      ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Submitting…</>
                      : '✉️ Submit Feedback'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
