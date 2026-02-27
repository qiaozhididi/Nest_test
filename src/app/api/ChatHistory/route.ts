import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { decryptMessage } from '@/lib/encryption';
import { ChatMessage } from '@/types/chat';
import { ErrorMessages } from '@/lib/errorMessages';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // 获取该时间戳之前的消息

    const { db } = await connectToDatabase();
    const chatCollection = db.collection<ChatMessage>('chat_messages');

    // 构建查询条件
    const query = before 
      ? { timestamp: { $lt: new Date(before) } } 
      : {};

    // 默认获取最新的消息
    const messages = await chatCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // 解密消息
    // 如果是分页加载（有 before 参数），不需要 reverse，前端会处理合并
    // 但为了保持一致性，我们在这里统一按时间正序返回（最早的在前面）
    const decryptedMessages = messages.reverse().map((msg) => ({
      ...msg,
      content: decryptMessage(msg.content),
    }));

    return NextResponse.json({
      messages: decryptedMessages,
      hasMore: decryptedMessages.length === limit
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json(
      { error: ErrorMessages.FETCH_HISTORY_FAILED },
      { status: 500 }
    );
  }
}
