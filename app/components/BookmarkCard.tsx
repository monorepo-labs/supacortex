"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  PanelRight,
  MousePointerClick,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import { sileo } from "sileo";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { useDeleteBookmark } from "@/hooks/use-bookmarks";
import AddToGroupMenu from "./AddToGroupMenu";
import type { BookmarkData } from "./BookmarkNode";

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookmarkCard({
  bookmark,
  expanded,
  expandedOverflows,
  onToggleExpand,
  onClick,
  onOpenInNewPanel,
  textSelectable,
  isSelected,
  isAttachedToChat,
  isOpenInReader,
  onSelect,
  className,
  contextMenuExtra,
}: {
  bookmark: BookmarkData;
  expanded: boolean;
  expandedOverflows?: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  onOpenInNewPanel?: () => void;
  textSelectable?: boolean;
  isSelected?: boolean;
  isAttachedToChat?: boolean;
  isOpenInReader?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
  contextMenuExtra?: React.ReactNode;
}) {
  const { mutate: remove } = useDeleteBookmark();
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);
  const [contextMode, setContextMode] = useState<"default" | "addToGroup">(
    "default",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (bookmark._optimistic) {
    return (
      <div
        className={`rounded-xl bg-white/80 tauri:bg-white shadow-card h-full ${className ?? ""}`}
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
  const media = bookmark.mediaUrls?.find(
    (m) => m.type !== "avatar" && !m.type.startsWith("quote_"),
  );
  const isVideo = media?.type === "video" || media?.type === "animated_gif";
  const isTweet = bookmark.type === "tweet" || bookmark.type === "article";
  const isYouTube = bookmark.type === "youtube";
  const ytMedia = isYouTube
    ? bookmark.mediaUrls?.find((m) => m.type === "youtube")
    : null;
  const bookmarkGroupIds = bookmark.groupIds ?? [];

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) {
          setContextMode("default");
          setConfirmDelete(false);
        }
      }}
    >
      <ContextMenuTrigger asChild>
        <div
          onMouseDown={(e) => {
            mouseDownPos.current = { x: e.clientX, y: e.clientY };
            wasDragged.current = false;
          }}
          onMouseUp={(e) => {
            if (mouseDownPos.current) {
              const dx = e.clientX - mouseDownPos.current.x;
              const dy = e.clientY - mouseDownPos.current.y;
              if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                wasDragged.current = true;
              }
            }
          }}
          onClick={(e) => {
            if (wasDragged.current) return;
            if (e.shiftKey) {
              onSelect?.(bookmark.id);
              return;
            }
            if (e.metaKey || e.ctrlKey) {
              onOpenInNewPanel?.();
              return;
            }
            onClick();
          }}
          className={`group/card relative flex flex-col h-full rounded-lg bg-white/70 tauri:bg-white shadow-card overflow-hidden ${
            isSelected
              ? "outline-2 outline-blue-600/50"
              : isOpenInReader
                ? "outline-1 outline-black/20"
                : ""
          } ${isAttachedToChat ? "ring-2 ring-blue-400/60" : ""} ${textSelectable ? "cursor-text select-text" : "cursor-pointer select-none"} ${className ?? ""}`}
        >
          {isYouTube ? (
            <>
              {/* Thumbnail with play button */}
              {ytMedia && (
                <div className="shrink-0 p-3 pb-0">
                  <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
                    <Image
                      src={ytMedia.url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              {bookmark.title && (
                <div className="shrink-0 px-4 pt-4 pb-1">
                  <h3
                    style={{ fontFamily: "var(--font-source-serif)" }}
                    className="font-medium leading-snug text-zinc-800 line-clamp-2"
                  >
                    {bookmark.title}
                  </h3>
                </div>
              )}

              {/* Footer — YouTube icon + channel */}
              <div className="shrink-0 flex items-center gap-2 px-4 pb-4 pt-2">
                <svg viewBox="0 0 28 20" className="h-3.5 w-auto shrink-0">
                  <path
                    fill="#FF0000"
                    d="M27.4 3.1a3.5 3.5 0 0 0-2.5-2.5C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z"
                  />
                  <path fill="#FFF" d="m11.2 14.3 7.2-4.3-7.2-4.3v8.6Z" />
                </svg>
                {bookmark.author && (
                  <span className="text-xs text-zinc-400 truncate">
                    {bookmark.author}
                  </span>
                )}
              </div>
            </>
          ) : isTweet ? (
            <>
              {/* Author — top */}
              <div className="shrink-0 flex items-center gap-2 px-4 pt-4">
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
                {bookmark.author && (
                  <a
                    href={`https://x.com/${bookmark.author}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-900 hover:text-zinc-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{bookmark.author}
                  </a>
                )}
                {formatDate(bookmark.tweetCreatedAt) && (
                  <span className="text-xs text-zinc-400">
                    · {formatDate(bookmark.tweetCreatedAt)}
                  </span>
                )}
              </div>

              {/* Content */}
              {bookmark.content && (
                <div className={`shrink-0 px-4 pt-2 ${!media ? "pb-4" : ""}`}>
                  <p
                    className={`break-words text-zinc-800 text-[15px] leading-normal whitespace-pre-line ${media ? "line-clamp-3" : ""}`}
                  >
                    {media
                      ? bookmark.content
                      : bookmark.content && bookmark.content.length > 280
                        ? bookmark.content.slice(0, 280) + "…"
                        : bookmark.content}
                  </p>
                </div>
              )}

              {/* Media — with margin and roundness */}
              {media && (
                <div className="shrink-0 px-4 pt-3 pb-4">
                  <div className="relative overflow-hidden rounded-[8px]">
                    <Image
                      src={media.url}
                      alt=""
                      width={600}
                      height={400}
                      className="w-full object-cover"
                      unoptimized
                    />
                    {isVideo && (
                      <div className="absolute bottom-2 left-2 pointer-events-none drop-shadow-md">
                        <svg
                          viewBox="0 0 24 24"
                          fill="white"
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="1"
                          className="h-5 w-5"
                        >
                          <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!media && !bookmark.content && <div className="shrink-0 h-4" />}
            </>
          ) : (
            <>
              {/* Media — full bleed for non-tweets */}
              {media && (
                <div className="relative h-40 shrink-0 overflow-hidden">
                  <Image
                    src={media.url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {isVideo && (
                    <div className="absolute bottom-2 left-2 pointer-events-none drop-shadow-md">
                      <svg
                        viewBox="0 0 24 24"
                        fill="white"
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="1"
                        className="h-5 w-5"
                      >
                        <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82z" />
                      </svg>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              {displayTitle && (
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h3
                    style={{ fontFamily: "var(--font-source-serif)" }}
                    className="font-medium leading-snug text-zinc-800 line-clamp-2"
                  >
                    {displayTitle}
                  </h3>
                </div>
              )}

              {/* Content */}
              {bookmark.content && bookmark.type !== "link" && (
                <div className={`px-4 ${!displayTitle ? "pt-4" : ""}`}>
                  <p
                    className={`mb-3 line-clamp-3 break-words ${displayTitle ? "text-zinc-500" : "text-zinc-800"}`}
                  >
                    {bookmark.content}
                  </p>
                </div>
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
                    <a
                      href={`https://x.com/${bookmark.author}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{bookmark.author}
                    </a>
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
                  {formatDate(bookmark.createdAt) && (
                    <span className="text-xs text-zinc-400">
                      · {formatDate(bookmark.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        {contextMode === "default" ? (
          <>
            {onOpenInNewPanel && !isOpenInReader && (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInNewPanel();
                }}
                className="gap-2"
              >
                <PanelRight size={14} />
                Open in New Panel
                <ContextMenuShortcut>
                  ⌘ <MousePointerClick size={12} />
                </ContextMenuShortcut>
              </ContextMenuItem>
            )}
            {contextMenuExtra}
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.open(bookmark.url, "_blank");
              }}
              className="gap-2"
            >
              <ExternalLink size={14} />
              {bookmark.type === "tweet"
                ? "View on Twitter"
                : bookmark.type === "youtube"
                  ? "View on YouTube"
                  : bookmark.type === "article"
                    ? "Read article"
                    : "Visit link"}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setContextMode("addToGroup");
              }}
              className="gap-2"
            >
              <FolderPlus size={14} />
              Add to Group
            </ContextMenuItem>
            <ContextMenuSeparator />
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(bookmark.id, {
                      onError: () =>
                        sileo.error({ title: "Failed to delete bookmark" }),
                    });
                    document.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "Escape" }),
                    );
                  }}
                >
                  Yes, delete
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setConfirmDelete(true);
                }}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 size={14} />
                Delete
              </ContextMenuItem>
            )}
          </>
        ) : (
          <>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setContextMode("default");
              }}
              className="gap-2"
            >
              <ArrowLeft size={14} />
              Back
            </ContextMenuItem>
            <ContextMenuSeparator />
            <AddToGroupMenu
              bookmarkIds={[bookmark.id]}
              currentGroupIds={bookmarkGroupIds}
            />
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
