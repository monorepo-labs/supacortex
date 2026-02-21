"use client";

import { useState, useEffect, type DragEvent } from "react";
import { FolderPlus } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Reader from "./Reader";
import AddToGroupMenu from "./AddToGroupMenu";
import type { BookmarkData } from "./BookmarkNode";

type MaxVisible = 4 | 6;

function readerStyle(
  dragIndex: number | null,
  overIndex: number | null,
  index: number,
) {
  return {
    opacity: dragIndex === index ? 0.5 : 1,
    outline: overIndex === index ? "2px solid #3b82f6" : "none",
    outlineOffset: -2,
    borderRadius: "0.75rem",
    transition: "opacity 150ms, outline 150ms",
  } as const;
}

function DensityToggle({
  value,
  onChange,
}: {
  value: MaxVisible;
  onChange: (v: MaxVisible) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden text-xs">
      <button
        onClick={() => onChange(4)}
        className={`px-2 py-1 transition-colors ${
          value === 4
            ? "bg-zinc-900 text-white"
            : "text-zinc-500 hover:bg-zinc-100"
        }`}
      >
        4
      </button>
      <button
        onClick={() => onChange(6)}
        className={`px-2 py-1 transition-colors ${
          value === 6
            ? "bg-zinc-900 text-white"
            : "text-zinc-500 hover:bg-zinc-100"
        }`}
      >
        6
      </button>
    </div>
  );
}

function SettingsBar({
  readers,
  maxVisible,
  onMaxChange,
}: {
  readers: BookmarkData[];
  maxVisible: MaxVisible;
  onMaxChange: (v: MaxVisible) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
      <DensityToggle value={maxVisible} onChange={onMaxChange} />
      <TooltipProvider>
        <Tooltip>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className="rounded-lg p-1.5 border border-zinc-200 bg-white text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
                  <FolderPlus size={14} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Add all open to group
            </TooltipContent>
            <PopoverContent side="bottom" align="end" className="w-56 p-0">
              <AddToGroupMenu
                bookmarkIds={readers.map((r) => r.id)}
                currentGroupIds={[]}
                onAction={() => setPopoverOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function ReadersContainer({
  readers,
  onClose,
  onReorder,
}: {
  readers: BookmarkData[];
  onClose: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [maxVisible, setMaxVisible] = useState<MaxVisible>(4);

  useEffect(() => {
    const stored = localStorage.getItem("readers-max-visible");
    if (stored === "4" || stored === "6") {
      setMaxVisible(Number(stored) as MaxVisible);
    }
  }, []);

  const handleMaxChange = (v: MaxVisible) => {
    setMaxVisible(v);
    localStorage.setItem("readers-max-visible", String(v));
  };

  const handleDragStart = (index: number) => (e: DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && index !== dragIndex) {
      setOverIndex(index);
    }
  };

  const handleDrop = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      onReorder(dragIndex, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const dragProps = (index: number) => ({
    draggable: true as const,
    onDragStart: handleDragStart(index),
    onDragOver: handleDragOver(index),
    onDrop: handleDrop(index),
    onDragEnd: handleDragEnd,
  });

  const fullHeight = "calc(100vh - 1rem)";
  const maxRows = maxVisible === 4 ? 2 : 3;
  const showSettings = readers.length >= 5;

  // Outer width for the sliding wrapper
  const innerWidth =
    readers.length <= 1 ? 480 : 480 * 2 + 8;
  // Add mr-2 (8px) spacing when readers are open
  const wrapperWidth = readers.length === 0 ? 0 : innerWidth + 8;

  // Build inner content (null when no readers)
  let content: React.ReactNode = null;

  if (readers.length === 1) {
    content = (
      <div className="shrink-0 my-2 mr-2" style={{ width: 480 }}>
        <Reader
          bookmark={readers[0]}
          onClose={() => onClose(readers[0].id)}
          style={{ height: fullHeight, width: 480, ...readerStyle(dragIndex, overIndex, 0) }}
          {...dragProps(0)}
        />
      </div>
    );
  } else if (readers.length === 2) {
    content = (
      <div className="relative shrink-0 flex gap-2 my-2 mr-2" style={{ width: innerWidth }}>
        {showSettings && <SettingsBar readers={readers} maxVisible={maxVisible} onMaxChange={handleMaxChange} />}
        {readers.map((b, i) => (
          <Reader
            key={b.id}
            bookmark={b}
            onClose={() => onClose(b.id)}
            style={{ height: fullHeight, width: 480, ...readerStyle(dragIndex, overIndex, i) }}
            {...dragProps(i)}
          />
        ))}
      </div>
    );
  } else if (readers.length === 3) {
    content = (
      <div
        className="relative shrink-0 grid gap-2 my-2 mr-2"
        style={{
          width: innerWidth,
          height: fullHeight,
          gridTemplateColumns: "480px 480px",
          gridTemplateRows: "1fr 1fr",
        }}
      >
        {showSettings && <SettingsBar readers={readers} maxVisible={maxVisible} onMaxChange={handleMaxChange} />}
        <Reader
          bookmark={readers[0]}
          onClose={() => onClose(readers[0].id)}
          style={{ gridRow: "1 / 3", height: "100%", width: 480, ...readerStyle(dragIndex, overIndex, 0) }}
          {...dragProps(0)}
        />
        <Reader
          bookmark={readers[1]}
          onClose={() => onClose(readers[1].id)}
          style={{ height: "100%", width: 480, ...readerStyle(dragIndex, overIndex, 1) }}
          {...dragProps(1)}
        />
        <Reader
          bookmark={readers[2]}
          onClose={() => onClose(readers[2].id)}
          style={{ height: "100%", width: 480, ...readerStyle(dragIndex, overIndex, 2) }}
          {...dragProps(2)}
        />
      </div>
    );
  } else if (readers.length >= 4) {
    const rows = Math.ceil(readers.length / 2);
    const gridTemplateRows = Array(rows)
      .fill(`minmax(0, calc((100vh - 1rem - ${(maxRows - 1) * 8}px) / ${maxRows}))`)
      .join(" ");

    content = (
      <div className="relative shrink-0 my-2 mr-2" style={{ width: innerWidth }}>
        {showSettings && <SettingsBar readers={readers} maxVisible={maxVisible} onMaxChange={handleMaxChange} />}
        <div
          className="overflow-y-auto overflow-x-hidden scrollbar-hide"
          style={{ maxHeight: fullHeight }}
        >
          <div
            className="grid gap-2"
            style={{
              width: innerWidth,
              gridTemplateColumns: "480px 480px",
              gridTemplateRows,
            }}
          >
            {readers.map((b, i) => (
              <Reader
                key={b.id}
                bookmark={b}
                onClose={() => onClose(b.id)}
                style={{
                  height: "100%",
                  width: 480,
                  ...readerStyle(dragIndex, overIndex, i),
                }}
                {...dragProps(i)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Track whether we've rendered with readers before (for initial slide-in)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (readers.length > 0 && !mounted) {
      // Trigger slide-in on next frame so the transform transition plays
      requestAnimationFrame(() => setMounted(true));
    } else if (readers.length === 0) {
      setMounted(false);
    }
  }, [readers.length, mounted]);

  if (readers.length === 0) return null;

  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{ width: wrapperWidth }}
    >
      <div
        className="transition-transform duration-200 ease-out"
        style={{ transform: mounted ? "translateX(0)" : `translateX(100%)` }}
      >
        {content}
      </div>
    </div>
  );
}
