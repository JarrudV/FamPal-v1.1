
import { GoogleGenAI, Type } from "@google/genai";
import { Place, ActivityType, Child } from "./types";

// Always create a fresh instance to ensure correct API key usage
const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

// Reliable placeholder images by place type using Unsplash
const placeholderImages: Record<string, string[]> = {
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=400&fit=crop",
  ],
  outdoor: [
    "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
  ],
  indoor: [
    "https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1536851674530-790ad26e2388?w=600&h=400&fit=crop",
  ],
  active: [
    "https://images.unsplash.com/photo-1564429238981-03da5e2d1a85?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=400&fit=crop",
  ],
  hike: [
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=400&fit=crop",
  ],
  show: [
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop",
  ],
  all: [
    "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=600&h=400&fit=crop",
  ],
};

function getPlaceholderImage(type: string, name: string, index: number): string {
  const typeImages = placeholderImages[type] || placeholderImages.all;
  // Use name hash + index to get consistent but varied images
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return typeImages[(hash + index) % typeImages.length];
}

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
    const safeChildren = Array.isArray(children) ? children : [];
    const ageContext = safeChildren.length > 0
      ? ` The family has children with ages: ${safeChildren.map(c => c.age).join(', ')}. Recommend places appropriate for these ages.`
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

    // Post-process to ensure IDs are unique and use reliable placeholder images
    return data.map((place: any, index: number) => ({
      ...place,
      id: place.id || `gen-${Date.now()}-${index}`,
      // Use Unsplash source for reliable, type-specific placeholder images
      imageUrl: getPlaceholderImage(place.type, place.name, index)
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
      imageUrl: getPlaceholderImage("outdoor", "Sunny Side Playground", 0),
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
      imageUrl: getPlaceholderImage("restaurant", "The Pet-Friendly Pasta Bar", 1),
      distance: "1.1 km",
      ageAppropriate: "All ages"
    }
  ];
  return base.filter(p => type === 'all' || p.type === type);
}
