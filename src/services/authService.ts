import apiClient from '@/lib/apiClient';

// 定义接口类型
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface ApiError {
  error: string;
}

// API 服务类
class AuthService {
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // 使用 alova 创建 POST 请求
      const response = await apiClient.Post<LoginResponse>('/api/Login', data);
      return response;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('登录请求失败，请检查网络连接');
    }
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      // 使用 alova 创建 POST 请求
      const response = await apiClient.Post<RegisterResponse>('/api/Register', data);
      return response;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('注册请求失败，请检查网络连接');
    }
  }

  /**
   * 退出登录
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 获取token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }
}

// 导出服务实例
export const authService = new AuthService();

// 导出默认实例
export default authService;