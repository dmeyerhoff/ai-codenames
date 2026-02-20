const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey(): string {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key || key === 'your-openrouter-api-key-here') {
    throw new Error('Please set VITE_OPENROUTER_API_KEY in your .env file');
  }
  return key;
}

export async function callOpenRouter(
  model: string,
  prompt: string,
  onChunk?: (text: string) => void,
  systemPrompt?: string,
): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Codenames',
    },
    body: JSON.stringify({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }],
      stream: !!onChunk,
      max_tokens: 1024,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  if (!onChunk) {
    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Streaming
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(fullText);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return fullText;
}
