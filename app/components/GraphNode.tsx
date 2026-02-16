"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  PanelRight,
  MousePointerClick,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
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

export type GraphNodeData = {
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  type: string;
  connectionCount: number;
  groupColors: { color: string; name: string }[];
  mediaUrls: { type: string; url: string }[] | null;
  isOpenInReader?: boolean;
  bookmarkId: string;
  groupIds: string[];
  onOpenInNewPanel?: () => void;
};

function GraphNodeComponent({ data, selected }: NodeProps) {
  const { title, content, author, url, type, groupColors, mediaUrls, isOpenInReader, bookmarkId, groupIds, onOpenInNewPanel } =
    data as unknown as GraphNodeData;

  const { mutate: remove } = useDeleteBookmark();
  const [contextMode, setContextMode] = useState<"default" | "addToGroup">("default");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isTweet = type === "tweet" || type === "article";
  let hostname = "";
  try {
    hostname = new URL(url as string).hostname.replace("www.", "");
  } catch {}

  const avatar = (mediaUrls as GraphNodeData["mediaUrls"])?.find(
    (m) => m.type === "avatar",
  );
  const media = (mediaUrls as GraphNodeData["mediaUrls"])?.find(
    (m) => m.type !== "avatar" && !m.type.startsWith("quote_"),
  );

  const displayText = isTweet
    ? (content as string)?.slice(0, 120) || ""
    : (title as string) || (content as string)?.slice(0, 80) || hostname;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0 !min-w-0 !min-h-0"
      />
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
            className={`relative w-[200px] rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${selected ? "ring-2 ring-black/20 border-black/20" : isOpenInReader ? "ring-2 ring-black/6 border-black/6" : ""}`}
          >
            {/* Group color bars with hover target */}
            {groupColors.length > 0 && (
              <div className="absolute left-0 top-0 bottom-0 flex flex-col w-[3px] overflow-hidden rounded-l-lg z-10">
                {groupColors.map((g, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: g.color }}
                  />
                ))}
              </div>
            )}
            {/* Wider invisible hover zone for tooltips */}
            {groupColors.length > 0 && (
              <div className="absolute left-0 top-0 bottom-0 flex flex-col w-4 z-20">
                {groupColors.map((g, i) => (
                  <div key={i} className="flex-1 group/bar relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] text-white shadow-sm">
                      {g.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Author row */}
            {avatar && (
              <div className="flex items-center gap-1.5 px-3 pt-3">
                <Image
                  src={avatar.url}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded-full shrink-0"
                  unoptimized
                />
                {author && (
                  <span className="text-[10px] text-zinc-400 truncate">
                    @{author}
                  </span>
                )}
              </div>
            )}

            {/* Text content */}
            <div className="px-3 pt-2 pb-2 space-y-1">
              {!avatar && isTweet && author && (
                <p className="text-[10px] text-zinc-400 truncate">@{author}</p>
              )}
              <p className="text-xs leading-snug text-zinc-700 line-clamp-3">
                {displayText}
              </p>
              {!isTweet && (
                <div className="flex items-center gap-1 pt-0.5">
                  <LinkIcon size={10} className="text-zinc-300 shrink-0" />
                  <span className="text-[10px] text-zinc-400 truncate">
                    {hostname}
                  </span>
                </div>
              )}
            </div>

            {/* Media image */}
            {media && (
              <div className="px-3 pb-3">
                <div className="relative h-24 overflow-hidden rounded-md">
                  <Image
                    src={media.url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64" onClick={(e) => e.stopPropagation()}>
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
                  <ContextMenuShortcut>⌘ <MousePointerClick size={12} /></ContextMenuShortcut>
                </ContextMenuItem>
              )}
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(url, "_blank");
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
                      remove(bookmarkId, {
                        onError: () => sileo.error({ title: "Failed to delete bookmark" }),
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
                bookmarkIds={[bookmarkId]}
                currentGroupIds={groupIds}
              />
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0 !min-w-0 !min-h-0"
      />
    </>
  );
}

export default memo(GraphNodeComponent);
