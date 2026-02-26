import { ErrorMessages } from './errorMessages';

// 使用原生 fetch API 实现类似 alova 的功能
class AlovaLikeClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
  }) {
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || 10000;
    this.defaultHeaders = config.headers || {};
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // 从本地存储获取 token
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        ...this.defaultHeaders,
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      console.log('API请求:', options.method || 'GET', url);

      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('API响应:', response.status, url);

      if (!response.ok) {
        // 处理 401 未授权错误
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      let finalError = error;
      if (error.name === 'AbortError') {
        finalError = new Error(ErrorMessages.TIMEOUT);
      } else if (!window.navigator.onLine) {
        finalError = new Error(ErrorMessages.NETWORK_ERROR);
      }
      
      console.error('请求错误:', finalError);
      throw finalError;
    }
  }

  // 类似 alova 的 Get 方法
  Get<T>(url: string): Promise<T> {
    return this.makeRequest<T>(url, {
      method: 'GET',
    });
  }

  // 类似 alova 的 Post 方法
  Post<T>(url: string, data?: any): Promise<T> {
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 类似 alova 的 Put 方法
  Put<T>(url: string, data?: any): Promise<T> {
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 类似 alova 的 Delete 方法
  Delete<T>(url: string): Promise<T> {
    return this.makeRequest<T>(url, {
      method: 'DELETE',
    });
  }
}

// 创建 API 客户端实例
const apiClient = new AlovaLikeClient({
  baseURL: '', // 使用相对路径以支持 3001 端口
  timeout: 10000, // 10秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;