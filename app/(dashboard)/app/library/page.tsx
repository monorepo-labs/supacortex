"use client";

import {
  Suspense,
  useDeferredValue,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import GridSearch from "@/app/components/GridSearch";
import LibraryGridView from "@/app/components/LibraryGridView";
import GraphView from "@/app/components/GraphView";
import ViewToggle, { type ViewMode } from "@/app/components/ViewToggle";
import { useBookmarks, useGraphData } from "@/hooks/use-bookmarks";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import ReadersContainer from "@/app/components/ReadersContainer";
import { useCreateBookmark } from "@/hooks/use-bookmarks";
import { sileo } from "sileo";

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryPageContent />
    </Suspense>
  );
}

function LibraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeGroupId = searchParams.get("group") || null;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [viewMode, setViewMode] = useState<ViewMode>("vertical");

  const {
    data: bookmarks,
    isLoading,
    error,
  } = useBookmarks(
    deferredSearch.length >= 3 ? deferredSearch : "",
    activeGroupId ?? undefined,
  );

  const { data: graphData, isLoading: graphLoading } = useGraphData(
    viewMode === "graph",
  );

  const [openReaders, setOpenReaders] = useState<BookmarkData[]>([]);
  const [userCollapsedOverride, setUserCollapsedOverride] = useState<
    boolean | null
  >(null);
  const searchRef = useRef<HTMLInputElement>(null!);

  const { mutate: addBookmark } = useCreateBookmark();

  const autoCollapsed = openReaders.length >= 2;
  const sidebarCollapsed = userCollapsedOverride ?? autoCollapsed;

  const openReaderIds = useMemo(
    () => new Set(openReaders.map((r) => r.id)),
    [openReaders],
  );

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setUserCollapsedOverride(collapsed);
  }, []);

  // Reset user override when all readers close
  useEffect(() => {
    if (openReaders.length === 0) {
      setUserCollapsedOverride(null);
    }
  }, [openReaders.length]);

  // Normal click: replace last reader or open first
  const handleOpenReader = useCallback((bookmark: BookmarkData) => {
    setOpenReaders((prev) => {
      if (prev.length === 0) return [bookmark];
      // Replace the last reader
      const next = [...prev];
      next[next.length - 1] = bookmark;
      return next;
    });
  }, []);

  // Open in new panel: append (skip duplicates)
  const handleOpenInNewPanel = useCallback((bookmark: BookmarkData) => {
    setOpenReaders((prev) => {
      if (prev.some((r) => r.id === bookmark.id)) return prev;
      return [...prev, bookmark];
    });
  }, []);

  const handleCloseReader = useCallback((id: string) => {
    setOpenReaders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleReorderReaders = useCallback(
    (fromIndex: number, toIndex: number) => {
      setOpenReaders((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [],
  );

  const handleGroupSelect = (groupId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (groupId) {
      params.set("group", groupId);
    } else {
      params.delete("group");
    }
    router.replace(`?${params.toString()}`);
  };

  // Escape closes last reader
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      setOpenReaders((prev) => {
        if (prev.length === 0) return prev;
        return prev.slice(0, -1);
      });
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.metaKey && e.key === "v") {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        let url = text.trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        try {
          new URL(url);
        } catch {
          return;
        }
        sileo.promise(
          new Promise((resolve, reject) => {
            addBookmark({ url }, { onSuccess: resolve, onError: reject });
          }),
          {
            loading: { title: "Saving bookmark..." },
            success: { title: "Bookmark saved" },
            error: (err) => ({ title: (err as Error).message || "Failed to save bookmark" }),
          },
        );
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addBookmark]);

  return (
    <div className="flex h-screen">
      <Sidebar
        activeGroupId={activeGroupId}
        onGroupSelect={handleGroupSelect}
        collapsed={sidebarCollapsed}
        onCollapsedChange={handleSidebarCollapsedChange}
      />
      <main className="relative flex-1 border border-zinc-200 rounded-xl m-2 overflow-hidden flex flex-col">
        <GridSearch onSearch={setSearch} inputRef={searchRef} value={search} />

        <div className="flex-1 overflow-hidden">
          {viewMode === "graph" ? (
            <GraphView
              bookmarks={bookmarks ?? []}
              edges={graphData?.edges ?? []}
              isLoading={graphLoading || isLoading}
              onOpenReader={handleOpenReader}
              onOpenInNewPanel={handleOpenInNewPanel}
              openReaderIds={openReaderIds}
            />
          ) : (
            <LibraryGridView
              bookmarks={bookmarks ?? []}
              isLoading={isLoading}
              error={error}
              onOpenReader={handleOpenReader}
              onOpenInNewPanel={handleOpenInNewPanel}
              openReaderIds={openReaderIds}
              isFiltered={!!activeGroupId || deferredSearch.length >= 3}
            />
          )}
        </div>

        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </main>

      <ReadersContainer
        readers={openReaders}
        onClose={handleCloseReader}
        onReorder={handleReorderReaders}
      />
    </div>
  );
}
