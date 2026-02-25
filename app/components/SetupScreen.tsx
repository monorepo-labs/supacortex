"use client";

import { useEffect, useRef } from "react";
import type { SetupPhase } from "@/hooks/use-setup";
import type { DependencyStatus } from "@/services/setup";

interface SetupScreenProps {
  phase: SetupPhase;
  dependencies: DependencyStatus | null;
  installProgress: string[];
  error: string | null;
  onInstall: () => void;
  onSkip: () => void;
  onRetry: () => void;
}

export function SetupScreen({
  phase,
  dependencies,
  installProgress,
  error,
  onInstall,
  onSkip,
  onRetry,
}: SetupScreenProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [installProgress]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Supacortex</h1>
          <p className="mt-1 text-sm text-zinc-500">Setting up your workspace</p>
        </div>

        {/* Checking */}
        {phase === "checking" && (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="size-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Checking dependencies...</span>
          </div>
        )}

        {/* Needed */}
        {phase === "needed" && dependencies && (
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
              <DepRow label="opencode" sublabel="AI engine" installed={dependencies.opencode} />
              <DepRow label="scx" sublabel="Supacortex CLI" installed={dependencies.scx} />
            </div>

            <p className="text-sm text-zinc-500 text-center">
              {!dependencies.opencode && !dependencies.scx
                ? "Two tools need to be installed to get started."
                : "One tool needs to be installed to get started."}
            </p>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onInstall}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Install
              </button>
              <button
                onClick={onSkip}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Installing */}
        {phase === "installing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
              <span className="text-sm text-zinc-600">Installing...</span>
            </div>

            {installProgress.length > 0 && (
              <div
                ref={logRef}
                className="h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-400 [&::-webkit-scrollbar]:hidden"
              >
                {installProgress.map((line, i) => (
                  <div key={i} className={line.startsWith("✓") ? "text-green-400" : line.startsWith("✗") ? "text-red-400" : line.startsWith("→") ? "text-zinc-300" : ""}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Failed */}
        {phase === "failed" && (
          <div className="space-y-6">
            {installProgress.length > 0 && (
              <div
                ref={logRef}
                className="h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-400 [&::-webkit-scrollbar]:hidden"
              >
                {installProgress.map((line, i) => (
                  <div key={i} className={line.startsWith("✓") ? "text-green-400" : line.startsWith("✗") ? "text-red-400" : line.startsWith("→") ? "text-zinc-300" : ""}>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onRetry}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Retry
              </button>
              <button
                onClick={onSkip}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DepRow({ label, sublabel, installed }: { label: string; sublabel: string; installed: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        <span className="ml-2 text-xs text-zinc-400">{sublabel}</span>
      </div>
      {installed ? (
        <span className="text-xs font-medium text-green-600">Installed</span>
      ) : (
        <span className="text-xs font-medium text-zinc-400">Not found</span>
      )}
    </div>
  );
}
