import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { useAuth } from '../components/AuthContext';
import supabase from '../lib/supabase';

const SKILL_OPTIONS = ['JavaScript', 'React', 'Node.js', 'Python', 'TypeScript', 'AWS', 'Docker', 'SQL', 'GraphQL', 'Kubernetes', 'Machine Learning', 'System Design', 'Product Management', 'Leadership'];

export default function Profile() {
  const { user, loading, updateProfile, updatePassword, logout } = useAuth();
  const router = useRouter();

  const [form, setForm]     = useState({ name: user?.name || '', bio: user?.bio || '', skills: user?.skills || [] });
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErr, setPwErr]   = useState('');
  const [pwOk, setPwOk]     = useState(false);
  const [savMsg, setSavMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  if (!loading && !user) { router.replace('/login'); return null; }
  if (loading || !user) return <div className="page-bg"><Navbar /><div className="loading-center mt-nav"><div className="spinner" /></div></div>;

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleSkill = s => setForm(f => ({
    ...f,
    skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s],
  }));

  const saveProfile = async () => {
    setSaving(true); setSavMsg('');
    const result = await updateProfile({ full_name: form.name, bio: form.bio, skills: form.skills });
    setSavMsg(result?.success ? '✅ Profile saved!' : `❌ ${result?.error}`);
    setSaving(false);
    setTimeout(() => setSavMsg(''), 3000);
  };

  const handleAvatar = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setSavMsg('❌ Image must be under 2 MB.'); return; }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl });
      setSavMsg('✅ Avatar updated!');
    } catch (err) {
      setSavMsg(`❌ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setSavMsg(''), 3000);
    }
  };

  const savePassword = async () => {
    setPwErr(''); setPwOk(false);
    if (pwForm.newPw.length < 6) { setPwErr('Password must be at least 6 characters.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwErr('Passwords do not match.'); return; }
    const res = await updatePassword(pwForm.newPw);
    if (res?.success) { setPwOk(true); setPwForm({ current: '', newPw: '', confirm: '' }); }
    else setPwErr(res?.error || 'Failed to update password.');
  };

  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="mt-nav">
        <div className="container" style={{ padding: '48px 24px', maxWidth: 720 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>My Profile</h1>
          <p style={{ color: 'var(--t-secondary)', fontSize: 14, marginBottom: 36 }}>
            Manage your account settings, skills, and preferences.
          </p>

          {/* ── Avatar + Basic Info ── */}
          <div className="card mb-24" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Personal Information</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--g-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', position: 'relative', overflow: 'hidden', flexShrink: 0 }}
                title="Click to change photo"
              >
                {user.avatar ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.avatarInitial}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  {uploading ? '⏳' : '📷'}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{user.name}</div>
                <div style={{ color: 'var(--t-muted)', fontSize: 13 }}>{user.email}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <span className={`badge ${user.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{user.role}</span>
                  <span className={`badge ${user.plan === 'pro' ? 'badge-blue' : 'badge-green'}`}>{user.plan} plan</span>
                  <span className={`badge ${user.emailVerified ? 'badge-green' : 'badge-yellow'}`}>{user.emailVerified ? '✓ verified' : '⚡ unverified'}</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div>
                <label className="label">Display Name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Your full name" />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea className="input" rows={3} value={form.bio} onChange={set('bio')} placeholder="A short description about yourself…" style={{ resize: 'vertical' }} />
              </div>
            </div>

            {savMsg && (
              <div style={{ fontSize: 13, color: savMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', marginBottom: 12 }}>
                {savMsg}
              </div>
            )}
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '💾 Save Profile'}
            </button>
          </div>

          {/* ── Skills ── */}
          <div className="card mb-24" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Skills &amp; Expertise</h2>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 18 }}>Select skills to personalize your interview experience.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {SKILL_OPTIONS.map(skill => (
                <button key={skill} type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`badge ${form.skills.includes(skill) ? 'badge-blue' : ''}`}
                  style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 13, background: form.skills.includes(skill) ? undefined : 'var(--surface)', border: `1px solid ${form.skills.includes(skill) ? 'transparent' : 'var(--border)'}` }}>
                  {skill}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? '…' : '💾 Save Skills'}
            </button>
          </div>

          {/* ── Change Password ── */}
          {!user.isDemo && (
            <div className="card mb-24" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Change Password</h2>
              <div className="form-group">
                <div>
                  <label className="label">New Password</label>
                  <input className="input" type="password" placeholder="Min. 6 characters"
                    value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input className="input" type="password" placeholder="Repeat password"
                    value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
                </div>
                {pwErr && <div style={{ color: 'var(--danger)', fontSize: 13 }}>⚠️ {pwErr}</div>}
                {pwOk  && <div style={{ color: 'var(--success)', fontSize: 13 }}>✅ Password updated!</div>}
                <button className="btn btn-secondary" onClick={savePassword} style={{ alignSelf: 'flex-start' }}>
                  🔒 Update Password
                </button>
              </div>
            </div>
          )}

          {/* ── Danger Zone ── */}
          <div className="card" style={{ padding: 28, border: '1px solid rgba(255,71,87,0.3)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--danger)' }}>⚠️ Danger Zone</h2>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 18 }}>
              Signing out will end your current session. All your data remains saved.
            </p>
            <button className="btn btn-danger" onClick={() => { logout(); router.push('/'); }} style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--danger)', border: '1px solid rgba(255,71,87,0.3)' }}>
              🚪 Sign Out
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
