"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  HeartPulse, 
  Menu, 
  X, 
  LayoutDashboard, 
  ArrowRight,
  ShieldCheck,
  Stethoscope
} from "lucide-react";
import Button from "@/components/common/Button";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                HealthSync <span className="text-teal-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium -mt-1 tracking-wider uppercase">
                Clinical Diagnostics
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#services"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Services
            </Link>
            <Link
              href="#packages"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Diagnostic Packages
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#ai-assistant"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              AI Assistant
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="gradient" size="sm" className="gap-1.5">
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-3">
          <Link
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Services
          </Link>
          <Link
            href="#packages"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Diagnostic Packages
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            How It Works
          </Link>
          <Link
            href="#ai-assistant"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            AI Assistant
          </Link>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="md" className="w-full" onClick={logout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="gradient" size="md" className="w-full">
                    Create Patient Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;

