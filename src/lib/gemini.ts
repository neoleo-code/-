import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDesignTerms(base64Image: string, mimeType: string = "image/jpeg"): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
        "Analyze this image and provide 5-10 design terminology keywords (e.g. typography, minimalism, negative space, amber tone, skeumorphism) that describe its visual style, UI/UX patterns, or aesthetic. Keep them concise."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonStr = response.text?.trim() || "[]";
    const terms = JSON.parse(jsonStr);
    return terms;
  } catch (error) {
    console.error("Failed to generate terms:", error);
    return [];
  }
}
