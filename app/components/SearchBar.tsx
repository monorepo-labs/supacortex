"use client";

import { useState } from "react";
import { Search, Plus, MessageSquare } from "lucide-react";

type Mode = "search" | "add" | "chat";

const modes: { key: Mode; icon: typeof Search }[] = [
  { key: "search", icon: Search },
  { key: "add", icon: Plus },
  { key: "chat", icon: MessageSquare },
];

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.includes(" ")) return false;
  return /^https?:\/\//i.test(trimmed) || /^[\w-]+\.[\w]{2,}/i.test(trimmed);
}

export default function SearchBar() {
  const [mode, setMode] = useState<Mode>("search");
  const [value, setValue] = useState("");

  const activeIndex = modes.findIndex((m) => m.key === mode);

  const placeholders: Record<Mode, string> = {
    search: "Search bookmarks...",
    add: "Paste a URL to save...",
    chat: "Ask anything...",
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setValue(text);

    if (mode !== "add" && looksLikeUrl(text)) {
      setMode("add");
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div className="relative flex items-center">
        {/* Mode toggle group */}
        <div className="absolute left-1.5 top-1/2 flex -translate-y-1/2 rounded-lg bg-zinc-100 p-[2px]">
          <div
            className="absolute top-[2px] bottom-[2px] rounded-md bg-white shadow-sm transition-transform duration-200 ease-in-out"
            style={{
              width: `calc((100% - 4px) / ${modes.length})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
            }}
          />
          {modes.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`relative z-10 rounded-md p-1.5 transition-colors ${
                mode === key ? "text-zinc-700" : "text-zinc-400"
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholders[mode]}
          className="w-[400px] rounded-xl border border-zinc-200 bg-white py-2.5 pl-[100px] pr-4 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-100"
        />
      </div>
    </div>
  );
}
