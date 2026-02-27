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
  const [onlineUsers, setOnlineUsers] = useState<{ username: string; ip: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollHeightRef = useRef<number>(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
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
        const response = await axios.get('/api/ChatHistory?limit=50');
        setMessages(response.data.messages);
        setHasMore(response.data.hasMore);
        // 初始加载完成后滚动到底部
        setTimeout(() => scrollToBottom('auto'), 100);
      } catch (error: any) {
        console.error('Error fetching chat history:', error);
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
          // 连接成功后，发送身份信息
          newSocket.emit('identify', { username: user.username });
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
          // 收到新消息时滚动到底部
          setTimeout(() => scrollToBottom(), 50);
        });

        newSocket.on('update_online_users', (users: { username: string; ip: string }[]) => {
          console.log('Online users updated:', users);
          setOnlineUsers(users);
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
    // scrollToBottom(); // 移除这个 useEffect 中的滚动，改为按需滚动
  }, [messages]);

  // 加载更多历史记录
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    // 记录当前滚动容器的高度
    if (scrollContainerRef.current) {
      lastScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
    }

    try {
      const firstMessageTimestamp = messages[0].timestamp;
      const response = await axios.get(`/api/ChatHistory?limit=50&before=${firstMessageTimestamp}`);
      
      const newMessages = response.data.messages;
      setHasMore(response.data.hasMore);
      
      if (newMessages.length > 0) {
        setMessages(prev => [...newMessages, ...prev]);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 处理滚动事件
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  // 当加载更多消息后，保持滚动位置
  useEffect(() => {
    if (isLoadingMore) return;
    
    if (scrollContainerRef.current && lastScrollHeightRef.current > 0) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - lastScrollHeightRef.current;
      scrollContainerRef.current.scrollTop = heightDifference;
      lastScrollHeightRef.current = 0; // 重置
    }
  }, [messages, isLoadingMore]);

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
      } else {
        // 自己发送消息后也滚动到底部
        setTimeout(() => scrollToBottom(), 50);
      }
    });
    setInputValue('');
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* 在线用户列表 - 侧边栏 */}
      <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-100">
          <h3 className="text-sm font-bold text-gray-700 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            在线用户 ({onlineUsers.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {onlineUsers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-4">暂无用户在线</p>
          ) : (
            onlineUsers.map((onlineUser, idx) => (
              <div 
                key={`${onlineUser.username}-${idx}`}
                className="flex flex-col p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-gray-200"
              >
                <span className="text-sm font-medium text-gray-800">{onlineUser.username}</span>
                <span className="text-[10px] text-gray-400 font-mono">{onlineUser.ip}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 聊天主界面 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">公共聊天室</h2>
          <p className="text-xs text-gray-500">局域网内所有用户均可参与</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white" ref={scrollContainerRef} onScroll={handleScroll}>
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-xs text-gray-500">正在加载历史消息...</span>
            </div>
          )}
          {!hasMore && messages.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-400">
              没有更多消息了
            </div>
          )}
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
  </div>
  );
}
