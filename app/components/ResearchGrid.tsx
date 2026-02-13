"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { Rows3, Columns3 } from "lucide-react";
import BookmarkCard from "./BookmarkCard";
import type { BookmarkData } from "./BookmarkNode";

function SortableBookmarkCard({
  bookmark,
  index,
  expanded,
  onToggleExpand,
  onClick,
  className,
  fillWidth,
  onColumnResize,
}: {
  bookmark: BookmarkData;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  className?: string;
  fillWidth?: boolean;
  onColumnResize?: (width: number) => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef(false);

  const onResizeStart = useCallback(() => {
    resizingRef.current = true;
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(() => {
    resizingRef.current = false;
    setIsResizing(false);
  }, []);

  const { ref, handleRef, isDragging } = useSortable({
    id: bookmark.id,
    index,
    disabled: isResizing,
  });

  return (
    <div
      ref={ref}
      className={className ?? ""}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <BookmarkCard
        bookmark={bookmark}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onClick={onClick}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
        dragHandleRef={expanded ? handleRef : undefined}
        fillWidth={fillWidth}
        onColumnResize={onColumnResize}
      />
    </div>
  );
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
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [scrollDir, setScrollDir] = useState<"horizontal" | "vertical">("vertical");
  const [colCount, setColCount] = useState(3);
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrderedIds((prev) => {
      const incomingIds = new Set(bookmarks.map((b) => b.id));
      const kept = prev.filter((id) => incomingIds.has(id));
      const keptSet = new Set(kept);
      const added = bookmarks.filter((b) => !keptSet.has(b.id)).map((b) => b.id);
      return [...kept, ...added];
    });
  }, [bookmarks]);

  const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]));
  const orderedBookmarks = orderedIds
    .map((id) => bookmarkMap.get(id))
    .filter(Boolean) as BookmarkData[];

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Compute column count from container width (vertical mode)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setColCount(Math.max(1, Math.floor(w / 340)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset column widths when column count changes
  useEffect(() => {
    setColumnWidths({});
  }, [colCount]);

  const onColumnResize = useCallback((colIndex: number, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [colIndex]: width }));
  }, []);

  // Distribute cards into columns (round-robin)
  const columns: BookmarkData[][] = Array.from({ length: colCount }, () => []);
  orderedBookmarks.forEach((b, i) => {
    columns[i % colCount].push(b);
  });

  // Option+Arrow keyboard scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const amount = 300;
      if (e.key === "ArrowLeft") {
        el.scrollBy({ left: -amount, behavior: "smooth" });
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        el.scrollBy({ left: amount, behavior: "smooth" });
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
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

  const isVertical = scrollDir === "vertical";

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full scrollbar-light ${
        isVertical
          ? "overflow-y-auto overflow-x-hidden"
          : "overflow-x-auto overflow-y-hidden"
      }`}
    >
      {/* Scroll direction toggle */}
      <button
        onClick={() => setScrollDir(isVertical ? "horizontal" : "vertical")}
        className="absolute top-3 right-3 z-10 rounded-lg bg-zinc-200/60 p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors"
        title={isVertical ? "Switch to horizontal scroll" : "Switch to vertical scroll"}
      >
        {isVertical ? <Columns3 size={14} /> : <Rows3 size={14} />}
      </button>

      <DragDropProvider
        onDragOver={(event) => {
          requestAnimationFrame(() => {
            setOrderedIds((items) => move(items, event));
          });
        }}
      >
        {isVertical ? (
          <div className="flex gap-4 p-4 pt-6">
            {columns.map((colCards, colIdx) => (
              <div
                key={colIdx}
                className="flex flex-col gap-4"
                style={{
                  width: columnWidths[colIdx] ?? undefined,
                  flex: columnWidths[colIdx] ? "none" : 1,
                  minWidth: 0,
                }}
              >
                {colCards.map((bookmark) => {
                  const globalIndex = orderedBookmarks.indexOf(bookmark);
                  return (
                    <SortableBookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      index={globalIndex}
                      expanded={expandedIds.has(bookmark.id)}
                      onToggleExpand={() => toggleExpand(bookmark.id)}
                      onClick={() => {
                        if (bookmark._optimistic) return;
                        if (expandedIds.has(bookmark.id)) {
                          onOpenReader(bookmark);
                        } else {
                          toggleExpand(bookmark.id);
                        }
                      }}
                      fillWidth
                      onColumnResize={(width) => onColumnResize(colIdx, width)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col flex-wrap content-start gap-4 p-4 h-full">
            {orderedBookmarks.map((bookmark, index) => (
              <SortableBookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                index={index}
                expanded={expandedIds.has(bookmark.id)}
                onToggleExpand={() => toggleExpand(bookmark.id)}
                onClick={() => {
                  if (bookmark._optimistic) return;
                  if (expandedIds.has(bookmark.id)) {
                    onOpenReader(bookmark);
                  } else {
                    toggleExpand(bookmark.id);
                  }
                }}
                className="w-fit"
              />
            ))}
          </div>
        )}
      </DragDropProvider>
    </div>
  );
}
