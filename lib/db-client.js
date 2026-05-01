/**
 * Client-side helper for MongoDB API routes.
 * All functions gracefully skip if MongoDB isn't configured (returns null).
 */

async function dbFetch(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (data.skipped) return null;      // MongoDB not configured — skip silently
    if (!res.ok) console.warn(`db ${path}:`, data.error);
    return data;
  } catch (err) {
    console.warn(`db ${path} failed:`, err.message);
    return null;
  }
}

/** Sync Supabase auth user  → MongoDB User document (call after login) */
export async function syncUser(userData = {}) {
  return dbFetch('/api/db/sync-user', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Save a completed interview to MongoDB.
 * @param {Object} session - { sessionId, category, score, answers, source }
 */
export async function saveInterviewToDB(session) {
  return dbFetch('/api/db/interviews', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

/** Fetch paginated interview history */
export async function fetchInterviewHistory({ page = 1, limit = 20, category } = {}) {
  const params = new URLSearchParams({ page, limit, ...(category ? { category } : {}) });
  return dbFetch(`/api/db/interviews?${params}`);
}

/** Fetch a single interview session by sessionId */
export async function fetchInterviewById(id) {
  return dbFetch(`/api/db/interviews?id=${encodeURIComponent(id)}`);
}

/** Fetch current user's score aggregates */
export async function fetchMyScores() {
  return dbFetch('/api/db/scores');
}

/** Fetch leaderboard */
export async function fetchLeaderboard(top = 10) {
  return dbFetch(`/api/db/scores?top=${top}`);
}

/** Fetch MongoDB user document */
export async function fetchMyUser() {
  return dbFetch('/api/db/user');
}

/** Update MongoDB user profile */
export async function updateUserInDB(updates) {
  return dbFetch('/api/db/user', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}
