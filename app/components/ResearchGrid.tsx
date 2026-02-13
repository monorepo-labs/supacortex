"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { toast } from "sonner";
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
}: {
  bookmark: BookmarkData;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  className?: string;
  fillWidth?: boolean;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const resizingRef = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(true); };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Shift") return;
      setShiftHeld(false);
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text) {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
        sel?.removeAllRanges();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

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
    disabled: isResizing || shiftHeld,
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
        textSelectable={shiftHeld}
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
  const [colCount, setColCount] = useState(3);
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

  // Option+Arrow keyboard scrolling
  useEffect(() => {
    const el = containerRef.current;
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

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden scrollbar-light"
    >
      <DragDropProvider
        onDragOver={(event) => {
          requestAnimationFrame(() => {
            setOrderedIds((items) => move(items, event));
          });
        }}
      >
        <div
          className="p-4"
          style={{ columns: `${colCount}`, columnGap: "1rem" }}
        >
          {orderedBookmarks.map((bookmark, index) => (
            <SortableBookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              index={index}
              expanded={expandedIds.has(bookmark.id)}
              onToggleExpand={() => toggleExpand(bookmark.id)}
              onClick={() => {
                if (!bookmark._optimistic) onOpenReader(bookmark);
              }}
              className="mb-4 break-inside-avoid"
              fillWidth
            />
          ))}
        </div>
      </DragDropProvider>
    </div>
  );
}
