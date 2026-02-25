# Nest Test - 登录注册与实时聊天系统

基于 Next.js 14、Socket.io 和 MongoDB 的现代化全栈演示系统。

## 功能特性

- ✅ **用户认证**: 注册、登录、JWT 身份验证
- ✅ **安全加固**: 密码使用 `bcrypt` 加密，聊天记录使用 `AES` 加密存储
- ✅ **实时聊天**: 基于 Socket.io 的局域网实时聊天室
- ✅ **历史记录**: 自动加载并解密显示最近 100 条聊天记录
- ✅ **数据库支持**: 使用 MongoDB 存储用户信息和加密聊天数据
- ✅ **响应式界面**: 使用 Tailwind CSS 构建的现代化 UI
- ✅ **局域网支持**: 支持通过本机 IP 供局域网内其他设备访问

## 技术栈

- **前端**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, Socket.io (Pages API)
- **数据库**: MongoDB
- **安全性**: JWT, bcryptjs, crypto-js (AES-256)
- **HTTP 客户端**: Axios

## 核心功能说明

### 1. 实时聊天 (Socket.io)
- 服务端位于 `src/pages/api/socket.ts`，利用 Next.js 的 Pages API 路由实现。
- 客户端在 `src/components/ChatRoom.tsx` 中建立连接并进行消息收发。

### 2. 聊天加密 (AES)
- 所有聊天消息在存入数据库前都会通过 `CryptoJS` 进行 AES 加密。
- 密钥由环境变量 `CHAT_ENCRYPTION_KEY` 控制。
- 只有通过应用程序界面登录的用户才能解密并查看内容，直接查看数据库看到的是加密后的密文。

## 环境配置

在 `.env.local` 文件中配置以下变量：

```env
JWT_SECRET=your-jwt-secret-key
MONGODB_URI=mongodb://username:password@host:port/dbname?authSource=admin
DB_NAME=MongoTest
CHAT_ENCRYPTION_KEY=your-chat-encryption-secret-key
```

## 安装与运行

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **开发模式运行**：
   ```bash
   npm run dev
   ```

3. **局域网共享模式运行**（推荐用于聊天测试）：
   ```bash
   npm run dev:network
   ```
   *启动后，局域网内的用户可以通过访问 `http://你的IP:3001` 进行协作。*

## API 接口概览

- `POST /api/Register`: 用户注册
- `POST /api/Login`: 用户登录
- `GET /api/ChatHistory`: 获取解密后的聊天历史记录
- `GET /api/socket`: 初始化 Socket.io 服务端连接

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── Login/      # 登录 API
│   │   ├── Register/   # 注册 API
│   │   └── ChatHistory/# 聊天记录获取与解密
│   └── ...
├── components/
│   ├── ChatRoom.tsx    # 聊天室核心组件
│   ├── Dashboard.tsx   # 用户面板（集成聊天室）
│   └── ...
├── lib/
│   ├── encryption.ts   # AES 加密/解密工具
│   ├── mongodb.ts      # 数据库连接
│   └── ...
├── pages/
│   └── api/
│       └── socket.ts   # Socket.io 服务端逻辑
└── types/
    ├── chat.ts         # 聊天数据类型定义
    └── user.ts         # 用户数据类型定义
```

## 安全建议

- 本项目仅作为功能演示，在生产环境中请确保：
  - 使用更复杂的 `JWT_SECRET` 和 `CHAT_ENCRYPTION_KEY`。
  - 启用 HTTPS 传输。
  - 完善数据库的访问控制权限。
