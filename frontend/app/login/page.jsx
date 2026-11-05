"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { HeartPulse, ShieldCheck, CheckCircle2, Lock, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white">
      {/* Left split screen banner (desktop only) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden">
        {/* Background Image with dark gradient overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1400&q=80"
            alt="Healthcare Professional with Digital Tablet"
            fill
            priority
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-blue-950/70" />
        </div>

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              HealthSync <span className="text-teal-400">AI</span>
            </span>
          </Link>
        </div>

        {/* Middle Brand Value Proposition */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Precision Clinical Diagnostics</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
            Accredited Laboratory Testing at Your Doorstep.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Access certified pathologists, sterile home phlebotomy visits, and AI-assisted health metrics in one secure, unified clinical platform.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>CAP & CLIA Accredited Laboratory Network</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Cold-chain temperature transport for sample integrity</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Direct HIPAA-compliant digital report downloads</span>
            </div>
          </div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>256-Bit SSL Encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>HIPAA Compliant Data</span>
          </div>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Mobile Logo */}
        <div className="flex items-center justify-between mb-8 lg:mb-0">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm">HealthSync AI</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors ml-auto"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Center LoginForm */}
        <div className="my-auto py-8 flex justify-center">
          <Suspense fallback={<div className="text-xs text-slate-400">Loading form...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Bottom Terms */}
        <div className="text-center text-[11px] text-slate-400 pt-6">
          Protected by HealthSync Clinical Security Guard. Authorized patient access only.
        </div>
      </div>
    </div>
  );
}

