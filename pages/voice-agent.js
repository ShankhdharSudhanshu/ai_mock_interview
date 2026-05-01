import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import supabase from '../lib/supabase';

const CATS = [
  { id: 'frontend',        icon: '💻', label: 'Frontend Dev'     },
  { id: 'backend',         icon: '⚙️',  label: 'Backend Dev'      },
  { id: 'fullstack',       icon: '🌐', label: 'Full Stack'        },
  { id: 'system-design',   icon: '🏗️', label: 'System Design'    },
  { id: 'data-science',    icon: '📊', label: 'Data Science'      },
  { id: 'product-manager', icon: '📋', label: 'Product Manager'  },
  { id: 'behavioral',      icon: '🤝', label: 'Behavioral'        },
  { id: 'devops',          icon: '🔧', label: 'DevOps / Cloud'    },
];

const ORB = {
  idle:        { color: '#4f72ff', emoji: '✨', label: 'Ready to start'       },
  connecting:  { color: '#ffb800', emoji: '🔗', label: 'Setting up…'          },
  ai_speaking: { color: '#4f72ff', emoji: '🤖', label: 'AI is speaking…'      },
  listening:   { color: '#00d97e', emoji: '🎙️', label: 'Listening to you…'   },
  processing:  { color: '#9c6bff', emoji: '⚡', label: 'Evaluating answer…'   },
  done:        { color: '#00d97e', emoji: '🏆', label: 'Interview complete!'  },
};

function scoreFallback(ans) {
  const w = ans.trim().split(/\s+/).filter(Boolean).length;
  let s = w < 15 ? 3 + Math.random()*2 : w < 40 ? 5 + Math.random()*2 : w < 90 ? 7 + Math.random()*1.5 : 8.5 + Math.random()*1.5;
  return Math.min(10, parseFloat(s.toFixed(1)));
}
function spokenScore(score) {
  if (score >= 9)  return `Outstanding — ${score} out of 10! Exceptional answer.`;
  if (score >= 8)  return `Excellent! ${score} out of 10. Well done.`;
  if (score >= 7)  return `Good job! ${score} out of 10. Solid response.`;
  if (score >= 6)  return `Not bad! ${score} out of 10. Add more examples next time.`;
  if (score >= 4)  return `${score} out of 10. You touched the topic but need more depth.`;
  return `${score} out of 10. Study this area further — you'll improve with practice.`;
}

