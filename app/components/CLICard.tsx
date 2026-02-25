"use client";

import { useState, useCallback } from "react";
import { Terminal, Check, Copy, Clipboard } from "lucide-react";

const commands = [
  "npm i -g @supacortex/cli",
  "npx skills add monorepo-labs/skills --skill supacortex",
  "scx login",
];

const aiPrompt = `Install the Supacortex CLI and skill so I can access my memory from this terminal:

npm i -g @supacortex/cli
npx skills add monorepo-labs/skills --skill supacortex
scx login`;

function CopyButton({
  text,
  className,
  children,
}: {
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
    >
      {children ?? (copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      ))}
    </button>
  );
}

export function CLICard() {
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(aiPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }, []);

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-900/10 dark:bg-zinc-100/10">
          <Terminal className="size-5 text-zinc-700 dark:text-zinc-300" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            CLI + skills
          </h3>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Any device, any AI tool
          </p>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Access your memory from Claude Code, OpenClaw, or any terminal. Install
        on Windows, Linux, or a second Mac.
      </p>
      <div className="flex flex-col gap-2 font-mono">
        {commands.map((cmd) => (
          <div
            key={cmd}
            className="group flex items-center justify-between gap-2 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800"
          >
            <code className="min-w-0 truncate text-[13px] text-zinc-600 dark:text-zinc-400">
              {cmd}
            </code>
            <CopyButton
              text={cmd}
              className="flex-none cursor-pointer text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleCopyPrompt}
        className="mt-auto flex w-full cursor-pointer select-none items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        {promptCopied ? (
          <>
            <Check className="size-4 text-emerald-500" />
            Copied!
          </>
        ) : (
          <>
            <Clipboard className="size-4" />
            Copy prompt for AI
          </>
        )}
      </button>
    </div>
  );
}
