// Mock questions per category — used when OpenAI is not configured
const MOCK_QUESTIONS = {
  frontend: [
    'Explain the difference between let, const, and var in JavaScript. When would you use each?',
    'What is the virtual DOM and how does React use it to optimize rendering performance?',
    'How does CSS specificity work? Walk me through how the browser resolves styling conflicts.',
    'What are React hooks? Name three of them and explain their practical use cases.',
    'What is the difference between synchronous and asynchronous JavaScript? How do Promises and async/await help?',
  ],
  backend: [
    'What are the key principles of RESTful API design? What makes an API truly RESTful?',
    'Explain database indexing. When should you use it, and what are the trade-offs?',
    'Compare SQL and NoSQL databases. When would you choose one over the other?',
    'How would you design a rate limiting system for a high-traffic public API?',
    'What is a microservices architecture? What are its main advantages and disadvantages over a monolith?',
  ],
  fullstack: [
    'Describe your preferred full-stack tech stack and explain why you chose each component.',
    'How do you handle authentication and authorization in a modern web application?',
    'Explain CI/CD. How would you set up a CI/CD pipeline for a full-stack app from scratch?',
    'How do you approach performance optimization — both on the frontend and the backend?',
    'What are WebSockets and when would you use them over standard HTTP requests?',
  ],
  'system-design': [
    'How would you design a URL shortener like bit.ly that handles millions of requests per day?',
    'Design a real-time chat application that can scale to 10 million concurrent users.',
    'How would you design a feed ranking algorithm for a social media platform like Twitter?',
    'Design a distributed caching layer. What eviction strategies would you use and why?',
    'How would you architect a fraud detection system for a payment processing platform?',
  ],
  'data-science': [
    'Explain the difference between supervised and unsupervised learning with examples.',
    'What is overfitting, and what techniques do you use to prevent it?',
    'Explain gradient descent. How do variants like Adam or RMSprop improve upon it?',
    'What metrics would you use to evaluate a classification model on an imbalanced dataset?',
    'Explain the bias-variance tradeoff. How do you decide where to balance model complexity?',
  ],
  'product-manager': [
    'How do you prioritize features on a product roadmap when you have more ideas than capacity?',
    'Walk me through how you would design and launch a product for a brand-new market.',
    'How do you define and measure the success of a product feature after launch?',
    'Tell me about a time you had to align engineering and business stakeholders on a difficult trade-off.',
    'Describe a product you genuinely admire. Why does it work so well?',
  ],
  behavioral: [
    'Tell me about a time you had to deal with a difficult team member. How did you handle it?',
    'Describe a project where you had to learn a completely new technology under a tight deadline.',
    'Tell me about a significant professional failure. What did you learn from it?',
    'Describe a situation where you had to make an important decision with incomplete information.',
    'What is your greatest professional achievement so far, and why does it matter to you?',
  ],
  devops: [
    'What is Infrastructure as Code? What tools have you used and what are the benefits?',
    'Explain the difference between Docker and Kubernetes. When do you need both?',
    'How would you set up comprehensive monitoring and alerting for a production microservices system?',
    'Explain blue-green deployment. How does it differ from canary releases?',
    'How do you ensure high availability and fault tolerance in a distributed cloud system?',
  ],
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { category = 'behavioral' } = req.query;

  // Try OpenAI if configured
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openaiKey });

      const systemPrompt = `You are an expert technical interviewer. Generate exactly 5 interview questions for the "${category}" track. Return ONLY a JSON array of 5 strings — no markdown, no keys, just the array.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.8,
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content.trim();
      const questions = JSON.parse(content);
      return res.status(200).json({ questions, source: 'openai' });
    } catch (err) {
      console.error('OpenAI question generation failed:', err.message);
      // Fall through to mock
    }
  }

  // Demo / fallback
  const questions = MOCK_QUESTIONS[category] || MOCK_QUESTIONS.behavioral;
  // Shuffle for variety
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return res.status(200).json({ questions: shuffled, source: 'demo' });
}
