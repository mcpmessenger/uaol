import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome, Mailbox, Apple, ArrowRight, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

// Fallback if logo fails to load
const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.style.display = 'none';
};

export default function Login() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuth = (provider: "google" | "outlook" | "icloud") => {
    setLoading(provider);
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const oauthUrl = `${baseUrl}/auth/${provider}`;
    
    console.log(`[OAuth] Redirecting to: ${oauthUrl}`);
    console.log(`[OAuth] Base URL from env: ${import.meta.env.VITE_API_BASE_URL || 'default (localhost:3000)'}`);
    
    // Redirect to OAuth endpoint - backend will redirect to provider
    window.location.href = oauthUrl;
  };

  const oauthProviders = [
    {
      id: "google" as const,
      name: "Google",
      icon: Chrome,
      description: "Access Gmail, Calendar, Drive, and more",
      color: "bg-white hover:bg-gray-50 text-gray-900 hover:text-gray-900 border-gray-300 shadow-sm hover:shadow-md",
      iconColor: "text-[#4285F4]",
      textColor: "text-gray-900",
    },
    {
      id: "outlook" as const,
      name: "Microsoft Outlook",
      icon: Mailbox,
      description: "Access Outlook email, Calendar, and OneDrive",
      color: "bg-[#0078d4] hover:bg-[#0064b1] text-white hover:text-white border-[#0078d4] shadow-sm hover:shadow-md",
      iconColor: "text-white",
    },
    {
      id: "icloud" as const,
      name: "iCloud",
      icon: Apple,
      description: "Access iCloud Mail, Calendar, and iCloud Drive",
      color: "bg-black hover:bg-gray-900 text-white hover:text-white border-black shadow-sm hover:shadow-md",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-bg p-4">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2 }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-[128px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/50 rounded-full blur-[150px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <Card className="border-border/50 bg-background/95 backdrop-blur-lg shadow-2xl max-w-md w-full">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={logo} 
                alt="UAOL Logo" 
                className="h-16 w-16 object-contain"
                onError={handleLogoError}
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome to UAOL</CardTitle>
              <CardDescription className="mt-2">
                Universal AI Orchestration Layer
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              {oauthProviders.map((provider) => {
                const Icon = provider.icon;
                const isLoading = loading === provider.id;
                
                return (
                  <Button
                    key={provider.id}
                    type="button"
                    variant="outline"
                    className={`w-full h-auto py-4 px-4 justify-start ${provider.color} transition-all duration-200 ${
                      provider.id === 'google' 
                        ? 'hover:!text-gray-900 [&:hover_*]:!text-gray-900 [&:hover_*]:!text-gray-700' 
                        : provider.id === 'icloud' || provider.id === 'outlook'
                        ? 'hover:!text-white [&:hover_*]:!text-white'
                        : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`[Login] OAuth button clicked: ${provider.id}`);
                      handleOAuth(provider.id);
                    }}
                    disabled={loading !== null}
                  >
                    <div className="flex items-center w-full">
                      <Icon className={`h-5 w-5 mr-3 flex-shrink-0 ${provider.iconColor}`} />
                      <div className="flex-1 text-left">
                        <div className={`font-semibold text-sm ${
                          provider.id === 'google' ? '!text-gray-900' 
                          : (provider.id === 'icloud' || provider.id === 'outlook') ? '!text-white' 
                          : ''
                        }`}>
                          Continue with {provider.name}
                        </div>
                        <div className={`text-xs opacity-80 mt-0.5 ${
                          provider.id === 'google' ? '!text-gray-700' 
                          : (provider.id === 'icloud' || provider.id === 'outlook') ? '!text-white/80' 
                          : ''
                        }`}>
                          {provider.description}
                        </div>
                      </div>
                      {isLoading ? (
                        <Loader2 className={`h-4 w-4 animate-spin ml-auto ${
                          provider.id === 'google' ? '!text-gray-900' 
                          : (provider.id === 'icloud' || provider.id === 'outlook') ? '!text-white' 
                          : ''
                        }`} />
                      ) : (
                        <ArrowRight className={`h-4 w-4 ml-auto opacity-60 ${
                          provider.id === 'google' ? '!text-gray-600' 
                          : (provider.id === 'icloud' || provider.id === 'outlook') ? '!text-white/80' 
                          : ''
                        }`} />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
