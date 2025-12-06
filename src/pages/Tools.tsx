import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToolRegistrationForm } from '@/components/tools/ToolRegistrationForm';
import { ToolList } from '@/components/tools/ToolList';
import { Plus, List } from 'lucide-react';

export default function Tools() {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tool Registry</h1>
          <p className="text-muted-foreground mt-2">
            Register and manage MCP tools for use in workflows
          </p>
        </div>
        {!showRegistrationForm && (
          <Button onClick={() => setShowRegistrationForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register New Tool
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            <List className="mr-2 h-4 w-4" />
            All Tools
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {showRegistrationForm ? (
            <ToolRegistrationForm
              onSuccess={() => setShowRegistrationForm(false)}
              onCancel={() => setShowRegistrationForm(false)}
            />
          ) : (
            <ToolList showActions={true} />
          )}
        </TabsContent>

        <TabsContent value="approved">
          <ToolList showActions={true} />
        </TabsContent>

        <TabsContent value="pending">
          <ToolList showActions={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

