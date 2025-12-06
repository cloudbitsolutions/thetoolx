import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Check, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState, useEffect } from "react";
import type { User } from "@shared/schema";

type UsersResult = { users: User[]; total: number };

export default function UsersAnalytics() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<string | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);
  const [updatedFrom, setUpdatedFrom] = useState<string | undefined>(undefined);
  const [updatedTo, setUpdatedTo] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, subscriptionType, updatedFrom, updatedTo]);

  // When preset changes compute from/to
  useEffect(() => {
    const now = new Date();
    const startOfDay = (d: Date) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };

    const endOfDay = (d: Date) => {
      const nd = new Date(d);
      nd.setHours(23, 59, 59, 999);
      return nd;
    };

    if (!preset || preset === "") {
      // leave custom values as-is
      return;
    }

    if (preset === "today") {
      setUpdatedFrom(startOfDay(now).toISOString());
      setUpdatedTo(now.toISOString());
      return;
    }

    if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setUpdatedFrom(startOfDay(y).toISOString());
      setUpdatedTo(endOfDay(y).toISOString());
      return;
    }

    if (preset === "last7") {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      setUpdatedFrom(startOfDay(from).toISOString());
      setUpdatedTo(now.toISOString());
      return;
    }

    if (preset === "last30") {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      setUpdatedFrom(startOfDay(from).toISOString());
      setUpdatedTo(now.toISOString());
      return;
    }

    if (preset === "last365") {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      setUpdatedFrom(startOfDay(from).toISOString());
      setUpdatedTo(now.toISOString());
      return;
    }

    if (preset === "custom") {
      // allow user to edit date inputs manually; do nothing here
      setUpdatedFrom(undefined);
      setUpdatedTo(undefined);
      return;
    }
  }, [preset]);

  const { data, isLoading, refetch } = useQuery<UsersResult, Error>({
    queryKey: ["/api/admin/users", page, limit, debouncedQuery, subscriptionType, updatedFrom, updatedTo],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", String(limit));
      if (debouncedQuery) q.set("q", debouncedQuery);
      if (subscriptionType) q.set("subscriptionType", subscriptionType);
      if (updatedFrom) q.set("updatedFrom", updatedFrom);
      if (updatedTo) q.set("updatedTo", updatedTo);
      const res = await fetch(`/api/admin/users?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const users: User[] = (data && Array.isArray((data as any).users) ? (data as any).users : []) as User[];
  const total: number = (data && typeof (data as any).total === 'number' ? (data as any).total : 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const csvEscape = (value: string | null | undefined) => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleExportCSV = async () => {
    try {
      setDownloading(true);
      const q = new URLSearchParams();
      q.set('page', '1');
      q.set('limit', String(Math.max(total || 100000, 100000)));
      if (debouncedQuery) q.set('q', debouncedQuery);
      if (subscriptionType) q.set('subscriptionType', subscriptionType);
      if (updatedFrom) q.set('updatedFrom', updatedFrom);
      if (updatedTo) q.set('updatedTo', updatedTo);

      const res = await fetch(`/api/admin/users?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users for export');
      const json = await res.json();
      const allUsers: User[] = Array.isArray(json?.users) ? json.users : [];
      if (allUsers.length === 0) {
        toast({ title: 'No users', description: 'No users to export' });
        return;
      }

      const rows: string[] = [];
      rows.push(['First Name', 'Last Name', 'Email', 'Created At', 'Updated At'].join(','));
      allUsers.forEach((u) => {
        const row = [csvEscape(u.firstName), csvEscape(u.lastName), csvEscape(u.email), csvEscape(u.createdAt as any), csvEscape(u.updatedAt as any)].join(',');
        rows.push(row);
      });

      const csv = rows.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-analytics-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: 'Exported', description: `Downloaded ${allUsers.length} users` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User analytics</h1>
          <p className="text-sm text-gray-600">Filter and export user data</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <select
            value={subscriptionType ?? ""}
            onChange={(e) => setSubscriptionType(e.target.value || undefined)}
            className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">All subscriptions</option>
            <option value="free">Free</option>
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="premium">Premium</option>
          </select>

          <select value={preset} onChange={(e) => setPreset(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
            <option value="">Range (select)</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last365">Last 1 year</option>
            <option value="custom">Custom</option>
          </select>

          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={updatedFrom ? updatedFrom.slice(0, 10) : ''}
                onChange={(e) => setUpdatedFrom(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
              <input
                type="date"
                value={updatedTo ? updatedTo.slice(0, 10) : ''}
                onChange={(e) => setUpdatedTo(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </>
          )}

          <Button size="sm" onClick={handleExportCSV} disabled={downloading}>
            {downloading ? 'Downloading...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">First Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created At</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Updated At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No users found</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">{u.firstName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{u.lastName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3 text-sm">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-sm">{u.updatedAt ? new Date(u.updatedAt).toLocaleString() : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total users: {total}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft /></Button>
          <div className="text-sm">Page {page} of {totalPages}</div>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
