'use client'

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { ChatMessage } from '@/types/chat';
import { ErrorMessages } from '@/lib/errorMessages';

interface User {
  id: string;
  username: string;
  email: string;
}

interface ChatRoomProps {
  user: User;
}

export default function ChatRoom({ user }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 格式化日期为：2024年3月14日 星期四
  const formatFullDate = (date: Date | string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekDay = weekDays[d.getDay()];
    return `${year}年${month}月${day}日 ${weekDay}`;
  };

  // 格式化时间为：14:30:05
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  // 检查两个日期是否是同一天
  const isSameDay = (date1: Date | string, date2: Date | string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  useEffect(() => {
    // Fetch initial chat history
    const fetchHistory = async () => {
      try {
        const response = await axios.get('/api/ChatHistory');
        setMessages(response.data);
      } catch (error: any) {
        console.error('Error fetching chat history:', error);
        // 如果是 401 错误，可能是 token 过期或无效，不在这里弹窗，由 apiClient 处理
        if (error.response?.status !== 401) {
          alert(ErrorMessages.FETCH_HISTORY_FAILED);
        }
      }
    };

    fetchHistory();

    // Initialize socket connection
    const initSocket = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Trigger the socket initialization on the server
        await fetch('/api/socket', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });

        const newSocket = io({
          path: '/socket.io',
          addTrailingSlash: false,
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          auth: {
            token: token
          }
        });

        newSocket.on('connect', () => {
          console.log('Connected to socket server, ID:', newSocket.id);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          if (error.message.includes('Authentication error')) {
            console.warn('Socket 认证失败，可能 Token 已过期');
          }
        });

        newSocket.on('receive_message', (message: ChatMessage) => {
          console.log('Received real-time message:', message);
          setMessages((prev) => {
            // 防止重复消息
            const exists = prev.some(m => m._id === message._id && m._id !== undefined);
            if (exists) return prev;
            return [...prev, message];
          });
        });

        setSocket(newSocket);
        return newSocket;
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    const socketPromise = initSocket();

    return () => {
      socketPromise.then(s => {
        if (s) {
          console.log('Disconnecting socket:', s.id);
          s.off('receive_message');
          s.disconnect();
        }
      });
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    const messageData = {
      senderId: user.id,
      senderName: user.username,
      content: inputValue,
    };

    socket.emit('send_message', messageData, (response: any) => {
      if (response?.error) {
        console.error('Send message error:', response.error);
        alert(ErrorMessages.SEND_MESSAGE_FAILED);
      }
    });
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-800">公共聊天室</h2>
        <p className="text-xs text-gray-500">局域网内所有用户均可参与</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const showDateSeparator =
            index === 0 || !isSameDay(messages[index - 1].timestamp, msg.timestamp);

          return (
            <div key={msg._id?.toString() || index} className="space-y-4">
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <div className="bg-gray-200 text-gray-500 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                    {formatFullDate(msg.timestamp)}
                  </div>
                </div>
              )}
              <div
                className={`flex flex-col ${
                  msg.senderId === user.id ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.senderId === user.id
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-black"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
