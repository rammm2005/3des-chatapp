export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
  type?: 'text' | 'image';
  decrypted?: string;
  mime?: string;
}