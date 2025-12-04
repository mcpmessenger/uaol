// Shared TypeScript types across all services

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies?: {
    database?: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
    mq?: 'connected' | 'disconnected';
  };
}

