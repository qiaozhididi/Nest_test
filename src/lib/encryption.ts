import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.CHAT_ENCRYPTION_KEY || 'default-chat-secret-key';

export function encryptMessage(message: string): string {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}

export function decryptMessage(encryptedMessage: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
