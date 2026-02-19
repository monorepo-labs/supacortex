"use client";

import { memo, createContext, useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import BookmarkCard from "./BookmarkCard";

export type BookmarkData = {
  id: string;
  type: "tweet" | "link" | "article" | "pdf" | "image" | "youtube";
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  notes: string | null;
  isRead: boolean;
  mediaUrls: { type: string; url: string; videoUrl?: string }[] | null;
  positionX: number | null;
  positionY: number | null;
  gridX: number | null;
  gridY: number | null;
  gridW: number | null;
  gridH: number | null;
  gridExpanded: boolean | null;
  tweetCreatedAt: string | null;
  createdAt: string | null;
  groupIds: string[];
  _optimistic?: boolean;
  _expanded?: boolean;
};

export const ToggleExpandContext = createContext<(id: string) => void>(() => {});

function BookmarkNode({ data }: NodeProps) {
  const bookmark = data as BookmarkData;
  const toggleExpand = useContext(ToggleExpandContext);

  return (
    <div>
      <BookmarkCard
        bookmark={bookmark}
        expanded={!!bookmark._expanded}
        onToggleExpand={() => toggleExpand(bookmark.id)}
        onClick={() => {}}
      />
      <Handle type="source" position={Position.Right} className="!invisible" />
      <Handle type="target" position={Position.Left} className="!invisible" />
    </div>
  );
}

export default memo(BookmarkNode);
