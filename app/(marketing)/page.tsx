import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CLICard } from "@/app/components/CLICard";

import {
  Terminal,
  MessageSquare,
  Brain,
  ArrowUpRight,
  Bookmark,
  Search,
  Shield,
  Code,
} from "lucide-react";
import {
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  ArrowRightEndOnRectangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";

function XIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function AppleIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 384 512"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

const features = [
  {
    icon: Brain,
    title: "Persistent memory",
    description:
      "Your bookmarks, notes, and conversations — stored in one place. Switch between AI tools without losing context.",
  },
  {
    icon: XIcon,
    title: "X bookmark sync",
    description:
      "Connect your X account and import all your bookmarks. Everything is saved and searchable.",
  },
  {
    icon: Bookmark,
    title: "Save links & videos",
    description:
      "Save any link or YouTube video. Full content extraction and transcripts, all searchable.",
  },
  {
    icon: Search,
    title: "Search everything",
    description:
      "Full-text search across all your bookmarks, notes, and saved content. Find anything instantly.",
  },
  {
    icon: Terminal,
    title: "CLI first",
    description: (
      <>
        Access your memory from{" "}
        <a href="https://github.com/nicholasgriffintn/OpenClaw" target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline decoration-zinc-300 hover:text-zinc-700 dark:decoration-zinc-600 dark:hover:text-zinc-300">OpenClaw</a>
        , Claude Code, or any terminal-based AI tool.
      </>
    ),
  },
  {
    icon: MessageSquare,
    title: "AI chat",
    description: (
      <>
        Chat with your memory. Ask questions, find things, brainstorm — powered by{" "}
        <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline decoration-zinc-300 hover:text-zinc-700 dark:decoration-zinc-600 dark:hover:text-zinc-300">OpenCode</a>
        .
      </>
    ),
  },
  {
    icon: Shield,
    title: "Private by default",
    description:
      "AI conversations stay on your device. Nothing is sent to the cloud unless you choose to save it.",
  },
  {
    icon: Code,
    title: "Open source",
    description: (
      <>
        The entire codebase is public. Self-host it, fork it, contribute to it.{" "}
        <a href="https://github.com/monorepo-labs/supacortex" target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline decoration-zinc-300 hover:text-zinc-700 dark:decoration-zinc-600 dark:hover:text-zinc-300">View on GitHub</a>
        .
      </>
    ),
  },
];

function DownloadButton({ className }: { className?: string }) {
  return (
    <Link
      href="#"
      className={`inline-flex select-none items-center gap-2 rounded-full bg-[#1784fe] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1784fe]/90 ${className ?? ""}`}
    >
      <AppleIcon className="size-3.5" />
      Download for free
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
              Supacortex
            </span>
            <Badge
              variant="outline"
              className="text-[9px] tracking-wide uppercase text-zinc-400"
            >
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/monorepo-labs/supacortex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              GitHub
            </Link>
            <DownloadButton />
          </div>
        </div>
      </nav>

      <main className="flex flex-col gap-16 sm:gap-24">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="relative z-10">
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:gap-8 sm:py-20">
              {/* Headline */}
              <div className="flex flex-col items-center gap-4">
                <h1 className="max-w-md text-3xl font-medium tracking-tight text-zinc-900 text-pretty dark:text-zinc-100">
                  One memory for all your AI.
                </h1>
                <p className="mx-auto max-w-lg text-lg text-zinc-400 text-pretty dark:text-zinc-500">
                  Save your bookmarks, notes, and conversations in one place. Use them across every AI tool — Claude Code, OpenClaw, or whatever comes next.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    href="#"
                    className="inline-flex select-none items-center gap-2 rounded-full bg-[#1784fe] px-5 py-2.5 text-[15px] font-medium text-white shadow-lg transition-colors hover:bg-[#1784fe]/90"
                  >
                    <AppleIcon className="size-3.5" />
                    Download for free
                  </Link>
                  <span className="text-zinc-300 dark:text-zinc-600">or</span>
                  <code className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 select-all dark:bg-zinc-800 dark:text-zinc-400">
                    npm i -g @supacortex/cli
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* App window preview */}
          <div className="mx-auto w-full max-w-2xl">
            <div className="relative mx-auto px-4 pb-0 lg:-mx-8 xl:-mx-12">
              <div className="w-full overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] ring-[0.5px] ring-zinc-200 select-none dark:bg-zinc-900 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] dark:ring-zinc-800">
                {/* App demo video */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full"
                >
                  <source src="/demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-8 sm:gap-16 sm:py-12">
          <div className="flex flex-col">
            <h2 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
              Save once, use everywhere.
            </h2>
            <h3 className="text-2xl font-medium text-zinc-400 dark:text-zinc-500">
              Your memory follows you across every AI tool.
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 sm:gap-y-16">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-4">
                <div className="flex size-8 flex-none items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <feature.icon className="size-6" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h3>
                  <p className="text-lg font-medium text-zinc-400 text-pretty dark:text-zinc-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Get Started */}
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-8 sm:gap-12 sm:py-12">
          <div className="flex flex-col">
            <h2 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
              Get started in seconds.
            </h2>
            <h3 className="text-2xl font-medium text-zinc-400 dark:text-zinc-500">
              The Mac app sets everything up. The CLI takes your memory everywhere.
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Mac app card */}
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1784fe]/10">
                  <ComputerDesktopIcon className="size-5 text-[#1784fe]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Mac app
                  </h3>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">Full experience, zero setup</p>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Download the app and everything is set up for you — CLI, skills, and AI chat all included.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-[15px] text-zinc-500 dark:text-zinc-400">
                  <ArrowDownTrayIcon className="size-4 flex-none text-zinc-400 dark:text-zinc-500" />
                  Download and install the app
                </div>
                <div className="flex items-center gap-3 text-[15px] text-zinc-500 dark:text-zinc-400">
                  <ArrowRightEndOnRectangleIcon className="size-4 flex-none text-zinc-400 dark:text-zinc-500" />
                  Sign up and log in
                </div>
                <div className="flex items-center gap-3 text-[15px] text-zinc-500 dark:text-zinc-400">
                  <SparklesIcon className="size-4 flex-none text-zinc-400 dark:text-zinc-500" />
                  Start saving and chatting
                </div>
              </div>
              <Link
                href="#"
                className="mt-auto flex w-full select-none items-center justify-center gap-2 rounded-full bg-[#1784fe] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1784fe]/90"
              >
                <AppleIcon className="size-3.5" />
                Download for free
              </Link>
            </div>

            {/* CLI card */}
            <CLICard />
          </div>
        </div>
      </main>

      {/* FAQ */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-8 sm:gap-12 sm:py-12">
        <div className="flex flex-col">
          <h2 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
            Questions
          </h2>
        </div>

        <div className="flex flex-col">
          {[
            {
              q: "Do I need the Mac app?",
              a: "No. You can use Supacortex entirely from the CLI. The Mac app gives you AI chat, a reader, and a visual interface \u2014 but it\u2019s optional.",
            },
            {
              q: "Is it free?",
              a: "Yes. Supacortex is open source and free to use.",
            },
            {
              q: "Where is my data stored?",
              a: "Your data lives in a managed Postgres database. AI chat conversations stay local on your device unless you choose to save them.",
            },
          ].map((faq) => (
            <details
              key={faq.q}
              className="group border-b border-zinc-200 dark:border-zinc-800"
            >
              <summary className="flex cursor-pointer items-center justify-between py-4 text-lg font-medium text-zinc-900 select-none dark:text-zinc-100">
                {faq.q}
                <span className="text-zinc-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-[15px] text-zinc-400 dark:text-zinc-500">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:py-24">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
          Try Supacortex today.
        </h2>
        <p className="text-lg text-zinc-400 dark:text-zinc-500">
          Free and open source. Download the app or install the CLI.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="#"
            className="inline-flex select-none items-center gap-2 rounded-full bg-[#1784fe] px-5 py-2.5 text-[15px] font-medium text-white shadow-lg transition-colors hover:bg-[#1784fe]/90"
          >
            <AppleIcon className="size-3.5" />
            Download for free
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">or</span>
          <code className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 select-all dark:bg-zinc-800 dark:text-zinc-400">
            npm i -g @supacortex/cli
          </code>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-6 text-sm">
          <p className="text-zinc-400">
            &copy; 2026 Monorepo Labs
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/monorepo-labs/supacortex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition-colors hover:text-zinc-500"
            >
              GitHub
            </Link>
            <Link
              href="/docs"
              className="text-zinc-400 transition-colors hover:text-zinc-500"
            >
              Docs
            </Link>
            <Link
              href="/privacy"
              className="text-zinc-400 transition-colors hover:text-zinc-500"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-zinc-400 transition-colors hover:text-zinc-500"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
