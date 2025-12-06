import { useQuery } from "@tanstack/react-query";

export type ToolRatingSummary = {
  average: number;
  totalReviews: number;
  totalUsers: number;
};

export function useToolRating(toolId?: number) {
  return useQuery<ToolRatingSummary, Error>({
    queryKey: ["tool", toolId, "rating-summary"],
    queryFn: async () => {
      if (!toolId) throw new Error("toolId is required");
      const res = await fetch(`/api/tools/${toolId}/reviews/summary`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch rating summary: ${res.status} ${res.statusText} - ${text.slice(0,200)}`);
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        // Likely Vite index.html was returned instead of JSON
        throw new Error(`Unexpected non-JSON response from reviews API. Response preview: ${text.slice(0,300)}`);
      }

      return res.json();
    },
  enabled: !!toolId,
  staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
