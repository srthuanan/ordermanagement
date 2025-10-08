
import { GoogleGenAI } from "@google/genai";

// SECURITY WARNING: This key will be exposed to clients.
// In a production environment, this API call should be made from a server-side component
// or a secure cloud function to protect the API key.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Extracts a date from an image using Gemini.
 * @param imageBase64 The base64 encoded image data.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @returns A promise that resolves to a date string in ISO format or null.
 */
export const extractDateFromImage = async (imageBase64: string, mimeType: string): Promise<string | null> => {
  if (!API_KEY) {
    throw new Error("API Key for Gemini is not configured.");
  }
  try {
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: "From the provided image of a receipt or transaction document, extract the exact date and time of the transaction. Return ONLY the date and time in the format 'YYYY-MM-DDTHH:mm:ss'. If no specific time is found, use '00:00:00'. If no date can be found at all, return the word 'null'.",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });
    
    const text = response.text.trim();
    
    // Validate if the response is a plausible date format or the string 'null'
    if (text === 'null') {
      return null;
    }
    // A simple regex to check for YYYY-MM-DDTHH:mm:ss format
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) {
      return text;
    }

    console.warn("Gemini OCR returned an unexpected format:", text);
    return null;

  } catch (error) {
    console.error("Error calling Gemini API for date extraction:", error);
    return null;
  }
};