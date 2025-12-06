import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  MessageCircle, 
  Settings, 
  TrendingUp,
  DollarSign,
  Download,
  Eye,
  CreditCard
} from "lucide-react";
import { Link } from "wouter";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tools' | 'users'>('tools');
  
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/dashboard-stats"],
    retry: false,
  });

  const { data: recentPosts, isLoading: postsLoading } = useQuery<any>({
    queryKey: ["/api/admin/blog"],
    retry: false,
  });

  const statsCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900",
    },
    {
      title: "Premium Users",
      value: stats?.premiumUsers || 0,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    {
      title: "Total Tools",
      value: stats?.totalTools || 0,
      icon: Settings,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900",
    },
    {
      title: "Active Tools",
      value: stats?.activeTools || 0,
      icon: Download,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900",
    },
    {
      title: "Total Downloads",
      value: stats?.totalDownloads || 0,
      icon: Download,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900",
    },
    {
      title: "Revenue",
      value: `$${stats?.revenue || 0}`,
      icon: DollarSign,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900",
    },
    {
      title: "User Logins",
      value: null,
      icon: Eye,
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900",
      isUserLoginCard: true,
    },
    {
      title: "Tool Usage",
      value: null,
      icon: Download,
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900",
      isToolUsageCard: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Overview of your platform's performance and activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{stat.title}</p>
                    {stat.isUserLoginCard ? (
                      <div className="flex items-center space-x-6 text-gray-900 dark:text-white">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.loggedInToday ?? 0}</div>
                          <div className="text-xs text-gray-500">Today</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.loggedInYesterday ?? 0}</div>
                          <div className="text-xs text-gray-500">Yesterday</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.loggedInLastMonth ?? 0}</div>
                          <div className="text-xs text-gray-500">1M</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.loggedInLastYear ?? 0}</div>
                          <div className="text-xs text-gray-500">1Y</div>
                        </div>
                      </div>
                    ) : stat.isToolUsageCard ? (
                      <div className="flex items-center space-x-6 text-gray-900 dark:text-white">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.toolUsageToday ?? 0}</div>
                          <div className="text-xs text-gray-500">Today</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.toolUsageYesterday ?? 0}</div>
                          <div className="text-xs text-gray-500">Yesterday</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.toolUsageLastMonth ?? 0}</div>
                          <div className="text-xs text-gray-500">1M</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats?.toolUsageLastYear ?? 0}</div>
                          <div className="text-xs text-gray-500">1Y</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Blog Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Recent Blog Posts</span>
          </CardTitle>
            <Button variant="ghost" size="sm" asChild>
            <Link href="/toolx-adminUser-auth/blog">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPosts?.slice(0, 5).map((post: any) => (
              <div key={post.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {post.title}
                    </p>
                    <Badge variant={
                      post.status === 'published' ? 'default' : 
                      post.status === 'draft' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {post.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {post.createdAt}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {post.viewCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No recent posts</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="flex space-x-2 mb-4">
              <button
                className={`px-3 py-1 rounded ${activeTab === 'tools' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab('tools')}
              >
                Tool Usage
              </button>
              <button
                className={`px-3 py-1 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab('users')}
              >
                Recent Users
              </button>
            </div>

            {activeTab === 'tools' ? <RecentActivity /> : <RecentUsers />}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/toolx-adminUser-auth/blog/create">
              <Button variant="outline" className="w-full p-4 h-auto flex flex-col items-center space-y-2">
                  <FileText className="w-6 h-6" />
                  <span>Create New Blog Post</span>
                </Button>
              </Link>
            <Link href="/toolx-adminUser-auth/tools">
              <Button variant="outline" className="w-full p-4 h-auto flex flex-col items-center space-y-2">
                <Settings className="w-6 h-6" />
                <span>Manage Tools</span>
              </Button>
            </Link>
            <Link href="/toolx-adminUser-auth/pricing">
              <Button variant="outline" className="w-full p-4 h-auto flex flex-col items-center space-y-2">
                <CreditCard className="w-6 h-6" />
                <span>Manage Pricing</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function timeAgo(iso?: string | Date | null) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  return d.toLocaleDateString();
}

function RecentActivity() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/recent-activity", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/recent-activity?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to load recent activity");
      return res.json();
    },
    retry: false,
  });

  const resp: any = data as any;
  const activities: any[] = resp?.activities || [];
  const total: number = resp?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;

  if (!activities || activities.length === 0) {
    return <div className="text-sm text-gray-500">No recent activity</div>;
  }

  return (
    <div className="space-y-3">
      {activities.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between p-3 rounded border border-gray-100">
          <div>
            <div className="text-sm font-medium text-gray-900">{a.userFirstName || a.userEmail || 'Anonymous'}</div>
            <div className="text-xs text-gray-500">used <span className="font-medium">{a.toolName || `Tool ${a.toolId}`}</span></div>
          </div>
          <div className="text-xs text-gray-400">{timeAgo(a.createdAt)}</div>
        </div>
      ))}

      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-gray-500">Showing {(offset + 1)} - {Math.min(offset + activities.length, total)} of {total}</div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">{page} / {totalPages}</div>
          <button
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function RecentUsers() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/users", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?limit=${limit}&page=${page}`);
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    retry: false,
  });

  const resp: any = data as any;
  const users: any[] = resp?.users || [];
  const total: number = resp?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;

  if (!users || users.length === 0) {
    return <div className="text-sm text-gray-500">No recent users</div>;
  }

  return (
    <div className="space-y-3">
      {users.map((u: any) => (
        <div key={u.id} className="flex items-center justify-between p-3 rounded border border-gray-100">
          <div>
            <div className="text-sm font-medium text-gray-900">{u.firstName || u.email || 'User'}</div>
            <div className="text-xs text-gray-500">{u.email}</div>
          </div>
          <div className="text-xs text-gray-400">{timeAgo(u.updatedAt || u.createdAt)}</div>
        </div>
      ))}

      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-gray-500">Showing {(offset + 1)} - {Math.min(offset + users.length, total)} of {total}</div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">{page} / {totalPages}</div>
          <button
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}