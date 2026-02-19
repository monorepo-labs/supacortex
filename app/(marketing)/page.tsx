import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="max-w-2xl text-center">
        {/* Name + Beta Badge */}
        <div className="relative inline-block">
          <h1 className="font-serif text-5xl font-semibold tracking-tight text-zinc-900">
            Supacortex
          </h1>
          <Badge
            variant="outline"
            className="absolute -top-3 -right-14 text-[10px] tracking-wide uppercase text-zinc-400"
          >
            Beta
          </Badge>
        </div>

        {/* Tagline */}
        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          Your second brain, built for the age of AI agents.
        </p>

        {/* Three Pillars */}
        <div className="mt-16 grid grid-cols-3 divide-x divide-zinc-300/60 text-center">
          <div className="px-8">
            <p className="text-[15px] font-medium text-zinc-900">Capture</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Bookmarks, links, memory
            </p>
          </div>
          <div className="px-8">
            <p className="text-[15px] font-medium text-zinc-900">Rediscover</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Search, group, rediscover
            </p>
          </div>
          <div className="px-8">
            <p className="text-[15px] font-medium text-zinc-900">Connect</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              CLI, API
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16">
          <Button size="lg" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </div>

    </div>
  );
}
