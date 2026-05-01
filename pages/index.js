import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const FEATURES = [
  { icon: '🤖', title: 'AI-Generated Questions', desc: 'GPT-4 crafts role-specific questions tailored to your target position and experience level.' },
  { icon: '🎙️', title: 'Voice Recognition', desc: 'Speak naturally — our AI transcribes your answers in real time with high accuracy.' },
  { icon: '📊', title: 'Instant Feedback', desc: 'Get detailed scoring and actionable feedback within seconds of answering.' },
  { icon: '📈', title: 'Progress Analytics', desc: 'Track your improvement across sessions with beautiful charts and trend data.' },
  { icon: '🏆', title: '8 Interview Tracks', desc: 'From Frontend to System Design — practice exactly the interviews you need.' },
  { icon: '🔒', title: 'Private & Secure', desc: 'Your interview sessions are encrypted and never shared with third parties.' },
];

const STATS = [
  { value: '12,400+', label: 'Interviews Practiced' },
  { value: '94%',     label: 'User Success Rate' },
  { value: '8',       label: 'Career Tracks' },
  { value: '4.9⭐',   label: 'Average Rating' },
];

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Frontend Engineer @ Google', avatar: 'P', text: '"I went from blanking out in interviews to confidently nailing my answers. Real-time AI Voice Agent is genuinely transformative."' },
  { name: 'Arjun M.', role: 'Backend Engineer @ Stripe',  avatar: 'A', text: '"The AI feedback is incredibly specific. It told me exactly what was missing — not just "be more detailed"."' },
  { name: 'Sara L.',  role: 'Product Manager @ Notion',   avatar: 'S', text: '"I practiced 3 sessions before my big interview. Got the offer. Enough said."' },
];

const TEAM = [
  { name: 'Sudhanshu Shankhdhar', role: 'Full Stack Developer',  avatar: 'SS', color: '#6c63ff' },
  { name: 'Piyush Kumar',        role: 'Backend Developer',     avatar: 'PK', color: '#00c6ff' },
  { name: 'Nikhil Diwakar',      role: 'UI/UX Designer',        avatar: 'ND', color: '#f857a6' },
  { name: 'Vivek Rajput',        role: 'Frontend Developer',    avatar: 'VR', color: '#43e97b' },
];

const STEPS = [
  { num: '01', title: 'Choose Your Track', desc: 'Select from 8 specialized interview categories matching your target role.' },
  { num: '02', title: 'Answer by Voice', desc: 'Listen to AI-generated questions and respond naturally with your voice.' },
  { num: '03', title: 'Get Scored & Improve', desc: 'Receive detailed AI feedback, strengths analysis, and a score to track your growth.' },
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Prevent SSR/client mismatch — user state is only known after mount
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="page-bg">
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero container fade-in">
        <div className="badge badge-blue mb-24" style={{ margin: '0 auto 24px' }}>
          ✨ AI-Powered Interview Coaching
        </div>
        <h1 className="hero-title">
          Master Any Interview<br />
          <span className="gradient-text">With Your Voice</span>
        </h1>
        <p className="hero-sub">
          Practice real interview questions, speak your answers, and get instant AI feedback — 
          so you show up confident and land the job.
        </p>
        <div className="hero-actions">
          {/* Render guest CTAs on server and first paint; swap after hydration */}
          {mounted && user ? (
            <button className="btn btn-primary btn-xl" onClick={() => router.push('/dashboard')}>
              🚀 Go to Dashboard
            </button>
          ) : (
            <Link href="/login" className="btn btn-primary btn-xl">Start Free Practice →</Link>
          )}
        </div>

        {/* Floating Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '64px', flexWrap: 'wrap' }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-h)' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--t-muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section container">
        <div className="text-center mb-48">
          <div className="divider" />
          <h2 className="section-title">Everything You Need to<br /><span className="gradient-text">Ace Your Interview</span></h2>
          <p className="section-sub" style={{ margin: '16px auto 0' }}>
            A complete AI coaching platform built for serious candidates.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card fade-in-up">
              <div className="feature-icon-wrap">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="text-center mb-48">
            <div className="divider" />
            <h2 className="section-title">How It <span className="gradient-text">Works</span></h2>
          </div>
          <div className="grid-3">
            {STEPS.map((s) => (
              <div key={s.num} className="card" style={{ textAlign: 'center', padding: '36px 28px' }}>
                <div style={{ fontSize: '48px', fontWeight: 900, color: 'var(--accent)', opacity: 0.3, marginBottom: '16px', letterSpacing: '-2px' }}>{s.num}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--t-secondary)', lineHeight: '1.7' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section container">
        <div className="text-center mb-48">
          <div className="divider" />
          <h2 className="section-title">Loved by <span className="gradient-text">Candidates</span></h2>
        </div>
        <div className="grid-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card card-hover" style={{ padding: '28px' }}>
              <p style={{ fontSize: '14px', color: 'var(--t-secondary)', lineHeight: '1.8', marginBottom: '20px', fontStyle: 'italic' }}>{t.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="nav-avatar" style={{ width: '42px', height: '42px', fontSize: '16px' }}>{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t-muted)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MEET THE TEAM ── */}
      <section className="section container">
        <div className="text-center mb-48">
          <div className="divider" />
          <h2 className="section-title">Meet the <span className="gradient-text">Team</span></h2>
          <p className="section-sub" style={{ margin: '16px auto 0' }}>
            The talented developers who built this platform.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
          {TEAM.map((member) => (
            <div key={member.name} className="card card-hover" style={{ textAlign: 'center', padding: '36px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                background: `linear-gradient(90deg, ${member.color}, ${member.color}88)`
              }} />
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
                background: `linear-gradient(135deg, ${member.color}33, ${member.color}11)`,
                border: `2px solid ${member.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: 800, color: member.color, letterSpacing: '1px'
              }}>
                {member.avatar}
              </div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{member.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--t-muted)', background: `${member.color}18`, borderRadius: '20px', padding: '4px 12px', display: 'inline-block' }}>
                {member.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container text-center">
          <h2 className="section-title mb-16">Ready to <span className="gradient-text">Land the Offer?</span></h2>
          <p className="section-sub" style={{ margin: '0 auto 40px' }}>
            Start practicing for free. No credit card required.
          </p>
          <Link href="/login" className="btn btn-primary btn-xl">Get Started — It's Free →</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', padding: '40px 0 24px' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'center', textAlign: 'center' }}>
          <div className="nav-logo" style={{ justifyContent: 'center' }}>
            <div className="nav-logo-icon">🎙️</div>
            <span>AI Voice Agent</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--t-muted)', lineHeight: '2' }}>
            <span style={{ fontWeight: 600, color: 'var(--t-secondary)' }}>Developed by</span>&nbsp;&nbsp;
            {TEAM.map((m, i) => (
              <span key={m.name}>
                <span style={{ color: 'var(--accent-h)', fontWeight: 600 }}>{m.name}</span>
                <span style={{ opacity: 0.6 }}> ({m.role})</span>
                {i < TEAM.length - 1 ? <span style={{ margin: '0 8px', opacity: 0.3 }}>·</span> : null}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--t-muted)' }}>
            <Link href="/login" style={{ color: 'var(--t-muted)' }}>Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}