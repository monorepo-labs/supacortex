"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Link as LinkIcon } from "lucide-react";
import Image from "next/image";

export type GraphNodeData = {
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  type: string;
  connectionCount: number;
  groupColor: string | null;
  mediaUrls: { type: string; url: string }[] | null;
  isOpenInReader?: boolean;
};

function GraphNodeComponent({ data, selected }: NodeProps) {
  const { title, content, author, url, type, groupColor, mediaUrls, isOpenInReader } =
    data as unknown as GraphNodeData;

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
      <div
        className={`w-[200px] rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${selected ? "ring-2 ring-black/20 border-black/20" : isOpenInReader ? "ring-2 ring-black/6 border-black/6" : ""}`}
        style={{
          borderColor: selected ? undefined : (groupColor ?? "#e4e4e7"),
          borderLeftWidth: groupColor && !selected ? 3 : undefined,
        }}
      >
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
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0 !min-w-0 !min-h-0"
      />
    </>
  );
}

export default memo(GraphNodeComponent);
