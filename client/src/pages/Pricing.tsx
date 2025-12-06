import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PricingCard from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { Check, X, CreditCard, Shield, Clock } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Subscription {
  subscriptionType: "free" | "monthly" | "yearly"; // or string if dynamic
  subscriptionStatus: string;                      // e.g. "active", "expired"
  subscriptionEndsAt: string | null;               // ISO date string
  isPremium: boolean;
}

export default function Pricing() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for pending subscription after authentication
  useEffect(() => {
    if (isAuthenticated) {
      const pendingSubscription = localStorage.getItem('pendingSubscription');
      if (pendingSubscription) {
        try {
          const { planType, amount, currency } = JSON.parse(pendingSubscription);
          localStorage.removeItem('pendingSubscription');
          // Small delay to ensure auth is fully loaded
          setTimeout(() => {
            handlePayment(planType, amount, currency);
          }, 500);
        } catch (error) {
          console.error('Error processing pending subscription:', error);
          localStorage.removeItem('pendingSubscription');
        }
      }
    }
  }, [isAuthenticated]);

  // Get current subscription status
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  // Get dynamic pricing from admin panel
  const { data: dynamicPricing = [] } = useQuery({
    queryKey: ["/api/pricing"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async ({ amount, planType, currency }: { amount: number; planType: string, currency: string }) => {
      const response = await apiRequest("POST", "/api/create-order", {
        amount,
        planType,
        currency,
      });
      return response.json();
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest("POST", "/api/verify-payment", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated successfully.",
      });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  const handlePayment = async (planType: string, amount: number, currency: string) => {
    if (!isAuthenticated) {
      // Store the plan details in localStorage to resume after authentication
      localStorage.setItem('pendingSubscription', JSON.stringify({ planType, amount, currency }));
      // Redirect to auth page instead of API endpoint
      window.location.href = "/auth";
      return;
    }

    setIsProcessing(true);
    
    try {
      const orderData = await createOrderMutation.mutateAsync({ amount, planType, currency });
      
      if (!window.Razorpay) {
        // Load Razorpay script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => initializePayment(orderData, planType);
        document.body.appendChild(script);
      } else {
        initializePayment(orderData, planType);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const initializePayment = (orderData: any, planType: string) => {
    const options = {
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "TheToolx",
      description: `${planType} subscription`,
      order_id: orderData.orderId,
      prefill: {
        email: user?.email,
        name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      },
      theme: {
        color: "#3B82F6",
      },
      handler: function (response: any) {
        verifyPaymentMutation.mutate({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          planType,
        });
        setIsProcessing(false);
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const features = [
    { id: "facebook_video", name: t("Facebook Video Downloader"), free: true, premium: true },
    { id: "youtube_video", name: t("YouTube Video Downloader"), free: true, premium: true },
    { id: "instagram_video", name: t("Instagram Video Downloader"), free: true, premium: true },
    { id: "tiktok_video", name: t("TikTok Video Downloader"), free: true, premium: true },
    { id: "twitter_video", name: t("Twitter Video Downloader"), free: true, premium: true },
    { id: "pdf_converter", name: t("PDF to Word Converter"), free: true, premium: true },
    { id: "youtube_mp3", name: t("YouTube to MP3 Converter"), free: true, premium: true },
    { id: "bg_remover", name: t("Background Remover"), free: true, premium: true },
    { id: "speed_test", name: t("Internet Speed Test"), free: true, premium: true },
    { id: "age_calculator", name: t("Age Calculator"), free: true, premium: true },
    { id: "translator", name: t("Language Translator"), free: true, premium: true },
    { id: "url_shortener", name: t("URL Shortener"), free: false, premium: true },
    { id: "unlimited_downloads", name: t("Unlimited Downloads"), free: false, premium: true },
    { id: "no_ads", name: t("No Advertisements"), free: false, premium: true },
    { id: "priority_support", name: t("Priority Support"), free: false, premium: true },
    { id: "api_access", name: t("API Access"), free: false, premium: true },
  ];

  // Find active monthly and yearly plans from admin-configured pricing
  const monthlyPlan = dynamicPricing.find((plan: any) => plan.planType === 'monthly' && plan.isActive);
  const yearlyPlan = dynamicPricing.find((plan: any) => plan.planType === 'yearly' && plan.isActive);

  const formatPrice = (price: string | number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol}${price}`;
  };

  const plans = [
    {
      title: t("Free"),
      price: "$0",
      period: t("forever"),
      features: features.map(f => ({ name: f.name, included: f.free })),
      buttonText: subscription?.subscriptionType === "free" ? t("Current Plan") : t("Get Started"),
      buttonVariant: "outline" as const,
      disabled: subscription?.subscriptionType === "free",
      onSelect: () => {
        if (!isAuthenticated) {
          window.location.href = "/auth";
        }
      },
    },
    {
      title: monthlyPlan?.planName || t("Monthly Pro"),
      price: monthlyPlan ? formatPrice(monthlyPlan.price, monthlyPlan.currency) : "$9.99",
      period: t("per month"),
      features: monthlyPlan?.features?.length > 0 
        ? monthlyPlan.features.map((feature: string) => ({ name: feature, included: true }))
        : features.map(f => ({ name: f.name, included: f.premium })),
      popular: true,
      buttonText: subscription?.subscriptionType === "monthly" ? t("Current Plan") : t("Upgrade Now"),
      buttonVariant: "default" as const,
      disabled: subscription?.subscriptionType === "monthly" || isProcessing,
      onSelect: () => handlePayment("monthly", monthlyPlan?.price, monthlyPlan?.currency || 9.99),
    },
    {
      title: yearlyPlan?.planName || t("Yearly Pro"),
      price: yearlyPlan ? formatPrice(yearlyPlan.price, yearlyPlan.currency) : "$99.99",
      period: t("per year"),
      features: yearlyPlan?.features?.length > 0 
        ? yearlyPlan.features.map((feature: string) => ({ name: feature, included: true }))
        : features.map(f => ({ name: f.name, included: f.premium })),
      buttonText: subscription?.subscriptionType === "yearly" ? t("Current Plan") : t("Upgrade Now"),
      buttonVariant: "secondary" as const,
      disabled: subscription?.subscriptionType === "yearly" || isProcessing,
      onSelect: () => handlePayment("yearly", yearlyPlan?.price, yearlyPlan?.currency || 99.99),
      badge: t("Best Value"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t("Choose Your Plan")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t("Unlock the full potential of TheToolx with our premium features")}
          </p>
          
          {subscription?.isPremium && (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
              <Check className="w-4 h-4 mr-2" />
              {t("You have an active")} {subscription.subscriptionType} {t("subscription")}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={index} {...plan} />
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t("Secure Payments")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t("All payments are processed securely through Razorpay with industry-standard encryption")}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t("Instant Activation")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t("Your premium features are activated immediately after successful payment")}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t("24/7 Support")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t("Premium users get priority support with fast response times")}
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            {t("Feature Comparison")}
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("Features")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("Free")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("Premium")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {features.map((feature, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {feature.free ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {feature.premium ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t("Money Back Guarantee")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t("Not satisfied? Get a full refund within 30 days, no questions asked.")}
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("Powered by Razorpay - India's most trusted payment gateway")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}