"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactGridLayout, { verticalCompactor } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { toast } from "sonner";
import BookmarkCard from "./BookmarkCard";
import type { BookmarkData } from "./BookmarkNode";
import { useUpdateGridLayout } from "@/hooks/use-bookmarks";

const COLS = 12;
const ROW_HEIGHT = 30;
const DEFAULT_W = 3;
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
    h: b.gridH ?? defaultH(b),
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
  const { mutate: saveLayout } = useUpdateGridLayout();
  const [layout, setLayout] = useState<Layout>(() => buildLayout(bookmarks));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(bookmarks.filter((b) => b.gridExpanded === true).map((b) => b.id)),
  );
  const [dragEnabled, setDragEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastDragTimeRef = useRef(0);
  const selectModeRef = useRef(false);
  const preExpandH = useRef<Map<string, number>>(new Map());
  const [gridWidth, setGridWidth] = useState(0);

  // Measure width from scroll container (accounts for scrollbar)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sync layout and expanded state when bookmarks change
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
          h: b.gridH ?? defaultH(b),
          minW: 2,
          minH: 3,
        }));
      return [...kept, ...newItems];
    });

    // Restore expanded state from DB
    setExpandedIds((prev) => {
      const fromDb = new Set(
        bookmarks.filter((b) => b.gridExpanded === true).map((b) => b.id),
      );
      if (prev.size === 0 && fromDb.size > 0) return fromDb;
      return prev;
    });
  }, [bookmarks]);

  const bookmarkMap = useMemo(
    () => new Map(bookmarks.map((b) => [b.id, b])),
    [bookmarks],
  );

  const persistLayout = useCallback((newLayout: Layout, expanded?: Set<string>) => {
    const items = newLayout.map((item) => ({
      id: item.i,
      gridX: item.x,
      gridY: item.y,
      gridW: item.w,
      gridH: item.h,
      ...(expanded && { gridExpanded: expanded.has(item.i) }),
    }));
    saveLayout(items);
  }, [saveLayout]);

  const toggleExpand = useCallback((id: string) => {
    // Suppress if drag just ended
    if (Date.now() - lastDragTimeRef.current < 200) return;

    const isExpanded = expandedIds.has(id);
    const currentItem = layout.find((item) => item.i === id);
    if (!currentItem) return;

    // Compute new height before calling setLayout (avoids ref issues in strict mode)
    let newH: number;
    if (isExpanded) {
      newH = preExpandH.current.get(id) ?? currentItem.h;
      preExpandH.current.delete(id);
    } else {
      preExpandH.current.set(id, currentItem.h);
      newH = EXPANDED_H;
    }

    const newExpandedIds = new Set(expandedIds);
    if (isExpanded) newExpandedIds.delete(id);
    else newExpandedIds.add(id);

    setExpandedIds(newExpandedIds);
    setLayout((prev) => {
      const next = prev.map((item) =>
        item.i === id ? { ...item, h: newH } : item
      );
      persistLayout(next, newExpandedIds);
      return next;
    });
  }, [expandedIds, layout, persistLayout]);

  const handleOpenReader = useCallback((bookmark: BookmarkData) => {
    if (Date.now() - lastDragTimeRef.current < 200) return;
    if (!bookmark._optimistic) onOpenReader(bookmark);
  }, [onOpenReader]);

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

  const placeholder = error
    ? "Failed to load bookmarks."
    : isLoading && bookmarks.length === 0
      ? "Loading..."
      : bookmarks.length === 0
        ? "No bookmarks yet."
        : null;

  const children = placeholder
    ? null
    : layout
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
      {placeholder ? (
        <div className="flex h-full items-center justify-center text-zinc-400">
          {placeholder}
        </div>
      ) : gridWidth > 0 && children ? (
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
          width={gridWidth}
          gridConfig={{
            cols: COLS,
            rowHeight: ROW_HEIGHT,
            margin: [24, 24] as [number, number],
            containerPadding: [24, 24] as [number, number],
          }}
          dragConfig={{
            enabled: dragEnabled,
          }}
          resizeConfig={{
            enabled: true,
            handles: ["w", "e", "s"],
          }}
          compactor={verticalCompactor}
        >
          {children}
        </ReactGridLayout>
      ) : null}
    </div>
  );
}
