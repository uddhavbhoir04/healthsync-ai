"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";
import { HeartPulse, ShieldCheck, CheckCircle2, Lock, Sparkles } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white">
      {/* Left split screen banner (desktop only) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1400&q=80"
            alt="Clinical Laboratory Scientist"
            fill
            priority
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-teal-950/70" />
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

        {/* Middle Brand Value */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Join 50,000+ Proactive Patients</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
            Take Control of Your Biomarkers with Medical-Grade Clarity.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Create your confidential HealthSync AI account today. Schedule home sample pickups, view trend graphs, and receive doctor-reviewed laboratory results.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Complimentary phlebotomist home visits on eligible packages</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Instant AI biomarker contextualization engine</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Lifetime secure history of all your diagnostic reports</span>
            </div>
          </div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Encrypted Health Vault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Privacy Standards</span>
          </div>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Mobile Header */}
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

        {/* Center RegisterForm */}
        <div className="my-auto py-8 flex justify-center">
          <Suspense fallback={<div className="text-xs text-slate-400">Loading form...</div>}>
            <RegisterForm />
          </Suspense>
        </div>

        {/* Bottom Terms */}
        <div className="text-center text-[11px] text-slate-400 pt-6">
          By registering, you acknowledge our clinical data privacy and specimen handling terms.
        </div>
      </div>
    </div>
  );
}

