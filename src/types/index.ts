export interface User {
  id: number;
  username: string;
  emoji: string;
  has_pro: boolean;
  pro_until?: string;
  is_admin: boolean;
  activity_days?: number;
  needs_emoji?: boolean;
  last_active?: string;
}

export interface Message {
  id: number;
  chat_id: string;
  sender_id: number;
  sender_username: string;
  type: 'text' | 'voice' | 'video' | 'file' | 'image';
  content?: string;
  file_url?: string;
  created_at: string;
}

export type AppScreen = 'splash' | 'auth' | 'emoji-pick' | 'main' | 'error-526';
