import type { RoomHistoryItem } from '../types/sushi';

const HISTORY_STORAGE_KEY = 'sushi_room_history';

export function ensurePlayerToken(): string {
  const savedToken = localStorage.getItem('playerToken');
  if (savedToken && savedToken.trim()) {
    return savedToken;
  }

  const cryptoApi = globalThis.crypto;
  const nextToken =
    cryptoApi && typeof cryptoApi.randomUUID === 'function'
      ? cryptoApi.randomUUID()
      : `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem('playerToken', nextToken);
  return nextToken;
}

export function generateCreatorToken(): string {
  const cryptoApi = globalThis.crypto;
  return cryptoApi && typeof cryptoApi.randomUUID === 'function'
    ? cryptoApi.randomUUID()
    : `creator-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadRoomHistory(): RoomHistoryItem[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as RoomHistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveRoomHistory(items: RoomHistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error(e);
  }
}

export function getRankLabel(index: number): string {
  if (index === 0) return '🏆';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}
