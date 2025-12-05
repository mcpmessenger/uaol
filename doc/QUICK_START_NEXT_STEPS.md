# Quick Start: Next Steps Implementation

## 🎯 Start Here: Guest Mode (3-4 hours)

**Strategy**: 
- **Guest Mode First** - No registration required, generous free tier
- **Email Registration** - Optional upgrade for persistence
- **OAuth** - Deferred (NOT needed for MVP - only for accessing user's data)

**Why Guest Mode First**:
- Lowest barrier to entry
- Users can try immediately
- No OAuth complexity
- Faster MVP launch

**See**: `GUEST_MODE_IMPLEMENTATION.md` for full plan

---

## 🎯 Then: Optional Authentication (2-3 hours)

**Note**: OAuth (Google, Outlook, iCloud) is deferred. OAuth is only needed for accessing user's personal data (Drive, Calendar) - an enhancement, not core functionality.

**Backend Status**: 
- ✅ Registration endpoint added: `POST /auth/register`
- ✅ Login endpoint ready: `POST /auth/login` (email or API key)
- ✅ User creation with auto-generated API key
- ⏸️ OAuth routes exist but are stubbed (will be implemented later)

### Step 1: Create Auth Context (30 min)

Create `src/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/lib/api/auth';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, apiKey?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    authService.refreshUser().then(() => {
      setUser(authService.getCurrentUser());
      setLoading(false);
    });
  }, []);

  const login = async (email: string, apiKey?: string) => {
    const result = await authService.login(email, apiKey);
    if (result.success) {
      setUser(result.user);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Step 2: Create Login Page (1 hour)

Create `src/pages/Login.tsx`:
```typescript
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, apiKey || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="glass-panel p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Login to UAOL</h1>
        {/* Form fields */}
      </form>
    </div>
  );
}
```

### Step 3: Add Protected Route (30 min)

Create `src/components/ProtectedRoute.tsx`:
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
}
```

### Step 4: Update App.tsx (30 min)

Wrap routes with AuthProvider and add protected routes.

---

## 🎯 Then: User Dashboard (2-3 hours)

### Step 1: Create Dashboard Page

Use existing API endpoints:
- `GET /auth/me` - Get current user
- `GET /jobs` - List user's jobs
- `GET /billing/credits` - Get credit balance

---

## 🎯 Finally: Tool Registry (2-3 hours)

### Step 1: Create Tools Page

Use existing API endpoints:
- `GET /tools` - List all tools
- `POST /tools` - Register new tool
- `GET /tools/:id` - Get tool details

---

## 📦 Dependencies to Add

```bash
# For routing (if not already installed)
npm install react-router-dom

# For forms (optional, but helpful)
npm install react-hook-form zod @hookform/resolvers
```

---

## ✅ Checklist

- [ ] Install react-router-dom
- [ ] Create AuthContext
- [ ] Create Login page
- [ ] Create Register page
- [ ] Add ProtectedRoute component
- [ ] Update App.tsx with routing
- [ ] Test login flow
- [ ] Create Dashboard page
- [ ] Create Tools page
- [ ] Test end-to-end flow

---

**Estimated Time**: 6-8 hours for complete authentication + dashboard + tools listing

