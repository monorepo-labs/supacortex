"use client";

import { useState } from "react";
import { Search, Plus, MessageSquare } from "lucide-react";
import { useCreateBookmark } from "@/hooks/use-bookmarks";
import { sileo } from "sileo";

type Mode = "search" | "add" | "chat";

const modes: { key: Mode; icon: typeof Search; bg: string; fg: string }[] = [
  { key: "search", icon: Search, bg: "#007AFF", fg: "#ffffff" },
  { key: "add", icon: Plus, bg: "#AF52DE", fg: "#ffffff" },
  { key: "chat", icon: MessageSquare, bg: "#34C759", fg: "#ffffff" },
];

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.includes(" ")) return false;
  return /^https?:\/\//i.test(trimmed) || /^[\w-]+\.[\w]{2,}/i.test(trimmed);
}

export default function SearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [value, setValue] = useState("");

  const { mutate: addBookmark, isPending } = useCreateBookmark();

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
      onSearch("");
    } else if (mode === "search") {
      onSearch(text);
    }
  }

  const handleSubmit = () => {
    if (mode === "add" && value.trim()) {
      sileo.promise(
        new Promise((resolve, reject) => {
          addBookmark(
            { url: value.trim() },
            { onSuccess: resolve, onError: reject },
          );
        }),
        {
          loading: "Saving bookmark...",
          success: "Bookmark saved",
          error: (err) => err.message || "Failed to save bookmark",
        },
      );
      setValue("");
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div className="relative flex items-center">
        {/* Mode toggle group */}
        <div className="absolute left-1.5 top-1/2 flex -translate-y-1/2 rounded-xl bg-zinc-200/60 p-[2px] cursor-pointer">
          <div
            className="absolute top-[2px] bottom-[2px] rounded-[11.5px] shadow-sm transition-all duration-200 ease-in-out "
            style={{
              width: `calc((100% - 4px) / ${modes.length})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
              backgroundColor: modes[activeIndex].bg,
            }}
          />
          {modes.map(({ key, icon: Icon, fg }) => (
            <button
              key={key}
              onClick={() => {
                setMode(key);
                if (key !== "search") onSearch("");
              }}
              className="relative z-10 rounded-[10px] p-1.5 transition-colors duration-200"
              style={{ color: mode === key ? fg : "#a1a1aa" }}
            >
              <Icon size={14} strokeWidth={mode === key ? 2.5 : 2} />
            </button>
          ))}
        </div>

        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholders[mode]}
          className="w-[400px] rounded-2xl border border-zinc-200 bg-white py-2.5 pl-[100px] pr-4 text-sm text-zinc-900 shadow-md placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-100"
        />
      </div>
    </div>
  );
}
