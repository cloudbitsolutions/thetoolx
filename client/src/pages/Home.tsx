import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Download,
  TrendingUp,
  Heart,
  Crown,
  Calendar,
  Clock,
  Star,
  Link as LinkIcon,
  MousePointer,
  Eye,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";
// ...existing code...

interface Tool {
  id: number;
  name: string;
  slug: string;
  usageCount: number;
}

interface Activity {
  id: string;
  description: string;
  timestamp: string;
  timeAgo: string; 
  color: string;
  icon: string; // better to be a key in iconMap
  link?: string;
}

interface UrlSummary {
  totalUrls: number;
  activeUrls: number;
  totalClicks: number;
  clicksToday: number;
  urls: {
    id: string;
    title?: string;
    shortCode: string;
    clickCount: number;
    createdAt: string;
    isActive: boolean;
  }[];
}

interface DashboardStats {
  downloadsToday?: number;
  totalDownloads?: number;
  favoriteTools?: number;
}

// Simple fetch helpers with proper return types
const fetchTools = async (language?: string): Promise<Tool[]> => {
  const params = new URLSearchParams();
  if (language && language !== 'en') params.set('lang', language);
  const res = await fetch(`/api/tools?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch tools');
  return res.json();
};

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await fetch("/api/dashboard/stats", { credentials: 'include' });
  if (res.status === 401) {
    console.warn('fetchDashboardStats: unauthorized (401)');
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
};

const fetchRecentActivity = async (): Promise<Activity[]> => {
  const res = await fetch("/api/dashboard/recent-activity", { credentials: 'include' });
  if (res.status === 401) {
    console.warn('fetchRecentActivity: unauthorized (401)');
    return [];
  }
  if (!res.ok) return [];
  const data = await res.json();
  // map server shape to client Activity interface
  return (data || []).map((a: any) => ({
    id: String(a.id),
    description: a.toolName || a.tool || "Unknown tool",
    timestamp: a.createdAt || new Date().toISOString(),
    timeAgo: a.time || "Just now",
    color: a.color || "bg-gray-100",
    icon: a.icon || "fas fa-tools",
    link: a.toolSlug ? `/tools/${a.toolSlug}` : undefined,
  }));
};

const fetchUrlSummary = async (): Promise<UrlSummary> => {
  const res = await fetch("/api/dashboard/url-summary", { credentials: 'include' });
  if (res.status === 401) {
    console.warn('fetchUrlSummary: unauthorized (401)');
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error("Failed to fetch url summary");
  return res.json();
};

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const { language } = useLanguage();

  const { data: tools = [] } = useQuery<Tool[]>({
    queryKey: ["/api/tools", language],
    queryFn: () => fetchTools(language),
  });

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: fetchDashboardStats,
    enabled: isAuthenticated,
  });

  const { data: recentActivity = [] } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    queryFn: fetchRecentActivity,
    enabled: isAuthenticated,
    // Poll the recent activity every 5 seconds for near-real-time updates
    refetchInterval: isAuthenticated ? 5000 : false,
  });

  const { data: urlSummary } = useQuery<UrlSummary>({
    queryKey: ["/api/dashboard/url-summary"],
    queryFn: fetchUrlSummary,
    enabled: isAuthenticated && user?.subscriptionType !== "free",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const popularTools = tools.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.firstName || user?.email}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1 max-w-md">
              Here's what's happening with your tools today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback>
                {user?.firstName?.[0] || user?.email?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left sm:text-right">
              <Badge
                variant={user?.subscriptionType === "free" ? "secondary" : "default"}
                className="mb-1 self-start sm:self-end"
              >
                {user?.subscriptionType === "free" ? (
                  "Free"
                ) : (
                  <div className="flex items-center space-x-1">
                    <Crown className="w-3 h-3" />
                    <span>Pro</span>
                  </div>
                )}
              </Badge>
              <p className="text-sm text-gray-600 dark:text-gray-300 break-words max-w-xs">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Downloads Today
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats?.downloadsToday || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Total Downloads
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats?.totalDownloads || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Favorite Tools
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats?.favoriteTools || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Plan Status</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.subscriptionType === "free" ? "Free" : "Pro"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* URL Analytics Section - Only for Premium Users */}
        {user?.subscriptionType !== "free" && urlSummary && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <LinkIcon className="w-6 h-6" />
                <span>URL Shortener Analytics</span>
              </h2>
              <Button variant="outline" asChild>
                <Link href="/url-analytics">View All Analytics</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total URLs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {urlSummary.totalUrls || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Active URLs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {urlSummary.activeUrls || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Clicks</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {urlSummary.totalClicks || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <MousePointer className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Clicks Today</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {urlSummary.clicksToday || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent URLs */}
            {urlSummary.urls && urlSummary.urls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Recent Short URLs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {urlSummary.urls.map((url: any) => (
                      <div
                        key={url.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {url.title || `Short URL #${url.id}`}
                              </p>
                              {!url.isActive && <Badge variant="secondary">Inactive</Badge>}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                              <span className="truncate max-w-48">toolx.com/{url.shortCode}</span>
                              <span>{url.clickCount} clicks</span>
                              <span>{new Date(url.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/">{/* adjust link as needed */}View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Popular Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Popular Tools</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularTools.map((tool: any) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                        <i
                          className={`fas fa-tools text-primary-600 dark:text-primary-400 text-sm`}
                        />
                      </div>
                      <div>

                        <p className="font-medium text-gray-900 dark:text-white">{(tool as any).translatedName || tool.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {tool.usageCount} uses
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/tools/${tool.slug}`}>Use</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div
                      className={`w-8 h-8 ${activity.color} rounded-full flex items-center justify-center`}
                    >
                      <i className={`${activity.icon} text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {/*new Date(activity.timestamp).toLocaleString()*/}
                        {activity.timeAgo}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={activity.link || "#"}>View</Link>
                    </Button>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
                    No recent activity.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}