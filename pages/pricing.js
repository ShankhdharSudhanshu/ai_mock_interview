import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';
import { useRouter } from 'next/router';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    desc: 'Perfect to get started',
    badge: null,
    features: [
      { ok: true,  text: '3 interview sessions / month' },
      { ok: true,  text: 'Basic AI feedback' },
      { ok: true,  text: '3 interview tracks' },
      { ok: false, text: 'Detailed score breakdown' },
      { ok: false, text: 'Session history (30 days)' },
      { ok: false, text: 'Priority support' },
    ],
    cta: 'Get Started Free',
    ctaClass: 'btn-secondary',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 19,
    yearlyPrice: 12,
    desc: 'For serious candidates',
    badge: 'Most Popular',
    features: [
      { ok: true, text: 'Unlimited interview sessions' },
      { ok: true, text: 'Advanced AI feedback + scoring' },
      { ok: true, text: 'All 8 interview tracks' },
      { ok: true, text: 'Detailed score breakdown' },
      { ok: true, text: 'Session history (1 year)' },
      { ok: false, text: 'Priority support' },
    ],
    cta: 'Start Pro Trial',
    ctaClass: 'btn-primary',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 49,
    yearlyPrice: 32,
    desc: 'For teams & bootcamps',
    badge: null,
    features: [
      { ok: true, text: 'Everything in Pro' },
      { ok: true, text: 'Team management dashboard' },
      { ok: true, text: 'Custom question sets' },
      { ok: true, text: 'Bulk user invitations' },
      { ok: true, text: 'Analytics & reporting' },
      { ok: true, text: 'Priority support + SLA' },
    ],
    cta: 'Contact Sales',
    ctaClass: 'btn-secondary',
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleCTA = (plan) => {
    if (plan.id === 'free') { router.push('/login'); return; }
    if (plan.id === 'enterprise') { alert('Contact us at sales@aivoiceagent.app'); return; }
    alert('Stripe checkout coming soon! (Demo mode)');
  };

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '64px 24px' }}>
          {/* Header */}
          <div className="text-center mb-48">
            <div className="badge badge-blue" style={{ margin: '0 auto 20px' }}>💳 Simple Pricing</div>
            <h1 className="section-title">Choose Your <span className="gradient-text">Plan</span></h1>
            <p className="section-sub" style={{ margin: '16px auto 32px' }}>
              Start free, upgrade when you need more power.
            </p>

            {/* Billing Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: yearly ? 'var(--t-muted)' : 'var(--t-primary)', fontWeight: 600 }}>Monthly</span>
              <div className={`toggle-switch ${yearly ? 'on' : ''}`} onClick={() => setYearly(!yearly)}>
                <div className="toggle-knob" />
              </div>
              <span style={{ fontSize: '14px', color: yearly ? 'var(--t-primary)' : 'var(--t-muted)', fontWeight: 600 }}>
                Yearly <span className="badge badge-green" style={{ marginLeft: '6px' }}>Save 37%</span>
              </span>
            </div>
          </div>

          {/* Plans */}
          <div className="pricing-grid" style={{ maxWidth: '960px', margin: '0 auto' }}>
            {PLANS.map((plan) => (
              <div key={plan.id} className={`pricing-card${plan.badge ? ' popular' : ''}`}>
                {plan.badge && <div className="popular-badge">⭐ {plan.badge}</div>}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{plan.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--t-muted)' }}>{plan.desc}</div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span className="price-amount gradient-text">
                    ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="price-period"> / month {yearly && plan.monthlyPrice > 0 ? <span className="badge badge-green" style={{ marginLeft: '6px' }}>billed yearly</span> : null}</span>
                </div>
                <ul className="features-list">
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <span className={f.ok ? 'feature-check' : 'feature-x'}>{f.ok ? '✓' : '✗'}</span>
                      <span style={{ color: f.ok ? 'var(--t-secondary)' : 'var(--t-muted)', textDecoration: f.ok ? 'none' : 'line-through' }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleCTA(plan)} className={`btn ${plan.ctaClass} btn-full`} style={{ padding: '14px', fontSize: '15px' }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className="text-center mt-32">
            <p style={{ fontSize: '14px', color: 'var(--t-muted)' }}>
              All plans include a 7-day free trial. Cancel anytime. No questions asked.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
