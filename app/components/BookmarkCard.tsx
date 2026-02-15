"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  BookOpen,
  FolderPlus,
  ArrowLeft,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { useDeleteBookmark } from "@/hooks/use-bookmarks";
import { useGroups } from "@/hooks/use-groups";
import {
  useAddBookmarksToGroups,
  useRemoveBookmarksFromGroups,
} from "@/hooks/use-bookmark-groups";
import { ICON_MAP } from "./GroupIconPicker";
import type { BookmarkData } from "./BookmarkNode";

export default function BookmarkCard({
  bookmark,
  expanded,
  expandedOverflows,
  onToggleExpand,
  onClick,
  textSelectable,
  isSelected,
  onSelect,
  className,
}: {
  bookmark: BookmarkData;
  expanded: boolean;
  expandedOverflows?: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  textSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const { mutate: remove } = useDeleteBookmark();
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);
  const [contextMode, setContextMode] = useState<"default" | "addToGroup">(
    "default",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: groups } = useGroups();
  const { mutate: addToGroups } = useAddBookmarksToGroups();
  const { mutate: removeFromGroups } = useRemoveBookmarksFromGroups();

  if (bookmark._optimistic) {
    return (
      <div
        className={`rounded-xl border border-zinc-100 bg-white/80 shadow-[0px_0.5px_1px_rgba(0,0,0,0.12),0px_8px_10px_rgba(0,0,0,0.06)] h-full ${className ?? ""}`}
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
  const isArticle = bookmark.type === "article";
  const bookmarkGroupIds = bookmark.groupIds ?? [];

  const articleUrl = isArticle
    ? bookmark.content?.match(/https?:\/\/[^\s)]+/)?.[0] ?? bookmark.url
    : null;

  const toggleGroupMembership = (groupId: string) => {
    const isInGroup = bookmarkGroupIds.includes(groupId);
    if (isInGroup) {
      removeFromGroups({ bookmarkIds: [bookmark.id], groupIds: [groupId] });
    } else {
      addToGroups({ bookmarkIds: [bookmark.id], groupIds: [groupId] });
    }
  };

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
            if (bookmark.type === "article") return;
            onClick();
          }}
          className={`group/card relative flex flex-col h-full rounded-lg border bg-white/70 shadow-[0px_0.5px_0px_rgba(0,0,0,0.12),0px_8px_10px_rgba(0,0,0,0.06)] overflow-hidden ${
            isSelected
              ? "border-blue-500 ring-2 ring-blue-500"
              : "border-black/6"
          } ${textSelectable ? "cursor-text select-text" : "cursor-pointer select-none"} ${className ?? ""}`}
        >
          {isTweet ? (
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
              </div>

              {/* Content */}
              {bookmark.content && (
                <div className={`shrink-0 px-4 pt-2 ${!media ? "pb-4" : ""}`}>
                  <p
                    className={`break-words text-zinc-800 text-[15px] leading-normal ${media ? "line-clamp-3" : ""}`}
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
                    {isVideo && media.videoUrl ? (
                      <>
                        <video
                          src={`/api/media?url=${encodeURIComponent(media.videoUrl)}`}
                          poster={media.url}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="w-full object-cover"
                          onMouseEnter={(e) => {
                            e.currentTarget.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute bottom-2 left-2 pointer-events-none transition-opacity duration-200 group-hover/card:opacity-0 drop-shadow-md">
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
                      </>
                    ) : (
                      <Image
                        src={media.url}
                        alt=""
                        width={600}
                        height={400}
                        className="w-full object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                </div>
              )}
              {!media && !bookmark.content && <div className="shrink-0 h-4" />}

              {/* Article hover button — full width at bottom */}
              {isArticle && articleUrl && (
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 flex items-center justify-center gap-1.5 mx-4 mb-4 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-500 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-zinc-50 hover:text-zinc-700"
                >
                  Read article
                  <ArrowUpRight size={12} />
                </a>
              )}
            </>
          ) : (
            <>
              {/* Media — full bleed for non-tweets */}
              {media && (
                <div className="relative h-40 shrink-0 overflow-hidden">
                  {isVideo && media.videoUrl ? (
                    <>
                      <video
                        src={`/api/media?url=${encodeURIComponent(media.videoUrl)}`}
                        poster={media.url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                        onMouseEnter={(e) => {
                          e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                      <div className="absolute bottom-2 left-2 pointer-events-none transition-opacity duration-200 group-hover/card:opacity-0 drop-shadow-md">
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
                    </>
                  ) : (
                    <Image
                      src={media.url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
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
                </div>
                {bookmark.isRead && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-300" />
                )}
              </div>
            </>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        {contextMode === "default" ? (
          <>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="gap-2"
            >
              <BookOpen size={14} />
              Open in Reader
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.open(bookmark.url, "_blank");
              }}
              className="gap-2"
            >
              <ExternalLink size={14} />
              Visit link
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
                      onError: () => toast.error("Failed to delete bookmark"),
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
            {groups?.map(
              (group: {
                id: string;
                name: string;
                color: string;
                icon?: string | null;
              }) => {
                const isInGroup = bookmarkGroupIds.includes(group.id);
                const iconName = group.icon ?? "hash";
                const Icon = ICON_MAP[iconName] ?? ICON_MAP.hash;
                return (
                  <ContextMenuItem
                    key={group.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleGroupMembership(group.id);
                    }}
                    className="gap-2 justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                        style={{ backgroundColor: group.color }}
                      >
                        <Icon className="h-2.5 w-2.5 text-white" />
                      </span>
                      {group.name}
                    </span>
                    {isInGroup && <Check size={14} className="text-zinc-600" />}
                  </ContextMenuItem>
                );
              },
            )}
            {(!groups || groups.length === 0) && (
              <div className="px-2 py-1.5 text-sm text-zinc-400">
                No groups yet
              </div>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
