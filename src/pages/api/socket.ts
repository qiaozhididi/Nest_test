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
// 存储在线用户: Map<socketId, {username, ip, userId}>
const onlineUsers = new Map<string, { username: string; ip: string; userId: string }>();

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
      socket.on('identify', (data: { username: string; userId: string }) => {
        onlineUsers.set(socket.id, { 
          username: data.username, 
          userId: data.userId,
          ip: clientIp.replace('::ffff:', '') // 处理 IPv6 映射的 IPv4
        });
        // 广播最新的在线用户列表
        io.emit('update_online_users', Array.from(onlineUsers.values()));
        console.log(`User identified: ${data.username} (${clientIp})`);
      });

      // 监听私聊消息
      socket.on('send_private_message', async (data: { 
        toUserId: string; 
        content: string;
        senderId: string;
        senderName: string;
      }, callback?: Function) => {
        console.log('Private message event received:', data);
        
        if (!data.content || !data.toUserId) {
          if (callback) callback({ error: 'Invalid private message data' });
          return;
        }

        const encryptedContent = encryptMessage(data.content);
        const newMessage = {
          senderId: data.senderId,
          senderName: data.senderName,
          toUserId: data.toUserId,
          content: encryptedContent,
          timestamp: new Date(),
          isPrivate: true
        };

        try {
          // 保存私聊消息到数据库
          await chatCollection.insertOne(newMessage as any);

          // 寻找目标用户的所有在线 socket 并推送
          let found = false;
          Array.from(onlineUsers.entries()).forEach(([sid, info]) => {
            if (info.userId === data.toUserId) {
              io.to(sid).emit('receive_private_message', {
                ...newMessage,
                content: data.content // 发送明文
              });
              found = true;
            }
          });

          // 也发给发送者自己，以便在多个设备同步
          socket.emit('receive_private_message', {
            ...newMessage,
            content: data.content
          });

          if (callback) callback({ success: true, delivered: found });
        } catch (error) {
          console.error('Failed to save private message:', error);
          if (callback) callback({ error: 'Failed to save message' });
        }
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
