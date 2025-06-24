export type ChatMessage = {
  sender: string;
  message: string;
  decrypted?: string;
  decryptDuration?: number;
  encryptDuration?: number;
};
