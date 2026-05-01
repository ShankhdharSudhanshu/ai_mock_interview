// Legacy endpoint — proxies to /api/interview/generate
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { default: generateHandler } = await import('./interview/generate');
  return generateHandler(req, res);
}