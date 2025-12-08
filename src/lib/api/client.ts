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

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        
        if (typeof window !== 'undefined') {
          const { toast } = await import('@/hooks/use-toast');
          toast({
            variant: 'destructive',
            title: 'Rate Limit Exceeded',
            description: retryAfter 
              ? `Please wait ${retryAfter} seconds before trying again.`
              : 'Too many requests. Please wait a moment and try again.',
          });
        }
        
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Rate limit exceeded. Please try again later.',
            details: { retryAfter, rateLimitRemaining, rateLimitReset },
          },
        };
      }

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          const { toast } = await import('@/hooks/use-toast');
          toast({
            variant: 'destructive',
            title: 'Session Expired',
            description: 'Please sign in again to continue.',
          });
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
        
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Your session has expired. Please sign in again.',
          },
        };
      }

      // Handle 500 Server Error
      if (response.status >= 500) {
        if (typeof window !== 'undefined') {
          const { toast } = await import('@/hooks/use-toast');
          toast({
            variant: 'destructive',
            title: 'Server Error',
            description: 'Something went wrong on our end. Please try again in a moment.',
          });
        }
      }

      const data = await response.json();

      if (!response.ok) {
        // Show user-friendly error message
        if (typeof window !== 'undefined' && response.status !== 401 && response.status !== 429) {
          const { toast } = await import('@/hooks/use-toast');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          });
        }

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
      // Handle network errors
      if (typeof window !== 'undefined') {
        const { toast } = await import('@/hooks/use-toast');
        const isOffline = !navigator.onLine;
        
        toast({
          variant: 'destructive',
          title: isOffline ? 'You\'re Offline' : 'Network Error',
          description: isOffline 
            ? 'Please check your internet connection and try again.'
            : 'Unable to connect to the server. Please try again.',
        });
      }

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

  async registerTool(tool: {
    name: string;
    gateway_url: string;
    credit_cost_per_call?: number;
    protocol?: 'json-rpc' | 'rest';
  }): Promise<ApiResponse<any>> {
    return this.request('/tools', {
      method: 'POST',
      body: JSON.stringify({
        name: tool.name,
        gateway_url: tool.gateway_url,
        credit_cost_per_call: tool.credit_cost_per_call || 1,
        protocol: tool.protocol || 'json-rpc',
      }),
    });
  }

  async approveTool(toolId: string): Promise<ApiResponse<any>> {
    return this.request(`/tools/${toolId}/approve`, {
      method: 'POST',
    });
  }

  async getToolMethods(toolId: string): Promise<ApiResponse<any>> {
    return this.request(`/proxy/${toolId}/tools`);
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

  // Workflow endpoints
  async createWorkflow(workflow: any): Promise<ApiResponse<{ workflowId: string }>> {
    return this.request('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async getWorkflows(): Promise<ApiResponse<{ workflows: any[] }>> {
    return this.request('/workflows');
  }

  async getWorkflow(workflowId: string): Promise<ApiResponse<any>> {
    return this.request(`/workflows/${workflowId}`);
  }

  async createShareLink(workflowId: string, permission: 'read' | 'editor' = 'editor', expiresAt?: string): Promise<ApiResponse<any>> {
    return this.request(`/workflows/${workflowId}/share-links`, {
      method: 'POST',
      body: JSON.stringify({ permission, expiresAt }),
    });
  }

  async listShareLinks(workflowId: string): Promise<ApiResponse<any>> {
    return this.request(`/workflows/${workflowId}/share-links`);
  }

  async executeWorkflow(workflowId: string, inputs?: Record<string, any>): Promise<ApiResponse<{ jobId: string }>> {
    return this.request(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    });
  }

  async getWorkflowExecutionStatus(jobId: string): Promise<ApiResponse<any>> {
    return this.request(`/jobs/${jobId}`);
  }

  // Billing endpoints
  async getCredits(): Promise<ApiResponse<{ credits: string }>> {
    return this.request('/billing/credits');
  }

  // User profile endpoints
  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('/users/profile');
  }

  async updateProfile(profile: { email?: string; avatarUrl?: string | null }): Promise<ApiResponse<any>> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  // File/Document management endpoints
  async listFiles(): Promise<ApiResponse<Array<{ fileId: string; filename: string; key: string; url: string }>>> {
    return this.request('/storage/files');
  }

  async deleteFile(fileId: string): Promise<ApiResponse<any>> {
    return this.request(`/storage/files/${fileId}`, {
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

