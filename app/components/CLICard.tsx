"use client";

import { useState, useCallback } from "react";
import { Check, Copy, Download, Terminal, Key } from "lucide-react";
import { ClipboardIcon } from "@heroicons/react/24/solid";
import { CommandLineIcon } from "@heroicons/react/24/solid";

const commands = [
  "npm i -g @supacortex/cli",
  "npx skills add monorepo-labs/skills --skill supacortex",
  "scx login",
];

const aiPrompt = `Install the Supacortex CLI and skill so I can access my memory from this terminal:

npm i -g @supacortex/cli
npx skills add monorepo-labs/skills --skill supacortex
scx login`;

export function CLICard() {
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch { /* clipboard access denied */ }
  }, []);

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-[hsl(0,0%,97%)] p-6 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-200 backdrop-blur-sm dark:bg-zinc-700">
          <CommandLineIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            CLI + skills
          </h3>
          <p className="text-base font-medium text-zinc-400 dark:text-zinc-500">
            Any device, any AI tool
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-base font-medium text-zinc-500 dark:text-zinc-400">
          <Download className="size-4 flex-none text-zinc-400 dark:text-zinc-500" />
          Install CLI and skill
        </div>
        <div className="flex items-center gap-3 text-base font-medium text-zinc-500 dark:text-zinc-400">
          <Key className="size-4 flex-none text-zinc-400 dark:text-zinc-500" />
          Log in with your account
        </div>
        <div className="flex items-center gap-3 text-base font-medium text-zinc-500 dark:text-zinc-400">
          <Terminal className="size-4 flex-none text-zinc-400 dark:text-zinc-500" />
          Works with Claude Code, OpenClaw, etc.
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopyPrompt}
        className="mt-auto flex w-full cursor-pointer select-none items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-zinc-700/20 dark:hover:bg-zinc-700"
      >
        {promptCopied ? (
          <>
            <Check className="size-4 text-emerald-500" />
            Copied!
          </>
        ) : (
          <>
            <ClipboardIcon className="size-4" />
            Copy setup prompt for AI
          </>
        )}
      </button>
    </div>
  );
}
