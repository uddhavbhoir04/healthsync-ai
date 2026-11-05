"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { usersService } from "@/services/users.service";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { getInitials, formatRole } from "@/lib/auth";
import {
  UserRound,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s\-()]{7,20}$/, "Enter a valid phone number (7-20 digits)")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
      },
      { message: "Date of birth must be a past date" }
    )
    .optional()
    .or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  profileImageUrl: z
    .string()
    .trim()
    .url("Please enter a valid HTTP/HTTPS image URL")
    .optional()
    .or(z.literal("")),
});

export default function ProfilePage() {
  const { user: authUser, updateUserData } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      profileImageUrl: "",
    },
  });

  const watchedImageUrl = watch("profileImageUrl");

  // Fetch profile on mount
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        setIsLoading(true);
        const res = await usersService.getProfile();
        const data = res?.data || res?.user || res;
        if (isMounted && data) {
          setProfile(data);
          reset({
            name: data.name || "",
            phone: data.phone || "",
            dateOfBirth: data.dateOfBirth || "",
            gender: data.gender || "",
            profileImageUrl: data.profileImageUrl || "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        // Fallback to authUser details
        if (isMounted && authUser) {
          setProfile(authUser);
          reset({
            name: authUser.name || "",
            phone: authUser.phone || "",
            dateOfBirth: authUser.dateOfBirth || "",
            gender: authUser.gender || "",
            profileImageUrl: authUser.profileImageUrl || "",
          });
        }
        toast.error("Could not fetch remote profile details", {
          description: err.message || "Using current session data",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [reset, authUser]);

  const onSubmit = async (values) => {
    try {
      setIsSaving(true);
      const payload = {
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || null,
        profileImageUrl: values.profileImageUrl?.trim() || null,
      };

      const res = await usersService.updateProfile(payload);
      const updated = res?.data || res?.user || res;

      setProfile(updated);
      if (updateUserData) {
        updateUserData(updated);
      }

      setIsEditing(false);
      setShowImageUrlInput(false);
      toast.success("Profile Updated Successfully", {
        description: "Your clinical identity and preferences have been securely saved.",
      });
    } catch (err) {
      console.error("Update profile failed:", err);
      toast.error("Failed to update profile", {
        description: err.message || "Please check your inputs and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      reset({
        name: profile.name || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        profileImageUrl: profile.profileImageUrl || "",
      });
    }
    setIsEditing(false);
    setShowImageUrlInput(false);
  };

  const currentDisplayUser = profile || authUser;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        badge="Account & Identity"
        title="Personal Profile & Settings"
        description="Manage your clinical profile, verified patient identity, and contact information used for diagnostic orders."
      />

      {/* Header Profile Summary Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group">
          {watchedImageUrl || currentDisplayUser?.profileImageUrl ? (
            <img
              src={watchedImageUrl || currentDisplayUser?.profileImageUrl}
              alt={currentDisplayUser?.name || "Patient"}
              className="w-22 h-22 rounded-2xl object-cover border-2 border-white shadow-md shadow-slate-200/50"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-22 h-22 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-teal-500 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
              {getInitials(currentDisplayUser?.name || "Patient")}
            </div>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={() => setShowImageUrlInput(!showImageUrlInput)}
              className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
              title="Change Profile Picture URL"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {currentDisplayUser?.name || "Patient"}
            </h2>
            <Badge variant="success" size="sm">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified Account
            </Badge>
          </div>

          <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDisplayUser?.email || "patient@healthsync.ai"}</span>
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Role: {formatRole(currentDisplayUser?.role || "PATIENT")}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Account ID: #{currentDisplayUser?.id || "---"}
            </span>
            {currentDisplayUser?.phone && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {currentDisplayUser.phone}
                </span>
              </>
            )}
          </div>
        </div>

        <div>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="font-semibold shadow-xs"
            >
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit(onSubmit)}
                isLoading={isSaving}
                className="font-semibold"
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Security & Access Control
        </button>
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 space-y-4">
              <div className="h-4 bg-slate-200/80 rounded w-1/4 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-blue-600" />
                    <span>Clinical Profile Data</span>
                  </h3>
                  {isEditing && (
                    <span className="text-[11px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md font-medium border border-teal-100">
                      Editing Mode Active
                    </span>
                  )}
                </div>

                {/* Avatar URL input when editing */}
                {isEditing && showImageUrlInput && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
                    <label className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                      Profile Image URL (Public HTTPS Link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      {...register("profileImageUrl")}
                      className="w-full text-xs p-2.5 rounded-xl border border-blue-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {errors.profileImageUrl && (
                      <p className="text-[11px] text-rose-600">
                        {errors.profileImageUrl.message}
                      </p>
                    )}
                    <p className="text-[11px] text-blue-700/80">
                      Paste a direct image link from Unsplash, Gravatar, or your preferred hosting.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      {...register("name")}
                      placeholder="e.g. Dr. Jane Doe"
                      className={`w-full text-xs p-2.5 rounded-xl border transition-all ${
                        isEditing
                          ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          : "border-slate-200/80 bg-slate-50 text-slate-600 cursor-not-allowed"
                      } ${errors.name ? "border-rose-400 bg-rose-50/20" : ""}`}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email - READ ONLY */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Email Address
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Read-Only
                      </span>
                    </div>
                    <input
                      type="email"
                      disabled
                      value={currentDisplayUser?.email || ""}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Primary sign-in credential and diagnostic notification recipient.
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        disabled={!isEditing}
                        {...register("phone")}
                        placeholder="+1 (555) 234-5678"
                        className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border transition-all ${
                          isEditing
                            ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            : "border-slate-200/80 bg-slate-50 text-slate-600 cursor-not-allowed"
                        } ${errors.phone ? "border-rose-400 bg-rose-50/20" : ""}`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Phlebotomists and diagnostic couriers contact this number for appointments.
                    </p>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="date"
                        disabled={!isEditing}
                        {...register("dateOfBirth")}
                        className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border transition-all ${
                          isEditing
                            ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            : "border-slate-200/80 bg-slate-50 text-slate-600 cursor-not-allowed"
                        } ${errors.dateOfBirth ? "border-rose-400 bg-rose-50/20" : ""}`}
                      />
                    </div>
                    {errors.dateOfBirth && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {errors.dateOfBirth.message}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Required for clinical reference intervals on lab reports.
                    </p>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Gender Identity
                    </label>
                    <select
                      disabled={!isEditing}
                      {...register("gender")}
                      className={`w-full text-xs p-2.5 rounded-xl border transition-all ${
                        isEditing
                          ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          : "border-slate-200/80 bg-slate-50 text-slate-600 cursor-not-allowed"
                      } ${errors.gender ? "border-rose-400 bg-rose-50/20" : ""}`}
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other / Prefer not to say</option>
                    </select>
                    {errors.gender && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {errors.gender.message}
                      </p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isSaving}
                      className="font-semibold shadow-xs"
                    >
                      Save Profile Changes
                    </Button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* Security & Access Control Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Role-Based Access Control (RBAC) & Security Policy</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                  Assigned Role
                </span>
                <p className="text-base font-bold text-blue-950">
                  {formatRole(currentDisplayUser?.role || "PATIENT")}
                </p>
                <p className="text-[11px] text-blue-800/80">
                  Authorizes diagnostic bookings, address management, and patient services.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
                  Account Status
                </span>
                <p className="text-base font-bold text-emerald-950">
                  {currentDisplayUser?.status !== false ? "Active & Verified" : "Suspended"}
                </p>
                <p className="text-[11px] text-emerald-800/80">
                  Protected with JWT short-lived tokens and HttpOnly session cookies.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600">
                  Session Mode
                </span>
                <p className="text-base font-bold text-teal-950">
                  In-Memory Token
                </p>
                <p className="text-[11px] text-teal-800/80">
                  Zero localStorage leakage; protected against XSS token harvesting.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-800">
                  Role Enforcement Details
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Role permissions are validated on every backend request via <code className="text-blue-700 bg-blue-50 px-1 rounded">allowRoles()</code> middleware and refreshed automatically upon token rotation. If you require Doctor or Administrative privileges, please contact your hospital clinical administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
