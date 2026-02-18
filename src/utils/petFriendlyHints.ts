import type { PetFriendlyFeature } from '../types/place';
import type { PlaceDetails } from '../../placesService';

export function getPetFriendlyHintsFromGoogle(placeDetails?: PlaceDetails | null): PetFriendlyFeature[] {
  if (!placeDetails) return [];

  const hints = new Set<PetFriendlyFeature>();

  if (placeDetails.allowsDogs === true) {
    hints.add('dogs_allowed');
  }

  const types = placeDetails.types || [];
  if (types.includes('dog_park') || types.includes('pet_store')) {
    hints.add('dogs_allowed');
    hints.add('off_leash_area');
  }
  if (types.includes('park') || types.includes('national_park') || types.includes('hiking_area')) {
    hints.add('dogs_allowed');
  }

  const reviewText = (placeDetails.reviews || []).map(r => r.text || '').join(' ').toLowerCase();
  if (reviewText) {
    if (/\bdog[s]?\s?(?:allowed|welcome|friendly)\b/i.test(reviewText)) hints.add('dogs_allowed');
    if (/\bcat[s]?\s?(?:allowed|welcome|friendly)\b/i.test(reviewText)) hints.add('cats_allowed');
    if (/\bpet[s]?\s?(?:allowed|welcome|friendly)\b/i.test(reviewText)) {
      hints.add('dogs_allowed');
      hints.add('cats_allowed');
    }
    if (/\bpet\s?(?:friendly\s?)?patio\b|\boutdoor.*pet/i.test(reviewText)) hints.add('pet_friendly_patio');
    if (/\bwater\s?bowl/i.test(reviewText)) hints.add('water_bowls');
    if (/\boff[\s-]?leash/i.test(reviewText)) hints.add('off_leash_area');
    if (/\bpet\s?menu\b|\bdog\s?menu\b|\bdog\s?treat/i.test(reviewText)) hints.add('pet_menu');
    if (/\bshaded.*pet\b|\bpet.*shade/i.test(reviewText)) hints.add('shaded_pet_area');
    if (/\bpet\s?waste\b|\bpoop\s?bag/i.test(reviewText)) hints.add('pet_waste_stations');
    if (/\benclosed\s?(?:garden|yard|area)\b|\bfenced/i.test(reviewText)) hints.add('enclosed_garden');
    if (/\bpet[s]?\s?(?:allowed\s?)?inside\b|\bdog[s]?\s?(?:allowed\s?)?inside/i.test(reviewText)) hints.add('pets_inside_allowed');
  }

  return [...hints];
}
