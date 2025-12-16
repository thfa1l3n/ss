export interface User {
  id: string;
  email: string;
  displayName: string;
  password?: string; // Mock auth
  avatar: string;
  groupId: string | null;
  drawnUserId: string | null; // The ID of the person they are gifting
}

export interface Group {
  id: string;
  name: string;
  code: string; // 4-char join code
  memberIds: string[];
}

export type AppState = 'AUTH' | 'LOBBY' | 'DRAWING' | 'REVEALED';

export interface GiftIdeaResponse {
  ideas: string[];
}
