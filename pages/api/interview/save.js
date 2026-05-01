import supabase from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const { session } = body;
  if (!session) return res.status(400).json({ error: 'Session data required' });

  // Try Supabase save
  try {
    const { error } = await supabase.from('interviews').insert([{
      id: session.id,
      user_id: session.userId,
      category: session.category,
      score: session.score,
      answers: JSON.stringify(session.answers),
      created_at: new Date().toISOString(),
    }]);
    if (error) throw error;
    return res.status(200).json({ success: true, source: 'supabase' });
  } catch (err) {
    // Demo mode — data is stored on client already
    return res.status(200).json({ success: true, source: 'demo', note: 'Saved to localStorage (demo mode)' });
  }
}
