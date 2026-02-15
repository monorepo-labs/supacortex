"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactGridLayout, { verticalCompactor } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import BookmarkCard from "./BookmarkCard";
import BulkActions from "./BulkActions";
import type { BookmarkData } from "./BookmarkNode";
import { useUpdateGridLayout, useResetGridLayout } from "@/hooks/use-bookmarks";

const COLS = 12;
const ROW_HEIGHT = 30;
const MARGIN = 24;
const CONTAINER_PAD = 24;
const DEFAULT_W = 3;
const MIN_H = 3;

/** Convert pixel height to grid row units */
function pxToH(px: number): number {
  return Math.max(MIN_H, Math.ceil((px + MARGIN) / (ROW_HEIGHT + MARGIN)));
}

/** Pixel width of a card given grid width and column span */
function cardPxWidth(gridWidth: number, w: number): number {
  const colPx = (gridWidth - 2 * CONTAINER_PAD - (COLS - 1) * MARGIN) / COLS;
  return w * colPx + (w - 1) * MARGIN;
}

export default function LibraryGridView({
  bookmarks,
  isLoading,
  error,
  onOpenReader,
  isFiltered,
}: {
  bookmarks: BookmarkData[];
  isLoading: boolean;
  error: Error | null;
  onOpenReader: (bookmark: BookmarkData) => void;
  isFiltered?: boolean;
}) {
  const { mutate: saveLayout } = useUpdateGridLayout();
  const { mutate: resetGrid } = useResetGridLayout();
  const [layout, setLayout] = useState<Layout>([]);
  const [measured, setMeasured] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const lastDragTimeRef = useRef(0);
  const selectModeRef = useRef(false);
  const [gridWidth, setGridWidth] = useState(0);

  // Measure width from scroll container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Measure all cards off-screen, then build layout with real heights
  useEffect(() => {
    if (gridWidth <= 0 || bookmarks.length === 0 || !measureRef.current) return;

    // Wait for measure container to paint
    requestAnimationFrame(() => {
      const container = measureRef.current;
      if (!container) return;

      const heights = new Map<string, number>();
      const cards = container.querySelectorAll<HTMLElement>("[data-bookmark-id]");
      cards.forEach((card) => {
        const id = card.dataset.bookmarkId!;
        heights.set(id, pxToH(card.offsetHeight));
      });

      setLayout((prev) => {
        const existing = new Map(prev.map((item) => [item.i, item]));
        const perRow = Math.floor(COLS / DEFAULT_W);

        return bookmarks.map((b, i) => {
          const prev = existing.get(b.id);
          const measuredH = heights.get(b.id) ?? 6;
          // When filtered (search/group), ignore DB positions — use fresh flow layout
          if (isFiltered) {
            return {
              i: b.id,
              x: (i % perRow) * DEFAULT_W,
              y: Math.floor(i / perRow) * measuredH,
              w: DEFAULT_W,
              h: measuredH,
              minW: 2,
              minH: MIN_H,
            };
          }
          return {
            i: b.id,
            x: prev?.x ?? b.gridX ?? (i % perRow) * DEFAULT_W,
            y: prev?.y ?? b.gridY ?? Math.floor(i / perRow) * measuredH,
            w: prev?.w ?? b.gridW ?? DEFAULT_W,
            h: measuredH,
            minW: 2,
            minH: MIN_H,
          };
        });
      });

      setMeasured(true);
    });
  }, [bookmarks, gridWidth, isFiltered]);

  const bookmarkMap = useMemo(
    () => new Map(bookmarks.map((b) => [b.id, b])),
    [bookmarks],
  );

  const persistLayout = useCallback(
    (newLayout: Layout) => {
      const items = newLayout.map((item) => ({
        id: item.i,
        gridX: item.x,
        gridY: item.y,
        gridW: item.w,
        gridH: item.h,
      }));
      saveLayout(items);
    },
    [saveLayout],
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

  // Compute card pixel width for measuring
  const measureWidth = gridWidth > 0 ? cardPxWidth(gridWidth, DEFAULT_W) : 300;

  const children = placeholder || !measured
    ? null
    : layout
        .map((item) => {
          const bookmark = bookmarkMap.get(item.i);
          if (!bookmark) return null;
          return (
            <div key={item.i}>
              <BookmarkCard
                bookmark={bookmark}
                expanded={false}
                onToggleExpand={() => {}}
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
      {/* Hidden off-screen container for measuring card heights */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute pointer-events-none"
        style={{ left: -9999, top: 0, width: measureWidth, visibility: "hidden" }}
      >
        {bookmarks.map((b) => (
          <div key={b.id} data-bookmark-id={b.id}>
            <BookmarkCard
              bookmark={b}
              expanded={false}
              onToggleExpand={() => {}}
              onClick={() => {}}
            />
          </div>
        ))}
      </div>

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
            if (!isFiltered) persistLayout(_layout);
          }}
          onResizeStop={(_layout) => {
            setLayout(_layout);
            if (!isFiltered) persistLayout(_layout);
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

      <button
        onClick={() => {
          resetGrid(undefined, {
            onSuccess: () => {
              setLayout([]);
              setMeasured(false);
              toast.success("Grid layout reset");
            },
          });
        }}
        className="absolute bottom-4 right-4 rounded-lg p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 transition-colors"
        title="Reset grid layout"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
