"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactGridLayout, { verticalCompactor } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { toast } from "sonner";
import BookmarkCard from "./BookmarkCard";
import BulkActions from "./BulkActions";
import type { BookmarkData } from "./BookmarkNode";
import { useUpdateGridLayout } from "@/hooks/use-bookmarks";

const COLS = 12;
const ROW_HEIGHT = 30;
const MARGIN = 24;
const CONTAINER_PAD = 24;
const DEFAULT_W = 3;
const DEFAULT_H = 5;
const IMAGE_H = 9;
const EXPANDED_H = 14;
const MIN_H = 3;

/** Pixel width available for text content inside a card */
function cardContentWidth(gridWidth: number, w: number): number {
  const colPx = (gridWidth - 2 * CONTAINER_PAD - (COLS - 1) * MARGIN) / COLS;
  const cardPx = w * colPx + (w - 1) * MARGIN;
  return cardPx - 32; // px-4 padding on each side
}

/** Convert pixel height to grid row units */
function pxToH(px: number): number {
  return Math.ceil((px + MARGIN) / (ROW_HEIGHT + MARGIN));
}

/** Estimate characters per line given content width and approximate char width */
function charsPerLine(contentWidth: number, charWidthPx: number): number {
  return Math.max(1, Math.floor(contentWidth / charWidthPx));
}

/** Estimate collapsed card height in grid units */
function estimateCollapsedH(b: BookmarkData, contentWidth: number): number {
  const hasImage = b.mediaUrls?.some((m) => m.type !== "avatar");
  const maxH = hasImage ? IMAGE_H : DEFAULT_H;

  let totalPx = 0;

  if (hasImage) totalPx += 160;

  const displayTitle = b.title;

  if (displayTitle) {
    const cpl = charsPerLine(contentWidth, 9);
    const titleLines = Math.min(2, Math.ceil(displayTitle.length / cpl));
    totalPx += 24 + titleLines * 22;
  }

  if (b.content && b.type !== "link") {
    const cpl = charsPerLine(contentWidth, 7);
    const contentLines = Math.min(3, Math.ceil(b.content.length / cpl));
    totalPx += contentLines * 20 + 12;
  }

  totalPx += 44;

  const h = pxToH(totalPx);
  return Math.max(MIN_H, Math.min(maxH, h));
}

/** Estimate expanded card height in grid units */
function estimateExpandedH(b: BookmarkData, contentWidth: number): number {
  const collapsedH = estimateCollapsedH(b, contentWidth);

  let totalPx = 0;
  const hasImage = b.mediaUrls?.some((m) => m.type !== "avatar");
  if (hasImage) totalPx += 160;

  const displayTitle = b.title;

  if (displayTitle) {
    const cpl = charsPerLine(contentWidth, 9);
    const titleLines = Math.ceil(displayTitle.length / cpl);
    totalPx += 24 + titleLines * 22;
  }

  if (b.content) {
    const cpl = charsPerLine(contentWidth, 8);
    const contentLines = Math.ceil(b.content.length / cpl);
    totalPx += contentLines * 27 + 12;
  }

  totalPx += 44;

  const h = pxToH(totalPx);
  return Math.max(collapsedH, Math.min(EXPANDED_H, h));
}

function defaultH(b: BookmarkData) {
  const hasImage = b.mediaUrls?.some((m) => m.type !== "avatar");
  return hasImage ? IMAGE_H : DEFAULT_H;
}

function buildLayout(
  bookmarks: BookmarkData[],
  gridWidth?: number,
): Layout {
  const perRow = Math.floor(COLS / DEFAULT_W);
  return bookmarks.map((b, i) => {
    let h: number;
    if (b.gridH != null) {
      h = b.gridH;
    } else if (gridWidth && gridWidth > 0) {
      h = estimateCollapsedH(
        b,
        cardContentWidth(gridWidth, b.gridW ?? DEFAULT_W),
      );
    } else {
      h = defaultH(b);
    }
    return {
      i: b.id,
      x: b.gridX ?? (i % perRow) * DEFAULT_W,
      y: b.gridY ?? Math.floor(i / perRow) * IMAGE_H,
      w: b.gridW ?? DEFAULT_W,
      h,
      minW: 2,
      minH: MIN_H,
    };
  });
}

