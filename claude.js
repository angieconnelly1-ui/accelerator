exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { system, prompt } = body;
  if (!system || !prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing system or prompt.' }) };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system }]
        },
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.7
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data?.error?.message || 'Gemini API error' })
      };
    }

    // Normalize Gemini response to match the shape the frontend expects:
    // { content: [{ text: "..." }] }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ text }] })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
