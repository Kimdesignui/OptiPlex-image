import { GoogleGenAI } from "@google/genai";
import { blobToBase64 } from './imageProcessing';

// Initialize Gemini Client
// Using process.env.GEMINI_API_KEY as preferred name in some environments
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });

export const enhanceImageWithGemini = async (
  imageFile: File,
  promptText: string
): Promise<string> => {
  console.log("Starting Gemini Enhancement with model: gemini-2.5-flash-image");
  try {
    const base64Data = await blobToBase64(imageFile);
    
    // Using gemini-2.5-flash-image as defined in skill for image editing
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
            text: `${promptText}. Please return the result as an image part.`,
          },
        ],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.error("Gemini Response error: No candidates found", response);
      throw new Error("Không nhận được phản hồi từ AI.");
    }

    const parts = response.candidates[0].content.parts;
    console.log("Gemini Response parts received:", parts.length);

    let imageData = '';
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageData = part.inlineData.data;
        if (part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        break;
      }
    }

    if (imageData) {
      return `data:${mimeType};base64,${imageData}`;
    }

    // If no image, check if there's text describing why
    const textPart = parts.find(p => p.text);
    if (textPart) {
      console.warn("AI returned text instead of image:", textPart.text);
      throw new Error(`AI không tạo ra ảnh. Phản hồi: ${textPart.text}`);
    }

    throw new Error("AI không tạo ra dữ liệu hình ảnh.");

  } catch (error: any) {
    console.error("Gemini Enhancement Error Details:", error);
    if (error.message?.includes("model")) {
        // Fallback or specific error if model is not found
        throw new Error("Model AI không khả dụng hoặc đang bận. Vui lòng thử lại sau.");
    }
    throw error;
  }
};
