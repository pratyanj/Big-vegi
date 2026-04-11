import { GoogleGenAI, Type } from '@google/genai';
import { ShoppingItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function detectGroceries(base64Image: string, mimeType: string): Promise<ShoppingItem[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: 'Analyze this image. If it is a handwritten or printed list of groceries/vegetables, extract the items, quantities, and prices (if any) from the list. If it is an image of actual vegetables or fruits, identify them. Return a list of items with their names. The name MUST be in the format "English Name (Gujarati Name in English letters)", for example: "ivy gourd (tindora)", "potato (batata)", "banana (kela)". If the image is a list, use the quantities and prices written on it (default price to 0 if not written, and guess a reasonable unit if not specified). If it\'s an image of actual vegetables, guess a reasonable quantity and unit (g, kg, pcs) based on the image, and leave price as 0. Return ONLY JSON.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Name of the vegetable or fruit in format "English (Gujarati)", e.g. "potato (batata)"' },
              quantity: { type: Type.NUMBER, description: 'Estimated quantity' },
              unit: { type: Type.STRING, description: 'Unit: g, kg, or pcs' },
              price: { type: Type.NUMBER, description: 'Price if written on the list, otherwise 0' },
            },
            required: ['name', 'quantity', 'unit', 'price'],
          },
        },
      },
    });

    let text = response.text;
    if (!text) return [];
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?|```/g, '').trim();
    
    const items: ShoppingItem[] = JSON.parse(text);
    return items;
  } catch (error) {
    console.error('Error detecting groceries:', error);
    throw error;
  }
}
