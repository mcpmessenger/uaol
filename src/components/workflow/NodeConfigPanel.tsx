import { useState, useEffect, useRef } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X, Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { WorkflowNode } from './WorkflowBuilder';
import { apiClient } from '@/lib/api/client';
import { generatePDFThumbnail } from '@/lib/pdf-thumbnail';
import { cn } from '@/lib/utils';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onNodeChange: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onClose: () => void;
}

interface UploadedFileInfo {
  fileId: string;
  filename: string;
  size: number;
  url: string;
  extractedText?: string;
  metadata?: any;
  preview?: string;
  type?: 'pdf' | 'image' | 'other';
}

export function NodeConfigPanel({ node, onNodeChange, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState(node.data);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalData(node.data);
  }, [node.id, node.data]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
    onNodeChange(node.id, updated);
  };

  const uploadedFiles: UploadedFileInfo[] = localData.uploadedFiles || [];

  const validateFile = (file: File): string | null => {
    const maxSizeMB = localData.maxSize || 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return `File "${file.name}" exceeds maximum size of ${maxSizeMB}MB`;
    }

    const allowedTypes = localData.fileTypes || ['pdf', 'docx', 'txt'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension && !allowedTypes.includes(fileExtension)) {
      return `File type "${fileExtension}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const generatePreview = async (file: File): Promise<string | null> => {
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    
    if (isPDF) {
      try {
        return await generatePDFThumbnail(file);
      } catch (error) {
        console.error('Failed to generate PDF thumbnail:', error);
        return null;
      }
    } else if (isImage) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }
    return null;
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    // Validate files
    const errors: string[] = [];
    const validFiles: File[] = [];
    
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      alert(`Upload errors:\n${errors.join('\n')}`);
      if (validFiles.length === 0) return;
    }

    setIsUploading(true);

    try {
      // Generate previews for valid files
      const filePreviews = await Promise.all(
        validFiles.map(async (file) => {
          const preview = await generatePreview(file);
          const isPDF = file.type === 'application/pdf';
          const isImage = file.type.startsWith('image/');
          return {
            file,
            preview,
            type: isPDF ? 'pdf' as const : isImage ? 'image' as const : 'other' as const,
          };
        })
      );

      // Upload files
      const uploadResponse = await apiClient.uploadFiles(validFiles);

      if (uploadResponse.success && uploadResponse.data) {
        // Combine uploaded file info with previews
        const newFiles: UploadedFileInfo[] = uploadResponse.data.files.map((f: any, index: number) => ({
          fileId: f.fileId,
          filename: f.filename,
          size: f.size,
          url: f.url,
          extractedText: f.extractedText,
          metadata: f.metadata,
          preview: filePreviews[index]?.preview || undefined,
          type: filePreviews[index]?.type || 'other',
        }));

        // Add to existing uploaded files
        const updatedFiles = [...uploadedFiles, ...newFiles];
        handleChange('uploadedFiles', updatedFiles);
      } else {
        const errorMsg = uploadResponse.error?.message || 'Failed to upload files';
        alert(`Upload failed: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.fileId !== fileId);
    handleChange('uploadedFiles', updatedFiles);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'file-upload':
        return (
          <div className="space-y-4">
            <div>
              <Label>File Types</Label>
              <Input
                value={localData.fileTypes?.join(', ') || ''}
                onChange={(e) => handleChange('fileTypes', e.target.value.split(',').map(s => s.trim()))}
                placeholder="pdf, docx, txt"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of allowed file extensions
              </p>
            </div>
            <div>
              <Label>Max File Size (MB)</Label>
              <Input
                type="number"
                value={localData.maxSize || 50}
                onChange={(e) => handleChange('maxSize', parseInt(e.target.value))}
              />
            </div>

            {/* File Upload Area */}
            <div>
              <Label>Upload Documents</Label>
              <div
                ref={dropZoneRef}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                  isUploading && "opacity-50 pointer-events-none"
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={localData.fileTypes?.map(ext => `.${ext}`).join(',')}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Uploading files...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {localData.fileTypes?.join(', ').toUpperCase() || 'PDF, DOCX, TXT'} files up to {localData.maxSize || 50}MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div>
                <Label>Uploaded Files ({uploadedFiles.length})</Label>
                <div className="space-y-2 mt-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.fileId}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 group hover:bg-muted/50 transition-colors"
                    >
                      {/* File Preview/Icon */}
                      <div className="flex-shrink-0">
                        {file.type === 'pdf' && file.preview ? (
                          <div className="w-10 h-12 bg-white dark:bg-gray-900 rounded border overflow-hidden">
                            <img
                              src={file.preview}
                              alt={file.filename}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : file.type === 'image' && file.preview ? (
                          <div className="w-10 h-10 rounded border overflow-hidden">
                            <img
                              src={file.preview}
                              alt={file.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.fileId);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'text-extraction':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable OCR</Label>
              <Switch
                checked={localData.useOCR !== false}
                onCheckedChange={(checked) => handleChange('useOCR', checked)}
              />
            </div>
            <div>
              <Label>Language Hints</Label>
              <Input
                value={localData.languageHints?.join(', ') || ''}
                onChange={(e) => handleChange('languageHints', e.target.value.split(',').map(s => s.trim()))}
                placeholder="en, es, fr"
              />
            </div>
          </div>
        );

      case 'rag-indexing':
        return (
          <div className="space-y-4">
            <div>
              <Label>Chunk Size</Label>
              <Input
                type="number"
                value={localData.chunkSize || 1000}
                onChange={(e) => handleChange('chunkSize', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Chunk Overlap</Label>
              <Input
                type="number"
                value={localData.chunkOverlap || 200}
                onChange={(e) => handleChange('chunkOverlap', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'rag-query':
        return (
          <div className="space-y-4">
            <div>
              <Label>Query</Label>
              <Textarea
                value={localData.query || ''}
                onChange={(e) => handleChange('query', e.target.value)}
                placeholder="Enter your query..."
                rows={3}
              />
            </div>
            <div>
              <Label>Top K Results</Label>
              <Input
                type="number"
                value={localData.topK || 5}
                onChange={(e) => handleChange('topK', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'ai-generation':
        return (
          <div className="space-y-4">
            <div>
              <Label>Model</Label>
              <Input
                value={localData.model || 'gpt-4o'}
                onChange={(e) => handleChange('model', e.target.value)}
              />
            </div>
            <div>
              <Label>Prompt</Label>
              <Textarea
                value={localData.prompt || ''}
                onChange={(e) => handleChange('prompt', e.target.value)}
                placeholder="Enter your prompt..."
                rows={4}
              />
            </div>
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={localData.maxTokens || 2000}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'mcp-tool':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tool Name</Label>
              <Input
                value={localData.tool_name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Input
                value={localData.method || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Parameters (JSON)</Label>
              <Textarea
                value={typeof localData.parameters === 'string' 
                  ? localData.parameters 
                  : JSON.stringify(localData.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange('parameters', parsed);
                  } catch {
                    // Invalid JSON, store as string for now
                    handleChange('parameters', e.target.value);
                  }
                }}
                placeholder='{"query": "your query here", "image": "base64..."}'
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter parameters as JSON. For images, use base64 encoding or file references.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No configuration options available for this node type.
          </div>
        );
    }
  };

  return (
    <GlassPanel
      variant="subtle"
      className="w-80 border-l border-border/50 flex flex-col"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{node.data.label}</h3>
          <p className="text-xs text-muted-foreground capitalize">{node.type.replace('-', ' ')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <Label>Node Label</Label>
            <Input
              value={localData.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
            />
          </div>
          {renderConfigFields()}
        </div>
      </div>
    </GlassPanel>
  );
}
