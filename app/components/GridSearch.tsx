"use client";

import type { RefObject } from "react";

export default function GridSearch({
  onSearch,
  inputRef,
  value,
}: {
  onSearch: (query: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  value: string;
}) {
  return (
    <div className="px-6 pt-6">
      <input
        ref={inputRef}
        value={value}
        type="text"
        placeholder="Type to search, paste link to bookmark"
        onChange={(e) => onSearch(e.target.value)}
        className="w-full text-xl text-zinc-900 placeholder:text-zinc-300 outline-none bg-transparent"
      />
    </div>
  );
}
