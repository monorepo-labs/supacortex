"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { Loader2 } from "lucide-react";

import GraphNode from "./GraphNode";
import type { BookmarkData } from "./BookmarkNode";
import type { BookmarkEdge } from "@/server/bookmarks/queries";
import { useGroups } from "@/hooks/use-groups";

const nodeTypes = { graph: GraphNode };

interface SimNode extends SimulationNodeDatum {
  id: string;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  shared: number;
}

export default function GraphView({
  bookmarks,
  edges: rawEdges,
  isLoading,
  onOpenReader,
}: {
  bookmarks: BookmarkData[];
  edges: BookmarkEdge[];
  isLoading: boolean;
  onOpenReader: (bookmark: BookmarkData) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfInstance = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const { data: groups } = useGroups();

  const bookmarkMap = useMemo(() => {
    const map = new Map<string, BookmarkData>();
    bookmarks.forEach((b) => map.set(b.id, b));
    return map;
  }, [bookmarks]);

  // Map groupId -> color
  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (groups) {
      for (const g of groups as { id: string; color: string }[]) {
        map.set(g.id, g.color);
      }
    }
    return map;
  }, [groups]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(bookmarks.map((b) => b.id));
    return rawEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [bookmarks, rawEdges]);

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredEdges.forEach((e) => {
      counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
      counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
    });
    return counts;
  }, [filteredEdges]);

  const connectedBookmarks = useMemo(() => {
    const connectedIds = new Set<string>();
    filteredEdges.forEach((e) => {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    });
    return bookmarks.filter((b) => connectedIds.has(b.id));
  }, [bookmarks, filteredEdges]);

  useEffect(() => {
    if (connectedBookmarks.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const simNodes: SimNode[] = connectedBookmarks.map((b) => ({
      id: b.id,
      x: undefined,
      y: undefined,
    }));
    const nodeIndex = new Map(simNodes.map((n, i) => [n.id, i]));

    const simLinks: SimLink[] = filteredEdges
      .filter((e) => nodeIndex.has(e.source) && nodeIndex.has(e.target))
      .map((e) => ({
        source: nodeIndex.get(e.source)!,
        target: nodeIndex.get(e.target)!,
        shared: e.shared,
      }));

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .distance(200)
          .strength((d) => Math.min(1, (d.shared || 1) * 0.12)),
      )
      .force("charge", forceManyBody().strength(-400))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(120))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    const maxShared = Math.max(...filteredEdges.map((e) => e.shared), 1);

    const rfNodes: Node[] = simNodes.map((sn) => {
      const bk = bookmarkMap.get(sn.id);
      const groupIds = bk?.groupIds ?? [];
      const groupColor = groupIds.length > 0 ? groupColorMap.get(groupIds[0]) ?? null : null;

      return {
        id: sn.id,
        type: "graph",
        position: { x: sn.x ?? 0, y: sn.y ?? 0 },
        data: {
          title: bk?.title ?? null,
          content: bk?.content ?? null,
          author: bk?.author ?? null,
          url: bk?.url ?? "",
          type: bk?.type ?? "link",
          connectionCount: connectionCounts.get(sn.id) ?? 0,
          groupColor,
        },
        draggable: true,
      };
    });

    const rfEdges: Edge[] = filteredEdges
      .filter((e) => nodeIndex.has(e.source) && nodeIndex.has(e.target))
      .map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        style: {
          stroke: "#d4d4d8",
          strokeWidth: 1 + (e.shared / maxShared) * 2,
        },
      }));

    setNodes(rfNodes);
    setEdges(rfEdges);

    setTimeout(() => rfInstance.current?.fitView({ padding: 0.3 }), 50);
  }, [connectedBookmarks, filteredEdges, connectionCounts, bookmarkMap, groupColorMap]);

  const lastDragTime = useRef(0);

  const onNodeDragStop = useCallback(() => {
    lastDragTime.current = Date.now();
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (Date.now() - lastDragTime.current < 100) return;
      const bookmark = bookmarkMap.get(node.id);
      if (bookmark && !bookmark._optimistic) {
        onOpenReader(bookmark);
      }
    },
    [onOpenReader, bookmarkMap],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (connectedBookmarks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
        No connections found between bookmarks
      </div>
    );
  }

  return (
    <div className="h-full w-full">
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
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
