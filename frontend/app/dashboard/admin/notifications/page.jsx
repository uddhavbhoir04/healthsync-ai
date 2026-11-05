"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Send,
  Mail,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { notificationsService } from "@/services/notifications.service";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("all");
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [failedOutbox, setFailedOutbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");

  // Admin access gate
  useEffect(() => {
    if (!authLoading && user && user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statsRes = await notificationsService.getAdminStats();
      setStats(statsRes?.stats || null);

      if (activeTab === "failed_queue") {
        const failedRes = await notificationsService.getAdminFailed({ page, limit: 15 });
        setFailedOutbox(failedRes?.failedEvents || []);
        setPagination(failedRes?.pagination || { total: 0, pages: 1 });
      } else {
        const params = {
          page,
          limit: 15,
          channel: channelFilter,
          search,
        };
        if (activeTab !== "all") {
          params.status = activeTab.toUpperCase();
        }
        const notifRes = await notificationsService.getAdminNotifications(params);
        setNotifications(notifRes?.notifications || []);
        setPagination(notifRes?.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error(err.message || "Failed to load notification logs");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, channelFilter, search]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadData();
    }
  }, [user, loadData]);

  const handleRetry = async (outboxId) => {
    setRetryingId(outboxId);
    try {
      await notificationsService.retryNotification(outboxId);
      toast.success("Job re-queued in BullMQ outbox dispatcher");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to retry job");
    } finally {
      setRetryingId(null);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="py-24 flex justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Notification Governance & Job Monitoring"
          description="Inspect platform-wide transactional alerts, BullMQ queue telemetry, and failed outbox deliveries."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Dispatched
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              Delivery Rate
            </span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{stats.deliveryRate}%</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              Emails Sent
            </span>
            <p className="text-xl font-bold text-blue-600 mt-1">{stats.channels?.email || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">
              Push Alerts
            </span>
            <p className="text-xl font-bold text-teal-600 mt-1">{stats.channels?.push || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              In-App Notices
            </span>
            <p className="text-xl font-bold text-slate-800 mt-1">{stats.channels?.inApp || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
              Failed Jobs
            </span>
            <p className="text-xl font-bold text-rose-600 mt-1">
              {(stats.failed || 0) + (stats.failedOutboxCount || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "all", label: "All Notification Logs" },
            { key: "sent", label: "Delivered (Sent)" },
            { key: "failed_queue", label: `Failed Queue (${stats?.failedOutboxCount || 0})` },
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

        {activeTab !== "failed_queue" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="PUSH">Web Push</option>
              <option value="IN_APP">In-App</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader size="lg" />
        </div>
      ) : activeTab === "failed_queue" ? (
        /* Failed Outbox Events View */
        failedOutbox.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Outbox is healthy"
            description="Zero failed background jobs. All transactional emails and push notifications delivered smoothly."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Last Error Reason</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failedOutbox.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {ev.eventType}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-rose-600">{ev.attempts} / 5</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={ev.lastError}>
                      {ev.lastError || "Provider delivery failed"}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryingId === ev.id}
                        onClick={() => handleRetry(ev.id)}
                        className="text-xs"
                      >
                        {retryingId === ev.id ? "Retrying..." : "Retry Dispatch"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notification records found"
          description="No dispatched records match your selected filter criteria."
        />
      ) : (
        /* Notification Logs Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Title & Excerpt</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{n.user?.name || "System"}</p>
                    <p className="text-[11px] text-slate-400">{n.user?.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {n.channel === "EMAIL" && <Mail className="w-3 h-3 text-blue-500" />}
                      {n.channel === "PUSH" && <Bell className="w-3 h-3 text-teal-500" />}
                      {n.channel === "SMS" && <Smartphone className="w-3 h-3 text-purple-500" />}
                      {n.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    <p className="font-semibold text-slate-800 truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{n.message}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        n.status === "SENT" || n.status === "READ"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : n.status === "FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.pages} (Total {pagination.total} records)
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
  );
}

