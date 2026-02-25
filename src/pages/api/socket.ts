import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptMessage } from '@/lib/encryption';
import { ChatMessage } from '@/types/chat';

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default async function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*', // Allow all for local network access
      methods: ['GET', 'POST'],
    },
  });
  res.socket.server.io = io;

  const { db } = await connectToDatabase();
  const chatCollection = db.collection<ChatMessage>('chat_messages');

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('send_message', async (data: { senderId: string; senderName: string; content: string }) => {
      console.log('Message received:', data);

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
      } catch (error) {
        console.error('Failed to save message:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  res.end();
}
