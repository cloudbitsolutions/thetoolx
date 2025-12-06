import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";

type User = {
  subscriptionType: string;
  [key: string]: any;
};

export function useAuth() {
  // Use the QueryClient provided via context (SSR or client). Read any
  // prefetched data and pass it as `initialData` so the hook is not in a
  // loading state during SSR when data was seeded.
  const qc = useQueryClient();
  const cached = qc.getQueryData(["/api/user"]);
  // If no cached data is present on the server, provide explicit null
  // as initialData so `useQuery` is not left in a loading state during SSR.
  const initialData = cached !== undefined ? cached : null;
  
  // On SSR, always set initialData and ensure placeholderData is also set
  // so isLoading will be false during server render
  const isSSR = typeof window === 'undefined';
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData,
    placeholderData: isSSR ? initialData : undefined,
    enabled: !isSSR || !!cached, // On SSR, only fetch if we have cached data
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // For Auth, we need to navigate to the logout endpoint
      // which will handle the OpenID Connect logout flow
      window.location.href = "/api/logout";
    },
    onSuccess: () => {
      // Clear the user cache
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user: user as User | null,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}
