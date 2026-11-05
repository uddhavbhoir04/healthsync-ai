import React from "react";
import Link from "next/link";
import { HeartPulse, ShieldCheck, Lock, Activity, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                HealthSync <span className="text-teal-400">AI</span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Next-generation diagnostic platform combining accredited clinical laboratories, certified home phlebotomy, and AI-assisted health metrics.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CAP & CLIA Accredited</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Diagnostic Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard/tests" className="text-slate-400 hover:text-white transition-colors">
                  Blood Chemistry Panels
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tests" className="text-slate-400 hover:text-white transition-colors">
                  Cardiac Risk Screening
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tests" className="text-slate-400 hover:text-white transition-colors">
                  Diabetes & HbA1c
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tests" className="text-slate-400 hover:text-white transition-colors">
                  Thyroid Spectrum
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tests" className="text-slate-400 hover:text-white transition-colors">
                  Executive Whole-Body
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                  Patient Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/bookings" className="text-slate-400 hover:text-white transition-colors">
                  Sample Pickup Status
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ai-assistant" className="text-slate-400 hover:text-white transition-colors">
                  AI Health Assistant
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
                  Clinical Partner Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Support & Care
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>support@healthsync.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>+1 (800) 555-SYNC</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>500 Innovation Way, Suite 100, San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} HealthSync AI Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Safeguards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

