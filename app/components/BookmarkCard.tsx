"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import Markdown from "react-markdown";
import { Link as LinkIcon, ExternalLink, Trash2, Maximize2, Minimize2 } from "lucide-react";
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
  onToggleExpand,
  onClick,
  onResizeStart,
  onResizeEnd,
  dragHandleRef,
  className,
}: {
  bookmark: BookmarkData;
  expanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  dragHandleRef?: ((el: Element | null) => void);
  className?: string;
}) {
  const { mutate: remove } = useDeleteBookmark();
  const cardRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  const onEdgeResize = useCallback((dir: "right" | "bottom", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const card = cardRef.current;
    if (!card) return;

    isResizingRef.current = true;
    onResizeStart?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = card.offsetWidth;
    const startH = card.offsetHeight;

    const onMove = (ev: PointerEvent) => {
      if (dir === "right") {
        card.style.width = `${Math.max(280, startW + ev.clientX - startX)}px`;
      }
      if (dir === "bottom") {
        card.style.height = `${Math.max(300, startH + ev.clientY - startY)}px`;
      }
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      onResizeEnd?.();
      // Keep flag true briefly so the click event that fires after pointerup is swallowed
      requestAnimationFrame(() => { isResizingRef.current = false; });
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [onResizeStart, onResizeEnd]);

  if (bookmark._optimistic) {
    return (
      <div className={`rounded-xl border border-zinc-200 bg-white shadow ${className ?? ""}`}>
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

  const displayTitle = bookmark.title || bookmark.aiTitle;
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const image = bookmark.mediaUrls?.find((m) => m.type !== "avatar");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={cardRef}
          onClick={() => { if (!isResizingRef.current) onClick(); }}
          className={`group/card relative rounded-xl border border-zinc-200 bg-white shadow transition-shadow hover:shadow-md cursor-pointer ${expanded ? "flex flex-col" : ""} ${className ?? ""}`}
          style={{ width: 320, height: expanded ? 500 : undefined }}
        >
          {/* Image */}
          {image && !expanded && (
            <div className="relative h-40 overflow-hidden rounded-t-xl">
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Title (pinned top when expanded) */}
          {displayTitle && (
            <div className={expanded ? "shrink-0 px-4 pt-4 pb-2" : "px-4 pt-4"}>
              <h3
                style={{ fontFamily: "var(--font-source-serif)" }}
                className={`font-medium leading-snug text-zinc-900 ${expanded ? "text-xl" : "text-lg"}`}
              >
                {displayTitle}
              </h3>
            </div>
          )}

          {/* Scrollable content area when expanded */}
          {expanded ? (
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 scrollbar-hover"
              onWheel={(e) => e.stopPropagation()}
            >
              {bookmark.content && (
                <div className="prose prose-zinc prose-base max-w-none mb-3 reader-content">
                  <style>{`
                    .reader-content p { line-height: 1.7; }
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
            bookmark.content && bookmark.type !== "link" && (
              <div className="px-4">
                <p className="mb-3 text-zinc-500">
                  {bookmark.content.length > 160
                    ? bookmark.content.slice(0, 160) + "…"
                    : bookmark.content}
                </p>
              </div>
            )
          )}

          {/* Footer (pinned bottom when expanded) */}
          <div className={`flex items-center justify-between ${expanded ? "shrink-0 px-4 py-3" : "px-4 pb-4"}`}>
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
                <span className="text-xs text-zinc-400">@{bookmark.author}</span>
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

          {/* Resize handles */}
          {expanded && (
            <>
              <div
                onPointerDown={(e) => onEdgeResize("right", e)}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 right-0 w-4 h-full cursor-e-resize touch-none z-10"
              />
              <div
                onPointerDown={(e) => onEdgeResize("bottom", e)}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 h-6 w-full cursor-s-resize touch-none z-10"
              />
            </>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="gap-2"
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {expanded ? "Collapse" : "Expand"}
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
