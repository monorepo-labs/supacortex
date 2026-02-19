import Link from "next/link";

export default function MinimalLandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center">
        <h1
          className="text-4xl font-semibold tracking-tight text-zinc-900"
          style={{ fontFamily: "var(--font-source-serif)" }}
        >
          Supacortex
        </h1>
        <p className="mt-3 text-zinc-400">A second brain for the AI age.</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Get Started
          </Link>
          <span className="rounded-full border border-zinc-300 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            Beta
          </span>
        </div>
      </div>
    </div>
  );
}
