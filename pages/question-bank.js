import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { SEED_QUESTIONS, CATEGORY_DESCRIPTIONS } from '../lib/questionBank';

// ── Constants ─────────────────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: 'var(--success)',  bg: 'rgba(0,217,126,0.12)' },
  medium: { label: 'Medium', color: 'var(--warning)',  bg: 'rgba(255,184,0,0.12)' },
  hard:   { label: 'Hard',   color: 'var(--danger)',   bg: 'rgba(255,71,87,0.12)' },
};

const ALL_CATEGORIES = Object.entries(CATEGORY_DESCRIPTIONS).map(([key, val]) => ({
  key, ...val,
}));

// ── Helpers ────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getQuestions(category, difficulty, searchTerm) {
  return SEED_QUESTIONS.filter(q => {
    if (category !== 'all' && q.category !== category) return false;
    if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
    if (searchTerm) {
      const q2 = searchTerm.toLowerCase();
      return q.text.toLowerCase().includes(q2) ||
             q.tags?.some(t => t.includes(q2)) ||
             q.expectedAnswer?.toLowerCase().includes(q2);
    }
    return true;
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

function TagPill({ tag }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 500, color: 'var(--accent-h)',
      background: 'rgba(79,114,255,0.12)', letterSpacing: 0.2,
    }}>
      {tag}
    </span>
  );
}

