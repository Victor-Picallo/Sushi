export type AppTab = 'room' | 'history' | 'reviews' | 'admin' | 'profile';

export type Player = {
  id: string;
  name: string;
  score: number;
  playerToken?: string;
};

export type Room = {
  id: string;
  players: Player[];
  creatorId: string;
  creatorName: string;
  creatorToken: string;
  isClosed: boolean;
  restaurantId?: number | null;
  restaurantName?: string | null;
  menuId?: number | null;
  menuName?: string | null;
  menuPriceCents?: number | null;
};

export type RoomHistoryItem = {
  roomId: string;
  userName: string;
  creatorToken?: string;
  lastJoinedAt: number;
  isClosed?: boolean;
  restaurantName?: string | null;
  finalPlayers?: { name: string; score: number }[];
};

export type RoomSummary = {
  id: string;
  isClosed: boolean;
  restaurantName?: string | null;
  players: { name: string; score: number }[];
};

export type CelebrationState = {
  show: boolean;
  score: number;
  title: string;
  subtitle: string;
  gifUrl: string;
};

export type SushiReview = {
  id: string;
  pieceName: string;
  restaurantName: string;
  tasteScore: number;
  sizeScore: number;
  presentationScore: number;
  comment: string;
  photoPreviewUrl?: string;
  createdAt: number;
};

export type UserProfile = {
  displayName: string;
  email?: string;
  avatarPreviewUrl?: string;
  favoritePiece?: string;
};
