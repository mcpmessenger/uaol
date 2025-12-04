/**
 * Authentication utilities for UAOL Frontend
 */

import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  subscriptionTier: string;
  credits: string;
}

class AuthService {
  private currentUser: User | null = null;

  async login(email: string, apiKey?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await apiClient.login(email, apiKey);
    
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token);
      
      // Fetch user details
      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        this.currentUser = userResponse.data;
        return { success: true, user: this.currentUser };
      }
    }

    return {
      success: false,
      error: response.error?.message || 'Login failed',
    };
  }

  logout() {
    apiClient.clearToken();
    this.currentUser = null;
  }

  isAuthenticated(): boolean {
    return apiClient['token'] !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async refreshUser(): Promise<void> {
    if (this.isAuthenticated()) {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        this.currentUser = response.data;
      }
    }
  }
}

export const authService = new AuthService();

