import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  Plus, 
  Wrench, 
  Save,
  Eye,
  EyeOff,
  Settings,
  Zap
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ToolCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
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

  const categories = [
    { value: "video", label: "Video Tools" },
    { value: "converter", label: "File Converters" },
    { value: "utility", label: "Utilities" },
    { value: "premium", label: "Premium Tools" }
  ];

  const createToolMutation = useMutation({
    mutationFn: async (toolData: any) => {
      const payload = {
        ...toolData,
        tags: toolData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        metadata: JSON.parse(toolData.metadata || '{}')
      };
      await apiRequest("POST", "/api/admin/tools", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tools"] });
      toast({
        title: "Success",
        description: "Tool created successfully",
      });
  setLocation("/toolx-adminUser-auth/tools");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create tool",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
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

    createToolMutation.mutate(formData);
  };

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
              Create New Tool
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Add a new tool to your platform
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={createToolMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Create Tool
        </Button>
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
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="tool-url-slug"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  URL: /tools/{formData.slug}
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
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => handleInputChange('icon', e.target.value)}
                    placeholder="fa-download"
                    className="mt-1"
                  />
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


        </div>
      </div>
    </div>
  );
}