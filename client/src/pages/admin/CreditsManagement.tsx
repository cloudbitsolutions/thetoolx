import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Gift,
  CreditCard,
  User,
  Calendar,
  Filter
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CreditsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [newCredits, setNewCredits] = useState({
    userId: "",
    amount: "",
    type: "bonus",
    reason: "",
  });
  const { toast } = useToast();

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: creditHistory = [] } = useQuery({
    queryKey: ["/api/admin/credits"],
  });

  const addCreditsMutation = useMutation({
    mutationFn: async (creditData: any) => {
      await apiRequest("POST", "/api/admin/credits", creditData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Credits added successfully",
      });
      setShowAddCredits(false);
      setNewCredits({ userId: "", amount: "", type: "bonus", reason: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add credits",
        variant: "destructive",
      });
    },
  });

  const handleAddCredits = () => {
    if (!newCredits.userId || !newCredits.amount || !newCredits.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    addCreditsMutation.mutate({
      userId: newCredits.userId,
      amount: parseInt(newCredits.amount),
      type: newCredits.type,
      reason: newCredits.reason,
    });
  };

  const filteredUsers = users.filter((user: any) => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bonus':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'purchase':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'refund':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'penalty':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Credits Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage user credits and reward system
          </p>
        </div>
        <Button onClick={() => setShowAddCredits(!showAddCredits)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Credits
        </Button>
      </div>

      {/* Add Credits Form */}
      {showAddCredits && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2" />
              Add Credits to User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userId">Select User</Label>
                <select
                  id="userId"
                  value={newCredits.userId}
                  onChange={(e) => setNewCredits(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select a user...</option>
                  {users.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.email} - {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="amount">Credits Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newCredits.amount}
                  onChange={(e) => setNewCredits(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter credits amount"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Credit Type</Label>
                <select
                  id="type"
                  value={newCredits.type}
                  onChange={(e) => setNewCredits(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="bonus">Bonus</option>
                  <option value="purchase">Purchase</option>
                  <option value="refund">Refund</option>
                  <option value="penalty">Penalty</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={newCredits.reason}
                  onChange={(e) => setNewCredits(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for credit adjustment"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddCredits(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddCredits}
                disabled={addCreditsMutation.isPending}
              >
                <Gift className="w-4 h-4 mr-2" />
                Add Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Users */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* User Credits Overview */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              User Credits Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No users found matching your search.
                </div>
              ) : (
                filteredUsers.map((user: any) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.credits || 0} Credits
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.subscriptionType || 'free'} plan
                        </div>
                      </div>
                      <Badge variant="outline">
                        {user.subscriptionStatus || 'active'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Recent Credit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No credit history available.
              </div>
            ) : (
              creditHistory.map((entry: any) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {entry.reason}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        User: {entry.userEmail}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {entry.amount > 0 ? '+' : ''}{entry.amount} Credits
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge className={getTypeColor(entry.type)}>
                      {entry.type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}