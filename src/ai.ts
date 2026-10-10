import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Inisialisasi SDK dengan mode Vertex AI (Memotong Kredit Gratis GCP $300)
export const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'project-1bcc4549-c8d6-4962-958',
  location: process.env.GCP_LOCATION || 'us-central1',
});

/**
 * Basic text generator
 */
export async function generateText(prompt: string, modelName = 'gemini-2.5-flash') {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error Vertex AI:', error);
    throw error;
  }
}

/**
 * Advanced content generator for AI Studio Playground UI
 */
export async function generateContentAdvanced(params: {
  prompt: string;
  modelName?: string;
  systemInstruction?: string;
  temperature?: number;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
}) {
  try {
    const model = params.modelName || 'gemini-2.5-flash';

    const config: any = {};
    if (params.systemInstruction?.trim()) {
      config.systemInstruction = params.systemInstruction;
    }
    if (typeof params.temperature === 'number') {
      config.temperature = params.temperature;
    }

    let contents: any;
    if (params.history && params.history.length > 0) {
      contents = [...params.history, { role: 'user', parts: [{ text: params.prompt }] }];
    } else {
      contents = params.prompt;
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    return {
      text: response.text || '',
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}
