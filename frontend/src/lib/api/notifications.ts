import api from "@/lib/api/client";

export interface Notification {
  id: string;
  userId: string;
  type: "PAYMENT_DUE" | "PAYMENT_OVERDUE" | "PROJECT_UPDATE" | "ASSIGNMENT_CREATED" | "GENERAL";
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>("/notifications", { params });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/notifications/unread-count");
  return data.count;
}

export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<number> {
  const { data } = await api.patch<{ updated: number }>("/notifications/read-all");
  return data.updated;
}
