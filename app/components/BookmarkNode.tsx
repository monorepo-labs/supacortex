"use client";

import { memo } from "react";
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

  return (
    <div className="group w-[320px] rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Author */}
      {bookmark.author && (
        <p className="mb-2 text-xs text-zinc-400">@{bookmark.author}</p>
      )}

      {/* Title — serif font */}
      {displayTitle && (
        <h3
          style={{ fontFamily: "var(--font-source-serif)" }}
          className="mb-2 text-base font-medium leading-snug text-zinc-900"
        >
          {displayTitle}
        </h3>
      )}

      {/* Content */}
      {bookmark.content && (
        <p className="text-sm leading-relaxed text-zinc-600">
          {bookmark.content.length > 200
            ? bookmark.content.slice(0, 200) + "…"
            : bookmark.content}
        </p>
      )}

      {/* Media preview */}
      {bookmark.mediaUrls && bookmark.mediaUrls.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg">
          <img
            src={bookmark.mediaUrls[0].url}
            alt=""
            className="h-40 w-full object-cover"
          />
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-600"
        >
          Open original
        </a>
        {bookmark.isRead && <span className="text-xs text-zinc-300">Read</span>}
      </div>

      {/* React Flow handles (hidden, for future connections) */}
      <Handle type="source" position={Position.Right} className="!invisible" />
      <Handle type="target" position={Position.Left} className="!invisible" />
    </div>
  );
}

export default memo(BookmarkNode);
