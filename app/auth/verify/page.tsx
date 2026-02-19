"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/cli/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode: code.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setError("Something went wrong");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 px-4 text-center">
          <h1
            style={{ fontFamily: "var(--font-source-serif)" }}
            className="text-2xl font-medium text-zinc-900"
          >
            CLI authorized
          </h1>
          <p className="text-sm text-zinc-500">
            You can close this tab and return to your terminal.
          </p>
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
            Authorize CLI
          </h1>
          <p className="text-sm text-zinc-500">
            Enter the code shown in your terminal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="ABCD-1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center text-lg tracking-widest"
            maxLength={9}
            required
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "Verifying..." : "Authorize"}
          </Button>
        </form>
      </div>
    </div>
  );
}
