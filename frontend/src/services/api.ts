import { getStoredAuthToken } from './auth';
import { backendUrl } from './socket';

export type ApiRestaurantMenu = {
  id: number;
  restaurantId: number;
  name: string;
  priceCents: number;
  currency: string;
  notes: string;
};

export type ApiRestaurant = {
  id: number;
  name: string;
  country: string;
  province: string;
  city: string;
  photoUrl?: string | null;
  menus: ApiRestaurantMenu[];
};

export type ApiRestaurantFilters = {
  countries: string[];
  provinces: string[];
  cities: string[];
};

export type ApiReview = {
  id: number;
  restaurantId: number;
  restaurantName: string;
  playerToken: string;
  authorName: string;
  pieceName: string;
  tasteScore: number;
  sizeScore: number;
  presentationScore: number;
  comment: string;
  photoUrl?: string | null;
  createdAt: string;
};

export type ApiProfile = {
  playerToken: string;
  displayName: string;
  role: 'user' | 'superuser';
  avatarUrl?: string | null;
};

export type ApiHistoryItem = {
  roomId: string;
  userName: string;
  lastJoinedAt: number;
  isClosed: boolean;
  finalPlayers: { name: string; score: number }[];
};

export async function fetchRestaurantFilters(): Promise<ApiRestaurantFilters> {
  const res = await fetch(`${backendUrl}/api/restaurants/filters`);
  if (!res.ok) return { countries: [], provinces: [], cities: [] };
  return res.json();
}

export async function fetchRestaurants(filters?: {
  country?: string;
  province?: string;
  city?: string;
}): Promise<ApiRestaurant[]> {
  const params = new URLSearchParams();
  if (filters?.country) params.set('country', filters.country);
  if (filters?.province) params.set('province', filters.province);
  if (filters?.city) params.set('city', filters.city);
  const qs = params.toString();
  const res = await fetch(`${backendUrl}/api/restaurants${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error cargando restaurantes');
  return res.json();
}

export async function createRestaurant(payload: {
  name: string;
  country: string;
  province: string;
  city: string;
  photoDataUrl?: string;
}): Promise<ApiRestaurant> {
  const token = getStoredAuthToken();
  const res = await fetch(`${backendUrl}/api/restaurants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo crear el restaurante');
  }
  return res.json();
}

export async function createRestaurantMenu(
  restaurantId: number,
  payload: { name: string; priceEuros: number; notes?: string },
): Promise<ApiRestaurantMenu> {
  const token = getStoredAuthToken();
  const res = await fetch(`${backendUrl}/api/restaurants/${restaurantId}/menus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo añadir el menú');
  }
  return res.json();
}

export async function fetchReviews(): Promise<ApiReview[]> {
  const res = await fetch(`${backendUrl}/api/reviews`);
  if (!res.ok) throw new Error('Error cargando valoraciones');
  return res.json();
}

export async function createReview(payload: {
  playerToken: string;
  authorName: string;
  pieceName: string;
  restaurantId: number;
  tasteScore: number;
  sizeScore: number;
  presentationScore: number;
  comment: string;
  photoDataUrl?: string;
}): Promise<ApiReview> {
  const res = await fetch(`${backendUrl}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error guardando valoración');
  }
  return res.json();
}

export async function fetchProfile(playerToken: string): Promise<ApiProfile | null> {
  const res = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(playerToken)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveProfile(
  playerToken: string,
  payload: { displayName: string; avatarDataUrl?: string },
): Promise<ApiProfile> {
  const res = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(playerToken)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error guardando perfil');
  return res.json();
}

export async function fetchHistory(playerToken: string): Promise<ApiHistoryItem[]> {
  const res = await fetch(`${backendUrl}/api/history?playerToken=${encodeURIComponent(playerToken)}`);
  if (!res.ok) return [];
  return res.json();
}
