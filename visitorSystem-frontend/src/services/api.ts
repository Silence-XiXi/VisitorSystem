const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';

export interface LoginRequest {
  username: string;
  password: string;
}

interface Distributor {
  id: string;
  distributorId: string; // 分判商编号
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  accountUsername?: string;
  accountStatus?: 'active' | 'disabled';
  siteIds?: string[];
  sites?: Array<{ id: string; name: string }>;
  userId?: string;
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

interface Worker {
  id: string;
  workerId: string;
  name: string;
  phone: string;
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
  idNumber: string;
  gender: 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'INACTIVE';
  distributorId: string;
  siteId: string;
  createdAt: string;
  updatedAt: string;
  distributor?: {
    id: string;
    name: string;
  };
  site?: {
    id: string;
    name: string;
  };
}

interface VisitorRecord {
  id: string;
  workerId: string;
  siteId: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'ON_SITE' | 'LEFT' | 'PENDING';
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
  idNumber: string;
  physicalCardId?: string;
  registrarId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  worker?: {
    id: string;
    workerId: string;
    name: string;
    distributor?: {
      id: string;
      name: string;
    };
    site?: {
      id: string;
      name: string;
    };
  };
  site?: {
    id: string;
    name: string;
  };
  registrar?: {
    id: string;
    name: string;
  };
}

interface CreateWorkerRequest {
  name: string;
  phone: string;
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
  idNumber: string;
  physicalCardId?: string;
  gender: string; // 改为string类型，支持任意值
  siteId: string;
  distributorId: string;
  region: string;
  birthDate?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  workerId?: string;
  status?: string;
}

interface UpdateWorkerRequest {
  name?: string;
  phone?: string;
  idType?: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
  idNumber?: string;
  physicalCardId?: string;
  gender?: 'MALE' | 'FEMALE';
  siteId?: string;
  distributorId?: string;
  region?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  birthDate?: string | null;
  email?: string | null;
  whatsapp?: string | null;
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

  // 获取当前用户信息
  private getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
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
        let errorData: any = null;
        
