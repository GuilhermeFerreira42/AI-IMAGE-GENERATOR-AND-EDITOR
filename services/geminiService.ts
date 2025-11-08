import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentRequest, Part } from "@google/genai";
import type { RequestPayload } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string): Part => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export const callGeminiApi = async (
  params: RequestPayload
): Promise<{ images?: string[]; text?: string }> => {
  const { prompt, images, options, responseType } = params;
  const { aspectRatio, variations, negativePrompt } = options;

  const modelName = responseType === 'image' ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash';

  let fullPrompt = prompt;

  // The aspect ratio is now handled in the request config, not in the prompt text.
  // Only append the negative prompt if provided.
  if (responseType === 'image' && negativePrompt) {
    fullPrompt += `. Negative prompt: do not include ${negativePrompt}`;
  }

  const parts: Part[] = images.map(img => fileToGenerativePart(img.base64, img.mimeType));
  parts.push({ text: fullPrompt });

  const request: GenerateContentRequest = {
    contents: [{ parts }],
  };
  
  if (responseType === 'image') {
    request.config = {
      responseModalities: [Modality.IMAGE],
      // CRITICAL FIX: The gemini-2.5-flash-image model requires the aspect ratio
      // to be passed in this structured config object to work correctly.
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    };
  }

  try {
    const variationCount = responseType === 'image' ? variations : 1;
    const promises = Array(variationCount).fill(0).map(() =>
        ai.models.generateContent({ model: modelName, ...request })
    );

    const responses = await Promise.all(promises);

    if (responseType === 'text') {
        const textResponse = responses[0].text;
        if (!textResponse) {
             throw new Error('The model returned an empty text response.');
        }
        return { text: textResponse };
    }


    const base64Images: string[] = [];
    responses.forEach(response => {
        response.candidates?.forEach(candidate => {
            candidate.content.parts.forEach(part => {
                if (part.inlineData?.data) {
                    base64Images.push(part.inlineData.data);
                }
            });
        });
    });

    if (base64Images.length === 0) {
      throw new Error('No images were generated. The prompt may have been blocked or the response was empty.');
    }

    return { images: base64Images };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`API Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while calling the API.');
  }
};