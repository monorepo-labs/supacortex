"use client";

import { useDeferredValue, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import SearchBar from "@/app/components/SearchBar";
import Canvas from "@/app/components/Canvas";
import { useBookmarks } from "@/hooks/use-bookmarks";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const {
    data: bookmarks,
    isLoading,
    error,
  } = useBookmarks(deferredSearch.length >= 3 ? deferredSearch : "");

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="relative flex-1 border border-zinc-200 rounded-lg m-1 overflow-hidden">
        <SearchBar onSearch={setSearch} />
        <Canvas
          bookmarks={bookmarks ?? []}
          isLoading={isLoading}
          error={error}
          isSearching={deferredSearch.length >= 3}
        />
      </main>
    </div>
  );
}
