"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Calendar,
  CreditCard,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { Loader } from "@/components/common/Loader";
import { notificationsService } from "@/services/notifications.service";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    appointmentReminders: true,
    bookingUpdates: true,
    paymentUpdates: true,
    reportUpdates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const [subscribingPush, setSubscribingPush] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await notificationsService.getPreferences();
        if (res?.preferences) {
          setPreferences(res.preferences);
        }
      } catch (err) {
        toast.error("Failed to load preferences");
      } finally {
        setLoading(false);
      }
    }
    load();

    // Check browser Push support
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleToggle = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationsService.updatePreferences(preferences);
      toast.success("Notification preferences saved successfully");
    } catch (err) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleEnableBrowserPush = async () => {
    if (!pushSupported) {
      toast.error("Browser push notifications are not supported in your current browser.");
      return;
    }

    setSubscribingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        toast.error("Notification permission was denied. Please allow notifications in browser settings.");
        return;
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const keyRes = await notificationsService.getVapidPublicKey();
      const vapidPublicKey = keyRes?.publicKey;
      if (!vapidPublicKey) {
        throw new Error("Could not retrieve VAPID public key from server");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const subJson = subscription.toJSON();
      await notificationsService.subscribePush({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
        deviceName: navigator.userAgent.slice(0, 80),
      });

      setPreferences((prev) => ({ ...prev, pushEnabled: true }));
      toast.success("Browser push notifications activated!");
    } catch (err) {
      toast.error(err.message || "Failed to enable push notifications");
    } finally {
      setSubscribingPush(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/notifications">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title="Notification Preferences"
          description="Choose which delivery channels and clinical event alerts you wish to receive."
        />
      </div>

      {/* Web Push Banner */}
      {pushSupported && (
        <div className="p-5 rounded-2xl border bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Browser Web Push Notifications
              </h3>
              {pushPermission === "granted" && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Receive immediate desktop alerts when doctors confirm your slots, reports finish AI analysis, or phlebotomists arrive.
            </p>
          </div>
          {pushPermission !== "granted" ? (
            <Button
              onClick={handleEnableBrowserPush}
              disabled={subscribingPush}
              size="sm"
              className="shrink-0"
            >
              {subscribingPush ? "Activating..." : "Enable Push Alerts"}
            </Button>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-4 h-4" /> Enabled
            </span>
          )}
        </div>
      )}

      {/* Channels Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
            1. Delivery Channels
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the primary delivery mediums for your account updates.
          </p>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Transactional Email Notifications</p>
                <p className="text-xs text-slate-500">Booking receipts, cancellation notes, and doctor reminder emails.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={() => handleToggle("emailEnabled")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Browser Push Notifications</p>
                <p className="text-xs text-slate-500">Real-time alerts directly in your operating system notification tray.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={() => handleToggle("pushEnabled")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">SMS Text Alerts (Optional)</p>
                <p className="text-xs text-slate-500">Phlebotomist arrival reminders via SMS (disabled by default in free tier).</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.smsEnabled}
                onChange={() => handleToggle("smsEnabled")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
            2. Notification Events & Reminders
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Fine-tune which clinical and financial events trigger notifications.
          </p>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Doctor Appointment Reminders</p>
                <p className="text-xs text-slate-500">Automated BullMQ reminder 24 hours before your scheduled consultation.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.appointmentReminders}
                onChange={() => handleToggle("appointmentReminders")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Booking Confirmations & Status Updates</p>
                <p className="text-xs text-slate-500">Alerts when bookings are created, confirmed, rescheduled, or cancelled.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bookingUpdates}
                onChange={() => handleToggle("bookingUpdates")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Payment Confirmations & Refund Notices</p>
                <p className="text-xs text-slate-500">Immediate cryptographic payment verifications, failures, and processed refunds.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.paymentUpdates}
                onChange={() => handleToggle("paymentUpdates")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">AI Clinical Report Summaries</p>
                <p className="text-xs text-slate-500">Notification when uploaded laboratory reports finish AI multimodal analysis.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.reportUpdates}
                onChange={() => handleToggle("reportUpdates")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Changes..." : "Save Preferences"}</span>
        </Button>
      </div>
    </div>
  );
}

