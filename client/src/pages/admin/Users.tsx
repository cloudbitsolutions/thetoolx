import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Check, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState, useEffect } from "react";
import type { User } from "@shared/schema";

type UsersResult = { users: User[]; total: number };

export default function AdminUsers() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<string | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, subscriptionType]);

  const { data, isLoading, refetch } = useQuery<UsersResult, Error>({
    queryKey: ["/api/admin/users", page, limit, debouncedQuery, subscriptionType],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", String(limit));
      if (debouncedQuery) q.set("q", debouncedQuery);
      if (subscriptionType) q.set("subscriptionType", subscriptionType);
      const res = await fetch(`/api/admin/users?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<User>>({});

  const updateUser = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<User> }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User updated" });
      setEditingId(null);
      refetch();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
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
      // Request all users by using a very large limit; server may cap it but this is safest client-side approach
      const q = new URLSearchParams();
      q.set('page', '1');
      // use total if available otherwise a large number
      q.set('limit', String(Math.max(total || 100000, 100000)));
      if (debouncedQuery) q.set('q', debouncedQuery);
      if (subscriptionType) q.set('subscriptionType', subscriptionType);

      const res = await fetch(`/api/admin/users?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users for export');
      const json = await res.json();
      const allUsers: User[] = Array.isArray(json?.users) ? json.users : [];
      if (allUsers.length === 0) {
        toast({ title: 'No users', description: 'No users to export' });
        return;
      }

      const rows: string[] = [];
      rows.push(['First Name', 'Last Name', 'Email'].join(','));
      allUsers.forEach((u) => {
        const row = [csvEscape(u.firstName), csvEscape(u.lastName), csvEscape(u.email)].join(',');
        rows.push(row);
      });

      const csv = rows.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
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
          <h1 className="text-2xl font-bold">All Users</h1>
          <p className="text-sm text-gray-600">View and manage users</p>
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subscription</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No users found</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">
                    {editingId === u.id ? (
                      <Input value={form.firstName ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    ) : (
                      u.firstName || '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === u.id ? (
                      <Input value={form.lastName ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    ) : (
                      u.lastName || '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === u.id ? (
                      <Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === u.id ? (
                      <Input value={form.subscriptionType ?? ''} onChange={(e) => setForm({ ...form, subscriptionType: e.target.value })} />
                    ) : (
                      u.subscriptionType || 'free'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === u.id ? (
                      <Input value={form.subscriptionStatus ?? ''} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })} />
                    ) : (
                      u.subscriptionStatus || 'inactive'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {editingId === u.id ? (
                      <div className="inline-flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setForm({}); }}><X /></Button>
                        <Button size="sm" onClick={() => updateUser.mutate({ id: u.id, payload: form })}><Check /></Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(u.id); setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, subscriptionType: u.subscriptionType, subscriptionStatus: u.subscriptionStatus }); }}><Edit /></Button>
                    )}
                  </td>
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
