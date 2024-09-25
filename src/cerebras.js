const CEREBRAS_API_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
let CEREBRAS_API_KEY = '<YOUR_API_KEY>';

export async function fetchCerebrasExplanation(text, pageTitle) {
  console.log('Sending request to Cerebras API');
  const response = await fetch(CEREBRAS_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama3.1-70b',
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant that explains complex concepts in simple words.',
        },
        {
          role: 'user',
          content: `Explain "${text}" in the context of the webpage titled "${pageTitle}" in under 100 words in bullet points. Use markdown for formatting. Don't include any headers. Don't ask further questions.`,
        },
      ],
      temperature: 0,
      max_tokens: -1,
      seed: 0,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('Cerebras API response received:', data);

  if (data.choices && data.choices[0].message.content) {
    return data.choices[0].message.content;
  } else {
    throw new Error('Unexpected response format from Cerebras API');
  }
}
