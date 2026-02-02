
import { GoogleGenAI, Type } from "@google/genai";
import { Place, ActivityType, Child } from "./types";

// Always create a fresh instance to ensure correct API key usage
const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  type: ActivityType = 'all',
  children: Child[] = [],
  radiusKm: number = 10
): Promise<Place[]> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API key missing – AI disabled");
  }
  const ai = getAI();
  try {
    const ageContext = children.length > 0
      ? ` The family has children with ages: ${children.map(c => c.age).join(', ')}. Recommend places appropriate for these ages.`
      : " Recommend generic kid-friendly spots.";

    const prompt = `Find 5-10 kid and pet-friendly ${type === 'all' ? 'places' : type} within ${radiusKm}km of ${lat}, ${lng}.${ageContext} 
    Return a strict JSON array of places. Each place must have an id, name, description, address, rating (1-5), tags (array of strings), mapsUrl, type, priceLevel ($, $$, $$$), imageUrl, distance (string), and ageAppropriate string.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              address: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              mapsUrl: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["restaurant", "outdoor", "indoor", "active", "hike", "show", "all"] },
              priceLevel: { type: Type.STRING, enum: ["$", "$$", "$$$", "$$$$"] },
              imageUrl: { type: Type.STRING },
              distance: { type: Type.STRING },
              ageAppropriate: { type: Type.STRING },
            },
            required: ["id", "name", "description", "address", "rating", "tags", "mapsUrl", "type", "priceLevel", "imageUrl", "distance", "ageAppropriate"],
          },
        },
      },
    });

    const responseText = response.text;
    const data = responseText ? JSON.parse(responseText) : null;

    if (!data || !Array.isArray(data)) {
      console.warn("Gemini returned invalid JSON structure", data);
      return getSeedData(type);
    }

    // Post-process to ensure IDs are unique if Gemini generates duplicates or generic IDs
    return data.map((place: any, index: number) => ({
      ...place,
      id: place.id || `gen-${Date.now()}-${index}`,
      // Fallback for image until we have a real search API
      imageUrl: place.imageUrl || `https://picsum.photos/seed/${index + Date.now()}/600/400`
    }));

  } catch (error: any) {
    console.error("Gemini Fetch Error:", error);
    return getSeedData(type);
  }
}

function getSeedData(type: string): Place[] {
  const base = [
    {
      id: 'seed-1',
      name: "Sunny Side Playground",
      description: "Massive outdoor park with specialized areas for toddlers and pre-teens.",
      address: "123 Golden Gate Park",
      rating: 4.8,
      tags: ["Outdoor", "Free", "Stroller-Friendly"],
      mapsUrl: "https://maps.google.com",
      type: "outdoor" as const,
      priceLevel: "$" as const,
      imageUrl: "https://picsum.photos/seed/park/600/400",
      distance: "0.4 km",
      ageAppropriate: "0-12"
    },
    {
      id: 'seed-2',
      name: "The Pet-Friendly Pasta Bar",
      description: "Dine with your dog and kids. Includes a coloring station and dog treats.",
      address: "456 Main St",
      rating: 4.6,
      tags: ["Dine", "Pet-Friendly", "Kids Menu"],
      mapsUrl: "https://maps.google.com",
      type: "restaurant" as const,
      priceLevel: "$$" as const,
      imageUrl: "https://picsum.photos/seed/restaurant/600/400",
      distance: "1.1 km",
      ageAppropriate: "All ages"
    }
  ];
  return base.filter(p => type === 'all' || p.type === type);
}
