"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  UserRound,
  Search,
  Package,
  CalendarDays,
  FileText,
  BrainCircuit,
  Bell,
  Settings,
  LogOut,
  HeartPulse,
  ChevronRight,
  ShieldCheck,
  X,
  MapPin,
  Users,
  Stethoscope,
  FlaskConical,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/auth";

export function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Find Doctors",
      href: "/dashboard/doctors",
      icon: Stethoscope,
    },
    {
      label: "Lab Tests Catalog",
      href: "/dashboard/lab-tests",
      icon: FlaskConical,
    },
    {
      label: "Diagnostic Packages",
      href: "/dashboard/packages",
      icon: Package,
    },
    {
      label: "My Bookings",
      href: "/dashboard/bookings",
      icon: CalendarDays,
    },
    {
      label: "Payment History",
      href: "/dashboard/payments",
      icon: CreditCard,
    },
    {
      label: "Medical Reports",
      href: "/dashboard/ai-assistant/reports",
      icon: FileText,
    },
    {
      label: "AI Health Assistant",
      href: "/dashboard/ai-assistant",
      exact: true,
      icon: BrainCircuit,
      highlight: true,
      badge: "Gemini",
    },
    {
      label: "My Profile",
      href: "/dashboard/profile",
      icon: UserRound,
    },
    {
      label: "My Addresses",
      href: "/dashboard/addresses",
      icon: MapPin,
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            label: "User Management",
            href: "/dashboard/admin/users",
            icon: Users,
            badge: "Admin",
          },
          {
            label: "All Bookings",
            href: "/dashboard/admin/bookings",
            icon: CalendarDays,
            badge: "Admin",
          },
          {
            label: "Payment Governance",
            href: "/dashboard/admin/payments",
            icon: CreditCard,
            badge: "Admin",
          },
          {
            label: "Doctor Catalog",
            href: "/dashboard/admin/doctors",
            icon: Stethoscope,
            badge: "Admin",
          },
          {
            label: "Lab Test Catalog",
            href: "/dashboard/admin/lab-tests",
            icon: FlaskConical,
            badge: "Admin",
          },
          {
            label: "Package Catalog",
            href: "/dashboard/admin/packages",
            icon: Package,
            badge: "Admin",
          },
          {
            label: "AI Knowledge",
            href: "/dashboard/admin/ai-knowledge",
            icon: BookOpen,
            badge: "Admin",
          },
          {
            label: "Notification Monitoring",
            href: "/dashboard/admin/notifications",
            icon: Bell,
            badge: "Admin",
          },
        ]
      : []),
    {
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
    },
    {
      label: "Settings",
      href: "/dashboard/profile?tab=settings",
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 h-18 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/25">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              HealthSync <span className="text-teal-600">AI</span>
            </span>
            <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
              Clinical Platform
            </span>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href.split("?")[0]) && item.href !== "/dashboard";

          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-xs border border-blue-100/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                item.highlight && !isActive && "text-teal-700 hover:bg-teal-50/70"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-blue-600"
                      : item.highlight
                      ? "text-teal-600 group-hover:text-teal-700"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                    isActive
                      ? "bg-blue-600 text-white"
                      : item.highlight
                      ? "bg-teal-100 text-teal-800"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User profile & Logout footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-xs mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(user?.name || "Patient")}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || "Alex Morgan"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.email || "patient@healthsync.ai"}
              </p>
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop and overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;