export default function VoiceAgent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [state, setState]         = useState('idle');
  const [category, setCategory]   = useState('');
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx]           = useState(0);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatus]   = useState('Select a track and start your free interview');
  const [currentQ, setCurrentQ]   = useState('');
  const [answered, setAnswered]   = useState(0);
  const [micErr, setMicErr]       = useState('');

  // Refs — always current inside async functions
  const stateRef      = useRef('idle');
  const answersRef    = useRef([]);
  const finalTx       = useRef('');
  const recRef        = useRef(null);
  const isRecRef      = useRef(false);
  const resolveRef    = useRef(null); // resolves listenAsync()
  const silenceRef    = useRef(null);
  const activeRef     = useRef(false);

  const setS = (s) => { stateRef.current = s; setState(s); };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => () => {
    activeRef.current = false;
    isRecRef.current = false;
    if (resolveRef.current) resolveRef.current('');
    clearTimeout(silenceRef.current);
    window.speechSynthesis?.cancel();
    try { recRef.current?.stop(); } catch (_) {}
  }, []);

  // ── TTS promise ──────────────────────────────────────────────
  function speakAsync(text) {
    return new Promise(resolve => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.91; u.pitch = 1.0; u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en'))
             || voices.find(v => v.lang.startsWith('en-')) || voices[0];
      if (v) u.voice = v;
      u.onend = resolve; u.onerror = resolve;
      window.speechSynthesis.speak(u);
    });
  }

  // ── STT promise — resolves with final transcript ─────────────
  function listenAsync() {
    return new Promise(resolve => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setMicErr('Use Chrome or Edge for speech recognition.'); resolve(''); return; }

      finalTx.current = '';
      setTranscript('');
      isRecRef.current = true;
      resolveRef.current = resolve;

      const done = () => {
        if (!resolveRef.current) return;
        clearTimeout(silenceRef.current);
        isRecRef.current = false;
        try { recRef.current?.stop(); } catch (_) {}
        const t = finalTx.current.trim();
        resolveRef.current(t);
        resolveRef.current = null;
      };

      const launch = () => {
        const rec = new SR();
        recRef.current = rec;
        rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';

        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalTx.current += t + ' '; else interim = t;
          }
          setTranscript(finalTx.current + interim);
          clearTimeout(silenceRef.current);
          if (finalTx.current.trim()) silenceRef.current = setTimeout(done, 3500);
        };

        rec.onerror = (e) => {
          if (e.error === 'not-allowed') {
            setMicErr('Microphone denied — click the 🔒 icon in your browser bar.');
            resolve('');
          }
        };

        rec.onend = () => {
          if (isRecRef.current && resolveRef.current) {
            setTimeout(() => { try { rec.start(); } catch (_) { launch(); } }, 200);
          }
        };

        try { rec.start(); } catch (_) {}
      };

      launch();
    });
  }

  // Manual "Done Answering" button
  function handleDone() {
    if (!resolveRef.current) return;
    clearTimeout(silenceRef.current);
    isRecRef.current = false;
    const t = finalTx.current.trim();
    resolveRef.current(t);
    resolveRef.current = null;
    try { recRef.current?.stop(); } catch (_) {}
  }

  // ── Main interview flow ───────────────────────────────────────
  async function startInterview() {
    if (!category || activeRef.current) return;
    activeRef.current = true;
    answersRef.current = [];
    setAnswered(0); setQIdx(0); setMicErr('');
    setS('connecting'); setStatus('Loading your questions…');

    let qs = [];
    try {
      const r = await fetch(`/api/interview/generate?category=${encodeURIComponent(category)}`);
      const d = await r.json();
      qs = d.questions || [];
    } catch (_) {}

    if (!qs.length || !activeRef.current) { setS('idle'); activeRef.current = false; return; }
    setQuestions(qs);

    const catLabel = CATS.find(c => c.id === category)?.label || category;
    setS('ai_speaking'); setStatus('AI Interviewer is speaking…');
    await speakAsync(`Hello! I'm your AI Voice Agent interviewer. We'll go through ${qs.length} ${catLabel} questions today. After each answer I'll give you immediate feedback. Let's begin!`);

    for (let i = 0; i < qs.length && activeRef.current; i++) {
      setQIdx(i); setCurrentQ(qs[i]);
      setS('ai_speaking');
      setStatus(`Question ${i + 1} of ${qs.length}`);
      const prefix = i === 0 ? 'First question. ' : `Question ${i + 1}. `;
      await speakAsync(prefix + qs[i]);
      if (!activeRef.current) break;

      setS('listening'); setStatus('Your turn — speak your answer');
      const answer = await listenAsync();
      if (!activeRef.current) break;

      setS('processing'); setStatus('Evaluating your answer…');
      setTranscript(answer);

      let score, feedback, strengths = [], improvements = [];
      let contentScore, fluencyScore, sentimentScore, fluency, sentiment;
      try {
        const r = await fetch('/api/interview/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: qs[i], answer, category }),
        });
        const d = await r.json();
        score = d.score; feedback = d.feedback;
        strengths = d.strengths || []; improvements = d.improvements || [];
        contentScore  = d.contentScore;
        fluencyScore  = d.fluencyScore;
        sentimentScore= d.sentimentScore;
        fluency       = d.fluency;
        sentiment     = d.sentiment;
      } catch {
        score = scoreFallback(answer || 'no answer');
        feedback = spokenScore(score);
      }

      answersRef.current.push({ question: qs[i], answer, score, feedback, strengths, improvements, contentScore, fluencyScore, sentimentScore, fluency, sentiment });
      setAnswered(answersRef.current.length);

      setS('ai_speaking'); setStatus('AI feedback…');
      await speakAsync(spokenScore(score));
    }

    if (!activeRef.current) return;

    setS('ai_speaking'); setStatus('Wrapping up…');
    await speakAsync('Excellent! You completed your interview session. Preparing your results now.');

    // Save + navigate
    const all = answersRef.current;
    const avg = all.length ? parseFloat((all.reduce((s, a) => s + a.score, 0) / all.length).toFixed(1)) : 0;
    const sid = `session-${Date.now()}`;
    const session = {
      id: sid, category: catLabel,
      date: new Date().toISOString().split('T')[0],
      score: avg, questions: all.length, answers: all,
    };
    try {
      const prev = JSON.parse(localStorage.getItem('vp-history') || '[]');
      localStorage.setItem('vp-history', JSON.stringify([session, ...prev].slice(0, 20)));
      localStorage.setItem(`vp-session-${sid}`, JSON.stringify(session));
    } catch (_) {}
    if (user && !user.isDemo) {
      supabase.from('interviews').insert({ id: sid, user_id: user.id, category: catLabel, score: avg, answers: all }).catch(() => {});
    }
    setS('done');
    router.push(`/results/${sid}`);
    activeRef.current = false;
  }

  function endSession() {
    activeRef.current = false;
    isRecRef.current = false;
    if (resolveRef.current) { resolveRef.current(''); resolveRef.current = null; }
    clearTimeout(silenceRef.current);
    window.speechSynthesis.cancel();
    try { recRef.current?.stop(); } catch (_) {}

    const all = answersRef.current;
    if (all.length) {
      const avg = parseFloat((all.reduce((s, a) => s + a.score, 0) / all.length).toFixed(1));
      const sid = `session-${Date.now()}`;
      const session = { id: sid, category, date: new Date().toISOString().split('T')[0], score: avg, questions: all.length, answers: all };
      try {
        localStorage.setItem(`vp-session-${sid}`, JSON.stringify(session));
        const prev = JSON.parse(localStorage.getItem('vp-history') || '[]');
        localStorage.setItem('vp-history', JSON.stringify([session, ...prev].slice(0, 20)));
      } catch (_) {}
      router.push(`/results/${sid}`);
    } else {
      router.push('/dashboard');
    }
  }

  if (loading) return <div className="va-page" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  const orb     = ORB[state] || ORB.idle;
  const isActive = state !== 'idle';

  return (
    <div className="va-page">
      {/* Top bar */}
      <div className="va-topbar">
        <Link href="/" className="va-logo">
          <div className="va-logo-icon">🎙️</div>
          AI Voice <span style={{ color: '#6b8aff' }}>&nbsp;Agent</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {state === 'listening' && (
            <button onClick={handleDone} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#00d97e,#00b868)', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ✓ Done Answering
            </button>
          )}
          {isActive ? (
            <button onClick={endSession} style={{ padding: '8px 16px', background: 'rgba(255,71,87,0.15)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              End Session
            </button>
          ) : (
            <Link href="/dashboard" style={{ color: '#7a9cc8', fontSize: 14, textDecoration: 'none' }}>← Dashboard</Link>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="va-main" style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {!isActive ? (
          /* ── IDLE: Setup screen ── */
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎙️</div>
            <h1 style={{ fontSize: 'clamp(26px,5vw,38px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12 }}>
              Free AI Voice Interviewer
            </h1>
            <p style={{ color: '#7a9cc8', fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: '0 auto 36px' }}>
              100% free. No API key needed. Your AI interviewer asks questions aloud, listens to your answers, auto-detects when you stop, and gives instant spoken feedback.
            </p>

            <div style={{ fontSize: 12, color: '#3d5a82', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
              Choose your interview track
            </div>
            <div className="va-cat-grid" style={{ margin: '0 auto 32px' }}>
              {CATS.map(c => (
                <button key={c.id} className={`va-cat-btn${category === c.id ? ' selected' : ''}`} onClick={() => setCategory(c.id)}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>

            <button className="va-start-btn" disabled={!category} onClick={startInterview}>
              🎙️ Start Voice Interview
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 32, flexWrap: 'wrap' }}>
              {['100% Free', 'No API Key', 'Auto Listen', 'Spoken Feedback'].map(f => (
                <span key={f} style={{ fontSize: 12, color: '#3d5a82', fontWeight: 600 }}>✓ {f}</span>
              ))}
            </div>
            {micErr && <div style={{ marginTop: 16, color: '#ff4757', fontSize: 13 }}>⚠️ {micErr}</div>}
          </div>
        ) : (
          /* ── ACTIVE: Voice UI ── */
          <>
            {/* Progress */}
            {questions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(79,114,255,0.15)', color: '#6b8aff', fontSize: 12, fontWeight: 700 }}>
                  {CATS.find(c => c.id === category)?.label || category}
                </span>
                <span style={{ color: '#3d5a82', fontSize: 13 }}>Q{Math.min(qIdx + 1, questions.length)}/{questions.length}</span>
                <span style={{ color: '#00d97e', fontSize: 13 }}>✓ {answered} answered</span>
              </div>
            )}

            {/* ORB */}
            <div className="orb-wrap" style={{ color: orb.color }}>
              {['ai_speaking', 'listening'].includes(state) && (
                <>
                  <div className="orb-ring orb-ring-1" />
                  <div className="orb-ring orb-ring-2" />
                </>
              )}
              <div className={`orb-core ${state === 'processing' ? 'orb-spin' : 'orb-pulse'}`} style={{
                background: `radial-gradient(circle at 35% 35%, ${orb.color}cc, ${orb.color}44)`,
                boxShadow: `0 0 60px ${orb.color}66, 0 0 120px ${orb.color}22`,
              }}>
                {orb.emoji}
              </div>
            </div>

            {/* Status */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{statusText}</div>
              {state === 'listening' && (
                <div style={{ fontSize: 13, color: '#3d5a82' }}>
                  Auto-submits 3.5s after you stop speaking · or press "Done Answering"
                </div>
              )}
              {micErr && <div style={{ marginTop: 8, color: '#ff4757', fontSize: 13 }}>⚠️ {micErr}</div>}
            </div>

            {/* Current question */}
            {currentQ && (
              <div className="va-card">
                <div className="va-q-label">Current Question</div>
                <div className="va-q-text">{currentQ}</div>
              </div>
            )}

            {/* Live transcript */}
            {(transcript || state === 'listening') && (
              <div className="va-card" style={{ borderColor: 'rgba(0,217,126,0.2)' }}>
                <div className="va-t-label">Your Answer (live)</div>
                <div className="va-t-text">{transcript || <em>Listening…</em>}</div>
              </div>
            )}

            {/* Progress dots */}
            {questions.length > 0 && (
              <div className="va-dots">
                {questions.map((_, i) => (
                  <div key={i} className="va-dot" style={{
                    background: i < answered ? '#00d97e' : i === qIdx ? '#4f72ff' : 'rgba(255,255,255,0.12)',
                  }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
