import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Edit,
  Trash2,
  Plus,
  Filter,
  Eye,
  Users,
  Settings
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import iconMap from '@/lib/toolIcons';

export default function ToolsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  const { data: tools = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tools"],
  });

  const updateToolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PUT", `/api/admin/tools/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tools"] });
      toast({
        title: "Success",
        description: "Tool updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tool",
        variant: "destructive",
      });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      await apiRequest("DELETE", `/api/admin/tools/${toolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tools"] });
      toast({
        title: "Success",
        description: "Tool deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tool",
        variant: "destructive",
      });
    },
  });

  const filteredTools = tools.filter((tool: any) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || tool.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleToolStatus = (toolId: number, isActive: boolean) => {
    updateToolMutation.mutate({ id: toolId, data: { isActive } });
  };

  const togglePremiumStatus = (toolId: number, isPremium: boolean) => {
    updateToolMutation.mutate({ id: toolId, data: { isPremium } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tools Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage and configure platform tools
          </p>
        </div>
        <Button asChild>
          <Link href="/toolx-adminUser-auth/tools/create">
            <Plus className="w-4 h-4 mr-2" />
            Add New Tool
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="video">Video Tools</option>
                <option value="converter">Converters</option>
                <option value="utility">Utilities</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools List */}
      <div className="grid gap-4">
        {filteredTools.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No tools found. {searchTerm && "Try adjusting your search terms."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTools.map((tool: any) => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-lg">
                        {iconMap[tool.icon] || <i className={`${tool.icon} text-lg`} />}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tool.name}
                      </h3>
                      <Badge variant="outline">{tool.category}</Badge>
                      {tool.isPremium && (
                        <Badge variant="default">Premium</Badge>
                      )}
                      <Badge variant={tool.isActive ? "default" : "secondary"}>
                        {tool.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={tool.isLoginRequired ? "default" : "secondary"}>
                        {tool.isLoginRequired ? "Login Required" : "Login Not Required"}
                      </Badge>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      {tool.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{tool.usageCount} uses</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>Slug: {tool.slug}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>Tool Order: {((tool as any).toolsOrder ?? (tool as any).tools_order) === 0 ? '-' : ((tool as any).toolsOrder ?? (tool as any).tools_order ?? '—')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col ml-4 space-y-2">
                    {/* First row: Active + Premium */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          Active
                        </label>
                        <Switch
                          checked={tool.isActive}
                          onCheckedChange={(checked) => toggleToolStatus(tool.id, checked)}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          Premium
                        </label>
                        <Switch
                          checked={tool.isPremium}
                          onCheckedChange={(checked) => togglePremiumStatus(tool.id, checked)}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          Featured
                        </label>
                        <Switch
                          checked={tool.isFeatured}
                          onCheckedChange={(checked) =>
                            updateToolMutation.mutate({ id: tool.id, data: { isFeatured: checked } })
                          }
                        />
                      </div>
                    </div>

                    {/* Second row: Login Required + Edit */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          Login Required
                        </label>
                        <Switch
                          checked={tool.isLoginRequired}
                          onCheckedChange={(checked) =>
                            updateToolMutation.mutate({ id: tool.id, data: { isLoginRequired: checked } })
                          }
                        />
                      </div>

                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/toolx-adminUser-auth/tools/edit/${tool.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tools.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Tools
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {tools.filter((tool: any) => tool.isActive).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Active Tools
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {tools.filter((tool: any) => tool.isPremium).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Premium Tools
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {tools.reduce((acc: number, tool: any) => acc + tool.usageCount, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Usage
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}