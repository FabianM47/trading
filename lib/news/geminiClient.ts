import { GoogleGenerativeAI } from '@google/generative-ai';

let client: GoogleGenerativeAI | null = null;

/**
 * Singleton Google Generative AI Client fuer Server-side Gemini API Calls.
 * Nutzt GEMINI_API_KEY aus den Environment Variables.
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}
