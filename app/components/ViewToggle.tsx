"use client";

import { LayoutGrid, Move } from "lucide-react";

type ViewMode = "canvas" | "research";

const views: { key: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { key: "canvas", icon: Move, label: "Canvas" },
  { key: "research", icon: LayoutGrid, label: "Research" },
];

export default function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const activeIndex = views.findIndex((v) => v.key === mode);

  return (
    <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2">
      <div className="relative flex rounded-xl bg-zinc-200/60 p-[2px]">
        {/* Sliding indicator */}
        <div
          className="absolute top-[2px] bottom-[2px] rounded-[10px] bg-white shadow-sm transition-all duration-200 ease-in-out"
          style={{
            width: `calc((100% - 4px) / ${views.length})`,
            transform: `translateX(calc(${activeIndex} * 100%))`,
          }}
        />
        {views.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="relative z-10 rounded-[10px] p-1.5 transition-colors duration-200"
            style={{ color: mode === key ? "#18181b" : "#a1a1aa" }}
          >
            <Icon size={14} strokeWidth={mode === key ? 2.5 : 2} />
          </button>
        ))}
      </div>
    </div>
  );
}