        try {
          errorData = await response.json();
          console.log('错误响应数据:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorCode = errorData.statusCode || response.status;
        } catch (parseError) {
          // 如果无法解析JSON，使用默认错误信息
          console.warn('Failed to parse error response:', parseError);
        }

        // 根据状态码提供更具体的错误信息
        switch (response.status) {
          case 400:
            errorMessage = errorData?.message || '请求参数错误';
            break;
          case 401:
            errorMessage = '用户名或密码错误，或账户已被禁用';
            break;
          case 403:
            errorMessage = '没有权限访问此资源';
            break;
          case 404:
            errorMessage = errorData?.message || '请求的资源不存在';
            break;
          case 409:
            errorMessage = errorData?.message || '数据冲突，请检查输入信息';
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

      // 检查响应是否有内容
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // 对于DELETE等可能返回空响应的请求，返回空对象
        return {} as T;
      }
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

  async getAllGuards(siteId?: string): Promise<Guard[]> {
    const url = siteId ? `/admin/guards?siteId=${siteId}` : '/admin/guards';
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  async getGuardsBySite(siteId: string): Promise<Guard[]> {
    return this.getAllGuards(siteId);
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

  async updateDistributor(distributorId: string, distributorData: {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    siteIds?: string[];
    username?: string;
  }): Promise<Distributor> {
    return this.requestWithRetry(`/admin/distributors/${distributorId}`, {
      method: 'PUT',
      body: JSON.stringify(distributorData),
    });
  }

  async resetDistributorPassword(distributorId: string): Promise<{
    distributorId: string;
    distributorName: string;
    username: string;
    newPassword: string;
  }> {
    return this.requestWithRetry(`/admin/distributors/${distributorId}/reset-password`, {
      method: 'POST',
    });
  }

  async resetGuardPassword(guardId: string): Promise<{
    guardId: string;
    guardName: string;
    username: string;
    newPassword: string;
  }> {
    return this.requestWithRetry(`/admin/guards/${guardId}/reset-password`, {
      method: 'POST',
    });
  }

  async updateGuard(guardId: string, guardData: {
    name: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    siteId?: string;
    username?: string;
  }): Promise<Guard> {
    return this.requestWithRetry(`/admin/guards/${guardId}`, {
      method: 'PUT',
      body: JSON.stringify(guardData),
    });
  }

  async deleteGuard(guardId: string): Promise<{
    guardId: string;
    guardName: string;
    username: string;
  }> {
    return this.requestWithRetry(`/admin/guards/${guardId}`, {
      method: 'DELETE',
    });
  }

  async deleteDistributor(distributorId: string): Promise<{
    distributorId: string;
    distributorName: string;
    username: string;
  }> {
    return this.requestWithRetry(`/admin/distributors/${distributorId}`, {
      method: 'DELETE',
    });
  }

  async toggleGuardStatus(guardId: string): Promise<{
    guardId: string;
    guardName: string;
    username: string;
    oldStatus: string;
    newStatus: string;
  }> {
    return this.requestWithRetry(`/admin/guards/${guardId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async createGuard(guardData: {
    name: string;
    siteId: string;
    phone: string;
    email?: string;
    whatsapp?: string;
    guardId?: string;
    username: string;
    password: string;
  }): Promise<Guard> {
    return this.requestWithRetry('/admin/guards', {
      method: 'POST',
      body: JSON.stringify(guardData),
    });
  }

  async importGuards(guards: any[]): Promise<{
    success: number;
    skipped: number;
    errors: string[];
  }> {
    return this.requestWithRetry('/admin/guards/import', {
      method: 'POST',
      body: JSON.stringify({ guards }),
    });
  }

  async checkGuardExists(guardId: string, username: string): Promise<{
    guardIdExists: boolean;
    usernameExists: boolean;
  }> {
    return this.requestWithRetry(`/admin/guards/check-exists?guardId=${guardId}&username=${username}`, {
      method: 'GET',
    });
  }

  async createSite(siteData: {
    name: string;
    address: string;
    code?: string;
    manager?: string;
    phone?: string;
    status?: 'active' | 'inactive' | 'suspended';
    distributorIds?: string[];
  }): Promise<Site> {
    return this.requestWithRetry('/admin/sites', {
      method: 'POST',
      body: JSON.stringify(siteData),
    });
  }

  async updateSite(siteId: string, siteData: {
    name: string;
    address: string;
    code?: string;
    manager?: string;
    phone?: string;
    status?: 'active' | 'inactive' | 'suspended';
    distributorIds?: string[];
  }): Promise<Site> {
    return this.requestWithRetry(`/admin/sites/${siteId}`, {
      method: 'PUT',
      body: JSON.stringify(siteData),
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

  // 物品分类管理 API
  async getAllItemCategories(): Promise<Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request('/item-categories');
  }

  async createItemCategory(categoryData: {
    code?: string;
    name: string;
    description?: string;
    status?: string;
  }): Promise<{
    id: string;
    code: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request('/item-categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateItemCategory(id: string, categoryData: {
    code?: string;
    name?: string;
    description?: string;
    status?: string;
  }): Promise<{
    id: string;
    code: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request(`/item-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteItemCategory(id: string): Promise<void> {
    await this.request(`/item-categories/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleItemCategoryStatus(id: string): Promise<{
    id: string;
    code: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request(`/item-categories/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // 工人管理 API
  async getAllWorkers(filters?: {
    distributorId?: string;
    siteId?: string;
    status?: string;
  }): Promise<Worker[]> {
    const params = new URLSearchParams();
    if (filters?.distributorId) params.append('distributorId', filters.distributorId);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.status) params.append('status', filters.status);
    
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const baseEndpoint = user?.role?.toLowerCase() === 'distributor' ? '/distributors/workers' : '/admin/workers';
    const url = `${baseEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  async createWorker(workerData: CreateWorkerRequest): Promise<Worker> {
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const endpoint = user?.role?.toLowerCase() === 'distributor' ? '/distributors/workers' : '/admin/workers';
    
    return this.requestWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workerData),
    });
  }

  async updateWorker(workerId: string, workerData: UpdateWorkerRequest): Promise<Worker> {
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const endpoint = user?.role?.toLowerCase() === 'distributor' ? `/distributors/workers/${workerId}` : `/admin/workers/${workerId}`;
    
    return this.requestWithRetry(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workerData),
    });
  }

  async deleteWorker(workerId: string): Promise<void> {
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const endpoint = user?.role?.toLowerCase() === 'distributor' ? `/distributors/workers/${workerId}` : `/admin/workers/${workerId}`;
    
    await this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // 导出工人数据
  async exportWorkers(filters?: {
    siteId?: string;
    distributorId?: string;
    status?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.distributorId) params.append('distributorId', filters.distributorId);
    if (filters?.status) params.append('status', filters.status);
    
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const baseEndpoint = user?.role?.toLowerCase() === 'distributor' ? '/admin/workers/export' : '/admin/workers/export';
    const url = `${baseEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  // 导入工人数据
  async importWorkers(workers: any[]): Promise<any> {
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const endpoint = user?.role?.toLowerCase() === 'distributor' ? '/distributors/workers/import' : '/admin/workers/import';
    
    return this.requestWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workers }),
    });
  }

  // 导入工人数据（分销商）
  async importDistributorWorkers(workers: any[]): Promise<any> {
    return this.requestWithRetry('/distributors/workers/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workers }),
    });
  }

  // 直接上传Excel文件导入工人数据（分销商）
  async importDistributorWorkersFromExcel(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseURL}/distributors/workers/import-excel`;
    
    // 添加认证头
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = response.status;
        let errorData: any = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorCode = errorData.statusCode || response.status;
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }

        const error = new Error(errorMessage) as Error & { statusCode: number };
        error.statusCode = errorCode;
        throw error;
      }

      // 尝试解析JSON响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // 如果不是JSON，尝试解析文本响应
        const textResponse = await response.text();
        console.log('Non-JSON response:', textResponse);
        
        // 尝试解析为JSON
        try {
          return JSON.parse(textResponse);
        } catch {
          // 如果无法解析，返回默认结果
          return {
            success: 0,
            skipped: 0,
            errors: 1,
            errorDetails: ['无法解析服务器响应']
          };
        }
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // 直接上传Excel文件导入工人数据（管理员）
  async importAdminWorkersFromExcel(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseURL}/admin/workers/import-excel`;
    
    // 添加认证头
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = response.status;
        let errorData: any = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorCode = errorData.statusCode || response.status;
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }

        const error = new Error(errorMessage) as Error & { statusCode: number };
        error.statusCode = errorCode;
        throw error;
      }

      // 尝试解析JSON响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // 如果不是JSON，尝试解析文本响应
        const textResponse = await response.text();
        console.log('Non-JSON response:', textResponse);
        
        // 尝试解析为JSON
        try {
          return JSON.parse(textResponse);
        } catch {
          // 如果无法解析，返回默认结果
          return {
            success: 0,
            skipped: 0,
            errors: 1,
            errorDetails: ['无法解析服务器响应']
          };
        }
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // 下载工人导入模板
  async downloadWorkerTemplate(): Promise<any> {
    // 根据用户角色选择不同的端点
    const user = this.getCurrentUser();
    const endpoint = user?.role?.toLowerCase() === 'distributor' ? '/admin/workers/template' : '/admin/workers/template';
    
    return this.requestWithRetry(endpoint, {
      method: 'GET',
    });
  }

  async getDistributorWorkers(siteId?: string): Promise<Worker[]> {
    const url = siteId ? `/distributors/workers?siteId=${siteId}` : '/distributors/workers';
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  // 获取分销商关联的工地列表
  async getDistributorSites(): Promise<Site[]> {
    return this.requestWithRetry('/distributors/sites', {
      method: 'GET',
    });
  }

  // 获取分销商资料
  async getDistributorProfile(): Promise<Distributor> {
    return this.requestWithRetry('/distributors/profile', {
      method: 'GET',
    });
  }

  // 更新分销商资料
  async updateDistributorProfile(updateData: {
    name?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
  }): Promise<Distributor> {
    return this.requestWithRetry('/distributors/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
  }

  // 修改密码
  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.requestWithRetry('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // 分判商专用的工人管理API
  async createDistributorWorker(workerData: CreateWorkerRequest): Promise<Worker> {
    return this.requestWithRetry('/distributors/workers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workerData),
    });
  }

  async updateDistributorWorker(workerId: string, workerData: UpdateWorkerRequest): Promise<Worker> {
    return this.requestWithRetry(`/distributors/workers/${workerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workerData),
    });
  }

  async deleteDistributorWorker(workerId: string): Promise<void> {
    await this.request(`/distributors/workers/${workerId}`, {
      method: 'DELETE',
    });
  }

  async getSiteWorkers(): Promise<Worker[]> {
    return this.requestWithRetry('/guards/workers', {
      method: 'GET',
    });
  }

  // 访客记录相关接口
  async getVisitorRecords(filters?: {
    workerId?: string;
    siteId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    checkOutStartDate?: string;
    checkOutEndDate?: string;
    todayRelevant?: boolean;
  }): Promise<VisitorRecord[]> {
    const params = new URLSearchParams();
    if (filters?.workerId) params.append('workerId', filters.workerId);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.checkOutStartDate) params.append('checkOutStartDate', filters.checkOutStartDate);
    if (filters?.checkOutEndDate) params.append('checkOutEndDate', filters.checkOutEndDate);
    if (filters?.todayRelevant !== undefined) params.append('todayRelevant', filters.todayRelevant.toString());
    
    const url = `/visitor-records${params.toString() ? `?${params.toString()}` : ''}`;
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  async getWorkerVisitorRecords(workerId: string): Promise<VisitorRecord[]> {
    return this.requestWithRetry(`/visitor-records/worker/${workerId}`, {
      method: 'GET',
    });
  }

  async createVisitorRecord(data: {
    workerId: string;
    siteId: string;
    checkInTime?: string;
    checkOutTime?: string;
    status?: 'ON_SITE' | 'LEFT' | 'PENDING';
    idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
    idNumber: string;
    physicalCardId?: string;
    registrarId?: string;
    notes?: string;
  }): Promise<VisitorRecord> {
    return this.requestWithRetry('/visitor-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // 门卫专用的创建访客记录方法
  async createGuardVisitorRecord(data: {
    workerId: string;
    siteId: string;
    checkInTime?: string;
    checkOutTime?: string;
    status?: 'ON_SITE' | 'LEFT' | 'PENDING';
    idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
    idNumber: string;
    physicalCardId?: string;
    registrarId?: string;
    phone?: string; // 添加电话号码字段
    notes?: string;
  }): Promise<VisitorRecord> {
    return this.requestWithRetry('/guards/visitor-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async updateVisitorRecord(id: string, data: Partial<{
    workerId: string;
    siteId: string;
    checkInTime?: string;
    checkOutTime?: string;
    status?: 'ON_SITE' | 'LEFT' | 'PENDING';
    idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
    idNumber: string;
    physicalCardId?: string;
    registrarId?: string;
    notes?: string;
  }>): Promise<VisitorRecord> {
    return this.requestWithRetry(`/visitor-records/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async checkOutVisitor(id: string, checkOutTime?: string): Promise<VisitorRecord> {
    return this.requestWithRetry(`/visitor-records/${id}/checkout`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ checkOutTime }),
    });
  }

  async deleteVisitorRecord(id: string): Promise<void> {
    return this.requestWithRetry(`/visitor-records/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取工人借用物品记录
  async getWorkerBorrowRecords(workerId: string, visitorRecordId?: string): Promise<any[]> {
    console.log(`调用 getWorkerBorrowRecords API，工人ID: ${workerId}, 访客记录ID: ${visitorRecordId || '无'}`);
    try {
      let url = `/guards/borrow-records?workerId=${workerId}`;
      if (visitorRecordId) {
        url = `/guards/borrow-records?visitorRecordId=${visitorRecordId}`;
      }
      const result = await this.requestWithRetry<any[]>(url, {
        method: 'GET',
      });
      console.log(`工人 ${workerId} ${visitorRecordId ? `(访客记录ID: ${visitorRecordId})` : ''} 的借用记录 API 响应:`, result);
      return result;
    } catch (error) {
      console.error(`获取工人 ${workerId} 的借用记录失败:`, error);
      return [];
    }
  }

  // 获取所有借用物品记录（管理员用）
  async getAllBorrowRecords(filters?: {
    siteId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const url = `/admin/borrow-records${params.toString() ? `?${params.toString()}` : ''}`;
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  // 门卫相关API
  async getGuardProfile(): Promise<Guard> {
    return this.requestWithRetry('/guards/profile', {
      method: 'GET',
    });
  }

  async getGuardStats(): Promise<{
    totalWorkers: number;
    activeWorkers: number;
    inactiveWorkers: number;
    borrowedItems: number;
    returnedItems: number;
    todayVisitorRecords: number;
    todayEntered: number;
    todayExited: number;
    onSiteWorkers: number;
  }> {
    return this.requestWithRetry('/guards/stats', {
      method: 'GET',
    });
  }

  async getGuardSiteBorrowRecords(filters?: {
    status?: string;
    workerId?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.workerId) params.append('workerId', filters.workerId);
    
    const url = `/guards/borrow-records${params.toString() ? `?${params.toString()}` : ''}`;
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  async getGuardSiteVisitorRecords(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    checkOutStartDate?: string;
    checkOutEndDate?: string;
    todayRelevant?: boolean;
  }): Promise<VisitorRecord[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.checkOutStartDate) params.append('checkOutStartDate', filters.checkOutStartDate);
    if (filters?.checkOutEndDate) params.append('checkOutEndDate', filters.checkOutEndDate);
    if (filters?.todayRelevant !== undefined) params.append('todayRelevant', filters.todayRelevant.toString());
    
    const url = `/guards/visitor-records${params.toString() ? `?${params.toString()}` : ''}`;
    return this.requestWithRetry(url, {
      method: 'GET',
    });
  }

  // 根据工人编号查询工人信息
  async getWorkerByWorkerId(workerId: string): Promise<Worker> {
    return this.requestWithRetry(`/guards/workers/${workerId}`, {
      method: 'GET',
    });
  }

  // 根据工人编号或实体卡编号查询工人信息
  async getWorkerByIdentifier(identifier: string): Promise<Worker> {
    return this.requestWithRetry(`/guards/workers/identifier/${identifier}`, {
      method: 'GET',
    });
  }

  // 检查工人是否有有效的入场记录
  async checkWorkerEntryRecord(workerId: string): Promise<{
    worker: Worker;
    entryRecord: VisitorRecord;
  }> {
    return this.requestWithRetry(`/guards/workers/${workerId}/entry-record`, {
      method: 'GET',
    });
  }

  // 通过实体卡编号查询访客记录（使用checkWorkerEntryRecord接口，它支持工号或实体卡编号）
  async getVisitorRecordByPhysicalCardId(physicalCardId: string): Promise<{
    worker: Worker;
    entryRecord: VisitorRecord;
    currentBorrowedItems: any[];
  }> {
    return this.requestWithRetry(`/guards/workers/${physicalCardId}/entry-record`, {
      method: 'GET',
    });
  }

  // 创建物品借用记录
  async createBorrowRecord(data: {
    workerId: string;
    categoryId: string;
    itemCode: string;
    borrowDate: Date;
    borrowTime: string;
    notes?: string; // 注意：后端使用notes字段而不是remark
  }): Promise<any> {
    console.log('API服务：发送借用记录请求:', data);
    return this.requestWithRetry('/guards/borrow-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 归还物品
  async returnItem(recordId: string): Promise<any> {
    return this.requestWithRetry(`/guards/borrow-records/${recordId}/return`, {
      method: 'PUT',
    });
  }

  // 系统配置相关API
  async getSystemConfigs(): Promise<any[]> {
    return this.requestWithRetry('/system-config', {
      method: 'GET',
    });
  }

  async getSystemConfig(key: string, decrypt: boolean = false): Promise<any> {
    return this.requestWithRetry(`/system-config/${key}?decrypt=${decrypt}`, {
      method: 'GET',
    });
  }

  // 获取解密后的配置值
  async getDecryptedSystemConfig(key: string): Promise<string> {
    const config = await this.getSystemConfig(key, true);
    return config.config_value;
  }

  async updateSystemConfig(key: string, value: string, isEncrypted: boolean = false): Promise<any> {
    return this.requestWithRetry(`/system-config/${key}`, {
      method: 'PUT', // 改为PUT方法，CORS兼容性更好
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        config_value: value,
        is_encrypted: isEncrypted 
      }),
    });
  }

  // 邮件相关API
  async sendQRCodeEmail(data: {
    workerEmail: string;
    workerName: string;
    workerId: string;
    qrCodeDataUrl: string;
    language?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.requestWithRetry('/email/send-qrcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // 批量发送二维码邮件
  async batchSendQRCodeEmail(data: {
    workers: Array<{
      workerEmail: string;
      workerName: string;
      workerId: string;
      qrCodeDataUrl: string;
    }>;
    language?: string;
  }): Promise<{ 
    success: boolean; 
    message: string; 
    results?: {
      total: number;
      succeeded: number;
      failed: number;
      details: Array<{
        workerId: string;
        workerName: string;
        success: boolean;
        message?: string;
      }>;
    }
  }> {
    return this.requestWithRetry('/email/batch-send-qrcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // 生成工人二维码
  async generateWorkerQRCode(workerId: string): Promise<{ qrCodeDataUrl: string }> {
    // 这里使用自定义的QRCode库生成二维码
    try {
      // 引入QRCode库
      const QRCode = await import('qrcode');
      // 生成二维码图片
      const qrCodeDataUrl = await QRCode.toDataURL(workerId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return { qrCodeDataUrl };
    } catch (error) {
      console.error('Generate worker QR code failed:', error);
      throw new Error('Generate QR code failed');
    }
  }

  async testEmailConfig(): Promise<{ success: boolean; message: string }> {
    return this.requestWithRetry('/email/test-config', {
      method: 'POST',
    });
  }

}

export const apiService = new ApiService();
export default apiService;

// 导出工人相关类型
export type { Worker, CreateWorkerRequest, UpdateWorkerRequest, VisitorRecord };