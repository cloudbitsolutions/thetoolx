import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface ToolAccessResponse {
  hasAccess: boolean;
  toolName: string;
  isPremium: boolean;
  userSubscription: string;
  requiresUpgrade: boolean;
}

export function useToolAccess(toolId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery<ToolAccessResponse>({
    queryKey: ["/api/tools", toolId, "access"],
    enabled: isAuthenticated && !!toolId,
  });
}

export function useCanAccessTool(toolId: number) {
  const { data: accessData, isLoading } = useToolAccess(toolId);
  
  return {
    canAccess: accessData?.hasAccess ?? false,
    isPremium: accessData?.isPremium ?? false,
    requiresUpgrade: accessData?.requiresUpgrade ?? false,
    userSubscription: accessData?.userSubscription ?? 'free',
    toolName: accessData?.toolName ?? '',
    isLoading
  };
}