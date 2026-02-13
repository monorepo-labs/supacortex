"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import BookmarkCard from "./BookmarkCard";
import type { BookmarkData } from "./BookmarkNode";

function SortableBookmarkCard({
  bookmark,
  index,
  expanded,
  onToggleExpand,
  onClick,
}: {
  bookmark: BookmarkData;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
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
      className="w-fit"
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
    <div className="h-full w-full overflow-x-auto overflow-y-hidden scrollbar-light">
      <DragDropProvider
        onDragOver={(event) => {
          setOrderedIds((items) => move(items, event));
        }}
      >
        <div className="flex flex-col flex-wrap content-start h-full gap-4 p-4">
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
            />
          ))}
        </div>
      </DragDropProvider>
    </div>
  );
}
