"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import Loader from "@/components/common/Loader";

export function DashboardLayout({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Only redirect once authentication checking has completed
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading state prevents flashing unauthenticated content
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader size="lg" label="Securing HealthSync Clinical Session..." />
      </div>
    );
  }

  // Prevent flash if not authenticated while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader size="md" label="Redirecting to secure login..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-200">
        <DashboardHeader
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;

