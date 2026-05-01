import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthContext';

const CATEGORIES = ['frontend','backend','fullstack','dsa','system-design','hr','behavioral','devops','data-science','product-manager'];
const DIFFICULTIES = ['easy','medium','hard'];
const DIFF_COLOR = { easy:'badge-green', medium:'badge-yellow', hard:'badge-red' };

const EMPTY_FORM = { text:'', category:'dsa', difficulty:'medium', tags:'', expectedAnswer:'', keywords:'', timeLimit:120 };

export default function AdminQuestions() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [fetching,  setFetching]  = useState(false);

  // Filters
  const [filterCat,  setFilterCat]  = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [filterQ,    setFilterQ]    = useState('');

  // Add / Edit form
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');

  // Bulk upload
  const [bulkJson,    setBulkJson]    = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult,  setBulkResult]  = useState('');

  // AI Generate
  const [genCat,     setGenCat]     = useState('dsa');
  const [genDiff,    setGenDiff]    = useState('medium');
  const [genCount,   setGenCount]   = useState(5);
  const [genTags,    setGenTags]    = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult,  setGenResult]  = useState('');

  // Access guard
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/dashboard');
  }, [user, loading, router]);

  const fetchQuestions = useCallback(async (p = page) => {
    setFetching(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (filterCat)  params.set('category',   filterCat);
      if (filterDiff) params.set('difficulty',  filterDiff);
      if (filterQ)    params.set('q',           filterQ);
      const r = await fetch(`/api/questions/admin?${params}`);
      const d = await r.json();
      if (r.ok) { setQuestions(d.questions); setTotal(d.total); setPages(d.pages); setPage(p); }
    } finally { setFetching(false); }
  }, [page, filterCat, filterDiff, filterQ]);

  useEffect(() => { if (user?.role === 'admin') fetchQuestions(1); }, [user, filterCat, filterDiff]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd  = () => { setEditId(null); setForm(EMPTY_FORM); setFormErr(''); setShowForm(true); };
  const openEdit = (q) => {
    setEditId(q._id);
    setForm({
      text:           q.text,
      category:       q.category,
      difficulty:     q.difficulty,
      tags:           (q.tags || []).join(', '),
      expectedAnswer: q.expectedAnswer || '',
      keywords:       (q.keywords || []).join(', '),
      timeLimit:      q.timeLimit || 120,
    });
    setFormErr('');
    setShowForm(true);
  };

  const saveQuestion = async () => {
    if (!form.text.trim()) { setFormErr('Question text is required.'); return; }
    setSaving(true); setFormErr('');
    const body = {
      ...form,
      tags:     form.tags.split(',').map(t => t.trim()).filter(Boolean),
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      timeLimit: Number(form.timeLimit),
    };
    const url    = editId ? `/api/questions/admin?id=${editId}` : '/api/questions/admin';
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setShowForm(false); fetchQuestions(1); }
    else setFormErr(d.error || 'Save failed.');
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Deactivate this question?')) return;
    await fetch(`/api/questions/admin?id=${id}`, { method: 'DELETE' });
    fetchQuestions(page);
  };

  const doBulkUpload = async () => {
    setBulkLoading(true); setBulkResult('');
    try {
      const parsed = JSON.parse(bulkJson);
      const r = await fetch('/api/questions/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ questions: parsed }),
      });
      const d = await r.json();
      setBulkResult(r.ok ? `✅ Inserted ${d.inserted} / ${d.total}` : `❌ ${d.error}`);
      if (r.ok) { setBulkJson(''); fetchQuestions(1); }
    } catch { setBulkResult('❌ Invalid JSON'); }
    setBulkLoading(false);
  };

  const doGenerate = async () => {
    setGenerating(true); setGenResult('');
    const tags = genTags.split(',').map(t => t.trim()).filter(Boolean);
    const r = await fetch('/api/questions/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ category: genCat, difficulty: genDiff, count: genCount, tags }),
    });
    const d = await r.json();
    setGenResult(r.ok ? `✅ Generated & saved ${d.generated} questions!` : `❌ ${d.error}`);
    if (r.ok) fetchQuestions(1);
    setGenerating(false);
  };

  if (loading || !user) return <div className="page-bg"><Navbar /><div className="loading-center mt-nav"><div className="spinner" /></div></div>;
  if (user.role !== 'admin') return null;

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '40px 24px', maxWidth: 1100 }}>

          {/* Header */}
          <div className="flex-between mb-32" style={{ flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>🛠 Question Bank Admin</h1>
              <p style={{ color:'var(--t-secondary)', fontSize:14 }}>{total} questions · Manage, add, and AI-generate questions</p>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchQuestions(1)}>🔄 Refresh</button>
              <button className="btn btn-primary" onClick={openAdd}>+ Add Question</button>
            </div>
          </div>

          {/* ── 3-column panels: Filters | Bulk Upload | AI Generate ── */}
          <div className="grid-3 mb-28" style={{ gap:16 }}>

            {/* Filters */}
            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🔍 Filter Questions</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <select className="input" value={filterCat} onChange={e => { setFilterCat(e.target.value); }}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                  <option value="">All Difficulties</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="input" placeholder="Search text…" value={filterQ} onChange={e => setFilterQ(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && fetchQuestions(1)} style={{ flex:1 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => fetchQuestions(1)}>Go</button>
                </div>
              </div>
            </div>

            {/* Bulk Upload */}
            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>📤 Bulk Upload (JSON)</h3>
              <p style={{ fontSize:12, color:'var(--t-muted)', marginBottom:10 }}>
                Paste a JSON array: [{'{'}text, category, difficulty, tags (pipe-separated), expectedAnswer, keywords, timeLimit{'}'}]
              </p>
              <textarea className="input" rows={4} placeholder='[{"text":"...","category":"dsa","difficulty":"easy",...}]'
                value={bulkJson} onChange={e => setBulkJson(e.target.value)} style={{ resize:'vertical', fontSize:12 }} />
              {bulkResult && <div style={{ fontSize:13, marginTop:8, color: bulkResult.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{bulkResult}</div>}
              <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={doBulkUpload} disabled={bulkLoading || !bulkJson.trim()}>
                {bulkLoading ? '⏳ Uploading…' : '📤 Upload'}
              </button>
            </div>

            {/* AI Generate */}
            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🤖 AI Generate Questions</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <select className="input" value={genCat} onChange={e => setGenCat(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" value={genDiff} onChange={e => setGenDiff(e.target.value)}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input className="input" type="number" min={1} max={20} value={genCount} onChange={e => setGenCount(e.target.value)} placeholder="Count (1-20)" />
                <input className="input" placeholder="Tags (comma-separated)" value={genTags} onChange={e => setGenTags(e.target.value)} />
              </div>
              {genResult && <div style={{ fontSize:13, marginTop:8, color: genResult.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{genResult}</div>}
              <button className="btn btn-primary btn-sm" style={{ marginTop:10, width:'100%' }} onClick={doGenerate} disabled={generating}>
                {generating ? '⏳ Generating…' : '🤖 Generate with AI'}
              </button>
            </div>
          </div>

          {/* ── Questions Table ── */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {fetching ? (
              <div className="loading-center" style={{ padding:48 }}><div className="spinner" /></div>
            ) : questions.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:'var(--t-muted)' }}>
                <p style={{ fontSize:32, marginBottom:12 }}>📭</p>
                <p>No questions found. Add some above or change filters.</p>
              </div>
            ) : (
              <table className="history-table" style={{ fontSize:13 }}>
                <thead>
                  <tr>
                    <th style={{ width:'35%' }}>Question</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Tags</th>
                    <th>⏱ Limit</th>
                    <th>Uses</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q._id}>
                      <td style={{ color:'var(--t-primary)', fontWeight:500, maxWidth:300 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.text}</div>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize:11 }}>{q.category}</span></td>
                      <td><span className={`badge ${DIFF_COLOR[q.difficulty]}`} style={{ fontSize:11 }}>{q.difficulty}</span></td>
                      <td style={{ color:'var(--t-muted)' }}>
                        {(q.tags || []).slice(0,3).join(', ')}{q.tags?.length > 3 ? '…' : ''}
                      </td>
                      <td style={{ color:'var(--t-muted)' }}>{q.timeLimit}s</td>
                      <td style={{ color:'var(--t-muted)' }}>{q.usageCount || 0}</td>
                      <td>
                        <span className={`badge ${q.isActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize:11 }}>
                          {q.isActive ? 'Active' : 'Off'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding:'4px 10px', fontSize:12 }} onClick={() => openEdit(q)}>✏️</button>
                          <button className="btn btn-sm" style={{ padding:'4px 10px', fontSize:12, background:'rgba(255,71,87,0.15)', color:'var(--danger)', border:'1px solid rgba(255,71,87,0.3)' }} onClick={() => deleteQuestion(q._id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => fetchQuestions(p)}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div className="card" style={{ width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', padding:32 }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontWeight:800, fontSize:18 }}>{editId ? '✏️ Edit Question' : '+ Add Question'}</h2>
              <button onClick={() => setShowForm(false)} style={{ fontSize:20, color:'var(--t-muted)', background:'none', border:'none', cursor:'pointer' }}>✕</button>
            </div>
            <div className="form-group">
              <div>
                <label className="label">Question Text *</label>
                <textarea className="input" rows={3} value={form.text} onChange={setF('text')} placeholder="Enter interview question…" style={{ resize:'vertical' }} />
              </div>
              <div className="grid-2" style={{ gap:12 }}>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" value={form.category} onChange={setF('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Difficulty *</label>
                  <select className="input" value={form.difficulty} onChange={setF('difficulty')}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input className="input" value={form.tags} onChange={setF('tags')} placeholder="arrays, recursion, react" />
              </div>
              <div>
                <label className="label">Expected Answer / Key Points</label>
                <textarea className="input" rows={3} value={form.expectedAnswer} onChange={setF('expectedAnswer')} placeholder="Key points or model answer…" style={{ resize:'vertical' }} />
              </div>
              <div>
                <label className="label">Evaluation Keywords (comma-separated)</label>
                <input className="input" value={form.keywords} onChange={setF('keywords')} placeholder="O(n), recursion, base case" />
              </div>
              <div>
                <label className="label">Time Limit (seconds)</label>
                <input className="input" type="number" value={form.timeLimit} onChange={setF('timeLimit')} min={30} max={600} />
              </div>
              {formErr && <div style={{ color:'var(--danger)', fontSize:13 }}>⚠️ {formErr}</div>}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
                <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveQuestion} disabled={saving}>
                  {saving ? '⏳ Saving…' : editId ? '💾 Update' : '+ Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
