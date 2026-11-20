export type AppTab = 'room' | 'history' | 'reviews' | 'profile';

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
};

export type RoomHistoryItem = {
  roomId: string;
  userName: string;
  creatorToken?: string;
  lastJoinedAt: number;
  isClosed?: boolean;
  finalPlayers?: { name: string; score: number }[];
};

export type RoomSummary = {
  id: string;
  isClosed: boolean;
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
