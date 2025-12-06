import { ReactNode, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, Lock } from "lucide-react";
import { Link } from "wouter";
import { useCanAccessTool } from "@/hooks/useToolAccess";
import { useAuth } from "@/hooks/useAuth";

interface PremiumGuardProps {
  toolId: number;
  children: ReactNode;
  fallback?: ReactNode;
  // Optional: when the tool page already knows the tool's premium flag
  // (for example from GET /api/tools/:slug) it can pass it here so
  // PremiumGuard can show the unauthenticated premium prompt without
  // needing the authenticated-only access endpoint.
  isToolPremiumFromTool?: boolean;
  toolNameFromProps?: string;
}

export default function PremiumGuard({
  toolId,
  children,
  fallback,
  isToolPremiumFromTool,
  toolNameFromProps,
}: PremiumGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const { canAccess, isPremium, requiresUpgrade, toolName, isLoading } = useCanAccessTool(toolId);

  const resolvedIsPremium = isToolPremiumFromTool ?? isPremium;
  const resolvedToolName = toolNameFromProps ?? toolName;

  // Small initial grace period to avoid a quick "Access Denied" flash while
  // access state resolves on page refresh. Show the spinner for a short
  // interval (e.g. 2000ms) before evaluating access fallback UI.
  const [initialDelay, setInitialDelay] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialDelay(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Local check using /api/user data: if user is on free plan or premium but not active,
  // they should be prompted to upgrade when the tool is premium.
  const userSubscriptionType = user?.subscriptionType ?? "free";
  const userSubscriptionStatus = (user as any)?.subscriptionStatus ?? "inactive";
  const localRequiresUpgrade =
    !!resolvedIsPremium &&
    isAuthenticated &&
    (userSubscriptionType === "free" || (userSubscriptionType === "premium" && userSubscriptionStatus !== "active"));

  // Show loading state or initial grace spinner to avoid UI flicker (client-side only)
  const isSSR = typeof window === 'undefined';
  const showLoader = !isSSR && (isLoading || initialDelay);
  if (showLoader) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  // If the tool is not premium, let it render for everyone (including unauthenticated users).
  // Premium tools continue to be gated below.
  if (!resolvedIsPremium) {
    return <>{children}</>;
  }

  // If the tool is premium and the user is not authenticated, show the premium prompt
  // For authenticated users who need to upgrade we handle that below.
  if (resolvedIsPremium && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-full">
                <Crown className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {resolvedToolName}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              This is a premium feature. Please log in and upgrade to access this tool.
            </p>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Crown className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">Premium Feature</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {resolvedToolName} is available for premium users only. Please log in and upgrade to access this feature.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/auth">Log In to Continue</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/pricing">View Pricing Plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated but doesn't have access to premium tool
  // if (isAuthenticated && (requiresUpgrade || localRequiresUpgrade)) {
  if (requiresUpgrade || localRequiresUpgrade) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-full">
                <Lock className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {resolvedToolName}
            </h1>
            
            <Alert className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 max-w-2xl mx-auto">
              <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Premium Required:</strong> {resolvedToolName} is a premium feature. 
                <Link href="/pricing" className="underline ml-1">Upgrade your plan</Link> to access this tool.
              </AlertDescription>
            </Alert>

            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Crown className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">Upgrade Required</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You're currently on the free plan. Upgrade to premium to unlock {resolvedToolName} and all advanced features.
                </p>
                <Button asChild className="w-full">
                  <Link href="/pricing">Upgrade to Premium</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If user has access, render the children (actual tool content)
  if (canAccess) {
    return <>{children}</>;
  }

  // Fallback for any other case
  return fallback || (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          You don't have access to this tool. Please contact support if you believe this is an error.
        </p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}