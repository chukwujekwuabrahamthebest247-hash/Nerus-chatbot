
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async chatStream(
    messages: { role: string; content: string; parts?: any[] }[],
    config: {
      model?: string;
      systemInstruction?: string;
      useSearch?: boolean;
      thinkingBudget?: number;
      temperature?: number;
    }
  ) {
    const ai = getAI();
    const model = config.model || 'gemini-3-pro-preview';

    const tools: any[] = [];
    if (config.useSearch) {
      tools.push({ googleSearch: {} });
    }

    const contents = messages.map(m => {
      const parts = m.parts || [{ text: m.content || "Analyze the provided input." }];
      // Ensure there is always at least one part and parts are not empty strings
      const cleanedParts = parts.filter((p: any) => p.text !== "" || p.inlineData);
      
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: cleanedParts.length > 0 ? cleanedParts : [{ text: "..." }]
      };
    });

    return await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: config.systemInstruction || "You are a multimodal expert. Analyze files and text with precision.",
        temperature: config.temperature,
        thinkingConfig: config.thinkingBudget ? { thinkingBudget: config.thinkingBudget } : undefined,
        tools: tools.length > 0 ? tools : undefined,
      },
    });
  },

  async generateImage(prompt: string, highQuality: boolean = false) {
    const ai = getAI();
    const model = highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          ...(model === 'gemini-3-pro-image-preview' ? { imageSize: "2K" } : {})
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }
};
