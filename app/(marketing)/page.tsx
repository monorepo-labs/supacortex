import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-6 pt-32 pb-20">
      <div className="max-w-lg text-center">
        <h1
          className="text-4xl font-semibold tracking-tight text-zinc-900"
          style={{ fontFamily: "var(--font-source-serif)" }}
        >
          Supercortex
        </h1>
        <p className="mt-3 text-lg text-zinc-500">
          A personal knowledge workspace. Save bookmarks, sync from X, and
          rediscover what matters.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Get Started
        </Link>
      </div>

      <div className="mt-16 w-full max-w-4xl overflow-hidden rounded-xl border border-zinc-200 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <Image
          src="/hero.webp"
          alt="Supercortex — bookmark grid with categories, search, and reader view"
          width={2852}
          height={1618}
          className="w-full h-auto"
          priority
        />
      </div>

      <footer className="mt-auto pt-16 flex gap-4 text-xs text-zinc-400">
        <Link href="/terms" className="hover:text-zinc-600 transition-colors">
          Terms of Service
        </Link>
        <span>&middot;</span>
        <Link href="/privacy" className="hover:text-zinc-600 transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
