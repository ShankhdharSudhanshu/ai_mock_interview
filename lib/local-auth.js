/**
 * local-auth.js
 * ─────────────
 * A fully self-contained authentication engine backed by localStorage.
 * Mirrors the Supabase auth interface so lib/supabase.js can use it as a
 * drop-in when no Supabase credentials are configured.
 *
 * Passwords are hashed with SHA-256 via the Web Crypto API (async, secure).
 * Sessions persist in localStorage across page refreshes.
 *
 * Storage keys:
 *   vp-la-users   → array of user records
 *   vp-la-session → current session { user, token }
 */

const USERS_KEY   = 'vp-la-users';
const SESSION_KEY = 'vp-la-session';

// ── Helpers ────────────────────────────────────────────────────────────────

function isClient() {
  return typeof window !== 'undefined';
}

async function sha256(str) {
  if (!isClient()) return str; // SSR fallback (never used for auth ops)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  if (!isClient()) return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}

function saveUsers(users) {
  if (!isClient()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  if (!isClient()) return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

function saveSession(session) {
  if (!isClient()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  if (!isClient()) return;
  localStorage.removeItem(SESSION_KEY);
}

/** Build a Supabase-compatible user object */
function makeUser(record) {
  return {
    id:                   record.id,
    email:                record.email,
    email_confirmed_at:   record.createdAt,
    user_metadata: {
      full_name: record.name,
      role:      record.role || 'candidate',
    },
    app_metadata: {},
    created_at:   record.createdAt,
  };
}

// ── Public API (mirrors supabase.auth.*) ───────────────────────────────────

/** Sign up with email + password (+ optional name in options.data.full_name) */
export async function localSignUp({ email, password, options = {} }) {
  const users = getUsers();
  const norm  = email.trim().toLowerCase();

  if (users.find(u => u.email === norm)) {
    return { data: null, error: { message: 'Email already registered. Try signing in.' } };
  }
  if (!password || password.length < 6) {
    return { data: null, error: { message: 'Password must be at least 6 characters.' } };
  }

  const hash = await sha256(password + '_vp_' + norm);
  const record = {
    id:        'local-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    email:     norm,
    name:      options.data?.full_name || norm.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    role:      options.data?.role || 'candidate',
    hash,
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  saveUsers(users);

  const supaUser = makeUser(record);
  const session  = { access_token: 'local-' + Date.now(), user: supaUser };
  saveSession(session);

  return { data: { user: supaUser, session }, error: null };
}

/** Sign in with email + password */
export async function localSignInWithPassword({ email, password }) {
  const users = getUsers();
  const norm  = email.trim().toLowerCase();
  const user  = users.find(u => u.email === norm);

  if (!user) {
    return { data: null, error: { message: 'No account found with that email. Please sign up first.' } };
  }

  const hash = await sha256(password + '_vp_' + norm);
  if (hash !== user.hash) {
    return { data: null, error: { message: 'Incorrect password.' } };
  }

  const supaUser = makeUser(user);
  const session  = { access_token: 'local-' + Date.now(), user: supaUser };
  saveSession(session);

  return { data: { user: supaUser, session }, error: null };
}

/** Sign out — clear session */
export function localSignOut() {
  clearSession();
  return { error: null };
}

/** Get current session */
export function localGetSession() {
  const session = getSession();
  return { data: { session }, error: null };
}

/** Update a user's password */
export async function localUpdatePassword(newPassword) {
  const session = getSession();
  if (!session?.user) return { error: { message: 'Not signed in.' } };

  const users = getUsers();
  const idx   = users.findIndex(u => u.id === session.user.id);
  if (idx === -1) return { error: { message: 'User not found.' } };

  users[idx].hash = await sha256(newPassword + '_vp_' + users[idx].email);
  saveUsers(users);
  return { data: { user: makeUser(users[idx]) }, error: null };
}

/**
 * Minimal onAuthStateChange shim.
 * Fires the callback once (SIGNED_IN or SIGNED_OUT) and returns an unsubscribe handle.
 */
export function localOnAuthStateChange(callback) {
  const session = getSession();
  // Fire async so the caller can capture the subscription object first
  setTimeout(() => {
    callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  }, 0);
  return { data: { subscription: { unsubscribe: () => {} } } };
}
