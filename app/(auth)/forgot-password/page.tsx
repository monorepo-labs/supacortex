"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });
      if (error) {
        setError(error.message ?? "Failed to send reset email");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-6 px-4 text-center">
          <div className="space-y-1">
            <h1
              style={{ fontFamily: "var(--font-source-serif)" }}
              className="text-2xl font-medium text-zinc-900"
            >
              Check your email
            </h1>
            <p className="text-sm text-zinc-500">
              If an account exists for {email}, you&apos;ll receive a password reset link shortly.
            </p>
          </div>
          <a
            href="/login"
            className="inline-block text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1
            style={{ fontFamily: "var(--font-source-serif)" }}
            className="text-2xl font-medium text-zinc-900"
          >
            Forgot password?
          </h1>
          <p className="text-sm text-zinc-500">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
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
