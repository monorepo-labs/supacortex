"use client";

const TYPES = [
  { label: "All", value: "" },
  { label: "Twitter", value: "tweet" },
  { label: "Links", value: "link" },
  { label: "YouTube", value: "youtube" },
] as const;

export default function TypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (type: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-6 pt-3">
      {TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            value === t.value
              ? "bg-zinc-900 text-white"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