function QuestionCard({ question, index, isSelected, onToggle, onStartInterview }) {
  const [expanded, setExpanded] = useState(false);
  const catInfo = CATEGORY_DESCRIPTIONS[question.category] || { icon: '❓', title: question.category };
  const mins = Math.round(question.timeLimit / 60);

  return (
    <div
      className="qb-question-card"
      style={{
        background: isSelected ? 'rgba(79,114,255,0.08)' : 'var(--bg-card)',
        border: `1px solid ${isSelected ? 'rgba(79,114,255,0.5)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        transition: 'all 0.2s var(--ease)',
        overflow: 'hidden',
      }}
    >
      {/* Card Header */}
      <div
        style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Select checkbox */}
        <div
          role="checkbox"
          aria-checked={isSelected}
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onToggle(question); }}
          onKeyDown={e => e.key === ' ' && (e.preventDefault(), onToggle(question))}
          style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 3,
            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
            background: isSelected ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {isSelected && <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>✓</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>
              {catInfo.icon} {catInfo.title}
            </span>
            <span style={{ color: 'var(--border)', fontSize: 12 }}>•</span>
            <DifficultyBadge difficulty={question.difficulty} />
            <span style={{ color: 'var(--border)', fontSize: 12 }}>•</span>
            <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>⏱ {mins}m</span>
          </div>

          {/* Question text */}
          <p style={{
            fontSize: 15, fontWeight: 600, lineHeight: 1.55,
            color: 'var(--t-primary)', marginBottom: 10,
          }}>
            {question.text}
          </p>

          {/* Tags */}
          {question.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {question.tags.map(t => <TagPill key={t} tag={t} />)}
            </div>
          )}
        </div>

        {/* Expand chevron */}
        <div style={{
          flexShrink: 0, fontSize: 14, color: 'var(--t-muted)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>
          ▾
        </div>
      </div>

      {/* Expanded answer preview */}
      {expanded && (
        <div style={{
          padding: '0 20px 20px',
          borderTop: '1px solid var(--border)',
          paddingTop: 16,
          animation: 'fadeInUp 0.2s var(--ease)',
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-h)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              📖 Model Answer
            </div>
            <p style={{ fontSize: 14, color: 'var(--t-secondary)', lineHeight: 1.7 }}>
              {question.expectedAnswer || 'Answer guidance not available.'}
            </p>
          </div>

          {question.keywords?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                🔑 Key Terms
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {question.keywords.map(k => (
                  <span key={k} style={{
                    padding: '2px 8px', borderRadius: 999,
                    fontSize: 11, fontWeight: 500,
                    color: 'var(--success)', background: 'rgba(0,217,126,0.1)',
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); onStartInterview(question); }}
            >
              🎙️ Practice This
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); onToggle(question); }}
            >
              {isSelected ? '☑ Selected' : '+ Add to Session'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function QuestionBankPage() {
  const router = useRouter();

  // Prevent SSR/client hydration mismatch with emoji + Math.random
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Filters
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDifficulty, setActiveDifficulty] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default | difficulty | time

  // Selection
  const [selected, setSelected] = useState([]);
  const [showSelectionBar, setShowSelectionBar] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  // Stats per category (computed once)
  const [catStats] = useState(() => {
    const stats = {};
    SEED_QUESTIONS.forEach(q => {
      stats[q.category] = (stats[q.category] || 0) + 1;
    });
    return stats;
  });

  // Filtered + sorted questions — only shuffle after mount to avoid SSR/client mismatch
  const filtered = useCallback(() => {
    let qs = getQuestions(activeCategory, activeDifficulty, searchTerm);
    if (!mounted || sortBy === 'difficulty') {
      const order = { easy: 0, medium: 1, hard: 2 };
      qs = [...qs].sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    } else if (sortBy === 'time') {
      qs = [...qs].sort((a, b) => a.timeLimit - b.timeLimit);
    } else {
      qs = shuffle(qs);
    }
    return qs;
  }, [activeCategory, activeDifficulty, searchTerm, sortBy, mounted]);

  const allFiltered = filtered();
  const totalPages = Math.ceil(allFiltered.length / PER_PAGE);
  const pageQuestions = allFiltered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, activeDifficulty, searchTerm, sortBy]);

  // Show floating bar when something selected
  useEffect(() => { setShowSelectionBar(selected.length > 0); }, [selected]);

  function handleToggle(question) {
    setSelected(prev => {
      const isIn = prev.some(q => q.text === question.text);
      return isIn ? prev.filter(q => q.text !== question.text) : [...prev, question];
    });
  }

  function handleSelectAll() {
    const newOnes = pageQuestions.filter(q => !selected.some(s => s.text === q.text));
    if (newOnes.length > 0) {
      setSelected(prev => [...prev, ...newOnes]);
    } else {
      // Deselect all on current page
      setSelected(prev => prev.filter(s => !pageQuestions.some(p => p.text === s.text)));
    }
  }

  function handleClearSelection() { setSelected([]); }

  function handleStartSessionWithSelected() {
    if (selected.length === 0) return;
    // Navigate to interview with first question's category
    const cat = selected[0].category;
    router.push(`/interview/${cat}?count=${selected.length}`);
  }

  function handlePracticeOne(question) {
    router.push(`/interview/${question.category}?count=5`);
  }

  // Counts
  const easyCount   = SEED_QUESTIONS.filter(q => q.difficulty === 'easy').length;
  const mediumCount = SEED_QUESTIONS.filter(q => q.difficulty === 'medium').length;
  const hardCount   = SEED_QUESTIONS.filter(q => q.difficulty === 'hard').length;
  const allPageSelected = pageQuestions.length > 0 && pageQuestions.every(q => selected.some(s => s.text === q.text));

  // Show loading skeleton before mount to prevent hydration warnings
  if (!mounted) {
    return (
      <div className="page-bg" style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ paddingTop: 'var(--nav-h)', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="spinner" />
            <div style={{ fontSize: 14, color: 'var(--t-muted)' }}>Loading question bank…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ paddingTop: 'var(--nav-h)' }}>
        {/* ── HERO HEADER ── */}
        <section style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '48px 0 36px' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
              <div>
                <div className="badge badge-blue mb-16" style={{ marginBottom: 12 }}>📚 Question Bank</div>
                <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>
                  Browse <span className="gradient-text">Interview Questions</span>
                </h1>
                <p style={{ fontSize: 15, color: 'var(--t-secondary)', maxWidth: 540 }}>
                  {SEED_QUESTIONS.length} curated interview questions across {ALL_CATEGORIES.length} categories. Filter, preview answers, and start a practice session.
                </p>
              </div>

              {/* Quick stats */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total', value: SEED_QUESTIONS.length, color: 'var(--accent-h)' },
                  { label: 'Easy',   value: easyCount,   color: 'var(--success)' },
                  { label: 'Medium', value: mediumCount, color: 'var(--warning)' },
                  { label: 'Hard',   value: hardCount,   color: 'var(--danger)' },
                ].map(s => (
                  <div key={s.label} style={{
                    textAlign: 'center', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                    padding: '14px 20px', minWidth: 70,
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="container" style={{ padding: '32px 24px 80px' }}>
          {/* ── CATEGORY PILLS ── */}
          <div style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginRight: 4 }}>Category:</span>
            {[{ key: 'all', icon: '🔍', title: 'All' }, ...ALL_CATEGORIES].map(cat => {
              const count = cat.key === 'all' ? SEED_QUESTIONS.length : (catStats[cat.key] || 0);
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  id={`cat-${cat.key}`}
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive ? 'rgba(79,114,255,0.12)' : 'var(--bg-card)',
                    color: isActive ? 'var(--accent-h)' : 'var(--t-secondary)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                  {count > 0 && (
                    <span style={{
                      background: isActive ? 'rgba(79,114,255,0.2)' : 'var(--bg-secondary)',
                      borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                      color: isActive ? 'var(--accent-h)' : 'var(--t-muted)',
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── FILTER + SEARCH BAR ── */}
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 24,
          }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--t-muted)', pointerEvents: 'none' }}>🔎</span>
              <input
                id="search-questions"
                type="text"
                className="input"
                placeholder="Search questions, tags, keywords..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 36, height: 38, fontSize: 14 }}
              />
            </div>

            {/* Difficulty filter */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--t-muted)', fontWeight: 600 }}>Difficulty:</span>
              {['all', 'easy', 'medium', 'hard'].map(d => {
                const isA = activeDifficulty === d;
                const cfg = d !== 'all' ? DIFFICULTY_CONFIG[d] : null;
                return (
                  <button
                    key={d}
                    id={`diff-${d}`}
                    onClick={() => setActiveDifficulty(d)}
                    style={{
                      padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${isA ? (cfg?.color || 'var(--accent)') : 'var(--border)'}`,
                      background: isA ? (cfg?.bg || 'rgba(79,114,255,0.1)') : 'transparent',
                      color: isA ? (cfg?.color || 'var(--accent-h)') : 'var(--t-muted)',
                      transition: 'all 0.15s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {d === 'all' ? 'All' : d}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <select
              id="sort-questions"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', color: 'var(--t-secondary)',
                padding: '6px 12px', fontSize: 13, cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="default">Sort: Random</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="time">Sort: Time Limit</option>
            </select>
          </div>

          {/* ── RESULTS HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--t-muted)' }}>
              Showing <span style={{ color: 'var(--t-primary)', fontWeight: 700 }}>{allFiltered.length}</span> question{allFiltered.length !== 1 ? 's' : ''}
              {activeCategory !== 'all' && ` in ${CATEGORY_DESCRIPTIONS[activeCategory]?.title || activeCategory}`}
              {activeDifficulty !== 'all' && ` · ${activeDifficulty}`}
              {searchTerm && ` · matching "${searchTerm}"`}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {selected.length > 0 && (
                <span style={{ fontSize: 13, color: 'var(--accent-h)', fontWeight: 600 }}>
                  {selected.length} selected
                </span>
              )}
              <button
                id="select-all-btn"
                className="btn btn-ghost btn-sm"
                onClick={handleSelectAll}
              >
                {allPageSelected ? '☐ Deselect Page' : '☑ Select Page'}
              </button>
              {selected.length > 0 && (
                <button id="clear-selection" className="btn btn-ghost btn-sm" onClick={handleClearSelection}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* ── QUESTION LIST ── */}
          {pageQuestions.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 24px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No questions found</div>
              <div style={{ fontSize: 14, color: 'var(--t-secondary)', marginBottom: 24 }}>
                Try adjusting your category, difficulty, or search term.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => { setActiveCategory('all'); setActiveDifficulty('all'); setSearchTerm(''); }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pageQuestions.map((q, i) => (
                <QuestionCard
                  key={`${q.category}-${q.text.slice(0,30)}-${i}`}
                  question={q}
                  index={(page - 1) * PER_PAGE + i + 1}
                  isSelected={selected.some(s => s.text === q.text)}
                  onToggle={handleToggle}
                  onStartInterview={handlePracticeOne}
                />
              ))}
            </div>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 36 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) => p === '...' ? (
                  <span key={`ellipsis-${idx}`} style={{ color: 'var(--t-muted)', fontSize: 13, padding: '0 4px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 36, height: 36, borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${p === page ? 'var(--accent)' : 'var(--border)'}`,
                      background: p === page ? 'rgba(79,114,255,0.15)' : 'var(--bg-card)',
                      color: p === page ? 'var(--accent-h)' : 'var(--t-secondary)',
                    }}
                  >
                    {p}
                  </button>
                ))
              }

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FLOATING SELECTION ACTION BAR ── */}
      {showSelectionBar && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid rgba(79,114,255,0.4)',
          borderRadius: 999, padding: '12px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(79,114,255,0.2)',
          animation: 'slideUp 0.3s var(--ease)',
          zIndex: 500, whiteSpace: 'nowrap',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: 'var(--g-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'white',
            }}>
              {selected.length}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-secondary)' }}>
              question{selected.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              id="start-session-btn"
              className="btn btn-primary btn-sm"
              onClick={handleStartSessionWithSelected}
            >
              🎙️ Start Practice Session
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClearSelection}
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
