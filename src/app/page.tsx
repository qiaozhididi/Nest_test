'use client'

import { useState, useEffect } from 'react'
import LoginForm from '@/components/LoginForm'
import RegisterForm from '@/components/RegisterForm'
import Dashboard from '@/components/Dashboard'
import { authService, User } from '@/services/authService'

type ViewMode = 'login' | 'register' | 'dashboard'

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. 检查 URL 中是否有微信登录成功的参数
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const userDataStr = searchParams.get('user_data');
    const isWechatLogin = searchParams.get('wechat_login') === 'success';

    if (isWechatLogin && token && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        // 保存到本地存储
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setViewMode('dashboard');
        
        // 清理 URL 参数，避免刷新页面再次触发逻辑
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      } catch (e) {
        console.error('解析微信登录数据失败:', e);
      }
    }

    // 2. 检查本地存储中的登录状态
    if (authService.isAuthenticated()) {
      const userData = authService.getCurrentUser()
      if (userData) {
        setUser(userData)
        setViewMode('dashboard')
      }
    }
    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setViewMode('dashboard')
  }

  const handleLogout = () => {
    authService.logout()
    setUser(null)
    setViewMode('login')
  }

  const handleSwitchToRegister = () => {
    setViewMode('register')
  }

  const handleSwitchToLogin = () => {
    setViewMode('login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  if (viewMode === 'register') {
    return <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
  }

  return (
    <LoginForm 
      onSwitchToRegister={handleSwitchToRegister}
      onLoginSuccess={handleLoginSuccess}
    />
  )
}