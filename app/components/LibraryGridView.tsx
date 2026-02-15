"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactGridLayout, { verticalCompactor } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { sileo } from "sileo";
import BookmarkCard from "./BookmarkCard";
import BulkActions from "./BulkActions";
import type { BookmarkData } from "./BookmarkNode";
import { useUpdateGridLayout } from "@/hooks/use-bookmarks";

const ROW_HEIGHT = 30;
const MARGIN = 24;
const CONTAINER_PAD = 24;
const MIN_H = 3;
const TARGET_CARD_WIDTH = 260;

/** Convert pixel height to grid row units */
function pxToH(px: number): number {
  return Math.max(MIN_H, Math.ceil((px + MARGIN) / (ROW_HEIGHT + MARGIN)));
}

/** How many columns fit at the target card width */
function calcCols(gridWidth: number): number {
  const usable = gridWidth - 2 * CONTAINER_PAD + MARGIN;
  return Math.max(1, Math.floor(usable / (TARGET_CARD_WIDTH + MARGIN)));
}

/** Pixel width of one column card */
function cardPxWidth(gridWidth: number, cols: number): number {
  const colPx = (gridWidth - 2 * CONTAINER_PAD - (cols - 1) * MARGIN) / cols;
  return colPx;
}

export default function LibraryGridView({
  bookmarks,
  isLoading,
  error,
  onOpenReader,
  onOpenInNewPanel,
  openReaderIds,
  isFiltered,
}: {
  bookmarks: BookmarkData[];
  isLoading: boolean;
  error: Error | null;
  onOpenReader: (bookmark: BookmarkData) => void;
  onOpenInNewPanel?: (bookmark: BookmarkData) => void;
  openReaderIds?: Set<string>;
  isFiltered?: boolean;
}) {
  const { mutate: saveLayout } = useUpdateGridLayout();
  const [layout, setLayout] = useState<Layout>([]);
  const [measured, setMeasured] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const lastDragTimeRef = useRef(0);
  const selectModeRef = useRef(false);
  const [gridWidth, setGridWidth] = useState(0);

  const cols = gridWidth > 0 ? calcCols(gridWidth) : 4;
  const prevColsRef = useRef(cols);

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

      const colsChanged = prevColsRef.current !== cols;
      prevColsRef.current = cols;

      setLayout((prev) => {
        // When cols change or filtered, ignore previous positions — re-flow everything
        const usePrev = !colsChanged && !isFiltered;
        const existing = usePrev ? new Map(prev.map((item) => [item.i, item])) : null;

        return bookmarks.map((b, i) => {
          const measuredH = heights.get(b.id) ?? 6;
          const ex = existing?.get(b.id);
          return {
            i: b.id,
            x: ex?.x ?? i % cols,
            y: ex?.y ?? Math.floor(i / cols) * measuredH,
            w: 1,
            h: measuredH,
            minH: MIN_H,
          };
        });
      });

      setMeasured(true);
    });
  }, [bookmarks, gridWidth, isFiltered, cols]);

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
          sileo.success({ title: "Copied to clipboard" });
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
  const measureWidth = gridWidth > 0 ? cardPxWidth(gridWidth, cols) : 300;

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
                onOpenInNewPanel={
                  onOpenInNewPanel
                    ? () => onOpenInNewPanel(bookmark)
                    : undefined
                }
                textSelectable={!dragEnabled}
                isSelected={selectedIds.has(bookmark.id)}
                isOpenInReader={openReaderIds?.has(bookmark.id)}
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
          }}
          onResizeStop={(_layout) => {
            setLayout(_layout);
          }}
          width={gridWidth}
          gridConfig={{
            cols,
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
