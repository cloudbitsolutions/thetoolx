import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Wrench, 
  Save,
  Eye,
  EyeOff,
  Settings,
  Zap,
  Trash2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import iconMap, { perToolIconOptions, genericIconOptions } from '@/lib/toolIcons';

interface ToolEditProps {
  params: {
    id: string;
  };
}

export default function ToolEdit({ params }: ToolEditProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const toolId = params.id;
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "video",
    icon: "fa-download",
    toolsOrder: 1,
    isActive: true,
    isPremium: false,
    featured: false,
    downloadUrl: "",
    processingUrl: "",
    tags: "",
    metadata: "{}"
  });

  const { data: tools = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tools"],
  });

  const tool = tools.find((t: any) => t.id === parseInt(toolId));

  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name || "",
        slug: tool.slug || "",
        description: tool.description || "",
        category: tool.category || "video",
        icon: tool.icon || "fa-download",
          toolsOrder: (tool as any).toolsOrder ?? 0,
        isActive: tool.isActive ?? true,
        isPremium: tool.isPremium ?? false,
        featured: tool.featured ?? false,
        downloadUrl: tool.downloadUrl || "",
        processingUrl: tool.processingUrl || "",
        tags: Array.isArray(tool.tags) ? tool.tags.join(', ') : "",
        metadata: typeof tool.metadata === 'object' ? JSON.stringify(tool.metadata, null, 2) : tool.metadata || "{}"
      });
    }
  }, [tool]);

  const categories = [
    { value: "video", label: "Video Tools" },
    { value: "converter", label: "File Converters" },
    { value: "utility", label: "Utilities" },
    { value: "premium", label: "Premium Tools" }
  ];

  const updateToolMutation = useMutation({
    mutationFn: async (toolData: any) => {
      const payload = {
        ...toolData,
        tags: toolData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        metadata: JSON.parse(toolData.metadata || '{}')
      };
      await apiRequest("PUT", `/api/admin/tools/${toolId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tools"] });
      toast({
        title: "Success",
        description: "Tool updated successfully",
      });
  setLocation("/toolx-adminUser-auth/tools");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update tool",
        variant: "destructive",
      });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/tools/${toolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tools"] });
      toast({
        title: "Success",
        description: "Tool deleted successfully",
      });
  setLocation("/toolx-adminUser-auth/tools");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete tool",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Don't auto-generate slug when editing - it's read-only
    // if (field === 'name') { ... }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    updateToolMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this tool? This action cannot be undone.")) {
      deleteToolMutation.mutate();
    }
  };

  if (!tool) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/toolx-adminUser-auth/tools")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tool Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              The requested tool could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/toolx-adminUser-auth/tools")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Tool: {tool.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Modify tool settings and configuration
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSubmit} disabled={updateToolMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Update Tool
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              // Ask admin whether to set a specific timestamp
              const at = new Date().toISOString();
              try {
                await apiRequest('POST', `/api/admin/tools/${toolId}/republish`, { at: at || undefined });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/tools"] });
                queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
                toast({ title: 'Republished', description: 'Tool timestamp updated. Google should re-index soon.' });
              } catch (err) {
                toast({ title: 'Error', description: 'Failed to republish tool', variant: 'destructive' });
              }
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Republish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Tool Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter tool name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  placeholder="tool-url-slug"
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                  readOnly
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  URL: /tools/{formData.slug} (Cannot be changed after creation)
                </p>
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this tool does..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="toolsOrder">Order</Label>
                  <Input
                    id="toolsOrder"
                    type="number"
                    value={formData.toolsOrder}
                    onChange={(e) => handleInputChange('toolsOrder', Number(e.target.value))}
                    className="mt-1"
                    min={1}
                    placeholder="1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Lower numbers appear first on the landing page.</p>
                </div>
                
                <div>
                  <Label htmlFor="icon">Icon (FontAwesome)</Label>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {(perToolIconOptions[tool.slug] || genericIconOptions).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleInputChange('icon', key)}
                          className={`p-2 rounded border ${formData.icon === key ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:border-gray-200'} focus:outline-none`}
                        >
                          <div className="w-6 h-6 text-current">{iconMap[key] || <i className={`fa ${key}`} />}</div>
                        </button>
                      ))}
                    </div>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => handleInputChange('icon', e.target.value)}
                      placeholder="fa-download or icon key"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="downloadUrl">Download URL</Label>
                <Input
                  id="downloadUrl"
                  value={formData.downloadUrl}
                  onChange={(e) => handleInputChange('downloadUrl', e.target.value)}
                  placeholder="https://example.com/download"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="processingUrl">Processing URL</Label>
                <Input
                  id="processingUrl"
                  value={formData.processingUrl}
                  onChange={(e) => handleInputChange('processingUrl', e.target.value)}
                  placeholder="https://example.com/process"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="video, download, youtube"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  value={formData.metadata}
                  onChange={(e) => handleInputChange('metadata', e.target.value)}
                  placeholder='{"maxFileSize": "50MB", "supportedFormats": ["mp4", "avi"]}'
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Status Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Status Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-sm text-gray-500">Tool is available to users</p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPremium">Premium</Label>
                  <p className="text-sm text-gray-500">Requires premium subscription</p>
                </div>
                <Switch
                  id="isPremium"
                  checked={formData.isPremium}
                  onCheckedChange={(checked) => handleInputChange('isPremium', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="featured">Featured</Label>
                  <p className="text-sm text-gray-500">Show in featured section</p>
                </div>
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleInputChange('featured', checked)}
                />
              </div>
            </CardContent>
          </Card>



          {/* Tool Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Usage</span>
                  <span className="text-sm font-medium">{tool.usageCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm font-medium">
                    {tool.createdAt ? new Date(tool.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last Updated</span>
                  <span className="text-sm font-medium">
                    {tool.updatedAt ? new Date(tool.updatedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}