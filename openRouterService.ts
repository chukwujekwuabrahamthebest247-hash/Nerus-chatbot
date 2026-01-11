
import { OpenRouterModel } from '../types';

export const openRouterService = {
  async getModels(apiKey: string): Promise<OpenRouterModel[]> {
    if (!apiKey) return [];
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Nexus AI Pro'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.data.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        pricing: m.pricing
      }));
    } catch (e) {
      console.error('Failed to fetch OpenRouter models', e);
      return [];
    }
  },

  async chatStream(
    apiKey: string,
    modelId: string,
    messages: { role: string; content: string }[],
    onChunk: (text: string) => void
  ) {
    // Trim modelId and ensure it's valid
    const activeModel = modelId.trim();
    if (!activeModel) {
      throw new Error('No OpenRouter model ID specified. Please enter a model in Settings.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Nexus AI Pro'
      },
      body: JSON.stringify({
        model: activeModel,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      let errorMessage = 'Failed to connect to OpenRouter';
      try {
        const errorData = await response.json();
        console.error('OpenRouter Error Response:', errorData);
        // Extract the most specific error message possible
        errorMessage = errorData.error?.message || errorData.error?.metadata?.raw || JSON.stringify(errorData.error) || errorMessage;
      } catch (e) {
        console.error('Could not parse error response JSON', e);
      }
      throw new Error(`OpenRouter Error: ${errorMessage}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is not readable');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanedLine = line.replace(/^data: /, '').trim();
        if (cleanedLine === '' || cleanedLine === '[DONE]') continue;

        try {
          // OpenRouter chunks sometimes contain multiple JSON objects in one line
          const parsed = JSON.parse(cleanedLine);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) onChunk(content);
        } catch (e) {
          // Ignore parse errors for incomplete or non-JSON chunks
          console.debug('Skip non-JSON chunk:', cleanedLine);
        }
      }
    }
  }
};
