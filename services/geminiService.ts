
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion, Language } from "../types";

const PRODUCT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise, attractive title for the second-hand product.",
    },
    description: {
      type: Type.STRING,
      description: "A detailed, persuasive description highlighting features and condition.",
    },
    category: {
      type: Type.STRING,
      enum: ['electronics', 'furniture', 'clothing', 'books', 'sports', 'vehicles', 'real_estate', 'services', 'other'],
      description: "The most appropriate category key for the item.",
    },
    suggestedPrice: {
        type: Type.NUMBER,
        description: "An estimated price in local currency based on the item appearance (integer only). For vehicles or real estate, estimate market value.",
    },
    suggestedDeliveryType: {
      type: Type.STRING,
      enum: ['meetup', 'shipping', 'both'],
      description: "Suggest 'meetup' for large items (furniture, cars) or services. Suggest 'shipping' or 'both' for small shippable items.",
    }
  },
  required: ["title", "description", "category", "suggestedPrice", "suggestedDeliveryType"],
};

const getLanguageName = (lang: Language): string => {
  switch (lang) {
    case 'zh': return 'Chinese';
    case 'es': return 'Spanish (Mexico)';
    case 'en': return 'English';
    default: return 'Spanish';
  }
};

export const analyzeProductImage = async (base64Image: string, language: Language = 'es'): Promise<AISuggestion> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = getLanguageName(language);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `You are an expert marketplace assistant for DESCU in Mexico. 
            SAFETY INSTRUCTIONS:
            - Do not generate descriptions for items containing hate speech, Nazi symbols, or extremist political propaganda.
            - Do not generate descriptions for items promoting political misinformation or election interference.
            - If the image contains sensitive political figures or controversial propaganda, return a neutral but firm description refusing the listing due to safety policies.
            
            TASK: Analyze this image and generate a listing. The title and description MUST be in ${langName}. The category must be one of the enum values provided. If it looks like a car, use 'vehicles'. If it looks like a house/apartment, use 'real_estate'. For large items, suggest 'meetup' as delivery type.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: PRODUCT_SCHEMA,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text) as AISuggestion;
    return data;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};
