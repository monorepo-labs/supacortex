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

  if (readers.length === 0) return null;

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

  // 1 reader: single column
  if (readers.length === 1) {
    return (
      <div className="shrink-0 my-2 mr-2" style={{ width: 480 }}>
        <Reader
          bookmark={readers[0]}
          onClose={() => onClose(readers[0].id)}
          style={{ height: fullHeight, width: 480, ...readerStyle(dragIndex, overIndex, 0) }}
          {...dragProps(0)}
        />
      </div>
    );
  }

  // 2 readers: side by side, full height
  if (readers.length === 2) {
    return (
      <div className="relative shrink-0 flex gap-2 my-2 mr-2" style={{ width: 480 * 2 + 8 }}>
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
  }

  // 3 readers: clockwise — 1st full-height left, 2nd top-right, 3rd bottom-right
  if (readers.length === 3) {
    return (
      <div
        className="relative shrink-0 grid gap-2 my-2 mr-2"
        style={{
          width: 480 * 2 + 8,
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
  }

  // 4+ readers: 2-col grid with overflow
  const rows = Math.ceil(readers.length / 2);
  const needsScroll = rows > maxRows;
  const gridTemplateRows = Array(rows)
    .fill(`minmax(0, calc((100vh - 1rem - ${(maxRows - 1) * 8}px) / ${maxRows}))`)
    .join(" ");

  return (
    <div className="relative shrink-0 my-2 mr-2" style={{ width: 480 * 2 + 8 }}>
      {showSettings && <SettingsBar readers={readers} maxVisible={maxVisible} onMaxChange={handleMaxChange} />}
      <div
        className="overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{ maxHeight: fullHeight }}
      >
        <div
          className="grid gap-2"
          style={{
            width: 480 * 2 + 8,
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
