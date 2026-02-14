"use client";

import Image from "next/image";
import Markdown from "react-markdown";
import {
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  Maximize2,
  Minimize2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useDeleteBookmark } from "@/hooks/use-bookmarks";
import type { BookmarkData } from "./BookmarkNode";

export default function BookmarkCard({
  bookmark,
  expanded,
  expandedOverflows,
  onToggleExpand,
  onClick,
  textSelectable,
  className,
}: {
  bookmark: BookmarkData;
  expanded: boolean;
  expandedOverflows?: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  textSelectable?: boolean;
  className?: string;
}) {
  const { mutate: remove } = useDeleteBookmark();

  if (bookmark._optimistic) {
    return (
      <div
        className={`rounded-xl border border-zinc-100 bg-white/40 shadow-[0px_0.5px_1px_rgba(0,0,0,0.12),0px_8px_10px_rgba(0,0,0,0.06)] h-full ${className ?? ""}`}
      >
        <div className="p-4 space-y-3">
          <div className="h-4 w-3/4 rounded bg-zinc-100 animate-pulse" />
          <div className="h-3 w-full rounded bg-zinc-100 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-zinc-100 animate-pulse" />
          <div className="flex items-center gap-2 pt-2">
            <LinkIcon size={12} className="text-zinc-200" />
            <span className="text-xs text-zinc-300 truncate">
              {new URL(bookmark.url).hostname.replace("www.", "")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const displayTitle = bookmark.title;
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const image = bookmark.mediaUrls?.find((m) => m.type !== "avatar");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={(e) => {
            if (e.shiftKey) return;
            if (e.altKey) {
              onClick();
            } else {
              onToggleExpand();
            }
          }}
          className={`group/card relative flex flex-col h-full rounded-lg border border-zinc-100 bg-white/40 shadow-[0px_0.5px_1px_rgba(0,0,0,0.12),0px_8px_10px_rgba(0,0,0,0.06)] overflow-hidden ${textSelectable ? "cursor-text select-text" : "cursor-pointer select-none"} ${className ?? ""}`}
        >
          {/* Image */}
          {image && (
            <div className="relative h-40 shrink-0 overflow-hidden">
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Title */}
          {displayTitle && (
            <div className="shrink-0 px-4 pt-4 pb-2">
              <h3
                style={{ fontFamily: "var(--font-source-serif)" }}
                className={`font-medium leading-snug ${expanded ? "text-zinc-500" : "text-zinc-800 line-clamp-2"}`}
              >
                {displayTitle}
              </h3>
            </div>
          )}

          {/* Content */}
          {expanded ? (
            <div
              className={`flex-1 min-h-0 px-4 ${!displayTitle ? "pt-2" : ""} ${expandedOverflows ? "overflow-y-auto scrollbar-hover" : "overflow-hidden"}`}
              onWheel={(e) => e.stopPropagation()}
            >
              {bookmark.content && (
                <div className="prose prose-zinc prose-base max-w-none mb-3 reader-content">
                  <style>{`
                    .reader-content p { line-height: 1.7; margin-top: 12px; margin-bottom: 12px; }
                    .reader-content p:first-of-type { margin-top: 8px; }
                    .reader-content p:last-of-type { margin-bottom: 8px; }
                    .reader-content ul, .reader-content ol { margin-top: 0.5rem; margin-bottom: 0.5rem; padding-left: 1.25rem; }
                    .reader-content li { margin-top: 0.25rem; margin-bottom: 0.25rem; line-height: 1.6; }
                    .reader-content img { border-radius: 0.5rem; }
                    .reader-content pre { background: #fafafa; font-size: 0.8rem; }
                    .reader-content blockquote { border-color: #e4e4e7; color: #71717a; }
                  `}</style>
                  <Markdown>{bookmark.content}</Markdown>
                </div>
              )}
            </div>
          ) : (
            bookmark.content &&
            bookmark.type !== "link" && (
              <div className={`px-4 ${!displayTitle ? "pt-4" : ""}`}>
                <p
                  className={`mb-3 text-sm line-clamp-3 ${displayTitle ? "text-zinc-500" : "text-zinc-800"}`}
                >
                  {bookmark.content}
                </p>
              </div>
            )
          )}

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-4 pb-4 pt-2">
            <div className="flex items-center gap-2 min-w-0">
              {avatar && (
                <Image
                  src={avatar.url}
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0 rounded-full object-cover"
                  unoptimized
                />
              )}
              {bookmark.author ? (
                <span className="text-xs text-zinc-400">
                  @{bookmark.author}
                </span>
              ) : (
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 min-w-0 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon size={12} className="shrink-0" />
                  <span className="truncate">
                    {new URL(bookmark.url).hostname.replace("www.", "")}
                  </span>
                </a>
              )}
            </div>
            {bookmark.isRead && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-300" />
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="gap-2 justify-between"
        >
          <span className="flex items-center gap-2">
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {expanded ? "Collapse" : "Expand"}
          </span>
          <span className="text-[11px] text-zinc-400">Click</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="gap-2 justify-between"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={14} />
            Open in Reader
          </span>
          <span className="text-[11px] text-zinc-400">⌥ Click</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            window.open(bookmark.url, "_blank");
          }}
          className="gap-2"
        >
          <ExternalLink size={14} />
          Open link
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            remove(bookmark.id, {
              onError: () => toast.error("Failed to delete bookmark"),
            });
          }}
          className="gap-2 text-red-500 focus:text-red-500"
        >
          <Trash2 size={14} color="currentColor" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
