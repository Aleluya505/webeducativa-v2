export default async function handler(req, res) {
  // Solo acepta POST
  if (req.method !== 'POST') return res.status(405).end();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,  // ← variable de entorno, nunca expuesta
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', // Haiku es más rápido y barato para trivia
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generá una pregunta de trivia sobre tecnología, inteligencia artificial, robótica o informática, orientada a estudiantes secundarios de Argentina. Respondé SOLO con un JSON válido, sin markdown ni backticks, con esta estructura exacta: {"pregunta": "...","opciones": ["A) ...","B) ...","C) ...","D) ..."],"correcta": 0,"explicacion": "..."} El campo "correcta" es el índice (0-3) de la opción correcta.`
      }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text.trim();

  try {
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch {
    res.status(500).json({ error: 'Respuesta inválida de la IA' });
  }
}
```

---

**2. Agregá tu API key en Vercel:**

En el dashboard de Vercel → tu proyecto → **Settings → Environment Variables**:
```
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxx