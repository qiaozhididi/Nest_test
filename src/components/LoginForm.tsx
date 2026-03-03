'use client'

import { useState, useEffect } from 'react'
import { authService, LoginRequest } from '@/services/authService'
import { ErrorMessages } from '@/lib/errorMessages'

interface LoginFormProps {
  onSwitchToRegister: () => void
  onLoginSuccess: (user: any) => void
}

export default function LoginForm({ onSwitchToRegister, onLoginSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const loginData: LoginRequest = {
        username: formData.username,
        password: formData.password
      }
      
      const response = await authService.login(loginData)
      
      // 保存token和用户信息
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      onLoginSuccess(response.user)
    } catch (error: any) {
      setError(error.message || ErrorMessages.LOGIN_FAILED)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleWechatLogin = () => {
    // 跳转到微信授权 API
    window.location.href = '/api/auth/wechat';
  };

  const handleWechatShortcutLogin = () => {
    // 跳转到微信快捷登录授权 API
    window.location.href = '/api/auth/wechat?type=shortcut';
  };

  // 检测是否在微信浏览器中
  const [isWechatBrowser, setIsWechatBrowser] = useState(false);
  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isWechat = ua.indexOf('micromessenger') !== -1;
    setIsWechatBrowser(isWechat);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录您的账户
          </h2>
        </div>
        <div className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  用户名或邮箱
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="请输入用户名或邮箱"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>

          {/* 微信扫码登录入口 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">其他登录方式</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {isWechatBrowser && (
                <button
                  onClick={handleWechatShortcutLogin}
                  className="w-full flex justify-center items-center py-2 px-4 border border-green-500 rounded-md shadow-sm bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.22 3.32C4.12 3.32 0.8 6.13 0.8 9.58c0 1.94 1.05 3.66 2.7 4.87l-.68 2.05 2.38-1.19c.64.19 1.32.3 2.02.3 4.1 0 7.42-2.81 7.42-6.26S12.32 3.32 8.22 3.32zm7.42 6.26c-.05 0-.11 0-.16.01.03.22.05.44.05.67 0 4.12-3.32 7.46-7.42 7.46-.72 0-1.42-.1-2.07-.29L3.86 19.3l2.67-1.33c.52.12 1.06.18 1.61.18 4.1 0 7.42-2.81 7.42-6.26 0-.79-.17-1.54-.48-2.21.36-.07.74-.1 1.13-.1 4.1 0 7.42 2.81 7.42 6.26 0 1.94-1.05 3.66-2.7 4.87l.68 2.05-2.38-1.19c-.64.19-1.32.3-2.02.3-4.1 0-7.42-2.81-7.42-6.26 0-.7-.11-1.36-.31-1.98z"/>
                  </svg>
                  微信快捷登录
                </button>
              )}
              
              <button
                onClick={handleWechatLogin}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.22 3.32C4.12 3.32 0.8 6.13 0.8 9.58c0 1.94 1.05 3.66 2.7 4.87l-.68 2.05 2.38-1.19c.64.19 1.32.3 2.02.3 4.1 0 7.42-2.81 7.42-6.26S12.32 3.32 8.22 3.32zm7.42 6.26c-.05 0-.11 0-.16.01.03.22.05.44.05.67 0 4.12-3.32 7.46-7.42 7.46-.72 0-1.42-.1-2.07-.29L3.86 19.3l2.67-1.33c.52.12 1.06.18 1.61.18 4.1 0 7.42-2.81 7.42-6.26 0-.79-.17-1.54-.48-2.21.36-.07.74-.1 1.13-.1 4.1 0 7.42 2.81 7.42 6.26 0 1.94-1.05 3.66-2.7 4.87l.68 2.05-2.38-1.19c-.64.19-1.32.3-2.02.3-4.1 0-7.42-2.81-7.42-6.26 0-.7-.11-1.36-.31-1.98z"/>
                </svg>
                微信扫码登录
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              还没有账户？点击注册
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}