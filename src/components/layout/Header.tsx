import { motion } from "framer-motion";
import { Workflow, MessageSquare, Moon, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditBalance } from "@/components/billing/CreditBalance";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import logo from "@/assets/logo.png";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isWorkflowPage = location.pathname === '/workflow';
  const [user, setUser] = useState<{ email: string; id: string; avatarUrl?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('uaol_token');
    if (token) {
      try {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data) {
          console.log('Header: User data fetched', {
            email: response.data.email,
            hasAvatar: !!response.data.avatarUrl,
            avatarUrl: response.data.avatarUrl?.substring(0, 50) || 'none'
          });
          setUser({
            email: response.data.email || '',
            id: response.data.id || '',
            avatarUrl: response.data.avatarUrl || null,
          });
        } else {
          // If getCurrentUser fails, try getProfile as fallback
          try {
            const profileResponse = await apiClient.getProfile();
            if (profileResponse.success && profileResponse.data) {
              setUser({
                email: profileResponse.data.email || '',
                id: profileResponse.data.id || '',
                avatarUrl: profileResponse.data.avatarUrl || null,
              });
            } else {
              setUser(null);
            }
          } catch (profileError) {
            console.warn('Failed to fetch user profile:', profileError);
            setUser(null);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch user data:', error);
        // Don't set user to null on error - keep showing avatar with logout option
        // This allows users to logout even if profile fetch fails
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUser();

    // Listen for storage changes (e.g., when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'uaol_token') {
        fetchUser();
      }
    };

    // Also listen for custom event when user logs in (for same-tab updates)
    const handleUserLogin = () => {
      fetchUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-logged-in', handleUserLogin);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-logged-in', handleUserLogin);
    };
  }, []);

  // Generate initials from email
  const getInitials = (email: string): string => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  // Generate fallback avatar URL from email using UI Avatars
  const getFallbackAvatarUrl = (email: string): string => {
    if (!email) return '';
    const name = email.split('@')[0];
    const encodedName = encodeURIComponent(name);
    // Use primary color for background
    return `https://ui-avatars.com/api/?name=${encodedName}&background=6366f1&color=fff&size=128&bold=true`;
  };

  const handleLogout = () => {
    apiClient.clearToken();
    setUser(null);
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('storage'));
    // Navigate to home page
    navigate('/');
  };

  return (
    <header className="flex-shrink-0 h-16 border-b border-border/10 bg-transparent">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo & Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <img src={logo} alt="UAOL Logo" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              UAOL
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Universal AI Orchestration
            </p>
          </div>
        </motion.div>

        {/* Center Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden md:flex items-center gap-2"
        >
          {isWorkflowPage ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => navigate('/')}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => navigate('/workflow')}
            >
              <Workflow className="w-4 h-4" />
              Workflows
            </Button>
          )}
        </motion.div>

        {/* Right Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          {user && <CreditBalance className="hidden sm:flex" />}
          <ThemeToggle />
          {isLoading ? (
            <div className="ml-2 w-9 h-9 rounded-xl bg-muted animate-pulse" />
          ) : (user || localStorage.getItem('uaol_token')) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 w-9 h-9 rounded-xl p-0 hover:bg-primary/10 transition-colors"
                  aria-label="User menu"
                >
                  <Avatar className="w-9 h-9 border border-primary/20 cursor-pointer">
                    <AvatarImage 
                      src={
                        user?.avatarUrl 
                          ? (user.avatarUrl.startsWith('http') 
                              ? user.avatarUrl 
                              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${user.avatarUrl}`)
                          : user?.email ? getFallbackAvatarUrl(user.email) : undefined
                      } 
                      alt={user?.email || 'User'} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          Signed in
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">User</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Profile unavailable
                      </p>
                    </div>
                  </DropdownMenuLabel>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/30 transition-colors"
              onClick={() => navigate("/login")}
              aria-label="Login"
            >
              <User className="w-5 h-5 text-primary" />
            </Button>
          )}
        </motion.div>
      </div>
    </header>
  );
}
