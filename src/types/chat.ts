import { ObjectId } from 'mongodb';

export interface ChatMessage {
  _id?: ObjectId;
  senderId: string;
  senderName: string;
  content: string; // Encrypted in DB
  timestamp: Date;
}
