let EXA_API_KEY = '<YOUR_API_KEY>';

export async function fetchExaLinks(text, articleTitle) {
  console.log('Sending request to EXA API');
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': EXA_API_KEY,
    },
    // https://docs.exa.ai/reference/search
    body: JSON.stringify({
      query: `useful links to learn more about "${text}" in the context of "${articleTitle}"`,
      type: 'neural',
      useAutoprompt: true,
      numResults: 5,
      //  contents: {
      //    text: true,
      //  },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('EXA API response received:', data);

  if (data.results && Array.isArray(data.results)) {
    const markdownLinks = data.results
      .map((result) => {
        let title = result.title.trim();
        if (!title) {
          const urlObj = new URL(result.url);
          title = urlObj.hostname;
        }
        // Trim long titles
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        return `- [${title}](${result.url})`;
      })
      .join('\n');
    return `\n\n#### Links:\n${markdownLinks}`;
  } else {
    throw new Error('Unexpected response format from EXA API');
  }
}
