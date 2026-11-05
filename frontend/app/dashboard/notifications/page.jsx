"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  CreditCard,
  Sparkles,
  FlaskConical,
  Settings,
  Mail,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { notificationsService } from "@/services/notifications.service";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type = "") {
  if (type.includes("APPOINTMENT") || type.includes("DOCTOR")) {
    return <Calendar className="w-5 h-5 text-blue-600" />;
  }
  if (type.includes("LAB") || type.includes("COLLECTION")) {
    return <FlaskConical className="w-5 h-5 text-purple-600" />;
  }
  if (type.includes("PAYMENT") || type.includes("REFUND")) {
    return <CreditCard className="w-5 h-5 text-emerald-600" />;
  }
  if (type.includes("AI") || type.includes("REPORT")) {
    return <Sparkles className="w-5 h-5 text-teal-600" />;
  }
  return <Bell className="w-5 h-5 text-slate-600" />;
}

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (activeTab === "unread") {
        params.isRead = false;
      } else if (activeTab === "bookings") {
        params.type = "BOOKING_CREATED,BOOKING_CONFIRMED,BOOKING_CANCELLED,BOOKING_RESCHEDULED,APPOINTMENT_REMINDER,LAB_COLLECTION_REMINDER";
      } else if (activeTab === "payments") {
        params.type = "PAYMENT_SUCCESS,PAYMENT_FAILED,REFUND_PROCESSED";
      } else if (activeTab === "reports") {
        params.type = "AI_REPORT_READY";
      }

      const [res, countRes] = await Promise.all([
        notificationsService.getNotifications(params),
        notificationsService.getUnreadCount(),
      ]);

      setNotifications(res?.notifications || []);
      setPagination(res?.pagination || { total: 0, pages: 1 });
      setUnreadCount(countRes?.count || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.success("Marked as read");
    } catch (err) {
      toast.error(err.message || "Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(err.message || "Failed to mark all as read");
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete notification");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Notification Center"
          description="Real-time clinical alerts, booking confirmations, payment receipts, and appointment reminders."
        />
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-teal-600" />
              <span>Mark all as read</span>
            </Button>
          )}
          <Link href="/dashboard/settings/notifications">
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Preferences</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { key: "all", label: "All Updates" },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "bookings", label: "Bookings & Appointments" },
          { key: "payments", label: "Payments & Refunds" },
          { key: "reports", label: "Clinical Reports" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications in this view"
          description="When you book appointments, receive lab test updates, or process payments, your updates will show up here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                !n.isRead
                  ? "bg-white border-teal-200 shadow-sm"
                  : "bg-white/70 border-slate-200/80 hover:bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getNotificationIcon(n.notificationType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm ${!n.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                        {n.channel}
                      </span>
                      {n.referenceType && (
                        <span className="text-[10px] text-slate-400">
                          Ref: #{n.referenceType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          title="Mark as read"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        title="Delete notification"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

