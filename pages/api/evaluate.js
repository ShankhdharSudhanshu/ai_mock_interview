// Legacy endpoint — proxies to /api/interview/evaluate
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { default: evaluateHandler } = await import('./interview/evaluate');
  return evaluateHandler(req, res);
}