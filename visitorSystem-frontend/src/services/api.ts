const API_BASE_URL = 'http://localhost:3000';

export interface LoginRequest {
  username: string;
  password: string;
}

interface Distributor {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  accountUsername?: string;
  accountStatus?: 'active' | 'disabled';
  siteIds?: string[];
  sites?: Array<{ id: string; name: string }>;
  user?: {
    username: string;
    status: string;
    createdAt: string;
  };
}

interface Guard {
  id: string;
  guardId: string;
  name: string;
  siteId: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  accountUsername?: string;
  accountStatus?: 'active' | 'disabled';
  status?: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
  site?: {
    id: string;
    name: string;
  };
  user?: {
    username: string;
    status: string;
    createdAt: string;
  };
}

interface Site {
  id: string;
  name: string;
  address: string;
  code?: string;
  manager?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'suspended';
  distributorIds?: string[];
  distributors?: Array<{ id: string; name: string }>;
  guards?: Array<{ id: string; name: string }>;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    role: string;
    status: string;
    distributor?: Distributor;
    guard?: Guard;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
}

class ApiService {
  private baseURL: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1秒

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 重试机制
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error: unknown) {
      // 如果是网络错误且还有重试次数，则重试
      if (error && typeof error === 'object' && 'isNetworkError' in error && 
          (error as { isNetworkError: boolean }).isNetworkError && retryCount < this.maxRetries) {
        console.log(`请求失败，正在重试 (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * (retryCount + 1)); // 递增延迟
        return this.requestWithRetry<T>(endpoint, options, retryCount + 1);
      }
      
      // 如果是401错误，清除本地存储的token
      if (error && typeof error === 'object' && 'statusCode' in error && 
          (error as { statusCode: number }).statusCode === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
      
      throw error;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 添加认证头
    const token = localStorage.getItem('access_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = response.status;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorCode = errorData.statusCode || response.status;
        } catch (parseError) {
          // 如果无法解析JSON，使用默认错误信息
          console.warn('Failed to parse error response:', parseError);
        }

        // 根据状态码提供更具体的错误信息
        switch (response.status) {
          case 401:
            errorMessage = '用户名或密码错误，或账户已被禁用';
            break;
          case 403:
            errorMessage = '没有权限访问此资源';
            break;
          case 404:
            errorMessage = '请求的资源不存在';
            break;
          case 422:
            errorMessage = '请求参数验证失败';
            break;
          case 500:
            errorMessage = '服务器内部错误，请稍后重试';
            break;
          case 0:
            errorMessage = '网络连接失败，请检查网络设置';
            break;
        }

        const error = new Error(errorMessage) as Error & { statusCode: number; originalResponse: Response };
        error.statusCode = errorCode;
        error.originalResponse = response;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      
      // 如果是网络错误，提供更友好的错误信息
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error('网络连接失败，请检查网络设置或服务器状态') as Error & { statusCode: number; isNetworkError: boolean };
        networkError.statusCode = 0;
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      throw error;
    }
  }

  // 认证相关API
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.requestWithRetry<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getProfile(): Promise<{
    id: string;
    username: string;
    role: string;
    status: string;
    distributor?: Distributor;
    guard?: Guard;
    lastActivity?: string;
  }> {
    return this.requestWithRetry('/auth/profile', {
      method: 'GET',
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.requestWithRetry('/auth/logout', {
      method: 'POST',
    });
  }

  // 用户相关API
  async getUsers(): Promise<{
    id: string;
    username: string;
    role: string;
    status: string;
    distributor?: Distributor;
    guard?: Guard;
  }[]> {
    return this.requestWithRetry('/users', {
      method: 'GET',
    });
  }

  async getUserById(id: string): Promise<{
    id: string;
    username: string;
    role: string;
    status: string;
    distributor?: Distributor;
    guard?: Guard;
  }> {
    return this.requestWithRetry(`/users/${id}`, {
      method: 'GET',
    });
  }

  // 管理员相关API
  async getSystemStats(): Promise<{
    totalUsers: number;
    totalDistributors: number;
    totalSites: number;
    totalGuards: number;
    totalWorkers: number;
    activeWorkers: number;
    inactiveWorkers: number;
    totalItems: number;
    borrowedItems: number;
    availableItems: number;
  }> {
    return this.requestWithRetry('/admin/stats', {
      method: 'GET',
    });
  }

  async getAllDistributors(): Promise<Distributor[]> {
    return this.requestWithRetry('/admin/distributors', {
      method: 'GET',
    });
  }

  async getAllSites(): Promise<Site[]> {
    return this.requestWithRetry('/admin/sites', {
      method: 'GET',
    });
  }

  async getAllGuards(): Promise<Guard[]> {
    return this.requestWithRetry('/admin/guards', {
      method: 'GET',
    });
  }

  async createDistributor(distributorData: {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    username: string;
    password: string;
    siteIds?: string[];
  }): Promise<Distributor> {
    return this.requestWithRetry('/admin/distributors', {
      method: 'POST',
      body: JSON.stringify(distributorData),
    });
  }

  async createGuard(guardData: {
    guardId: string;
    name: string;
    siteId: string;
    phone: string;
    email?: string;
    whatsapp?: string;
    username: string;
    password: string;
  }): Promise<Guard> {
    return this.requestWithRetry('/admin/guards', {
      method: 'POST',
      body: JSON.stringify(guardData),
    });
  }

  async updateUserStatus(userId: string, status: string): Promise<{
    id: string;
    username: string;
    status: string;
  }> {
    return this.requestWithRetry(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;
