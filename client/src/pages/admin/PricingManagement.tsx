import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2, DollarSign, Users, Check } from "lucide-react";

export default function PricingManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    planName: "",
    planType: "monthly",
    price: "",
    currency: "USD",
    features: "",
    isActive: true,
  });
  const { toast } = useToast();

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/admin/pricing"],
  });

  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const payload = {
        ...planData,
        price: parseFloat(planData.price),
        features: planData.features.split('\n').map((f: string) => f.trim()).filter(Boolean),
      };
      await apiRequest("POST", "/api/admin/pricing", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
      toast({
        title: "Success",
        description: "Pricing plan created successfully",
      });
      setShowCreateModal(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create pricing plan",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const payload = {
        ...data,
        price: parseFloat(data.price),
        features: data.features.split('\n').map((f: string) => f.trim()).filter(Boolean),
      };
      await apiRequest("PUT", `/api/admin/pricing/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
      toast({
        title: "Success",
        description: "Pricing plan updated successfully",
      });
      setEditingPlan(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pricing plan",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      await apiRequest("DELETE", `/api/admin/pricing/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
      toast({
        title: "Success",
        description: "Pricing plan deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete pricing plan",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      planName: "",
      planType: "monthly",
      price: "",
      currency: "USD",
      features: "",
      isActive: true,
    });
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      planName: plan.planName,
      planType: plan.planType,
      price: plan.price.toString(),
      currency: plan.currency,
      features: plan.features?.join('\n') || "",
      isActive: plan.isActive,
    });
  };

  const handleSubmit = () => {
    if (!formData.planName || !formData.price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Subscription Pricing Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage subscription plans and pricing for your platform
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Edit Pricing Plan' : 'Create New Pricing Plan'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="planName">Plan Name</Label>
                <Input
                  id="planName"
                  placeholder="e.g., Premium Monthly"
                  value={formData.planName}
                  onChange={(e) => handleInputChange('planName', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="planType">Plan Type</Label>
                <select
                  id="planType"
                  value={formData.planType}
                  onChange={(e) => handleInputChange('planType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="9.99"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  placeholder="Unlimited downloads&#10;Premium tools access&#10;Priority support"
                  value={formData.features}
                  onChange={(e) => handleInputChange('features', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active Plan</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pricing Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan: any) => (
          <Card key={plan.id} className={`relative ${plan.isActive ? 'ring-2 ring-blue-500' : 'opacity-75'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.planName}</CardTitle>
                <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {plan.currency === 'USD' ? '$' : plan.currency === 'EUR' ? '€' : '₹'}
                  {plan.price}
                </span>
                <span className="text-gray-600 dark:text-gray-300">
                  /{plan.planType}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {plan.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleEdit(plan);
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this pricing plan?')) {
                          deletePlanMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {plan.planType}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {plans.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No pricing plans found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Create your first pricing plan to get started with subscription management.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}