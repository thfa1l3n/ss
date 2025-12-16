import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is present
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const getFestiveGiftIdeas = async (
  recipientName: string,
  // recipientNickname: string // Removed simplified param
  context: string = "The Elf"
): Promise<string[]> => {
  if (!apiKey) {
    console.warn("No API Key found, returning default ideas.");
    return [
      "A lump of coal (premium edition)",
      "Ugly sweater with flashing lights",
      "Fruitcake from 1995"
    ];
  }

  try {
    const prompt = `Give me 3 funny, slightly tacky, and creative Secret Santa gift ideas for someone named ${recipientName}. 
    The tone should be cheeky, playful, and Christmas-themed. Keep them short (under 10 words each).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    if (response.text) {
        const parsed = JSON.parse(response.text);
        return parsed.ideas || [];
    }
    return [];

  } catch (error) {
    console.error("Gemini Elf Error:", error);
    return [
      "A singing fish plaque",
      "Socks with your face on them",
      "Emergency hot cocoa kit"
    ];
  }
};
