"use client";

import { memo } from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export type BookmarkData = {
  type: "tweet" | "link" | "article" | "pdf" | "image";
  title: string | null;
  aiTitle: string | null;
  content: string | null;
  author: string | null;
  url: string;
  isRead: boolean;
  mediaUrls: { type: string; url: string }[] | null;
  createdAt: string | null;
};

function BookmarkNode({ data }: NodeProps) {
  const bookmark = data as BookmarkData;

  const displayTitle = bookmark.title || bookmark.aiTitle;
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const image = bookmark.mediaUrls?.find((m) => m.type !== "avatar");

  return (
    <div className="group w-[320px] rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      {image && (
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
            className="mb-2 text-lg font-medium leading-snug text-zinc-900"
          >
            {displayTitle}
          </h3>
        )}

        {/* Content */}
        {bookmark.content && (
          <p className="mb-3 text-zinc-500">
            {bookmark.content.length > 160
              ? bookmark.content.slice(0, 160) + "…"
              : bookmark.content}
          </p>
        )}

        {/* Footer — avatar, username, read status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {avatar && (
              <Image
                src={avatar.url}
                alt=""
                width={20}
                height={20}
                className="rounded-full object-cover"
                unoptimized
              />
            )}
            {bookmark.author && (
              <span className="text-xs text-zinc-400">@{bookmark.author}</span>
            )}
          </div>
          {bookmark.isRead && (
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
          )}
        </div>
      </div>

      {/* React Flow handles (hidden, for future connections) */}
      <Handle type="source" position={Position.Right} className="!invisible" />
      <Handle type="target" position={Position.Left} className="!invisible" />
    </div>
  );
}

export default memo(BookmarkNode);
