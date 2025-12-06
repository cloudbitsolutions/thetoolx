import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Eye,
  Link,
  Calendar,
  Globe,
  TrendingUp,
  Copy,
  ExternalLink,
  Crown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "wouter";
import UnauthenticatedView from "./auth/UnauthenticatedView";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function URLAnalytics() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const isPremiumUser = user?.subscriptionType !== "free";

  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ["/api/url-analytics"],
    enabled: isAuthenticated && isPremiumUser,
    retry: (failureCount, error) => {
      // Don't retry unauthorized errors
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  if (!isAuthenticated) {
    return <UnauthenticatedView />;
  }

  if (!isPremiumUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-full">
                <BarChart3 className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              URL Analytics
              <Badge className="ml-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Track clicks, analyze traffic, and optimize your link performance.
            </p>
          </div>

          <Alert className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Premium Required:</strong> URL analytics is a premium feature.
              <RouterLink href="/pricing">
                <Button variant="link" className="p-0 h-auto text-yellow-800 dark:text-yellow-200 underline ml-1">
                  Upgrade your plan
                </Button>
              </RouterLink>
              to access detailed analytics.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    if (isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return null;
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertDescription className="text-red-800 dark:text-red-200">
              Failed to load analytics data. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
              <BarChart3 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            URL Analytics
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Track and analyze the performance of your shortened URLs.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total URLs</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.totalUrls || 0}</div>
              <p className="text-xs text-muted-foreground">
                Short URLs created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.totalClicks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all URLs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData?.totalUrls > 0
                  ? Math.round((analyticsData.totalClicks / analyticsData.totalUrls) * 100) / 100
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Clicks per URL
              </p>
            </CardContent>
          </Card>
        </div>

        {/* URL List with Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                URL Performance
              </div>
              <RouterLink href="/tools/url-shortener">
                <Button variant="outline" size="sm">
                  <Link className="h-4 w-4 mr-2" />
                  Create Short URL
                </Button>
              </RouterLink>
            </CardTitle>
            <CardDescription>
              Detailed analytics for each of your shortened URLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!analyticsData?.urls || analyticsData.urls.length === 0 ? (
              <div className="text-center py-12">
                <Link className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No URLs yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first shortened URL to start tracking analytics.
                </p>
                <RouterLink href="/tools/url-shortener">
                  <Button>
                    <Link className="h-4 w-4 mr-2" />
                    Create Short URL
                  </Button>
                </RouterLink>
              </div>
            ) : (
              <div className="space-y-4">
                {analyticsData.urls.map((url: any) => (
                  <div key={url.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {url.shortenedUrl}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(url.shortenedUrl)}
                          variant="ghost"
                          size="sm"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => window.open(url.shortenedUrl, '_blank')}
                          variant="ghost"
                          size="sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">
                          <Eye className="h-3 w-3 mr-1" />
                          {url.clickCount || 0} clicks
                        </Badge>
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(url.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {url.title && (
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {url.title}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        <strong>Original:</strong> {url.originalUrl}
                      </div>
                    </div>

                    {/* Recent Clicks */}
                    {url.recentClicks && url.recentClicks.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                        <div className="space-y-2">
                          {url.recentClicks.slice(0, 5).map((click: any, index: number) => (
                            <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Globe className="h-3 w-3" />
                              <span>{new Date(click.createdAt).toLocaleString()}</span>
                              {click.country && <span>• {click.country}</span>}
                              {click.referer && (
                                <span>• from {new URL(click.referer).hostname}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}