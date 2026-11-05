"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setApiError("");
    setIsLoading(true);

    try {
      const res = await login(data.email, data.password);
      toast.success("Welcome back!", {
        description: `Signed in as ${res?.user?.name || data.email}`,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Login submission error:", err);
      const msg =
        err?.data?.message ||
        err?.message ||
        "Unable to sign in. Please verify your credentials or ensure the backend is running.";
      setApiError(msg);
      toast.error("Authentication Failed", {
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
          Welcome back
        </h2>
        <p className="text-xs text-slate-500">
          Sign in to access your diagnostic tests, reports, and appointments.
        </p>
      </div>

      {/* Global API error notification */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Sign in error</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="alex.morgan@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            icon={Lock}
            endIcon={showPassword ? EyeOff : Eye}
            onEndIconClick={() => setShowPassword(!showPassword)}
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                defaultChecked
              />
              <span>Remember this session</span>
            </label>

            <button
              type="button"
              onClick={() =>
                toast.info("Password Reset Service", {
                  description: "Please contact clinic administrator or support@healthsync.ai to reset your clinical account.",
                })
              }
              className="font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          isLoading={isLoading}
          className="w-full font-semibold shadow-md mt-2"
        >
          <span>Sign In to HealthSync</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* Footer link to Register */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Don&apos;t have a patient account yet?{" "}
        <Link
          href="/register"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default LoginForm;