export default function LibraryGridView({
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
  const [layout, setLayout] = useState<Layout>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () =>
      new Set(
        bookmarks.filter((b) => b.gridExpanded === true).map((b) => b.id),
      ),
  );
  const [dragEnabled, setDragEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  // Sync layout and expanded state when bookmarks or gridWidth change
  useEffect(() => {
    if (gridWidth <= 0) return;

    setLayout((prev) => {
      if (prev.length === 0) return buildLayout(bookmarks, gridWidth);

      const existing = new Map(prev.map((item) => [item.i, item]));
      const incomingIds = new Set(bookmarks.map((b) => b.id));
      const kept = prev.filter((item) => incomingIds.has(item.i));
      const perRow = Math.floor(COLS / DEFAULT_W);
      const newItems = bookmarks
        .filter((b) => !existing.has(b.id))
        .map((b, i) => {
          const w = b.gridW ?? DEFAULT_W;
          const h =
            b.gridH ??
            estimateCollapsedH(b, cardContentWidth(gridWidth, w));
          return {
            i: b.id,
            x: b.gridX ?? ((kept.length + i) % perRow) * DEFAULT_W,
            y: b.gridY ?? 0,
            w,
            h,
            minW: 2,
            minH: MIN_H,
          };
        });
      return [...kept, ...newItems];
    });

    setExpandedIds((prev) => {
      const fromDb = new Set(
        bookmarks.filter((b) => b.gridExpanded === true).map((b) => b.id),
      );
      if (prev.size === 0 && fromDb.size > 0) return fromDb;
      return prev;
    });
  }, [bookmarks, gridWidth]);

  const bookmarkMap = useMemo(
    () => new Map(bookmarks.map((b) => [b.id, b])),
    [bookmarks],
  );

  const persistLayout = useCallback(
    (newLayout: Layout, expanded?: Set<string>) => {
      const items = newLayout.map((item) => ({
        id: item.i,
        gridX: item.x,
        gridY: item.y,
        gridW: item.w,
        gridH: item.h,
        ...(expanded && { gridExpanded: expanded.has(item.i) }),
      }));
      saveLayout(items);
    },
    [saveLayout],
  );

  const toggleExpand = useCallback(
    (id: string) => {
      if (Date.now() - lastDragTimeRef.current < 200) return;

      const isExpanded = expandedIds.has(id);
      const currentItem = layout.find((item) => item.i === id);
      if (!currentItem) return;

      const bookmark = bookmarkMap.get(id);
      const cw =
        gridWidth > 0
          ? cardContentWidth(gridWidth, currentItem.w)
          : 200;

      let newH: number;
      if (isExpanded) {
        newH =
          preExpandH.current.get(id) ??
          (bookmark ? estimateCollapsedH(bookmark, cw) : DEFAULT_H);
        preExpandH.current.delete(id);
      } else {
        preExpandH.current.set(id, currentItem.h);
        newH = bookmark
          ? estimateExpandedH(bookmark, cw)
          : EXPANDED_H;
      }

      const newExpandedIds = new Set(expandedIds);
      if (isExpanded) newExpandedIds.delete(id);
      else newExpandedIds.add(id);

      setExpandedIds(newExpandedIds);
      setLayout((prev) => {
        const next = prev.map((item) =>
          item.i === id ? { ...item, h: newH } : item,
        );
        persistLayout(next, newExpandedIds);
        return next;
      });
    },
    [expandedIds, layout, persistLayout, bookmarkMap, gridWidth],
  );

  const handleOpenReader = useCallback(
    (bookmark: BookmarkData) => {
      if (Date.now() - lastDragTimeRef.current < 200) return;
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
          const isExpanded = expandedIds.has(bookmark.id);
          const expandedOverflows = isExpanded;
          return (
            <div key={item.i}>
              <BookmarkCard
                bookmark={bookmark}
                expanded={isExpanded}
                expandedOverflows={expandedOverflows}
                onToggleExpand={() => toggleExpand(bookmark.id)}
                onClick={() => handleOpenReader(bookmark)}
                textSelectable={!dragEnabled}
                isSelected={selectedIds.has(bookmark.id)}
                onSelect={handleSelect}
              />
            </div>
          );
        })
        .filter(Boolean);

  return (
    <div
      ref={scrollRef}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden scrollbar-none"
    >
      {placeholder ? (
        <div className="flex h-full items-center justify-center text-zinc-400">
          {placeholder}
        </div>
      ) : gridWidth > 0 && children ? (
        <ReactGridLayout
          layout={layout}
          onDragStop={(_layout) => {
            setLayout(_layout);
            lastDragTimeRef.current = Date.now();
            persistLayout(_layout);
          }}
          onResizeStop={(_layout) => {
            setLayout(_layout);
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

      {selectedIds.size > 0 && (
        <BulkActions
          selectedIds={selectedIds}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
