# Nest Test - 登录注册系统

基于 Next.js 14 和 MongoDB 的现代化登录注册系统。

## 功能特性

- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT 身份验证
- ✅ 密码加密 (bcrypt)
- ✅ MongoDB 数据存储
- ✅ 响应式界面 (Tailwind CSS)
- ✅ TypeScript 支持
- ✅ Axios HTTP 客户端封装
- ✅ 统一错误处理
- ✅ 请求/响应拦截器

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: MongoDB
- **身份验证**: JWT, bcryptjs
- **HTTP 客户端**: Axios
- **样式**: Tailwind CSS

## API 接口

### 注册接口
```
POST /api/Register
Content-Type: application/json

{
  "username": "用户名",
  "email": "邮箱",
  "password": "密码"
}
```

### 登录接口
```
POST /api/Login
Content-Type: application/json

{
  "username": "用户名或邮箱",
  "password": "密码"
}
```

## 数据库配置

MongoDB 连接配置：
- 服务器地址: 192.168.1.3
- 用户名: qzfrato
- 密码: root
- 数据库名: nest_test_db

## 环境变量

在 `.env.local` 文件中配置：

```env
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=mongodb://qzfrato:root@192.168.1.3:27017
DB_NAME=nest_test_db
```

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 访问应用：
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## Axios HTTP 客户端封装

项目使用 Axios 进行 HTTP 请求，提供统一的错误处理和拦截器功能：

### API 客户端配置 (`src/lib/apiClient.ts`)
- 自动添加 Authorization header
- 请求/响应日志记录
- 401 错误自动登出
- 10秒请求超时

### 认证服务 (`src/services/authService.ts`)
提供以下方法：
- `login(data)` - 用户登录
- `register(data)` - 用户注册  
- `logout()` - 退出登录
- `getCurrentUser()` - 获取当前用户
- `isAuthenticated()` - 检查登录状态

### 使用示例
```typescript
import { authService } from '@/services/authService'

// 登录
try {
  const response = await authService.login({
    username: 'user@example.com',
    password: 'password123'
  })
  console.log('登录成功:', response.user)
} catch (error) {
  console.error('登录失败:', error.message)
}

// 注册
try {
  const response = await authService.register({
    username: 'newuser',
    email: 'user@example.com',
    password: 'password123'
  })
  console.log('注册成功:', response.message)
} catch (error) {
  console.error('注册失败:', error.message)
}
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── Login/route.ts      # 登录API
│   │   └── Register/route.ts   # 注册API
│   ├── layout.tsx              # 页面布局
│   ├── page.tsx                # 主页面
│   └── globals.css             # 全局样式
├── components/
│   ├── LoginForm.tsx           # 登录表单
│   ├── RegisterForm.tsx        # 注册表单
│   └── Dashboard.tsx           # 用户仪表板
├── lib/
│   ├── mongodb.ts              # MongoDB连接
│   ├── auth.ts                 # 身份验证工具
│   └── apiClient.ts            # Axios客户端配置
├── services/
│   └── authService.ts          # 认证服务封装
└── types/
    └── user.ts                 # 用户类型定义
```

## 安全特性

- 密码使用 bcrypt 加密存储
- JWT token 用于身份验证
- 输入验证和错误处理
- MongoDB 连接池管理

## 开发说明

这是一个演示项目，展示了如何使用 Next.js 构建完整的用户认证系统。可以根据实际需求进行扩展和定制。