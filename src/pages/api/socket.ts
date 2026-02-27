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
// 存储在线用户: Map<socketId, {username, ip}>
const onlineUsers = new Map<string, { username: string; ip: string }>();

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
      // 这里的 username 需要从用户信息中获取，或者通过 handshake.auth 传递
      // 我们暂且允许客户端在连接后发送一个 identify 事件来绑定用户名
      next();
    });

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      // 获取客户端真实 IP
      const clientIp = (socket.handshake.headers['x-forwarded-for'] as string) || 
                       socket.handshake.address || 
                       'Unknown';

      // 监听用户身份识别
      socket.on('identify', (data: { username: string }) => {
        onlineUsers.set(socket.id, { 
          username: data.username, 
          ip: clientIp.replace('::ffff:', '') // 处理 IPv6 映射的 IPv4
        });
        // 广播最新的在线用户列表
        io.emit('update_online_users', Array.from(onlineUsers.values()));
        console.log(`User identified: ${data.username} (${clientIp})`);
      });

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
        const user = onlineUsers.get(socket.id);
        if (user) {
          onlineUsers.delete(socket.id);
          // 广播更新后的用户列表
          io.emit('update_online_users', Array.from(onlineUsers.values()));
          console.log(`User disconnected: ${user.username} (${socket.id})`);
        }
      });
    });
  } catch (error) {
    console.error('Socket initialization failed:', error);
  } finally {
    isInitializing = false;
  }

  res.end();
}
