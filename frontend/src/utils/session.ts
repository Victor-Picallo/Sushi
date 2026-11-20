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

export function clearLegacyLocalHistory(): void {
  localStorage.removeItem('sushi_room_history');
  localStorage.removeItem('sushi_local_reviews');
}

export function getRankLabel(index: number): string {
  if (index === 0) return '🏆';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}
