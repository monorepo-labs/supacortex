"use client";

import { MousePointer2, Grid2x2 } from "lucide-react";

export type ViewMode = "canvas" | "vertical";

const views: { key: ViewMode; icon: typeof MousePointer2 }[] = [
  { key: "canvas", icon: MousePointer2 },
  { key: "vertical", icon: Grid2x2 },
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
    <div className="group/toggle absolute top-0 left-1/2 z-10 -translate-x-1/2 p-6">
      <div className="relative flex rounded-lg bg-zinc-200/60 p-[2px] transition-transform duration-200 ease-out scale-100 group-hover/toggle:scale-125 origin-top">
        {/* Sliding indicator */}
        <div
          className="absolute top-[2px] bottom-[2px] rounded-[8px] bg-white shadow-sm transition-all duration-200 ease-in-out"
          style={{
            width: `calc((100% - 4px) / ${views.length})`,
            transform: `translateX(calc(${activeIndex} * 100%))`,
          }}
        />
        {views.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="relative z-10 rounded-[8px] p-1.5 transition-colors duration-200 cursor-pointer hover:bg-white/50"
            style={{ color: mode === key ? "#18181b" : "#a1a1aa" }}
          >
            <Icon size={14} strokeWidth={mode === key ? 2.5 : 2} />
          </button>
        ))}
      </div>
    </div>
  );
}
