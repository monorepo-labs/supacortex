"use client";

import Image from "next/image";

// Step 1: X bookmarks syncing to Supacortex app icon
export function SyncVisual() {
  return (
    <div className="relative flex items-center justify-center gap-8 py-6 sm:gap-12 sm:py-8">
      <style>{`
        @keyframes sync-packet-1 {
          0% { left: 48px; opacity: 0; }
          10% { opacity: 1; }
          45% { opacity: 1; }
          55% { left: calc(100% - 80px); opacity: 0; }
          100% { left: calc(100% - 80px); opacity: 0; }
        }
        @keyframes sync-packet-2 {
          0%, 20% { left: 48px; opacity: 0; }
          30% { opacity: 1; }
          60% { opacity: 1; }
          70% { left: calc(100% - 80px); opacity: 0; }
          100% { left: calc(100% - 80px); opacity: 0; }
        }
        @keyframes sync-packet-3 {
          0%, 40% { left: 48px; opacity: 0; }
          50% { opacity: 1; }
          75% { opacity: 1; }
          85% { left: calc(100% - 80px); opacity: 0; }
          100% { left: calc(100% - 80px); opacity: 0; }
        }
        @keyframes sync-icon-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(23,132,254,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(23,132,254,0); }
        }
      `}</style>

      {/* X logo */}
      <div className="z-10 flex size-12 flex-none items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-zinc-500 dark:text-zinc-400">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {/* Sync track */}
      <div className="relative h-px flex-1 bg-zinc-200 dark:bg-zinc-700">
        {/* Dashed overlay */}
        <div className="absolute inset-0 border-t border-dashed border-zinc-300 dark:border-zinc-600" />

        {/* Animated packets */}
        <div
          className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#1784fe]"
          style={{ animation: "sync-packet-1 3s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#1784fe]/70"
          style={{ animation: "sync-packet-2 3s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#1784fe]/50"
          style={{ animation: "sync-packet-3 3s ease-in-out infinite" }}
        />
      </div>

      {/* Supacortex app icon */}
      <div
        className="z-10 flex size-12 flex-none items-center justify-center overflow-hidden rounded-xl"
        style={{ animation: "sync-icon-pulse 3s ease-in-out infinite" }}
      >
        <Image
          src="/supacortex-icon.png"
          alt="Supacortex"
          width={48}
          height={48}
          className="size-12 rounded-xl"
        />
      </div>
    </div>
  );
}

// Step 2: Telegram-style chat — user says "save to cortex", OpenClaw bot replies
export function SaveVisual() {
  return (
    <div className="flex flex-col gap-2 py-4">
      <style>{`
        @keyframes save-msg-user {
          0%, 5% { opacity: 0; transform: translateY(8px); }
          15%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes save-msg-bot {
          0%, 40% { opacity: 0; transform: translateY(8px); }
          55%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes save-typing {
          0%, 15% { opacity: 0; }
          25%, 40% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes save-dot-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      {/* User message — right aligned */}
      <div
        className="flex justify-end"
        style={{ animation: "save-msg-user 5s ease-out infinite" }}
      >
        <div className="rounded-2xl rounded-br-md bg-[#1784fe] px-3.5 py-2">
          <p className="text-xs font-medium text-white">save this to cortex</p>
        </div>
      </div>

      {/* Typing indicator */}
      <div
        className="flex items-center gap-1"
        style={{ animation: "save-typing 5s ease-out infinite" }}
      >
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-zinc-100 px-3.5 py-2.5 dark:bg-zinc-800">
          <span
            className="inline-block size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
            style={{ animation: "save-dot-bounce 0.6s ease-in-out infinite" }}
          />
          <span
            className="inline-block size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
            style={{ animation: "save-dot-bounce 0.6s ease-in-out 0.15s infinite" }}
          />
          <span
            className="inline-block size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
            style={{ animation: "save-dot-bounce 0.6s ease-in-out 0.3s infinite" }}
          />
        </div>
      </div>

      {/* Bot reply — left aligned with OpenClaw avatar */}
      <div
        className="flex items-start gap-2"
        style={{ animation: "save-msg-bot 5s ease-out infinite" }}
      >
        <Image
          src="/openclaw-icon.png"
          alt="OpenClaw"
          width={24}
          height={24}
          className="size-6 flex-none rounded-full"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">OpenClaw</span>
          <div className="rounded-2xl rounded-tl-md bg-zinc-100 px-3.5 py-2 dark:bg-zinc-800">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Saved — &ldquo;Auth architecture discussion&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Claude Code terminal — user asks to pull convo, AI replies
export function RecallVisual() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card dark:bg-zinc-900">
      <style>{`
        @keyframes recall-prompt {
          0%, 8% { opacity: 0; }
          15%, 100% { opacity: 1; }
        }
        @keyframes recall-response {
          0%, 45% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }
        @keyframes recall-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>

      {/* Title bar */}
      <div className="relative flex items-center justify-center bg-white px-4 py-2.5 dark:bg-zinc-900">
        <div className="absolute left-4 flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-[#FF5F56]" />
          <div className="size-2.5 rounded-full bg-[#FFBD2E]" />
          <div className="size-2.5 rounded-full bg-[#27C93F]" />
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">Terminal</span>
      </div>

      {/* Terminal content */}
      <div className="flex flex-col gap-0 bg-white p-4 pb-6 font-mono text-xs leading-relaxed dark:bg-zinc-900 sm:p-6 sm:pb-8">
        {/* Claude Code startup */}
        <div className="text-zinc-400 dark:text-zinc-500">$ claude</div>
        <div className="mt-2 flex items-center gap-2.5">
          {/* Claude mascot */}
          <div className="text-[10px] font-bold leading-[1.1] text-[#E07A5F]">
            <div>▄█▀█▄</div>
            <div>█▄▄▄█</div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-zinc-700 dark:text-zinc-400">Claude Code</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-600">v1.0.12</span>
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
              ~/projects/my-app
            </div>
          </div>
        </div>

        {/* User prompt */}
        <div
          className="mt-4 flex items-start gap-2"
          style={{ animation: "recall-prompt 6s ease-out infinite" }}
        >
          <span className="shrink-0 text-zinc-400 dark:text-zinc-500">&gt;</span>
          <span className="text-zinc-800 dark:text-zinc-200">what did we decide on auth last week?</span>
          <span
            className="inline-block h-3.5 w-1.5 bg-zinc-300 dark:bg-zinc-500"
            style={{ animation: "recall-cursor 1s step-end infinite" }}
          />
        </div>

        {/* Tool call */}
        <div
          className="mt-2 flex items-start gap-2"
          style={{ animation: "recall-response 6s ease-out infinite" }}
        >
          <span className="text-zinc-400 dark:text-zinc-500">✻</span>
          <span className="text-zinc-400 dark:text-zinc-500">Bash(scx conversation list --search &quot;auth&quot;)</span>
        </div>

        {/* AI response */}
        <div
          className="mt-3 flex flex-col gap-2 pl-5 text-sm"
          style={{ animation: "recall-response 6s ease-out infinite" }}
        >
          <p className="text-zinc-600 dark:text-zinc-400">
            Found a conversation from Feb 28 — &ldquo;Auth architecture discussion&rdquo;.
            You went with BetterAuth using session-based auth and added Twitter OAuth for the X sync flow.
          </p>
          <p className="text-zinc-400 dark:text-zinc-500">
            Want me to show you everything stored from that session?
          </p>
        </div>
      </div>
    </div>
  );
}
