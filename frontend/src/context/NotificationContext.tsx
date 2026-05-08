"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { Notification } from "@/lib/types";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/api/notifications?limit=30");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // SSE connection for real-time push
  useEffect(() => {
    if (!user || !token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = `${baseUrl}/api/notifications/stream`;

    // EventSource doesn't support custom headers, so we pass token as query param
    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        setNotifications((prev) => [notification, ...prev].slice(0, 30));
        setUnreadCount((prev) => prev + 1);

        // Show toast
        const isHighFive = notification.type === "PLATINUM_HIGH_FIVE";
        toast(notification.title, {
          icon: isHighFive ? "🖐" : notification.metadata?.points && notification.metadata.points > 0 ? "✅" : "⚠️",
          duration: 5000,
          style: isHighFive
            ? { background: "#FDF6E3", border: "2px solid #B8860B", fontWeight: 600 }
            : undefined,
        });
      } catch {
        // ignore parse errors / heartbeats
      }
    };

    es.onerror = () => {
      // Auto-reconnects by default; no action needed
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [user, token]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Failed to mark as read");
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed to mark all as read");
    }
  }, []);

  const clearRead = useCallback(async () => {
    try {
      await api.delete("/api/notifications/clear");
      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch {
      toast.error("Failed to clear notifications");
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAsRead, markAllRead, clearRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
