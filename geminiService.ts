
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
  radiusKm: number = 10,
  searchQuery?: string
): Promise<Place[]> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API key missing – AI disabled");
  }
  
  // Create cache key including children ages for proper family context
  const safeChildren = Array.isArray(children) ? children : [];
  const agesKey = safeChildren.map(c => c.age).sort().join(',') || 'none';
  const cacheKey = `${lat.toFixed(2)}:${lng.toFixed(2)}:${type}:${radiusKm}:${searchQuery || ''}:ages:${agesKey}`;
  
  // Check cache first
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PLACES_CACHE_TTL) {
    return cached.places;
  }
  
  const ai = getAI();
  try {
    const ageContext = safeChildren.length > 0
      ? ` The family has children with ages: ${safeChildren.map(c => c.age).join(', ')}. Recommend places appropriate for these ages.`
      : " Recommend generic kid-friendly spots.";
    
    const searchContext = searchQuery 
      ? ` Focus on places matching: "${searchQuery}".`
      : "";

    const prompt = `Find 5-10 kid and pet-friendly ${type === 'all' ? 'places' : type} within ${radiusKm}km of ${lat}, ${lng}.${ageContext}${searchContext}
    Return a strict JSON array of REAL places with actual contact info. Each place must have an id, name, description, address, rating (1-5), tags (array of strings), mapsUrl (Google Maps link), type, priceLevel ($, $$, $$$), imageUrl, distance (string), ageAppropriate string, phone (real phone number if known), and website (real website URL if known).`;

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
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
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
    const places = data.map((place: any, index: number) => ({
      ...place,
      id: place.id || `gen-${Date.now()}-${index}`,
      imageUrl: getPlaceholderImage(place.type, place.name, index)
    }));
    
    // Cache the results
    placesCache.set(cacheKey, { places, timestamp: Date.now() });
    
    return places;

  } catch (error: any) {
    console.error("Gemini Fetch Error:", error);
    return getSeedData(type);
  }
}

// In-memory cache for AI responses during the session (reduces API calls for repeated questions)
const aiResponseCache: Map<string, string> = new Map();

// Cache for fetched places to avoid repeated API calls
const placesCache: Map<string, { places: Place[]; timestamp: number }> = new Map();
const PLACES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function askAboutPlace(
  place: Place,
  question: string,
  userContext?: { childrenAges?: number[] }
): Promise<string> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API key missing – AI disabled");
  }
  
  // Create a cache key from place ID, question, and family context
  const agesKey = userContext?.childrenAges?.sort().join(',') || 'none';
  const cacheKey = `${place.id}:${question.toLowerCase().trim()}:ages:${agesKey}`;
  
  // Check memory cache first
  if (aiResponseCache.has(cacheKey)) {
    return aiResponseCache.get(cacheKey)!;
  }
  
  const ai = getAI();
  
  try {
    const childContext = userContext?.childrenAges?.length 
      ? `The family has children aged ${userContext.childrenAges.join(', ')}.`
      : '';
    
    const prompt = `You are a helpful family travel assistant. A parent is asking about "${place.name}" located at ${place.address}.

Place details:
- Type: ${place.type}
- Rating: ${place.rating}/5
- Price: ${place.priceLevel}
- Tags: ${place.tags.join(', ')}
- Description: ${place.description}

${childContext}

Question: ${question}

Provide a helpful, concise answer focused on family-friendliness, kid safety, and practical tips. Keep response under 150 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const answer = response.text || "Sorry, I couldn't generate an answer. Please try again.";
    
    // Cache the response
    aiResponseCache.set(cacheKey, answer);
    
    return answer;
  } catch (error: any) {
    console.error("Gemini Ask Error:", error);
    throw new Error("Failed to get AI response. Please try again.");
  }
}

export async function generateFamilySummary(place: Place, childrenAges?: number[]): Promise<string> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API key missing – AI disabled");
  }
  
  const cacheKey = `summary:${place.id}:${childrenAges?.join(',') || 'general'}`;
  
  if (aiResponseCache.has(cacheKey)) {
    return aiResponseCache.get(cacheKey)!;
  }
  
  const ai = getAI();
  
  try {
    const ageContext = childrenAges?.length 
      ? `for a family with children aged ${childrenAges.join(', ')}`
      : 'for families with young children';
    
    const prompt = `Generate a brief, enthusiastic family-friendly summary ${ageContext} for:

"${place.name}" at ${place.address}
Type: ${place.type} | Rating: ${place.rating}/5 | Price: ${place.priceLevel}
Tags: ${place.tags.join(', ')}

Include: 
1. Why families love it (1 sentence)
2. Best for ages (specific range)
3. Pro tip for parents (1 sentence)

Keep it under 80 words, warm and helpful tone.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const summary = response.text || place.description;
    aiResponseCache.set(cacheKey, summary);
    
    return summary;
  } catch (error: any) {
    console.error("Gemini Summary Error:", error);
    return place.description;
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
