"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { sileo } from "sileo";
import BookmarkCard from "./BookmarkCard";
import BulkActions from "./BulkActions";
import type { BookmarkData } from "./BookmarkNode";

const TARGET_CARD_WIDTH = 260;
const GAP = 24;

export default function LibraryGridView({
  bookmarks,
  isLoading,
  error,
  onOpenReader,
  onOpenInNewPanel,
  openReaderIds,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  contextMenuExtra,
  attachedToChatIds,
}: {
  bookmarks: BookmarkData[];
  isLoading: boolean;
  error: Error | null;
  onOpenReader: (bookmark: BookmarkData) => void;
  onOpenInNewPanel?: (bookmark: BookmarkData) => void;
  openReaderIds?: Set<string>;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  contextMenuExtra?: (bookmark: BookmarkData) => React.ReactNode;
  attachedToChatIds?: Set<string>;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [textSelectable, setTextSelectable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const selectModeRef = useRef(false);

  const handleOpenReader = useCallback(
    (bookmark: BookmarkData) => {
      if (!bookmark._optimistic) onOpenReader(bookmark);
    },
    [onOpenReader],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Escape clears selection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIds(new Set());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Option+Shift text selection mode with copy on release
  useEffect(() => {
    const update = (e: KeyboardEvent) => {
      const active = e.altKey && e.shiftKey;
      if (selectModeRef.current && !active) {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (text) {
          navigator.clipboard.writeText(text);
          sileo.success({ title: "Copied to clipboard" });
          sel?.removeAllRanges();
        }
      }
      selectModeRef.current = active;
      setTextSelectable(active);
    };
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
    };
  }, []);

  // Option+Arrow scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const amount = 300;
      if (e.key === "ArrowUp") {
        el.scrollBy({ top: -amount, behavior: "smooth" });
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        el.scrollBy({ top: amount, behavior: "smooth" });
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Infinite scroll — load more when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage?.();
        }
      },
      { root, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const placeholder = error
    ? "Failed to load bookmarks."
    : isLoading && bookmarks.length === 0
      ? "Loading..."
      : bookmarks.length === 0
        ? "No bookmarks yet."
        : null;

  return (
    <div
      ref={scrollRef}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden scrollbar-none"
    >
      {placeholder ? (
        <div className="flex h-full items-center justify-center text-zinc-400">
          {placeholder}
        </div>
      ) : (
        <div
          className="p-6"
          style={{
            columnWidth: `${TARGET_CARD_WIDTH}px`,
            columnGap: `${GAP}px`,
          }}
        >
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="break-inside-avoid mb-6"
            >
              <BookmarkCard
                bookmark={bookmark}
                expanded={false}
                onToggleExpand={() => {}}
                onClick={() => handleOpenReader(bookmark)}
                onOpenInNewPanel={
                  onOpenInNewPanel
                    ? () => onOpenInNewPanel(bookmark)
                    : undefined
                }
                textSelectable={textSelectable}
                isSelected={selectedIds.has(bookmark.id)}
                isAttachedToChat={attachedToChatIds?.has(bookmark.id)}
                isOpenInReader={openReaderIds?.has(bookmark.id)}
                onSelect={handleSelect}
                contextMenuExtra={contextMenuExtra?.(bookmark)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      )}

      {selectedIds.size > 0 && (
        <BulkActions
          selectedIds={selectedIds}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
