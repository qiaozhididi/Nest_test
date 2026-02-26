import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptMessage } from '@/lib/encryption';
import { ChatMessage } from '@/types/chat';
import { verifyToken } from '@/lib/auth';

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

let isInitializing = false;

export default async function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  if (isInitializing) {
    res.end();
    return;
  }

  isInitializing = true;
  console.log('Socket.io server initializing...');
  
  try {
    const io = new Server(res.socket.server, {
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: '*', // Allow all for local network access
        methods: ['GET', 'POST'],
      },
    });
    res.socket.server.io = io;

    const { db } = await connectToDatabase();
    const chatCollection = db.collection<ChatMessage>('chat_messages');

    // 增加中间件验证 token
    io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }
      (socket as any).userId = decoded.userId;
      next();
    });

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('send_message', async (data: { senderId: string; senderName: string; content: string }, callback?: Function) => {
        if (!data.content || !data.senderId) {
          if (callback) callback({ error: 'Invalid message data' });
          return;
        }

        const encryptedContent = encryptMessage(data.content);
        const newMessage: ChatMessage = {
          senderId: data.senderId,
          senderName: data.senderName,
          content: encryptedContent,
          timestamp: new Date(),
        };

        try {
          await chatCollection.insertOne(newMessage);
          // Broadcast the original content to clients for real-time display
          io.emit('receive_message', {
            ...newMessage,
            content: data.content, // Send plain text for immediate display
          });
          if (callback) callback({ success: true });
        } catch (error) {
          console.error('Failed to save message:', error);
          if (callback) callback({ error: 'Failed to save message' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });
  } catch (error) {
    console.error('Socket initialization failed:', error);
  } finally {
    isInitializing = false;
  }

  res.end();
}
