"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeDragHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import BookmarkNode, { type BookmarkData } from "./BookmarkNode";
import Reader from "./Reader";
import { useUpdateBookmarkPosition } from "@/hooks/use-bookmarks";

const nodeTypes = { bookmark: BookmarkNode };

// Grid layout for search results or bookmarks without saved positions
function gridPosition(index: number) {
  const cols = 3;
  const gapX = 380;
  const gapY = 300;
  return {
    x: (index % cols) * gapX,
    y: Math.floor(index / cols) * gapY,
  };
}

function bookmarksToNodes(bookmarks: BookmarkData[], useGrid: boolean): Node[] {
  return bookmarks.map((bookmark, i) => ({
    id: bookmark.id,
    type: "bookmark",
    position:
      !useGrid && bookmark.positionX != null && bookmark.positionY != null
        ? { x: bookmark.positionX, y: bookmark.positionY }
        : gridPosition(i),
    data: bookmark,
    draggable: true,
  }));
}

export default function Canvas({
  bookmarks,
  isLoading,
  error,
  isSearching,
}: {
  bookmarks: BookmarkData[];
  isLoading: boolean;
  error: Error | null;
  isSearching: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const { mutate: updatePosition } = useUpdateBookmarkPosition();
  const [activeBookmark, setActiveBookmark] = useState<BookmarkData | null>(null);

  useEffect(() => {
    setNodes(bookmarksToNodes(bookmarks, isSearching));
    setTimeout(() => rfInstance.current?.fitView({ padding: 0.2 }), 50);
  }, [bookmarks, isSearching]);

  const lastDragTime = useRef(0);

  const onNodeDragStop: NodeDragHandler = (_, node) => {
    lastDragTime.current = Date.now();
    if (isSearching) return;
    updatePosition({
      id: node.id,
      positionX: node.position.x,
      positionY: node.position.y,
    });
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Ignore click if a drag just ended (within 100ms)
    if (Date.now() - lastDragTime.current < 100) return;
    const bookmark = node.data as BookmarkData;
    if (bookmark._optimistic) return;
    setActiveBookmark(bookmark);
  }, []);

  return (
    <div className="h-full w-full bg-white/60">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          rfInstance.current = instance;
        }}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        {/*<Background color="#AFB5C0" gap={24} size={1} />*/}
      </ReactFlow>

      {activeBookmark && (
        <Reader
          bookmark={activeBookmark}
          onClose={() => setActiveBookmark(null)}
        />
      )}
    </div>
  );
}
