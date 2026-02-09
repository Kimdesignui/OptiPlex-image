import { GoogleGenAI } from "@google/genai";
import { blobToBase64 } from './imageProcessing';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhanceImageWithGemini = async (
  imageFile: File,
  promptText: string
): Promise<string> => {
  try {
    const base64Data = await blobToBase64(imageFile);
    
    // Using gemini-2.5-flash-image for speed and efficiency in generating/editing
    const model = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data,
            },
          },
          {
            text: `${promptText}. Return only the image.`,
          },
        ],
      },
    });

    // Extract image from response
    // The model might return a text description AND an image, or just an image.
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No response from AI");
    }

    const parts = candidates[0].content.parts;
    let imageUrl = '';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("AI did not generate an image. It might have only returned text.");
    }

    return imageUrl;

  } catch (error) {
    console.error("Gemini Enhancement Error:", error);
    throw error;
  }
};
