"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Menu,
  Bell,
  Sparkles,
  ChevronDown,
  User,
  Clock,
  LogOut,
  CheckCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { GlobalSearch } from "@/components/healthcare/GlobalSearch";
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
  return `${diffDays}d ago`;
}

export function DashboardHeader({ onOpenMobileSidebar }) {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotificationData = useCallback(async () => {
    if (!user) return;
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsService.getNotifications({ limit: 5 }),
        notificationsService.getUnreadCount(),
      ]);
      setNotifications(listRes?.notifications || []);
      setUnreadCount(countRes?.count || 0);
    } catch {
      // Quiet fail on network hiccups
    }
  }, [user]);

  useEffect(() => {
    fetchNotificationData();
    // Poll every 45 seconds for background updates
    const interval = setInterval(fetchNotificationData, 45000);
    return () => clearInterval(interval);
  }, [fetchNotificationData]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: Mobile menu & Quick Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <GlobalSearch />
        </div>
      </div>

      {/* Right side: Quick actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Gemini AI pill */}
        <Link
          href="/dashboard/ai-assistant"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200/80 text-teal-800 hover:shadow-xs transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
          <span>Gemini Health Assistant</span>
        </Link>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-blue-600 ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-92 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`py-3 text-left hover:bg-slate-50/70 rounded-xl px-2 transition-colors ${
                        !n.isRead ? "bg-teal-50/30" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${!n.isRead ? "text-slate-900 font-bold" : "text-slate-700"}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            title="Mark as read"
                            className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 cursor-pointer shrink-0"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  <span>Open Notification Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user?.name || "Patient")}
            </div>
            <span className="hidden md:block text-xs font-semibold text-slate-800 max-w-28 truncate">
              {user?.name || "Patient"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Patient"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                  {user?.role || "Verified Patient"}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile & Settings</span>
                </Link>
                <Link
                  href="/dashboard/settings/notifications"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notification Preferences</span>
                </Link>
                <Link
                  href="/dashboard/bookings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Appointments History</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
