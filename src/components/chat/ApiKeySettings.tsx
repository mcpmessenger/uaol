import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { Trash2, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyInfo {
  provider: string;
  isDefault: boolean;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiKeySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS = [
  { id: 'openai' as const, name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'gemini' as const, name: 'Google Gemini', placeholder: 'Your Gemini API key' },
  { id: 'claude' as const, name: 'Anthropic Claude', placeholder: 'sk-ant-...' },
];

export function ApiKeySettings({ open, onOpenChange }: ApiKeySettingsProps) {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    if (open) {
      loadKeys();
    }
  }, [open]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getApiKeys();
      if (response.success && response.data) {
        setKeys(response.data);
        setIsAuthenticated(true);
      } else if (response.error?.code === 'UNAUTHORIZED' || response.error?.message?.includes('Authentication required')) {
        // User is not authenticated
        setKeys([]);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      if (error.message?.includes('UNAUTHORIZED') || error.message?.includes('Authentication required')) {
        setIsAuthenticated(false);
      }
      console.error('Failed to load API keys', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: 'openai' | 'gemini' | 'claude') => {
    const apiKey = keyValues[provider]?.trim();
    if (!apiKey) {
      setErrors({ ...errors, [provider]: 'API key is required' });
      return;
    }

    setSaving(provider);
    setErrors({ ...errors, [provider]: '' });

    try {
      const existingKey = keys.find(k => k.provider === provider);
      const isDefault = existingKey?.isDefault || false;

      const response = await apiClient.setApiKey(provider, apiKey, isDefault);
      if (response.success) {
        setKeyValues({ ...keyValues, [provider]: '' });
        await loadKeys();
      } else {
        setErrors({ ...errors, [provider]: response.error?.message || 'Failed to save API key' });
      }
    } catch (error: any) {
      setErrors({ ...errors, [provider]: error.message || 'Failed to save API key' });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (provider: 'openai' | 'gemini' | 'claude') => {
    if (!confirm(`Are you sure you want to delete your ${PROVIDERS.find(p => p.id === provider)?.name} API key?`)) {
      return;
    }

    setDeleting(provider);
    try {
      const response = await apiClient.deleteApiKey(provider);
      if (response.success) {
        await loadKeys();
      }
    } catch (error) {
      console.error('Failed to delete API key', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (provider: 'openai' | 'gemini' | 'claude') => {
    try {
      const response = await apiClient.setDefaultProvider(provider);
      if (response.success) {
        await loadKeys();
      }
    } catch (error) {
      console.error('Failed to set default provider', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Key Settings</DialogTitle>
          <DialogDescription>
            Manage your AI provider API keys. Keys are encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isAuthenticated ? (
          <div className="py-8 px-4 text-center space-y-4">
            <div className="text-lg font-semibold">Authentication Required</div>
            <p className="text-muted-foreground">
              You need to register or login to manage your API keys.
            </p>
            <div className="space-y-2 text-sm text-left bg-muted/50 p-4 rounded-lg">
              <p className="font-medium">To get started:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Type <code className="px-1.5 py-0.5 rounded bg-background text-foreground">/register your@email.com</code> in the chat</li>
                <li>Or type <code className="px-1.5 py-0.5 rounded bg-background text-foreground">/login your@email.com</code> if you already have an account</li>
                <li>Then come back here to add your API keys</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {PROVIDERS.map((provider) => {
              const existingKey = keys.find(k => k.provider === provider.id);
              const hasKey = !!existingKey;
              const isDefault = existingKey?.isDefault || false;
              const currentValue = keyValues[provider.id] || '';
              const error = errors[provider.id];

              return (
                <div key={provider.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={provider.id} className="text-base font-medium">
                      {provider.name}
                      {isDefault && (
                        <span className="ml-2 text-xs text-primary">(Default)</span>
                      )}
                    </Label>
                    {hasKey && (
                      <div className="flex items-center gap-2">
                        {!isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(provider.id)}
                          >
                            Set as Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(provider.id)}
                          disabled={deleting === provider.id}
                        >
                          {deleting === provider.id ? (
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
                          setKeyValues({ ...keyValues, [provider.id]: '' });
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        id={provider.id}
                        type="password"
                        placeholder={provider.placeholder}
                        value={currentValue}
                        onChange={(e) => {
                          setKeyValues({ ...keyValues, [provider.id]: e.target.value });
                          setErrors({ ...errors, [provider.id]: '' });
                        }}
                        className={cn(error && "border-destructive")}
                      />
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                      <Button
                        onClick={() => handleSave(provider.id)}
                        disabled={!currentValue.trim() || saving === provider.id}
                        size="sm"
                      >
                        {saving === provider.id ? (
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

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Your API keys are encrypted and stored securely. 
                Only you can access your keys. Set a default provider to use it automatically for all messages, 
                or specify a provider per message.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
