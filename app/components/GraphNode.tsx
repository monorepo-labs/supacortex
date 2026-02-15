"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Link as LinkIcon } from "lucide-react";

export type GraphNodeData = {
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  type: string;
  connectionCount: number;
  groupColor: string | null;
};

function GraphNodeComponent({ data, selected }: NodeProps) {
  const { title, content, author, url, type, groupColor } =
    data as unknown as GraphNodeData;

  const isTweet = type === "tweet" || type === "article";
  let hostname = "";
  try {
    hostname = new URL(url as string).hostname.replace("www.", "");
  } catch {}

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
        className={`w-[200px] rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${selected ? "ring-2 ring-black/20 border-black/20" : ""}`}
        style={{
          borderColor: selected ? undefined : (groupColor ?? "#e4e4e7"),
          borderLeftWidth: groupColor && !selected ? 3 : undefined,
        }}
      >
        <div className="p-3 space-y-1.5">
          {isTweet && author && (
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
