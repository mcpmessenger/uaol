/**
 * API Client for UAOL Backend
 * Handles all communication with the backend services
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('uaol_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('uaol_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('uaol_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (typeof window !== 'undefined') {
      // Guest mode - send guest ID
      const { getGuestId } = await import('../guest-session');
      headers['X-Guest-Id'] = getGuestId();
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      };
    }
  }

  // Auth endpoints
  async register(email: string): Promise<ApiResponse<{ token: string; user: any; apiKey: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(email: string, apiKey?: string): Promise<ApiResponse<{ token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, apiKey }),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request('/auth/me');
  }

  // Job endpoints
  async createJob(workflowDefinition: any): Promise<ApiResponse<any>> {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify({ workflow_definition: workflowDefinition }),
    });
  }

  async getJob(jobId: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${jobId}`);
  }

  async listJobs(limit?: number): Promise<ApiResponse<any[]>> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/jobs${params}`);
  }

  // Tool endpoints
  async listTools(): Promise<ApiResponse<any[]>> {
    return this.request('/tools');
  }

  async getTool(toolId: string): Promise<ApiResponse<any>> {
    return this.request(`/tools/${toolId}`);
  }

  // Chat/Workflow endpoints
  async sendChatMessage(message: string, fileId?: string, provider?: 'openai' | 'gemini' | 'claude'): Promise<ApiResponse<any>> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, fileId, provider }),
    });
  }

  // API Key management endpoints
  async setApiKey(provider: 'openai' | 'gemini' | 'claude', apiKey: string, isDefault: boolean = false): Promise<ApiResponse<any>> {
    return this.request('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey, isDefault }),
    });
  }

  async getApiKeys(): Promise<ApiResponse<Array<{ provider: string; isDefault: boolean; maskedKey: string; createdAt: string; updatedAt: string }>>> {
    return this.request('/api-keys');
  }

  async getApiKey(provider: 'openai' | 'gemini' | 'claude'): Promise<ApiResponse<{ provider: string; isDefault: boolean; maskedKey: string } | null>> {
    return this.request(`/api-keys/${provider}`);
  }

  async setDefaultProvider(provider: 'openai' | 'gemini' | 'claude'): Promise<ApiResponse<any>> {
    return this.request(`/api-keys/${provider}/default`, {
      method: 'PUT',
    });
  }

  async deleteApiKey(provider: 'openai' | 'gemini' | 'claude'): Promise<ApiResponse<any>> {
    return this.request(`/api-keys/${provider}`, {
      method: 'DELETE',
    });
  }

  // File upload endpoint
  async uploadFiles(files: File[]): Promise<ApiResponse<{ files: any[]; summary: any }>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const url = `${this.baseUrl}/chat/upload`;
    
    const headers: HeadersInit = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (typeof window !== 'undefined') {
      const { getGuestId } = await import('../guest-session');
      headers['X-Guest-Id'] = getGuestId();
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      };
    }
  }

  // Voice endpoints
  async transcribeAudio(audioBlob: Blob): Promise<ApiResponse<{ text: string }>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const url = `${this.baseUrl}/chat/transcribe`;
    
    const headers: HeadersInit = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (typeof window !== 'undefined') {
      const { getGuestId } = await import('../guest-session');
      headers['X-Guest-Id'] = getGuestId();
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      };
    }
  }
}

export const apiClient = new ApiClient();

