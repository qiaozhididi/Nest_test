import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { decryptMessage } from '@/lib/encryption';
import { ChatMessage } from '@/types/chat';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const chatCollection = db.collection<ChatMessage>('chat_messages');

    // Fetch last 100 messages
    const messages = await chatCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // Decrypt messages
    const decryptedMessages = messages.reverse().map((msg) => ({
      ...msg,
      content: decryptMessage(msg.content),
    }));

    return NextResponse.json(decryptedMessages, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
