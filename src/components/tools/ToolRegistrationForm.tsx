import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface ToolRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ToolRegistrationForm({ onSuccess, onCancel }: ToolRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gateway_url: '',
    credit_cost_per_call: '1',
    protocol: 'json-rpc' as 'json-rpc' | 'rest',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiClient.registerTool({
        name: formData.name,
        gateway_url: formData.gateway_url,
        credit_cost_per_call: parseInt(formData.credit_cost_per_call, 10),
        protocol: formData.protocol,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Tool registered successfully. It will be reviewed before approval.',
        });
        setFormData({
          name: '',
          gateway_url: '',
          credit_cost_per_call: '1',
          protocol: 'json-rpc',
        });
        onSuccess?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error?.message || 'Failed to register tool',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to register tool',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Tool</CardTitle>
        <CardDescription>
          Register a new MCP tool to make it available for use in workflows
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tool Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Gmail Tool"
              required
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name for your tool
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway_url">Gateway URL *</Label>
            <Input
              id="gateway_url"
              type="url"
              value={formData.gateway_url}
              onChange={(e) => setFormData({ ...formData, gateway_url: e.target.value })}
              placeholder="https://your-tool-gateway.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              The URL where your MCP tool gateway is hosted
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocol *</Label>
              <Select
                value={formData.protocol}
                onValueChange={(value: 'json-rpc' | 'rest') =>
                  setFormData({ ...formData, protocol: value })
                }
              >
                <SelectTrigger id="protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json-rpc">JSON-RPC</SelectItem>
                  <SelectItem value="rest">REST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_cost">Credit Cost per Call</Label>
              <Input
                id="credit_cost"
                type="number"
                min="1"
                value={formData.credit_cost_per_call}
                onChange={(e) => setFormData({ ...formData, credit_cost_per_call: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Credits charged per tool call
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Register Tool
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

