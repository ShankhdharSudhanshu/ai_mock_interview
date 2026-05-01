import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthContext';
import supabase from '../../lib/supabase';
import { saveInterviewToDB } from '../../lib/db-client';

const CATEGORY_LABELS = {
  'frontend': 'Frontend Dev', 'backend': 'Backend Dev', 'fullstack': 'Full Stack',
  'system-design': 'System Design', 'data-science': 'Data Science / ML',
  'product-manager': 'Product Manager', 'behavioral': 'Behavioral', 'devops': 'DevOps / Cloud',
};
const WAVEFORM_BARS = Array.from({ length: 12 });

export default function InterviewSession() {
  const router   = useRouter();
  const { category } = router.query;
  const { user, loading } = useAuth();

  const [questions, setQuestions]     = useState([]);
  const [qIdx, setQIdx]               = useState(0);
  const [answers, setAnswers]         = useState([]);   // for display only
  const [transcript, setTranscript]   = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [feedback, setFeedback]       = useState(null);
  const [loadingQ, setLoadingQ]       = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [timer, setTimer]             = useState(0);
  const [micError, setMicError]       = useState('');

  // ── Refs: always current, no stale closures ──────────────────
  const answersRef      = useRef([]);   // source of truth for session save
  const isRecordingRef  = useRef(false);
  const finalTranscript = useRef('');
  const timerRef        = useRef(null);

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // ── Load questions ────────────────────────────────────────────
  useEffect(() => {
    if (!category) return;
    setLoadingQ(true);
    fetch(`/api/interview/generate?category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions || []); setLoadingQ(false); })
      .catch(() => setLoadingQ(false));
  }, [category]);

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current); setTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      window.speechSynthesis?.cancel();
      clearInterval(timerRef.current);
    };
  }, []);

  // ── TTS: Read question aloud ──────────────────────────────────
  const speakQuestion = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const q = questions[qIdx];
    if (!q) return;
    const u = new SpeechSynthesisUtterance(q);
    u.rate = 0.92; u.pitch = 1.05;
    u.onstart = () => setIsSpeaking(true);
    u.onend   = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [questions, qIdx]);

  // ── Mic recording (continuous, no auto-close) ─────────────────
  const startRecording = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError('Speech recognition requires Google Chrome or Microsoft Edge.');
      return;
    }
    setMicError('');
    finalTranscript.current = '';
    setTranscript('');
    setFeedback(null);
    isRecordingRef.current = true;
    setIsRecording(true);

    const launchRec = () => {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';

      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTranscript.current += t + ' ';
          else interim = t;
        }
        setTranscript(finalTranscript.current + interim);
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          setMicError('Microphone access denied. Allow mic in your browser address bar (🔒).');
          isRecordingRef.current = false; setIsRecording(false);
        }
        // no-speech / audio-capture → onend restarts automatically
      };

      // KEY FIX: auto-restart on every onend while still recording
      rec.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try { rec.start(); } catch (_) { launchRec(); }
            }
          }, 200);
        } else {
          setIsRecording(false);
        }
      };

      try {
        rec.start();
      } catch (e) {
        if (e.name !== 'InvalidStateError') {
          isRecordingRef.current = false; setIsRecording(false);
          setMicError('Could not start mic. Refresh and try again.');
        }
      }
    };

    launchRec();
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
  }, []);

  // ── Submit answer to AI ───────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    const ans = finalTranscript.current.trim();
    if (!ans) { setMicError('Please record your answer first.'); return; }
    setMicError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questions[qIdx], answer: ans, category }),
      });
      const data = await res.json();

      // ── CRITICAL: update ref FIRST, then state ──
      const newAnswer = {
        question: questions[qIdx], answer: ans,
        score: data.score, feedback: data.feedback,
        strengths: data.strengths || [], improvements: data.improvements || [],
      };
      answersRef.current = [...answersRef.current, newAnswer];
      setAnswers([...answersRef.current]);  // sync display state
      setFeedback(data);
    } catch {
      const fallback = {
        score: 7, feedback: 'Good attempt! Keep practicing.',
        strengths: ['Provided an answer'], improvements: ['Add more detail'],
      };
      const newAnswer = { question: questions[qIdx], answer: ans, ...fallback };
      answersRef.current = [...answersRef.current, newAnswer];
      setAnswers([...answersRef.current]);
      setFeedback(fallback);
    } finally {
      setSubmitting(false);
    }
  }, [questions, qIdx, category]);

  // ── Move to next question / Show results ─────────────────────
  const nextQuestion = useCallback(async () => {
    // ── ALWAYS read from ref — never stale ──
    const allAnswers = answersRef.current;
    const isLast = qIdx + 1 >= questions.length;

    if (isLast) {
      if (allAnswers.length === 0) {
        console.warn('No answers recorded — cannot save session');
        router.push('/dashboard');
        return;
      }

      const avg = parseFloat(
        (allAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / allAnswers.length).toFixed(1)
      );
      const sessionId = `session-${Date.now()}`;
      const session = {
        id:        sessionId,
        category:  CATEGORY_LABELS[category] || category,
        date:      new Date().toISOString().split('T')[0],
        score:     avg,
        questions: allAnswers.length,
        answers:   allAnswers,
        userId:    user?.id,
      };

      // Save to localStorage (always works, even in demo mode)
      try {
        const prevHistory = JSON.parse(localStorage.getItem('vp-history') || '[]');
        localStorage.setItem('vp-history', JSON.stringify([session, ...prevHistory].slice(0, 20)));
        localStorage.setItem(`vp-session-${sessionId}`, JSON.stringify(session));
      } catch (e) {
        console.error('localStorage save failed:', e);
      }

      // Save to Supabase (optional, non-blocking)
      if (user && !user.isDemo) {
        supabase.from('interviews').insert({
          id: sessionId, user_id: user.id,
          category: session.category, score: avg, answers: allAnswers,
        }).then(({ error }) => { if (error) console.warn('Supabase save:', error.message); });

        // Save to MongoDB (optional, non-blocking)
        saveInterviewToDB({
          sessionId, category: session.category, score: avg,
          answers: allAnswers, source: 'web',
        }).catch(err => console.warn('MongoDB save:', err?.message));
      }

      window.speechSynthesis.cancel();
      router.push(`/results/${sessionId}`);
    } else {
      setQIdx(q => q + 1);
      setTranscript('');
      finalTranscript.current = '';
      setFeedback(null);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [qIdx, questions.length, category, user, router]);
  // NOTE: `answers` intentionally NOT in deps — we use answersRef.current instead

  if (loading || !user) return (
    <div className="page-bg"><Navbar /><div className="loading-center mt-nav"><div className="spinner" /></div></div>
  );

  if (loadingQ) return (
    <div className="page-bg"><Navbar />
      <div className="loading-center mt-nav">
        <div className="spinner" />
        <p style={{ color: 'var(--t-secondary)', marginTop: 16, fontSize: 15 }}>
          Generating <strong>{CATEGORY_LABELS[category] || category}</strong> questions…
        </p>
      </div>
    </div>
  );

  const progress  = questions.length ? (qIdx / questions.length) * 100 : 0;
  const timeStr   = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;
  const curAnswer = finalTranscript.current.trim();

  return (
    <div className="interview-layout">
      <Navbar />
      <div className="progress-bar-wrap" style={{ marginTop: 'var(--nav-h)' }}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <main style={{ flex: 1 }}>
        <div className="container" style={{ padding: '32px 24px', maxWidth: 860 }}>

          {/* Header row */}
          <div className="flex-between mb-24" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="badge badge-blue" style={{ marginBottom: 8, display: 'inline-flex' }}>
                {CATEGORY_LABELS[category] || category}
              </span>
              <div style={{ fontSize: 13, color: 'var(--t-muted)', marginTop: 4 }}>
                Question {qIdx + 1} of {questions.length} · {answers.length} answered
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', animation: 'pulse-ring 1.2s infinite' }} />
                  REC {timeStr}
                </div>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { isRecordingRef.current = false; window.speechSynthesis.cancel(); router.push('/dashboard'); }}
              >✕ End Session</button>
            </div>
          </div>

          {/* Question card */}
          <div className="question-card mb-24 fade-in" key={qIdx}>
            <div className="question-num">Question {qIdx + 1}</div>
            <p className="question-text">{questions[qIdx]}</p>
            <div style={{ marginTop: 20 }}>
              <button
                className={`btn btn-sm ${isSpeaking ? 'btn-danger' : 'btn-secondary'}`}
                onClick={isSpeaking ? () => { window.speechSynthesis.cancel(); setIsSpeaking(false); } : speakQuestion}
              >
                {isSpeaking ? '⏹ Stop Reading' : '🔊 Read Aloud'}
              </button>
            </div>
          </div>

          {/* Recording panel */}
          <div className="recording-panel mb-24">
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--t-secondary)', marginBottom: 20 }}>
                {isRecording
                  ? '🎙️ Recording — speak naturally. Press ⏹ when done.'
                  : curAnswer
                  ? '✅ Recorded. Review your answer and submit.'
                  : 'Press the mic to start recording your answer'}
              </p>

              {/* Animated waveform */}
              <div className="waveform" style={{ justifyContent: 'center', marginBottom: 20 }}>
                {WAVEFORM_BARS.map((_, i) => (
                  <div key={i} className={`waveform-bar${isRecording ? ' active' : ''}`}
                    style={{ height: isRecording ? undefined : 4, opacity: isRecording ? 1 : 0.15 }} />
                ))}
              </div>

              {/* Mic button */}
              <button
                id="mic-btn"
                className={`mic-btn ${isRecording ? 'mic-btn-recording' : 'mic-btn-idle'}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!!feedback}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? '⏹' : '🎙️'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 10 }}>
                {isRecording ? 'Silence OK — recording stays on. Click ⏹ to stop.' : 'Click to record'}
              </p>
            </div>

            {/* Mic error */}
            {micError && (
              <div style={{
                width: '100%', background: 'rgba(255,71,87,0.1)',
                border: '1px solid rgba(255,71,87,0.3)', borderRadius: 'var(--r-md)',
                padding: '12px 16px', fontSize: 13, color: 'var(--danger)',
              }}>⚠️ {micError}</div>
            )}

            {/* Live transcript */}
            {(curAnswer || isRecording) && (
              <div style={{ width: '100%' }}>
                <div className="label">Your Answer</div>
                <div className="transcript-box" style={{ marginTop: 6 }}>
                  {curAnswer || <em style={{ color: 'var(--t-muted)' }}>Listening…</em>}
                </div>
              </div>
            )}

            {/* Submit / Clear */}
            {curAnswer && !feedback && (
              <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { finalTranscript.current = ''; setTranscript(''); }}>
                  🗑 Clear
                </button>
                <button className="btn btn-primary" onClick={submitAnswer} disabled={submitting}>
                  {submitting
                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Evaluating…</>
                    : '✓ Submit Answer'}
                </button>
              </div>
            )}
          </div>

          {/* AI Feedback panel */}
          {feedback && (
            <div className="feedback-panel mb-24">
              <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>🤖 AI Feedback</h3>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: 38, fontWeight: 900,
                    color: feedback.score >= 8 ? 'var(--success)' : feedback.score >= 6 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {feedback.score}
                  </span>
                  <span style={{ fontSize: 15, color: 'var(--t-muted)' }}>/10</span>
                </div>
              </div>
              <p className="feedback-text mb-16">{feedback.feedback}</p>
              <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 10 }}>✅ Strengths</div>
                  <ul className="feedback-list">{(feedback.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 10 }}>💡 Improve</div>
                  <ul className="feedback-list">{(feedback.improvements || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>
                  {answersRef.current.length} / {questions.length} answered
                </span>
                <button className="btn btn-primary" onClick={nextQuestion}>
                  {qIdx + 1 >= questions.length ? '🏁 View My Results →' : 'Next Question →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
