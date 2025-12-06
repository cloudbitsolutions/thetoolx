import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react"; // Spinner and delete icon

type ContactMessage = {
  id: number;
  name?: string;
  email: string;
  subject?: string;
  category?: string;
  message?: string;
  createdAt?: string;
};

export default function AdminContactMessages() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/contact-messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMessages(data.messages);
        } else {
          toast({
            title: "Failed to load messages",
            variant: "destructive",
          });
        }
        setLoading(false);
      })
      .catch(() => {
        toast({ title: "Failed to load messages", variant: "destructive" });
        setLoading(false);
      });
  }, [toast]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessages((msgs) => msgs.filter((m) => m.id !== id));
        toast({ title: "Message deleted" });
      } else {
        toast({ title: "Delete failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Card className="shadow-lg rounded-lg transition-transform hover:shadow-xl hover:-translate-y-1 duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Contact Messages</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12 text-sm">
              No contact messages found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold">Message</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Delete</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {messages.map((msg) => (
                    <tr
                      key={msg.id}
                      className="hover:bg-gray-50 transition duration-150 ease-in-out hover:shadow-sm"
                    >
                      <td className="px-4 py-3">{msg.name || "-"}</td>
                      <td className="px-4 py-3">{msg.email}</td>
                      <td className="px-4 py-3">{msg.category || "-"}</td>
                      <td className="px-4 py-3">{msg.subject || "-"}</td>
                      <td className="px-4 py-3 max-w-xs whitespace-pre-line break-words">
                        {msg.message}
                      </td>
                      <td className="px-4 py-3">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          title="Delete"
                          className="text-red-500 hover:text-red-700 p-1 rounded transition"
                          onClick={() => handleDelete(msg.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
