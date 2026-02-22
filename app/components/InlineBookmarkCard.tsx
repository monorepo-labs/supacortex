"use client";

import { PanelRight, ExternalLink, MousePointerClick } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { BookmarkData } from "@/app/components/BookmarkNode";

export default function InlineBookmarkCard({
  bookmarkId,
  bookmarkData,
  isLoading,
  onOpen,
  onOpenInNewPanel,
}: {
  bookmarkId: string;
  bookmarkData?: BookmarkData;
  isLoading?: boolean;
  onOpen: (bookmark: BookmarkData) => void;
  onOpenInNewPanel: (bookmark: BookmarkData) => void;
}) {
  // Skeleton while loading
  if (!bookmarkData && isLoading) {
    return (
      <div className="w-56 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden animate-pulse">
        <div className="px-3.5 py-3 space-y-2">
          <div className="h-3 w-10 rounded bg-zinc-100" />
          <div className="h-4 w-full rounded bg-zinc-100" />
          <div className="h-3 w-20 rounded bg-zinc-100" />
        </div>
      </div>
    );
  }

  // Not found — query settled but no data
  if (!bookmarkData) {
    return (
      <div className="w-56 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 overflow-hidden">
        <div className="px-3.5 py-3">
          <p className="text-xs text-zinc-400">Bookmark not found</p>
        </div>
      </div>
    );
  }

  const domain = (() => {
    try {
      return new URL(bookmarkData.url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  const typeLabel =
    bookmarkData.type === "tweet"
      ? "Tweet"
      : bookmarkData.type === "link"
        ? "Link"
        : bookmarkData.type;

  const displayText =
    bookmarkData.title ??
    (bookmarkData.content ? bookmarkData.content.slice(0, 120) : "Bookmark");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) {
              onOpenInNewPanel(bookmarkData);
            } else {
              onOpen(bookmarkData);
            }
          }}
          className="relative w-56 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden text-left cursor-pointer select-none"
        >
          <div className="px-3.5 py-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                {typeLabel}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-800 line-clamp-2 leading-snug">
              {displayText}
            </p>
            {domain && (
              <p className="text-xs text-zinc-400 truncate">{domain}</p>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => onOpenInNewPanel(bookmarkData)}
          className="gap-2"
        >
          <PanelRight size={14} />
          Open in New Panel
          <ContextMenuShortcut>
            ⌘ <MousePointerClick size={12} />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => window.open(bookmarkData.url, "_blank")}
          className="gap-2"
        >
          <ExternalLink size={14} />
          {bookmarkData.type === "tweet" ? "View on Twitter" : "Visit link"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
