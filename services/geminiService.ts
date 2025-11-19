import { GoogleGenAI } from "@google/genai";

// NOTE: In a real deployment, ensure process.env.API_KEY is set.
// If not available, this service will just fail gracefully or not be called.

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateTrainerPraise = async (context: 'success' | 'failure'): Promise<string> => {
  if (!ai) {
    return context === 'success' ? "Good rat! Here is a banana." : "Careful now. Try again.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a gentle, encouraging animal trainer working with a Hero Rat detecting landmines. 
      The rat just ${context === 'success' ? 'successfully identified a mine' : 'mistook a piece of scrap metal for a mine'}.
      Give a very short (max 10 words) verbal reaction. 
      If success, be warm and mention a treat.
      If failure, be calm and reassuring.`,
    });
    return response.text || (context === 'success' ? "Good boy!" : "Focus.");
  } catch (error) {
    console.warn("Gemini API Error", error);
    return context === 'success' ? "Good boy!" : "Focus.";
  }
};