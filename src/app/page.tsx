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
    // 检查本地存储中的登录状态
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