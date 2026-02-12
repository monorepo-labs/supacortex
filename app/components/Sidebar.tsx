"use client";

import { useState } from "react";
import { PanelLeft, Plus } from "lucide-react";
import { useTags } from "@/hooks/use-tags";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: tags } = useTags();

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-3 top-3 z-20 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
      >
        <PanelLeft size={18} />
      </button>
    );
  }

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col bg-background">
      {/* Toggle */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <PanelLeft size={18} />
        </button>
      </div>

      {/* Categories */}
      <nav className="mt-4 flex-1 px-3">
        <div className="mb-1.5 flex items-center justify-between px-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Categories
          </p>
          <button className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600">
            <Plus size={14} />
          </button>
        </div>
        <ul>
          {tags?.map((tag: { id: string; name: string; color: string }) => (
            <li key={tag.id}>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left">{tag.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
