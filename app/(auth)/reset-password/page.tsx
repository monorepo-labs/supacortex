"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-6 px-4 text-center">
          <div className="space-y-1">
            <h1
              style={{ fontFamily: "var(--font-source-serif)" }}
              className="text-2xl font-medium text-zinc-900"
            >
              Invalid link
            </h1>
            <p className="text-sm text-zinc-500">
              This password reset link is invalid or has expired.
            </p>
          </div>
          <a
            href="/forgot-password"
            className="inline-block text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
          >
            Request a new link
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        setError(error.message ?? "Failed to reset password");
        return;
      }
      router.push("/login?reset=success");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1
            style={{ fontFamily: "var(--font-source-serif)" }}
            className="text-2xl font-medium text-zinc-900"
          >
            Reset password
          </h1>
          <p className="text-sm text-zinc-500">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          <a
            href="/login"
            className="text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
          >
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
