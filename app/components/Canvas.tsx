"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import BookmarkNode, { type BookmarkData, ToggleExpandContext } from "./BookmarkNode";
import { useUpdateBookmarkPosition } from "@/hooks/use-bookmarks";

const nodeTypes = { bookmark: BookmarkNode };

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
  onOpenReader,
}: {
  bookmarks: BookmarkData[];
  isLoading: boolean;
  error: Error | null;
  isSearching: boolean;
  onOpenReader: (bookmark: BookmarkData) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfInstance = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const { mutate: updatePosition } = useUpdateBookmarkPosition();

  useEffect(() => {
    setNodes(bookmarksToNodes(bookmarks, isSearching));
    setTimeout(() => rfInstance.current?.fitView({ padding: 0.2 }), 50);
  }, [bookmarks, isSearching]);

  const toggleExpand = useCallback((id: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, _expanded: !n.data._expanded } }
          : n,
      ),
    );
  }, [setNodes]);

  const lastDragTime = useRef(0);

  const onNodeDragStop: OnNodeDrag = (_, node) => {
    lastDragTime.current = Date.now();
    if (isSearching) return;
    updatePosition({
      id: node.id,
      positionX: node.position.x,
      positionY: node.position.y,
    });
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (Date.now() - lastDragTime.current < 100) return;
    const bookmark = node.data as BookmarkData;
    if (bookmark._optimistic) return;
    onOpenReader(bookmark);
  }, [onOpenReader]);

  return (
    <div className="h-full w-full bg-white/60">
      <ToggleExpandContext.Provider value={toggleExpand}>
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
      </ToggleExpandContext.Provider>
    </div>
  );
}
