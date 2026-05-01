import supabase from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid body' }); }

  const { overallRating, aiQualityRating, track, message, recommend, name, email, userId } = body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  try {
    const { error } = await supabase.from('feedback').insert([{
      user_id: userId || null,
      overall_rating: overallRating || null,
      ai_quality_rating: aiQualityRating || null,
      track: track || null,
      message: message.trim(),
      recommend: recommend || null,
      name: name || null,
      email: email || null,
      created_at: new Date().toISOString(),
    }]);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    // Non-critical — just log and succeed (client saved to localStorage)
    console.warn('Feedback DB save failed:', err?.message);
    return res.status(200).json({ success: true, note: 'saved locally' });
  }
}
