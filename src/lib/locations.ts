/**
 * Location autocomplete — Nominatim via our API, with a small local list.
 */
import { apiFetch } from "@/lib/api";

const LOCAL: string[] = [
  "Lahore, Pakistan",
  "Karachi, Pakistan",
  "Islamabad, Pakistan",
  "Rawalpindi, Pakistan",
  "Multan, Pakistan",
  "Faisalabad, Pakistan",
  "Peshawar, Pakistan",
  "Quetta, Pakistan",
  "Los Angeles, United States",
  "New York, United States",
  "San Francisco, United States",
  "Seattle, United States",
  "Austin, United States",
  "London, United Kingdom",
  "Dubai, United Arab Emirates",
  "Toronto, Canada",
  "Berlin, Germany",
  "Remote",
];

export function searchLocationsLocal(q: string, limit = 8): string[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  return LOCAL.filter((x) => x.toLowerCase().includes(needle)).slice(0, limit);
}

export async function searchLocationsLive(q: string): Promise<string[]> {
  // BUG-1260: the API reads at most 80 characters.
  const query = q.trim().slice(0, 80).trim();
  if (query.length < 2) return [];
  try {
    const data = await apiFetch<{ locations: string[] }>(
      `/locations/suggest?q=${encodeURIComponent(query)}`
    );
    return Array.isArray(data.locations) ? data.locations : searchLocationsLocal(query);
  } catch {
    return searchLocationsLocal(query);
  }
}
