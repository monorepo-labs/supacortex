"use client";

import { memo, createContext, useContext } from "react";
import Image from "next/image";
import Markdown from "react-markdown";
import { Handle, Position, type NodeProps } from "@xyflow/react";
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

export type BookmarkData = {
  id: string;
  type: "tweet" | "link" | "article" | "pdf" | "image";
  title: string | null;
  aiTitle: string | null;
  content: string | null;
  author: string | null;
  url: string;
  isRead: boolean;
  mediaUrls: { type: string; url: string }[] | null;
  positionX: number | null;
  positionY: number | null;
  createdAt: string | null;
  _optimistic?: boolean;
  _expanded?: boolean;
};

export const ToggleExpandContext = createContext<(id: string) => void>(() => {});

function BookmarkNode({ data }: NodeProps) {
  const bookmark = data as BookmarkData;
  const { mutate: remove } = useDeleteBookmark();
  const toggleExpand = useContext(ToggleExpandContext);

  if (bookmark._optimistic) {
    return (
      <div className="w-[320px] rounded-xl border border-zinc-200 bg-white shadow">
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
        <Handle type="source" position={Position.Right} className="!invisible" />
        <Handle type="target" position={Position.Left} className="!invisible" />
      </div>
    );
  }

  const displayTitle = bookmark.title || bookmark.aiTitle;
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const image = bookmark.mediaUrls?.find((m) => m.type !== "avatar");
  const expanded = bookmark._expanded;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="group rounded-xl border border-zinc-200 bg-white shadow transition-all hover:shadow-md"
          style={{ width: expanded ? 560 : 320 }}
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

          <div className="p-4">
            {/* Title — serif font */}
            {displayTitle && (
              <h3
                style={{ fontFamily: "var(--font-source-serif)" }}
                className={`mb-2 font-medium leading-snug text-zinc-900 ${expanded ? "text-xl" : "text-lg"}`}
              >
                {displayTitle}
              </h3>
            )}

            {/* Content */}
            {bookmark.content && (
              expanded ? (
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
              ) : (
                bookmark.type !== "link" && (
                  <p className="mb-3 text-zinc-500">
                    {bookmark.content.length > 160
                      ? bookmark.content.slice(0, 160) + "…"
                      : bookmark.content}
                  </p>
                )
              )
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
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

          {/* React Flow handles (hidden, for future connections) */}
          <Handle type="source" position={Position.Right} className="!invisible" />
          <Handle type="target" position={Position.Left} className="!invisible" />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(bookmark.id);
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

export default memo(BookmarkNode);
