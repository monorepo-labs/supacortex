"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactGridLayout, { useContainerWidth, verticalCompactor } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { toast } from "sonner";
import BookmarkCard from "./BookmarkCard";
import type { BookmarkData } from "./BookmarkNode";
import { useUpdateGridLayout } from "@/hooks/use-bookmarks";

const COLS = 12;
const ROW_HEIGHT = 30;
const DEFAULT_W = 4;
const DEFAULT_H = 5;
const IMAGE_H = 9;
const EXPANDED_H = 14;

function defaultH(b: BookmarkData) {
  const hasImage = b.mediaUrls?.some((m) => m.type !== "avatar");
  return hasImage ? IMAGE_H : DEFAULT_H;
}

function buildLayout(bookmarks: BookmarkData[]): Layout {
  const perRow = Math.floor(COLS / DEFAULT_W);
  return bookmarks.map((b, i) => ({
    i: b.id,
    x: b.gridX ?? (i % perRow) * DEFAULT_W,
    y: b.gridY ?? Math.floor(i / perRow) * IMAGE_H,
    w: b.gridW ?? DEFAULT_W,
    h: defaultH(b),
    minW: 2,
    minH: 3,
  }));
}

export default function ResearchGrid({
  bookmarks,
  isLoading,
  error,
  onOpenReader,
}: {
  bookmarks: BookmarkData[];
  isLoading: boolean;
  error: Error | null;
  onOpenReader: (bookmark: BookmarkData) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const { mutate: saveLayout } = useUpdateGridLayout();
  const [layout, setLayout] = useState<Layout>(() => buildLayout(bookmarks));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dragEnabled, setDragEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastDragTimeRef = useRef(0);
  const selectModeRef = useRef(false);

  // Sync layout when bookmarks change (new/deleted items)
  useEffect(() => {
    setLayout((prev) => {
      const existing = new Map(prev.map((item) => [item.i, item]));
      const incomingIds = new Set(bookmarks.map((b) => b.id));
      const kept = prev.filter((item) => incomingIds.has(item.i));
      const perRow = Math.floor(COLS / DEFAULT_W);
      const newItems = bookmarks
        .filter((b) => !existing.has(b.id))
        .map((b, i) => ({
          i: b.id,
          x: b.gridX ?? ((kept.length + i) % perRow) * DEFAULT_W,
          y: b.gridY ?? Infinity,
          w: b.gridW ?? DEFAULT_W,
          h: defaultH(b),
          minW: 2,
          minH: 3,
        }));
      return [...kept, ...newItems];
    });
  }, [bookmarks]);

  const bookmarkMap = useMemo(
    () => new Map(bookmarks.map((b) => [b.id, b])),
    [bookmarks],
  );

  const toggleExpand = useCallback((id: string) => {
    // Suppress if drag just ended
    if (Date.now() - lastDragTimeRef.current < 200) return;

    const bookmark = bookmarkMap.get(id);
    const collapsedH = bookmark ? defaultH(bookmark) : DEFAULT_H;

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLayout((prev) =>
      prev.map((item) => {
        if (item.i !== id) return item;
        const isExpanded = expandedIds.has(id);
        return { ...item, h: isExpanded ? collapsedH : EXPANDED_H };
      }),
    );
  }, [expandedIds, bookmarkMap]);

  const handleOpenReader = useCallback((bookmark: BookmarkData) => {
    if (Date.now() - lastDragTimeRef.current < 200) return;
    if (!bookmark._optimistic) onOpenReader(bookmark);
  }, [onOpenReader]);

  const persistLayout = useCallback((newLayout: Layout) => {
    const items = newLayout.map((item) => ({
      id: item.i,
      gridX: item.x,
      gridY: item.y,
      gridW: item.w,
      gridH: item.h,
    }));
    saveLayout(items);
  }, [saveLayout]);

  // Option+Shift text selection mode with copy on release
  useEffect(() => {
    const update = (e: KeyboardEvent) => {
      const active = e.altKey && e.shiftKey;
      if (selectModeRef.current && !active) {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (text) {
          navigator.clipboard.writeText(text);
          toast.success("Copied to clipboard");
          sel?.removeAllRanges();
        }
      }
      selectModeRef.current = active;
      setDragEnabled(!active);
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

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        Failed to load bookmarks.
      </div>
    );
  }

  if (isLoading && bookmarks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        Loading...
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        No bookmarks yet.
      </div>
    );
  }

  const children = layout
    .map((item) => {
      const bookmark = bookmarkMap.get(item.i);
      if (!bookmark) return null;
      return (
        <div key={item.i}>
          <BookmarkCard
            bookmark={bookmark}
            expanded={expandedIds.has(bookmark.id)}
            onToggleExpand={() => toggleExpand(bookmark.id)}
            onClick={() => handleOpenReader(bookmark)}
            textSelectable={!dragEnabled}
          />
        </div>
      );
    })
    .filter(Boolean);

  return (
    <div
      ref={scrollRef}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden scrollbar-light bg-white/60"
    >
      <div ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            layout={layout}
            onLayoutChange={setLayout}
            onDragStop={(_layout) => {
              lastDragTimeRef.current = Date.now();
              persistLayout(_layout);
            }}
            onResizeStop={(_layout) => {
              persistLayout(_layout);
            }}
            width={width}
            gridConfig={{
              cols: COLS,
              rowHeight: ROW_HEIGHT,
              margin: [10, 10] as [number, number],
              containerPadding: [10, 10] as [number, number],
            }}
            dragConfig={{
              enabled: dragEnabled,
            }}
            resizeConfig={{
              enabled: true,
              handles: ["e", "s"],
            }}
            compactor={verticalCompactor}
          >
            {children}
          </ReactGridLayout>
        )}
      </div>
    </div>
  );
}
