"use client";

import Sidebar from "@/app/components/Sidebar";
import SearchBar from "@/app/components/SearchBar";
import Canvas from "@/app/components/Canvas";
import { useBookmarks } from "@/hooks/use-bookmarks";

export default function LibraryPage() {
  // TODO: replace hardcoded userId with auth session
  const { data: bookmarks, isLoading, error } = useBookmarks("seed-user");

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="relative flex-1 border border-zinc-200 rounded-lg m-1 overflow-hidden">
        <SearchBar />
        <Canvas bookmarks={bookmarks ?? []} isLoading={isLoading} error={error} />
      </main>
    </div>
  );
}
