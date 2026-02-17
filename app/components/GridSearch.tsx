"use client";

import type { RefObject } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GridSearch({
  onSearch,
  onRefresh,
  inputRef,
  value,
  isRefreshing,
}: {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  isRefreshing?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-6 pt-6">
      <input
        ref={inputRef}
        value={value}
        type="text"
        placeholder="Type to search, paste link to bookmark"
        onChange={(e) => onSearch(e.target.value)}
        className="flex-1 text-xl text-zinc-900 placeholder:text-zinc-300 outline-none bg-transparent"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRefresh}
        title="Refresh"
        className="text-zinc-600"
      >
        <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
      </Button>
    </div>
  );
}
