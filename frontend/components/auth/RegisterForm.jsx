"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { checkPasswordStrength } from "@/lib/auth";
import { toast } from "sonner";

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .max(150, "Email cannot exceed 150 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password cannot exceed 72 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password", "");
  const strength = checkPasswordStrength(passwordValue);

  const onSubmit = async (data) => {
    setApiError("");
    setIsLoading(true);

    try {
      await registerUser(data.name, data.email, data.password);
      toast.success("Account Created Successfully!", {
        description: "Your patient account is ready. Please sign in to continue.",
      });
      router.push("/login?registered=true");
    } catch (err) {
      console.error("Registration error:", err);
      const msg =
        err?.data?.message ||
        err?.message ||
        "Registration failed. Please verify your details or check if the email is already registered.";
      setApiError(msg);
      toast.error("Registration Failed", {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center sm:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create Patient Account
        </h2>
        <p className="text-xs text-slate-500">
          Join HealthSync AI for intelligent diagnostic monitoring and home tests.
        </p>
      </div>

      {/* Global API Error */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to register</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Legal Name"
          type="text"
          placeholder="Alex Morgan"
          icon={User}
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="alex.morgan@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-2">
          <Input
            label="Password (min 8 characters)"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            icon={Lock}
            endIcon={showPassword ? EyeOff : Eye}
            onEndIconClick={() => setShowPassword(!showPassword)}
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Password Strength Meter */}
          {passwordValue && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Strength:</span>
                <span className={`font-semibold ${strength.textClass}`}>
                  {strength.label}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex gap-1">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Input
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          placeholder="••••••••••••"
          icon={Lock}
          endIcon={showConfirmPassword ? EyeOff : Eye}
          onEndIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <div className="flex items-start gap-2 pt-1 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            By signing up, you agree to HealthSync AI HIPAA-compliant terms of service and clinical privacy protocols.
          </p>
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          isLoading={isLoading}
          className="w-full font-semibold shadow-md mt-2"
        >
          <span>Complete Registration</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* Footer link to Login */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default RegisterForm;

