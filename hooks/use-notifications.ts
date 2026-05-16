import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    markRead: markReadMutation.mutate,
    markReadAsync: markReadMutation.mutateAsync,
  };
}
