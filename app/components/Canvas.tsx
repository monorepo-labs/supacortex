"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import BookmarkNode, { type BookmarkData } from "./BookmarkNode";

const nodeTypes = { bookmark: BookmarkNode };

// Arrange cards in a grid layout on the canvas
function bookmarksToNodes(bookmarks: BookmarkData[]): Node[] {
  const cols = 3;
  const gapX = 380;
  const gapY = 300;

  return bookmarks.map((bookmark, i) => ({
    id: `bookmark-${i}`,
    type: "bookmark",
    position: {
      x: (i % cols) * gapX,
      y: Math.floor(i / cols) * gapY,
    },
    data: bookmark,
    draggable: true,
  }));
}

export default function Canvas({ bookmarks, isLoading, error }: { bookmarks: BookmarkData[]; isLoading: boolean; error: Error | null }) {
  const initialNodes = useMemo(
    () => bookmarksToNodes(bookmarks),
    [bookmarks]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  return (
    <div className="h-full w-full bg-zinc-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e4e4e7" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
