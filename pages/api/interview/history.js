import supabase from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('id, category, score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.status(200).json({ history: data || [], source: 'supabase' });
  } catch {
    return res.status(200).json({ history: [], source: 'demo', note: 'Load from localStorage on client' });
  }
}
