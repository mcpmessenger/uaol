import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';
import { CreditBalance } from '@/components/billing/CreditBalance';
import { Loader2, Key, User as UserIcon, Trash2, Check } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    subscriptionTier: string;
    credits: string;
    createdAt: string;
    avatarUrl: string | null;
  } | null>(null);
  const [apiKeys, setApiKeys] = useState<Array<{ provider: string; isDefault: boolean; maskedKey: string; createdAt: string; updatedAt: string }>>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [keyErrors, setKeyErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = localStorage.getItem('uaol_token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadProfile();
    loadApiKeys();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load profile',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const response = await apiClient.getApiKeys();
      if (response.success && response.data) {
        setApiKeys(response.data);
      }
    } catch (error) {
      console.error('Failed to load API keys', error);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleSaveApiKey = async (provider: 'openai' | 'gemini' | 'claude') => {
    const apiKey = keyValues[provider]?.trim();
    if (!apiKey) {
      setKeyErrors({ ...keyErrors, [provider]: 'API key is required' });
      return;
    }

    setSavingKey(provider);
    setKeyErrors({ ...keyErrors, [provider]: '' });

    try {
      const existingKey = apiKeys.find(k => k.provider === provider);
      const isDefault = existingKey?.isDefault || false;

      const response = await apiClient.setApiKey(provider, apiKey, isDefault);
      if (response.success) {
        toast({
          title: 'Success',
          description: `${provider} API key saved successfully`,
        });
        setKeyValues({ ...keyValues, [provider]: '' });
        await loadApiKeys();
      } else {
        setKeyErrors({ ...keyErrors, [provider]: response.error?.message || 'Failed to save API key' });
      }
    } catch (error: any) {
      setKeyErrors({ ...keyErrors, [provider]: error.message || 'Failed to save API key' });
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteApiKey = async (provider: 'openai' | 'gemini' | 'claude') => {
    if (!confirm(`Are you sure you want to delete your ${provider} API key?`)) {
      return;
    }

    setDeletingKey(provider);
    try {
      const response = await apiClient.deleteApiKey(provider);
      if (response.success) {
        toast({
          title: 'Success',
          description: `${provider} API key deleted`,
        });
        await loadApiKeys();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error?.message || 'Failed to delete API key',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete API key',
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const handleSetDefaultProvider = async (provider: 'openai' | 'gemini' | 'claude') => {
    try {
      const response = await apiClient.setDefaultProvider(provider);
      if (response.success) {
        toast({
          title: 'Success',
          description: `${provider} set as default provider`,
        });
        await loadApiKeys();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to set default provider',
      });
    }
  };

  const getInitials = (email: string): string => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const getFallbackAvatarUrl = (email: string): string => {
    if (!email) return '';
    const name = email.split('@')[0];
    const encodedName = encodeURIComponent(name);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=6366f1&color=fff&size=128&bold=true`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={
                    profile.avatarUrl
                      ? profile.avatarUrl.startsWith('http')
                        ? profile.avatarUrl
                        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${profile.avatarUrl}`
                      : getFallbackAvatarUrl(profile.email)
                  }
                  alt={profile.email}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(profile.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile.email}</p>
                <p className="text-sm text-muted-foreground">{profile.subscriptionTier} Plan</p>
                <CreditBalance className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>View your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">User ID</Label>
              <p className="text-sm font-mono">{profile.id}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">Subscription Tier</Label>
              <p className="text-sm">{profile.subscriptionTier}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">Member Since</Label>
              <p className="text-sm">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>Manage your AI provider API keys. Keys are encrypted and stored securely.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKeys ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {['openai', 'gemini', 'claude'].map((provider) => {
                  const providerName = provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude';
                  const placeholder = provider === 'openai' ? 'sk-...' : provider === 'gemini' ? 'Your Gemini API key' : 'sk-ant-...';
                  const existingKey = apiKeys.find(k => k.provider === provider);
                  const hasKey = !!existingKey;
                  const isDefault = existingKey?.isDefault || false;
                  const currentValue = keyValues[provider] || '';
                  const error = keyErrors[provider];

                  return (
                    <div key={provider} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          {providerName}
                          {isDefault && <span className="ml-2 text-xs text-primary">(Default)</span>}
                        </Label>
                        {hasKey && (
                          <div className="flex items-center gap-2">
                            {!isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefaultProvider(provider as 'openai' | 'gemini' | 'claude')}
                              >
                                Set as Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteApiKey(provider as 'openai' | 'gemini' | 'claude')}
                              disabled={deletingKey === provider}
                            >
                              {deletingKey === provider ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {hasKey ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={existingKey.maskedKey || '***'}
                            disabled
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setKeyValues({ ...keyValues, [provider]: '' });
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="password"
                            placeholder={placeholder}
                            value={currentValue}
                            onChange={(e) => {
                              setKeyValues({ ...keyValues, [provider]: e.target.value });
                              setKeyErrors({ ...keyErrors, [provider]: '' });
                            }}
                            className={error ? "border-destructive" : ""}
                          />
                          {error && (
                            <p className="text-sm text-destructive">{error}</p>
                          )}
                          <Button
                            onClick={() => handleSaveApiKey(provider as 'openai' | 'gemini' | 'claude')}
                            disabled={!currentValue.trim() || savingKey === provider}
                            size="sm"
                          >
                            {savingKey === provider ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-sm text-muted-foreground pt-2">
                  <strong>Note:</strong> Your API keys are encrypted and stored securely. 
                  Only you can access your keys. Set a default provider to use it automatically for all messages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

